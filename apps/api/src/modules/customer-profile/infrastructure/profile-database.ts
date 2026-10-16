import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "atlas-profile-client";
import {
  principal,
  postal,
  cpUuid,
  ProfileError,
  type AuthorizedCustomerPrincipal,
  type CandidatePostalAddress,
  type AddressEligibility,
  type AddressSnapshot,
  type QuoteAddress,
} from "../domain/address.js";
import type { ProfileTransactionContext } from "../application/customer-addresses.js";
import { profileUrl } from "./profile-config.js";
export class ProfileDatabase {
  private readonly client: PrismaClient;
  private readonly contexts = new WeakMap<
    ProfileTransactionContext,
    { tx: Prisma.TransactionClient; actor: string }
  >();
  constructor(
    value: string,
    consent: string | undefined,
    private readonly role: "actor_a" | "actor_b",
  ) {
    profileUrl(value, consent, role);
    this.client = new PrismaClient({
      adapter: new PrismaPg({
        host: "127.0.0.1",
        port: 55441,
        database: "atlas_profile_cp01",
        user: "atlas_profile_" + role,
        password: "",
        ssl: false,
        max: 3,
        connectionTimeoutMillis: 1000,
        idleTimeoutMillis: 1000,
        maxLifetimeSeconds: 30,
        statement_timeout: 4000,
        query_timeout: 4500,
        options:
          "-c search_path=pg_catalog -c lock_timeout=2500 -c idle_in_transaction_session_timeout=5000",
        application_name: "atlas-profile-" + role,
      }),
      log: [],
    });
  }
  private async safe(tx: Prisma.TransactionClient) {
    const rows = await tx.$queryRaw<
      { safe: boolean }[]
    >`SELECT current_database()='atlas_profile_cp01' AND current_user=${"atlas_profile_" + this.role} AND current_setting('atlas.profile_fixture',true)='atlas-cp01-disposable' AND current_setting('server_version_num')::int BETWEEN 170000 AND 179999
      AND NOT(rolsuper OR rolbypassrls OR rolcreatedb OR rolcreaterole OR rolreplication)
      AND NOT EXISTS(SELECT 1 FROM pg_auth_members WHERE member=r.oid)
      AND NOT has_database_privilege(current_database(),'CREATE,TEMP')
      AND NOT EXISTS(SELECT 1 FROM pg_namespace n WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND (has_schema_privilege(n.oid,'CREATE') OR n.nspowner=r.oid))
      AND NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p','v','m','f') AND n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND (c.relowner=r.oid OR has_table_privilege(c.oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') OR has_any_column_privilege(c.oid,'SELECT,INSERT,UPDATE,REFERENCES')))
      AND NOT EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='S' AND n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND (c.relowner=r.oid OR has_sequence_privilege(c.oid,'USAGE,SELECT,UPDATE')))
      AND NOT EXISTS(SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname NOT LIKE 'pg_%' AND n.nspname<>'information_schema' AND has_function_privilege(p.oid,'EXECUTE') AND NOT(p.oid IN ('customer_profile.change(uuid,uuid,uuid,integer,jsonb,text)'::regprocedure,'customer_profile.read_for_quote(uuid,uuid)'::regprocedure,'customer_profile.snapshot_for_order(uuid,uuid,integer)'::regprocedure)))
      AS safe FROM pg_roles r WHERE rolname=current_user`;
    if (rows[0]?.safe !== true) throw new ProfileError("PROFILE_UNAVAILABLE");
  }
  private mapped(error: unknown): never {
    if (error instanceof ProfileError) throw error;
    const detail = JSON.stringify((error as { meta?: unknown })?.meta ?? {});
    for (const code of [
      "UNAUTHENTICATED",
      "RESOURCE_NOT_FOUND",
      "VERSION_CONFLICT",
      "IDEMPOTENCY_CONFLICT",
      "INVALID_REQUEST",
    ] as const)
      if (detail.includes("CP_" + code)) throw new ProfileError(code);
    throw new ProfileError("PROFILE_UNAVAILABLE");
  }
  async transaction<T>(
    p: AuthorizedCustomerPrincipal,
    work: (tx: ProfileTransactionContext) => Promise<T>,
  ): Promise<T> {
    principal(p);
    try {
      return await this.client.$transaction(
        async (tx) => {
          await this.safe(tx);
          const context: ProfileTransactionContext = Object.freeze({
            purpose: "CP-01_TEST_ONLY",
          });
          this.contexts.set(context, { tx, actor: p.accountId });
          try {
            return await work(context);
          } finally {
            this.contexts.delete(context);
          }
        },
        { maxWait: 1000, timeout: 6000 },
      );
    } catch (error) {
      return this.mapped(error);
    }
  }
  private context(
    p: AuthorizedCustomerPrincipal,
    c: ProfileTransactionContext,
  ) {
    principal(p);
    const binding = this.contexts.get(c);
    if (!binding || binding.actor !== p.accountId)
      throw new ProfileError("PROFILE_UNAVAILABLE");
    return binding.tx;
  }
  async change(
    p: AuthorizedCustomerPrincipal,
    key: string,
    id: string,
    version: number,
    address: CandidatePostalAddress,
    state: AddressEligibility,
  ) {
    if (
      !cpUuid.test(key) ||
      !cpUuid.test(id) ||
      !Number.isSafeInteger(version) ||
      version < 0 ||
      !["ELIGIBLE", "INELIGIBLE", "RETIRED"].includes(state)
    )
      throw new ProfileError("INVALID_REQUEST");
    const input = postal(address);
    return this.transaction(p, async (c) => {
      const rows = await this.context(p, c).$queryRaw<
        { result: AddressSnapshot }[]
      >`SELECT customer_profile.change(${p.accountId}::uuid,${key}::uuid,${id}::uuid,${version}::int,${JSON.stringify(input)}::jsonb,${state}::text) result`;
      if (!rows[0]?.result) throw new ProfileError("PROFILE_UNAVAILABLE");
      return rows[0].result;
    });
  }
  readForQuote(p: AuthorizedCustomerPrincipal, id: string) {
    if (!cpUuid.test(id)) throw new ProfileError("RESOURCE_NOT_FOUND");
    return this.transaction(p, async (c) => {
      const rows = await this.context(p, c).$queryRaw<
        { result: QuoteAddress }[]
      >`SELECT customer_profile.read_for_quote(${p.accountId}::uuid,${id}::uuid) result`;
      if (!rows[0]?.result) throw new ProfileError("PROFILE_UNAVAILABLE");
      return rows[0].result;
    });
  }
  async snapshotForOrder(
    p: AuthorizedCustomerPrincipal,
    id: string,
    version: number,
    c: ProfileTransactionContext,
  ) {
    if (!cpUuid.test(id) || !Number.isSafeInteger(version) || version < 1)
      throw new ProfileError("RESOURCE_NOT_FOUND");
    const rows = await this.context(p, c).$queryRaw<
      { result: AddressSnapshot }[]
    >`SELECT customer_profile.snapshot_for_order(${p.accountId}::uuid,${id}::uuid,${version}::int) result`;
    if (!rows[0]?.result) throw new ProfileError("PROFILE_UNAVAILABLE");
    return rows[0].result;
  }
  close() {
    return this.client.$disconnect();
  }
}
