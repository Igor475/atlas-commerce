import { Logger } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "atlas-identity-client";
import type {
  MailDispatchRepository,
  MailResult,
} from "../domain/mail-dispatch.js";
import {
  IdentityError,
  type IdentityRepository,
  type IssueToken,
  type Credential,
  type CustomerView,
  type MailIntent,
} from "../domain/identity.js";

type Tx = Prisma.TransactionClient;
type Row = Record<string, unknown>;
async function rows<T = Row>(
  tx: Tx,
  sql: string,
  ...args: unknown[]
): Promise<T[]> {
  // All SQL below is static; values are positional bindings, never concatenated.
  return tx.$queryRawUnsafe<T[]>(sql, ...args);
}
async function exec(tx: Tx, sql: string, ...args: unknown[]): Promise<number> {
  return tx.$executeRawUnsafe(sql, ...args);
}
async function audit(
  tx: Tx,
  id: string | null,
  action: string,
  requestId: string,
): Promise<void> {
  await exec(
    tx,
    "INSERT INTO identity.auth_security_event(subject_id,action,request_id) VALUES ($1::uuid,$2,$3::uuid)",
    id,
    action,
    requestId,
  );
}
async function lockAccount(tx: Tx, id: string): Promise<Row | undefined> {
  return (
    await rows(
      tx,
      "SELECT id,email,status FROM identity.customer_account WHERE id=$1::uuid FOR UPDATE",
      id,
    )
  )[0];
}
async function issue(tx: Tx, id: string, token: IssueToken): Promise<void> {
  const recent = await rows(
    tx,
    "SELECT id FROM identity.account_token WHERE account_id=$1::uuid AND purpose=$2 AND consumed_at IS NULL AND invalidated_at IS NULL AND expires_at>clock_timestamp() AND created_at>clock_timestamp()-interval '60 seconds'",
    id,
    token.purpose,
  );
  if (recent.length) return;
  await exec(
    tx,
    "UPDATE identity.account_token SET invalidated_at=clock_timestamp() WHERE account_id=$1::uuid AND purpose=$2 AND consumed_at IS NULL AND invalidated_at IS NULL",
    id,
    token.purpose,
  );
  const created = await rows<{ id: string }>(
    tx,
    "INSERT INTO identity.account_token(account_id,token_hash,purpose,expires_at) VALUES ($1::uuid,$2,$3,clock_timestamp()+$4::int*interval '1 second') RETURNING id",
    id,
    token.hash,
    token.purpose,
    token.ttl,
  );
  await exec(
    tx,
    "INSERT INTO identity.email_outbox(token_id,payload,expires_at) SELECT id,$2,expires_at FROM identity.account_token WHERE id=$1::uuid",
    created[0]!.id,
    token.payload,
  );
}
async function liveSession(
  tx: Tx,
  hash: string,
  origin: string,
  idle: number,
): Promise<CustomerView | undefined> {
  const initial = (
    await rows<{ account_id: string }>(
      tx,
      "SELECT account_id FROM identity.auth_session WHERE token_hash=$1",
      hash,
    )
  )[0];
  if (!initial) return;
  const account = await lockAccount(tx, initial.account_id);
  if (account?.status !== "ACTIVE") return;
  const session = await rows(
    tx,
    "UPDATE identity.auth_session s SET last_seen_at=clock_timestamp() FROM identity.password_credential c WHERE s.token_hash=$1 AND s.account_id=c.account_id AND s.origin=$2 AND s.session_class='CUSTOMER' AND s.revoked_at IS NULL AND s.expires_at>clock_timestamp() AND s.last_seen_at>clock_timestamp()-$3::int*interval '1 second' AND s.credential_version=c.version RETURNING s.id",
    hash,
    origin,
    idle,
  );
  if (!session.length) return;
  return {
    id: String(account.id),
    email: String(account.email),
    sessionClass: "CUSTOMER",
  };
}
export class PrismaIdentityRepository
  implements IdentityRepository, MailDispatchRepository
{
  private client: PrismaClient | undefined;
  constructor(private readonly name = "atlas-id01") {}
  get database(): PrismaClient {
    return (this.client ??= new PrismaClient({
      adapter: new PrismaPg(
        {
          host: "127.0.0.1",
          port: 55436,
          database: "atlas_identity_id01",
          user: "atlas_identity_runtime",
          password: "",
          ssl: false,
          max: 2,
          application_name: this.name,
          connectionTimeoutMillis: 1000,
          idleTimeoutMillis: 1000,
          statement_timeout: 5000,
          lock_timeout: 3000,
          idle_in_transaction_session_timeout: 10000,
        },
        {
          schema: "identity",
          onPoolError: () => Logger.warn("IDENTITY_DB_UNAVAILABLE", "Identity"),
          onConnectionError: () =>
            Logger.warn("IDENTITY_DB_UNAVAILABLE", "Identity"),
        },
      ),
      log: [],
      errorFormat: "minimal",
      transactionOptions: {
        maxWait: 2000,
        timeout: 10000,
        isolationLevel: "ReadCommitted",
      },
    }));
  }
  failure(
    action: "LOGIN_DENIED" | "VERIFY_DENIED" | "RECOVERY_DENIED",
    requestId: string,
  ): Promise<void> {
    return this.tx((tx) => audit(tx, null, action, requestId));
  }
  private async tx<T>(work: (tx: Tx) => Promise<T>): Promise<T> {
    try {
      return await this.database.$transaction(async (tx) => {
        const target = (
          await rows<{ marker: string; db: string; role: string }>(
            tx,
            "SELECT current_setting('atlas.identity_fixture',true) AS marker,current_database() AS db,current_user AS role",
          )
        )[0];
        if (
          target?.marker !== "atlas-id01-disposable" ||
          target.db !== "atlas_identity_id01" ||
          target.role !== "atlas_identity_runtime"
        )
          throw new IdentityError("DEPENDENCY_UNAVAILABLE");
        return work(tx);
      });
    } catch (error) {
      if (error instanceof IdentityError) throw error;
      throw new IdentityError("DEPENDENCY_UNAVAILABLE");
    }
  }
  async register(
    email: string,
    hash: string,
    token: IssueToken,
    requestId: string,
  ): Promise<void> {
    await this.tx(async (tx) => {
      const inserted = await rows<{ id: string }>(
        tx,
        "INSERT INTO identity.customer_account(email) VALUES($1) ON CONFLICT(email) DO NOTHING RETURNING id",
        email,
      );
      if (!inserted.length) {
        await audit(tx, null, "REGISTER_ACCEPTED", requestId);
        return;
      }
      const id = inserted[0]!.id;
      await exec(
        tx,
        "INSERT INTO identity.password_credential(account_id,hash) VALUES($1::uuid,$2)",
        id,
        hash,
      );
      await issue(tx, id, token);
      await audit(tx, id, "REGISTER_ACCEPTED", requestId);
    });
  }
  async issue(
    email: string,
    token: IssueToken,
    requestId: string,
  ): Promise<void> {
    await this.tx(async (tx) => {
      const account = (
        await rows(
          tx,
          "SELECT id,status FROM identity.customer_account WHERE email=$1 FOR UPDATE",
          email,
        )
      )[0];
      const expected =
        token.purpose === "VERIFY_EMAIL" ? "PENDING_VERIFICATION" : "ACTIVE";
      if (account?.status === expected)
        await issue(tx, String(account.id), token);
      await audit(tx, null, "TOKEN_REQUEST_ACCEPTED", requestId);
    });
  }
  private async consume(
    tx: Tx,
    hash: string,
    purpose: string,
  ): Promise<string | undefined> {
    const initial = (
      await rows<{ account_id: string }>(
        tx,
        "SELECT account_id FROM identity.account_token WHERE token_hash=$1 AND purpose=$2",
        hash,
        purpose,
      )
    )[0];
    if (!initial) return;
    const account = await lockAccount(tx, initial.account_id);
    if (
      account?.status !==
      (purpose === "VERIFY_EMAIL" ? "PENDING_VERIFICATION" : "ACTIVE")
    )
      return;
    const token = await rows(
      tx,
      "UPDATE identity.account_token SET consumed_at=clock_timestamp() WHERE token_hash=$1 AND purpose=$2 AND consumed_at IS NULL AND invalidated_at IS NULL AND expires_at>clock_timestamp() RETURNING id",
      hash,
      purpose,
    );
    return token.length ? initial.account_id : undefined;
  }
  async verifyToken(hash: string, requestId: string): Promise<boolean> {
    return this.tx(async (tx) => {
      const id = await this.consume(tx, hash, "VERIFY_EMAIL");
      if (!id) return false;
      await exec(
        tx,
        "UPDATE identity.customer_account SET status='ACTIVE' WHERE id=$1::uuid",
        id,
      );
      await audit(tx, id, "EMAIL_VERIFIED", requestId);
      return true;
    });
  }
  async credential(email: string): Promise<Credential | undefined> {
    return this.tx(async (tx) => {
      const row = (
        await rows<Credential>(
          tx,
          "SELECT a.id,a.status,c.hash,c.version FROM identity.customer_account a JOIN identity.password_credential c ON c.account_id=a.id WHERE a.email=$1",
          email,
        )
      )[0];
      return row;
    });
  }
  async login(
    credential: Credential,
    tokenHash: string,
    oldHash: string,
    newHash: string | undefined,
    origin: string,
    absolute: number,
    requestId: string,
  ): Promise<boolean> {
    return this.tx(async (tx) => {
      const account = await lockAccount(tx, credential.id);
      const current = (
        await rows<{ hash: string; version: number }>(
          tx,
          "SELECT hash,version FROM identity.password_credential WHERE account_id=$1::uuid",
          credential.id,
        )
      )[0];
      if (
        account?.status !== "ACTIVE" ||
        current?.hash !== credential.hash ||
        current.version !== credential.version
      )
        return false;
      if (newHash)
        await exec(
          tx,
          "UPDATE identity.password_credential SET hash=$2 WHERE account_id=$1::uuid",
          credential.id,
          newHash,
        );
      await exec(
        tx,
        "UPDATE identity.auth_session SET revoked_at=clock_timestamp() WHERE token_hash=$1 AND account_id=$2::uuid AND revoked_at IS NULL",
        oldHash,
        credential.id,
      );
      await exec(
        tx,
        "INSERT INTO identity.auth_session(account_id,token_hash,credential_version,origin,expires_at) VALUES ($1::uuid,$2,$3,$4,clock_timestamp()+$5::int*interval '1 second')",
        credential.id,
        tokenHash,
        current.version,
        origin,
        absolute,
      );
      await audit(tx, credential.id, "CUSTOMER_LOGIN", requestId);
      return true;
    });
  }
  current(
    hash: string,
    origin: string,
    idle: number,
  ): Promise<CustomerView | undefined> {
    return this.tx((tx) => liveSession(tx, hash, origin, idle));
  }
  async revoke(
    hash: string,
    all: boolean,
    origin: string,
    idle: number,
    requestId: string,
  ): Promise<void> {
    await this.tx(async (tx) => {
      if (all) {
        const customer = await liveSession(tx, hash, origin, idle);
        if (!customer) throw new IdentityError("UNAUTHENTICATED");
        await exec(
          tx,
          "UPDATE identity.auth_session SET revoked_at=clock_timestamp() WHERE account_id=$1::uuid AND revoked_at IS NULL",
          customer.id,
        );
        await audit(tx, customer.id, "CUSTOMER_LOGOUT_ALL", requestId);
      } else {
        // A revoked/expired cookie still gets an idempotent persistent logout.
        await exec(
          tx,
          "UPDATE identity.auth_session SET revoked_at=clock_timestamp() WHERE token_hash=$1 AND revoked_at IS NULL",
          hash,
        );
        await audit(tx, null, "CUSTOMER_LOGOUT", requestId);
      }
    });
  }
  async recover(
    hash: string,
    passwordHash: string,
    requestId: string,
  ): Promise<boolean> {
    return this.tx(async (tx) => {
      const id = await this.consume(tx, hash, "RESET_PASSWORD");
      if (!id) return false;
      await exec(
        tx,
        "UPDATE identity.password_credential SET hash=$2,version=version+1 WHERE account_id=$1::uuid",
        id,
        passwordHash,
      );
      await exec(
        tx,
        "UPDATE identity.auth_session SET revoked_at=clock_timestamp() WHERE account_id=$1::uuid AND revoked_at IS NULL",
        id,
      );
      await exec(
        tx,
        "UPDATE identity.account_token SET invalidated_at=clock_timestamp() WHERE account_id=$1::uuid AND consumed_at IS NULL AND invalidated_at IS NULL",
        id,
      );
      await audit(tx, id, "CUSTOMER_RECOVERY", requestId);
      return true;
    });
  }
  async limit(
    key: string,
    seconds: number,
    maximum: number,
  ): Promise<number | undefined> {
    return this.tx(async (tx) => {
      await exec(
        tx,
        "DELETE FROM identity.auth_abuse_window WHERE (key,bucket) IN (SELECT key,bucket FROM identity.auth_abuse_window WHERE expires_at<clock_timestamp() LIMIT 100)",
      );
      await exec(
        tx,
        "DELETE FROM identity.auth_security_event WHERE id IN (SELECT id FROM identity.auth_security_event WHERE created_at<clock_timestamp()-interval '24 hours' LIMIT 100)",
      );
      await exec(
        tx,
        "DELETE FROM identity.email_outbox WHERE id IN (SELECT id FROM identity.email_outbox WHERE expires_at<clock_timestamp() OR created_at<clock_timestamp()-interval '48 hours' LIMIT 100)",
      );
      const result = (
        await rows<{ hits: number; retry: number }>(
          tx,
          "INSERT INTO identity.auth_abuse_window(key,bucket,hits,expires_at) VALUES ($1,floor(extract(epoch FROM clock_timestamp())/$2)::bigint,1,to_timestamp((floor(extract(epoch FROM clock_timestamp())/$2)+1)*$2)) ON CONFLICT(key,bucket) DO UPDATE SET hits=LEAST(identity.auth_abuse_window.hits+1,$3::int+1) RETURNING hits,GREATEST(1,ceil(extract(epoch FROM expires_at-clock_timestamp())))::int AS retry",
          key,
          seconds,
          maximum,
        )
      )[0]!;
      return result.hits > maximum ? result.retry : undefined;
    });
  }
  async claimMail(): Promise<MailIntent | undefined> {
    return this.tx(
      async (tx) =>
        (
          await rows<MailIntent>(
            tx,
            "UPDATE identity.email_outbox SET status='PROCESSING',lease_until=clock_timestamp()+interval '30 seconds',attempts=attempts+1 WHERE id=(SELECT o.id FROM identity.email_outbox o JOIN identity.account_token t ON t.id=o.token_id WHERE ((o.status='PENDING' AND (o.lease_until IS NULL OR o.lease_until<clock_timestamp())) OR (o.status='PROCESSING' AND o.lease_until<clock_timestamp())) AND NOT EXISTS(SELECT 1 FROM identity.auth_security_event e WHERE e.request_id=o.id AND e.action='RESEND_CLAIM') AND o.attempts<10 AND o.expires_at>clock_timestamp() AND t.consumed_at IS NULL AND t.invalidated_at IS NULL ORDER BY o.created_at LIMIT 1 FOR UPDATE OF o SKIP LOCKED) RETURNING id,payload,attempts",
          )
        )[0],
    );
  }
  async finishMail(
    id: string,
    delivered: boolean,
    attempt: number,
  ): Promise<void> {
    await this.tx(async (tx) => {
      await exec(
        tx,
        "UPDATE identity.email_outbox SET status=CASE WHEN $2 THEN 'DELIVERED' WHEN attempts>=10 THEN 'FAILED' ELSE 'PENDING' END,lease_until=CASE WHEN $2 THEN NULL ELSE clock_timestamp()+interval '5 seconds' END WHERE id=$1::uuid AND status='PROCESSING' AND attempts=$3::int",
        id,
        delivered,
        attempt,
      );
    });
  }
  async claimDispatchMail(id?: string): Promise<MailIntent | undefined> {
    return this.tx(async (tx) => {
      // An expired real-provider lease is ambiguous, never a blind replay.
      const crashed = await rows<{ id: string }>(
        tx,
        "UPDATE identity.email_outbox SET status='FAILED',lease_until=NULL WHERE id IN (SELECT o.id FROM identity.email_outbox o WHERE o.status='PROCESSING' AND o.lease_until<clock_timestamp() AND ($1::uuid IS NULL OR o.id=$1::uuid) AND EXISTS(SELECT 1 FROM identity.auth_security_event e WHERE e.request_id=o.id AND e.action='RESEND_CLAIM') LIMIT 3 FOR UPDATE OF o SKIP LOCKED) RETURNING id",
        id ?? null,
      );
      for (const row of crashed)
        await audit(tx, null, "RESEND_UNCERTAIN/CRASH", row.id);
      const expired = await rows<{ id: string }>(
        tx,
        "UPDATE identity.email_outbox SET status='FAILED',lease_until=NULL WHERE id IN (SELECT o.id FROM identity.email_outbox o JOIN identity.account_token t ON t.id=o.token_id JOIN identity.customer_account a ON a.id=t.account_id WHERE o.status='PENDING' AND ($1::uuid IS NULL OR o.id=$1::uuid) AND (o.expires_at<=clock_timestamp() OR t.expires_at<=clock_timestamp() OR t.consumed_at IS NOT NULL OR t.invalidated_at IS NOT NULL OR o.created_at<=clock_timestamp()-interval '24 hours' OR o.attempts>=3 OR (t.purpose='VERIFY_EMAIL' AND a.status<>'PENDING_VERIFICATION') OR (t.purpose='RESET_PASSWORD' AND a.status<>'ACTIVE')) LIMIT 3 FOR UPDATE OF o SKIP LOCKED) RETURNING id",
        id ?? null,
      );
      for (const row of expired)
        await audit(tx, null, "RESEND_PERMANENT/EXPIRED_OR_WINDOW", row.id);
      const intent = (
        await rows<MailIntent>(
          tx,
          "UPDATE identity.email_outbox SET status='PROCESSING',lease_until=clock_timestamp()+interval '30 seconds',attempts=attempts+1 WHERE id=(SELECT o.id FROM identity.email_outbox o JOIN identity.account_token t ON t.id=o.token_id JOIN identity.customer_account a ON a.id=t.account_id WHERE o.status='PENDING' AND ($1::uuid IS NULL OR o.id=$1::uuid) AND (o.lease_until IS NULL OR o.lease_until<=clock_timestamp()) AND o.attempts<3 AND o.created_at>clock_timestamp()-interval '24 hours' AND o.expires_at>clock_timestamp() AND t.expires_at>clock_timestamp() AND t.consumed_at IS NULL AND t.invalidated_at IS NULL AND ((t.purpose='VERIFY_EMAIL' AND a.status='PENDING_VERIFICATION') OR (t.purpose='RESET_PASSWORD' AND a.status='ACTIVE')) ORDER BY o.created_at LIMIT 1 FOR UPDATE OF o SKIP LOCKED) RETURNING id,payload,attempts",
          id ?? null,
        )
      )[0];
      if (intent) await audit(tx, null, "RESEND_CLAIM", intent.id);
      return intent;
    });
  }
  freezeDispatchMail(intent: MailIntent, payload: string): Promise<boolean> {
    return this.tx(
      async (tx) =>
        (await exec(
          tx,
          "UPDATE identity.email_outbox SET payload=$3 WHERE id=$1::uuid AND attempts=$2::int AND status='PROCESSING' AND lease_until>clock_timestamp()",
          intent.id,
          intent.attempts,
          payload,
        )) === 1,
    );
  }
  dispatchMailLive(intent: MailIntent): Promise<boolean> {
    return this.tx(
      async (tx) =>
        (
          await rows(
            tx,
            "SELECT o.id FROM identity.email_outbox o JOIN identity.account_token t ON t.id=o.token_id JOIN identity.customer_account a ON a.id=t.account_id WHERE o.id=$1::uuid AND o.attempts=$2::int AND o.status='PROCESSING' AND o.lease_until>clock_timestamp() AND o.expires_at>clock_timestamp() AND o.created_at>clock_timestamp()-interval '24 hours' AND t.expires_at>clock_timestamp() AND t.consumed_at IS NULL AND t.invalidated_at IS NULL AND ((t.purpose='VERIFY_EMAIL' AND a.status='PENDING_VERIFICATION') OR (t.purpose='RESET_PASSWORD' AND a.status='ACTIVE'))",
            intent.id,
            intent.attempts,
          )
        ).length === 1,
    );
  }
  finishDispatchMail(intent: MailIntent, result: MailResult): Promise<boolean> {
    return this.tx(async (tx) => {
      const retry = result.kind === "RETRY" ? result.afterSeconds : 0;
      const changed = await rows<{ status: string }>(
        tx,
        "UPDATE identity.email_outbox SET status=CASE WHEN $3='ACCEPTED' THEN 'PROCESSING' WHEN $3='RETRY' AND attempts<3 AND clock_timestamp()+$4::int*interval '1 second'<LEAST(expires_at,created_at+interval '24 hours') THEN 'PENDING' ELSE 'FAILED' END,lease_until=CASE WHEN $3='RETRY' AND attempts<3 AND clock_timestamp()+$4::int*interval '1 second'<LEAST(expires_at,created_at+interval '24 hours') THEN clock_timestamp()+$4::int*interval '1 second' ELSE NULL END WHERE id=$1::uuid AND attempts=$2::int AND status='PROCESSING' AND lease_until>clock_timestamp() RETURNING status",
        intent.id,
        intent.attempts,
        result.kind,
        retry,
      );
      if (!changed.length) return false;
      const action =
        result.kind === "ACCEPTED"
          ? "RESEND_PROVIDER_ACCEPTED/" + result.providerId
          : result.kind === "RETRY" && changed[0]!.status === "FAILED"
            ? "RESEND_PERMANENT/RETRY_EXHAUSTED"
            : "RESEND_" + result.kind + "/" + result.code;
      await audit(tx, null, action, intent.id);
      return true;
    });
  }
  async ready(): Promise<boolean> {
    try {
      const rows = await this.database.$queryRawUnsafe<{ unsafe: boolean }[]>(
        "SELECT (rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication OR has_database_privilege(current_database(),'CREATE,TEMP') OR has_schema_privilege('identity','CREATE') OR has_schema_privilege('public','CREATE') OR EXISTS(SELECT 1 FROM pg_auth_members m WHERE m.member=pg_roles.oid) OR current_setting('atlas.identity_fixture',true) IS DISTINCT FROM 'atlas-id01-disposable') AS unsafe FROM pg_roles WHERE rolname=current_user",
      );
      return rows.length === 1 && rows[0]?.unsafe === false;
    } catch {
      return false;
    }
  }
  async close(): Promise<void> {
    const client = this.client;
    this.client = undefined;
    await client?.$disconnect();
  }
}
