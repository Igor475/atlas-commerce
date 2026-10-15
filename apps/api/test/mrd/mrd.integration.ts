import { describe, it, expect, vi, afterAll } from "vitest";
import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  rmSync,
  unlinkSync,
  existsSync,
  symlinkSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { X509Certificate } from "node:crypto";
import pg from "pg";
import { observeLocal } from "../../src/infrastructure/persistence/mrd-executor.js";
import {
  parseArguments,
  validateEnvironment,
  operations,
  envelope,
} from "../../src/infrastructure/persistence/mrd-contract.js";
import {
  localConfiguration,
  digest,
} from "../../src/infrastructure/persistence/mrd-config.js";
import { projectResult } from "../../src/infrastructure/persistence/mrd-results.js";
import { catalogHashes } from "../../src/infrastructure/persistence/mrd-catalog.js";
const root = process.env.MRD_TEST_RUN_DIR;
if (!root) throw Error("MRD_LOCAL_HARNESS_REQUIRED");
const context = JSON.parse(
  readFileSync(join(root, "test-context.json"), "utf8"),
) as {
  runId: string;
  manifestPath: string;
  password: string;
  container: string;
};
const input = {
  runId: context.runId,
  manifestPath: context.manifestPath,
  password: context.password,
};
const cli = resolve("scripts/mrd.mjs");
// Explicit process environment: provider secrets are never forwarded.
const cleanEnv = Object.fromEntries(
  Object.entries(process.env).filter(([key]) =>
    [
      "PATH",
      "Path",
      "SystemRoot",
      "SYSTEMROOT",
      "WINDIR",
      "ComSpec",
      "COMSPEC",
      "PATHEXT",
      "TEMP",
      "TMP",
      "TMPDIR",
      "HOME",
      "USERPROFILE",
      "APPDATA",
      "LOCALAPPDATA",
      "USERDOMAIN",
      "USERNAME",
      "SystemDrive",
      "PROGRAMFILES",
      "ProgramFiles",
      "CI",
      "GITHUB_ACTIONS",
      "DOCKER_HOST",
      "DOCKER_CONTEXT",
      "DOCKER_CONFIG",
    ].includes(key),
  ),
);
const args = (id: string) => [
  "--profile=local-disposable",
  "--consent-local=MRD-G2",
  "--operation=" + id,
];
async function run(
  id = "PING",
  value: unknown = input,
  argv = args(id),
  env = cleanEnv,
) {
  const child = spawn(process.execPath, [cli, ...argv], {
    env,
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  let stdout = "",
    stderr = "";
  child.stdout.on("data", (b) => {
    stdout += b.toString();
  });
  child.stderr.on("data", (b) => {
    stderr += b.toString();
  });
  child.stdin.on("error", () => {});
  child.stdin.end(JSON.stringify(value));
  const code = await new Promise<number | null>((r) => child.once("exit", r));
  expect(stdout + stderr).not.toContain(context.password);
  expect(stdout + stderr).not.toContain("CANARY_FAKE_SECRET");
  return {
    code,
    stdout,
    stderr,
    result: stdout.startsWith("{") ? JSON.parse(stdout) : null,
  };
}
const adminOptions = {
  ...localConfiguration(input).options,
  user: "atlas_mrd_fixture_admin",
  password: "",
  options: "-c search_path=pg_catalog",
  statement_timeout: 10000,
  application_name: "atlas-mrd-test-control",
};
const controlPool = new pg.Pool(adminOptions);
controlPool.on("error", () => {});
afterAll(async () => {
  await controlPool.end();
});
async function admin(sql: string): Promise<string> {
  const r = await controlPool.query(sql);
  const last = Array.isArray(r) ? r.at(-1) : r;
  return (
    last?.rows
      .map((row: Record<string, unknown>) => Object.values(row).join("|"))
      .join("\n") ?? ""
  );
}
describe("MRD local security; no remote execution", () => {
  it("MRD-001/003/004 strict arguments deny before configuration or pool", async () => {
    const connectSpy = vi.spyOn(pg.Pool.prototype, "connect");
    try {
      for (const argv of [
        [],
        args("unknown"),
        [...args("PING"), "--operation=PING"],
        args("PING; SELECT lo_create(0)"),
        ["--profile=remote", "--consent-local=MRD-G2", "--operation=PING"],
        args("CANARY_FAKE_SECRET"),
      ]) {
        const r = await observeLocal(argv, null, {});
        expect(r.status).toBe("MRD_BLOCKED");
        expect(r.data).toBeNull();
        expect(r.l1SqlStrict).toBe("PENDENTE");
      }
      expect(parseArguments(["--help"])).toBe("HELP");
      expect(connectSpy).not.toHaveBeenCalled();
    } finally {
      connectSpy.mockRestore();
    }
  });
  it.each([
    "PGHOST",
    "PGOPTIONS",
    "DATABASE_URL",
    "SUPABASE_KEY",
    "ATLAS_SUPABASE_PROJECT_REF",
    "DEBUG",
    "NODE_OPTIONS",
    "NODE_PATH",
    "NODE_TLS_REJECT_UNAUTHORIZED",
  ])("MRD-002/003/016 ambient %s refused", async (key) => {
    expect(() =>
      validateEnvironment({ [key]: "CANARY_FAKE_SECRET" }),
    ).toThrow();
    const r = await run("PING", input, args("PING"), {
      ...cleanEnv,
      [key]: key === "NODE_OPTIONS" ? "" : "CANARY_FAKE_SECRET",
    });
    expect(r.code).not.toBe(0);
  });
  it("MRD-002/006 rejects credential, endpoint, cert and manifest substitution", async () => {
    for (const value of [
      { ...input, password: "CANARY_FAKE_SECRET" },
      { ...input, host: "remote.example" },
      { ...input, manifestPath: "/unknown" },
      { ...input, runId: "wrong" },
    ]) {
      expect((await run("PING", value)).code).not.toBe(0);
    }
    const original = readFileSync(context.manifestPath, "utf8");
    try {
      for (const [key, value] of [
        ["host", "remote.example"],
        ["port", 5432],
        ["database", "wrong"],
        ["role", "atlas_mrd_fixture_admin"],
        ["caHash", "bad"],
      ]) {
        const changed = JSON.parse(original);
        changed[key as string] = value;
        writeFileSync(context.manifestPath, JSON.stringify(changed));
        expect((await run()).code).not.toBe(0);
      }
    } finally {
      writeFileSync(context.manifestPath, original);
    }
  });
  it("four literal SQLs execute with exact OIDs and minimized output", async () => {
    const capture: {
      id: string;
      oids: number[];
      rows: number;
      hash: string;
    }[] = [];
    const original = pg.Client.prototype.query;
    const spy = vi.spyOn(pg.Client.prototype, "query");
    spy.mockImplementation(function (this: pg.Client, ...a: unknown[]) {
      const r = Reflect.apply(original, this, a);
      if (r && typeof r.then === "function")
        return r.then((result: pg.QueryResult) => {
          capture.push({
            id: String(a[0]),
            oids: result.fields.map((f) => f.dataTypeID),
            rows: result.rows.length,
            hash: digest(String(a[0])),
          });
          return result;
        });
      return r;
    } as typeof original);
    try {
      for (const op of operations) {
        const r = await observeLocal(args(op), input, {});
        expect(r.code).toBe("MRD_OK");
        expect(Object.keys(r)).toEqual([
          "contractVersion",
          "status",
          "code",
          "operationId",
          "elapsedMs",
          "l1SqlStrict",
          "data",
        ]);
      }
    } finally {
      spy.mockRestore();
    }
    expect(
      capture.every((c) => Object.values(catalogHashes).includes(c.hash)),
    ).toBe(true);
    expect(capture.length).toBe(10); // two prerequisite SELECTs; no duplicate selected prerequisite
    console.log(
      "MRD_SQL_METADATA",
      JSON.stringify(
        capture.map((c) => ({ hash: c.hash, oids: c.oids, rows: c.rows })),
      ),
    );
  });
  it("MRD-005/013 PUBLIC TEMP and native large-object capability remain visible without CLI effects", async () => {
    const before = await admin("SELECT count(*) FROM pg_largeobject_metadata;");
    const r = await run("PRIVILEGES_SUMMARY");
    expect(r.code).toBe(0);
    expect(r.result.data.signals.temp_capability).toBe(true);
    expect(r.result.data.signals.large_object_capability).toBe(true);
    expect(r.result.data.sqlCredentialStrictReadonly).toBe("NOT_PROVEN");
    expect(await admin("SELECT count(*) FROM pg_largeobject_metadata;")).toBe(
      before,
    );
    expect(r.stdout).not.toContain("READONLY_PROVEN");
    expect(r.result.l1SqlStrict).toBe("PENDENTE");
  });
  it("MRD-005/009 homonymous application objects never run", async () => {
    await admin(
      "CREATE SCHEMA decoy; CREATE TABLE decoy.sentinel(id int); CREATE FUNCTION decoy.current_database() RETURNS name LANGUAGE sql VOLATILE AS $$INSERT INTO decoy.sentinel VALUES(1) RETURNING 'wrong'::name$$; CREATE VIEW decoy.pg_stat_ssl AS SELECT 1 AS ignored;",
    );
    try {
      expect((await run("SERVER_METADATA")).code).toBe(0);
      expect(await admin("SELECT count(*) FROM decoy.sentinel;")).toBe("0");
    } finally {
      await admin("DROP SCHEMA decoy CASCADE;");
    }
  });
  it.each([
    [
      "superuser",
      "ALTER ROLE atlas_mrd_local SUPERUSER;",
      "ALTER ROLE atlas_mrd_local NOSUPERUSER;",
    ],
    [
      "bypassrls",
      "ALTER ROLE atlas_mrd_local BYPASSRLS;",
      "ALTER ROLE atlas_mrd_local NOBYPASSRLS;",
    ],
    [
      "createdb",
      "ALTER ROLE atlas_mrd_local CREATEDB;",
      "ALTER ROLE atlas_mrd_local NOCREATEDB;",
    ],
    [
      "createrole",
      "ALTER ROLE atlas_mrd_local CREATEROLE;",
      "ALTER ROLE atlas_mrd_local NOCREATEROLE;",
    ],
    [
      "replication",
      "ALTER ROLE atlas_mrd_local REPLICATION;",
      "ALTER ROLE atlas_mrd_local NOREPLICATION;",
    ],
    [
      "membership",
      "CREATE ROLE mrd_group; GRANT mrd_group TO atlas_mrd_local;",
      "REVOKE mrd_group FROM atlas_mrd_local; DROP ROLE mrd_group;",
    ],
    [
      "ownership",
      "CREATE TABLE public.owned(id int); ALTER TABLE public.owned OWNER TO atlas_mrd_local;",
      "DROP TABLE public.owned;",
    ],
    [
      "DML direct",
      "CREATE TABLE public.denied(id int); GRANT INSERT ON public.denied TO atlas_mrd_local;",
      "DROP TABLE public.denied;",
    ],
    [
      "DML PUBLIC",
      "CREATE TABLE public.denied(id int); GRANT UPDATE(id) ON public.denied TO PUBLIC;",
      "DROP TABLE public.denied;",
    ],
    [
      "DDL",
      "GRANT CREATE ON DATABASE atlas_mrd_g2 TO atlas_mrd_local;",
      "REVOKE CREATE ON DATABASE atlas_mrd_g2 FROM atlas_mrd_local;",
    ],
    [
      "sequence",
      "CREATE SEQUENCE public.counter; GRANT USAGE ON public.counter TO atlas_mrd_local;",
      "DROP SEQUENCE public.counter;",
    ],
    [
      "defaultACL",
      "ALTER DEFAULT PRIVILEGES GRANT INSERT ON TABLES TO atlas_mrd_local;",
      "ALTER DEFAULT PRIVILEGES REVOKE INSERT ON TABLES FROM atlas_mrd_local;",
    ],
    [
      "parameter",
      "GRANT SET ON PARAMETER session_replication_role TO atlas_mrd_local;",
      "REVOKE SET ON PARAMETER session_replication_role FROM atlas_mrd_local;",
    ],
  ])("MRD-002/009 denies %s", async (_name, setup, reset) => {
    await admin(setup);
    try {
      expect((await run()).result.code).toBe("MRD_IDENTITY_REJECTED");
    } finally {
      await admin(reset);
    }
    expect((await run()).code).toBe(0);
  });
  it("MRD-009/014 absent API roles yield null and explicit coverage; role/direct/PUBLIC grants distinguished", async () => {
    const source = readFileSync(
      resolve(
        "../../docs/05-engineering/integrations/MRD-G1-design-seguranca.md",
      ),
      "utf8",
    );
    const originals = [...source.matchAll(/```sql\r?\n([\s\S]*?)```/g)].map(
      (m) => m[1]!.replace(/\r\n/g, "\n").trim(),
    );
    const originalResult = await controlPool.query(originals[3]!);
    expect(originalResult.rows[1].api_relation_grant).toBe(false);
    for (const [i, id] of [
      "PING",
      "SERVER_METADATA",
      "PRIVILEGES_SUMMARY",
    ].entries())
      expect(digest(originals[i]!)).toBe(catalogHashes[id]);
    console.log(
      "MRD_G1_SCHEMA_ABSENT_API_ROLES_ORIGINAL_FALSE_CORRECTED_NULL_PENDING_REVIEW",
    );
    let r = await run("SCHEMA_EXPOSURE_SUMMARY");
    expect(r.code).toBe(0);
    expect(r.result.data.coverage).toBe("CATALOG_ONLY_API_ROLES_MISSING");
    expect(r.result.data.schemas[1].api_relation_grant).toBeNull();
    await admin(
      "CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE mrd_api_group; CREATE TABLE public.artificial(id int); GRANT SELECT ON public.artificial TO mrd_api_group; GRANT mrd_api_group TO anon;",
    );
    try {
      r = await run("SCHEMA_EXPOSURE_SUMMARY");
      expect(r.code).toBe(0);
      expect(r.result.data.schemas[1].api_relation_grant).toBe(true);
      await admin(
        "REVOKE mrd_api_group FROM anon; GRANT SELECT(id) ON public.artificial TO authenticated;",
      );
      expect(
        (await run("SCHEMA_EXPOSURE_SUMMARY")).result.data.schemas[1]
          .api_relation_grant,
      ).toBe(true);
      await admin(
        "REVOKE SELECT(id) ON public.artificial FROM authenticated; GRANT SELECT(id) ON public.artificial TO PUBLIC;",
      );
      r = await run("SCHEMA_EXPOSURE_SUMMARY");
      expect(r.result.data.schemas[1].public_relation_grant).toBe(true);
      expect(r.result.data.dataApiEvidence).toBe("UNVERIFIED");
      await admin(
        "CREATE SCHEMA identity; CREATE TABLE identity.artificial(id int); GRANT SELECT(id) ON identity.artificial TO PUBLIC;",
      );
      expect((await run("SCHEMA_EXPOSURE_SUMMARY")).result.code).toBe(
        "MRD_EXPOSURE_REVIEW_REQUIRED",
      );
    } finally {
      await admin(
        "DROP SCHEMA IF EXISTS identity CASCADE; DROP TABLE public.artificial; DROP OWNED BY anon,authenticated,mrd_api_group; DROP ROLE anon; DROP ROLE authenticated; DROP ROLE mrd_api_group;",
      );
    }
  });
  it("MRD-009/014 one missing API role remains indeterminate and identity refuses unknown", async () => {
    await admin("CREATE ROLE anon; CREATE SCHEMA identity;");
    try {
      expect((await run("SCHEMA_EXPOSURE_SUMMARY")).result.code).toBe(
        "MRD_EXPOSURE_REVIEW_REQUIRED",
      );
    } finally {
      await admin("DROP SCHEMA identity; DROP ROLE anon;");
    }
  });
  it("MRD-006/009 validates result shape, column OIDs and canary suppression", () => {
    for (const result of [
      {
        command: "SELECT",
        rows: [{ ok: 1, secret: "CANARY_FAKE_SECRET" }],
        fields: [{ name: "ok", dataTypeID: 23 }],
      },
      {
        command: "SELECT",
        rows: [{ ok: "CANARY_FAKE_SECRET" }],
        fields: [{ name: "ok", dataTypeID: 23 }],
      },
      {
        command: "SELECT",
        rows: [{ ok: 1 }],
        fields: [{ name: "ok", dataTypeID: 25 }],
      },
      {
        command: "SELECT",
        rows: [{ ok: 1 }, { ok: 1 }],
        fields: [{ name: "ok", dataTypeID: 23 }],
      },
    ])
      expect(() => projectResult("PING", result as pg.QueryResult)).toThrow(
        "MRD_RESULT_INVALID",
      );
    expect(
      JSON.stringify(
        envelope("PING", "MRD_RESULT_INVALID", 0, {
          secret: "CANARY_FAKE_SECRET",
        }),
      ),
    ).not.toContain("CANARY");
  });
  it("MRD-007 proves IP SAN then rejects real invalid CA and changed server SAN", async () => {
    const cert = new X509Certificate(readFileSync(join(root, "server.pem")));
    expect(cert.checkIP("127.0.0.1")).toBe("127.0.0.1");
    const original = readFileSync(join(root, "ca.pem"), "utf8");
    const manifest = readFileSync(context.manifestPath, "utf8");
    const openssl =
      process.platform === "win32"
        ? "C:/Program Files/Git/usr/bin/openssl.exe"
        : "openssl";
    const wrong = spawnSync(
      openssl,
      [
        "req",
        "-x509",
        "-newkey",
        "rsa:2048",
        "-nodes",
        "-keyout",
        join(root, "wrong.key"),
        "-out",
        join(root, "wrong.pem"),
        "-days",
        "2",
        "-subj",
        "/CN=Atlas-MRD-local-CA",
        "-addext",
        "basicConstraints=critical,CA:TRUE",
      ],
      { env: cleanEnv, encoding: "utf8", windowsHide: true },
    );
    expect(wrong.status).toBe(0);
    try {
      const wrongCa = readFileSync(join(root, "wrong.pem"), "utf8");
      writeFileSync(join(root, "ca.pem"), wrongCa);
      writeFileSync(
        context.manifestPath,
        JSON.stringify({ ...JSON.parse(manifest), caHash: digest(wrongCa) }),
      );
      expect((await run()).result.code).toBe("MRD_TLS_REJECTED");
    } finally {
      writeFileSync(join(root, "ca.pem"), original);
      writeFileSync(context.manifestPath, manifest);
    }
    const config = localConfiguration(input);
    const ssl = config.options.ssl as {
      checkServerIdentity: (name: string, cert: object) => Error | undefined;
    };
    expect(
      ssl.checkServerIdentity("127.0.0.1", {
        subjectaltname: "DNS:localhost",
        subject: { CN: "localhost" },
      }),
    ).toBeInstanceOf(Error);
  });
  it("MRD-008/010 execution lock refuses concurrency without removing foreign lock", async () => {
    const lock = join(root, "execution.lock");
    writeFileSync(lock, "owned-by-test", { flag: "wx", mode: 0o600 });
    try {
      expect((await run()).result.code).toBe("MRD_BUSY");
      expect(readFileSync(lock, "utf8")).toBe("owned-by-test");
    } finally {
      unlinkSync(lock);
    }
    expect((await run()).code).toBe(0);
  });
  it("MRD-007 real server SAN mismatch is refused without downgrade", async () => {
    const openssl =
      process.platform === "win32"
        ? "C:/Program Files/Git/usr/bin/openssl.exe"
        : "openssl";
    const command = (binary: string, a: string[]) => {
      const r = spawnSync(binary, a, {
        env: cleanEnv,
        encoding: "utf8",
        timeout: 30000,
        windowsHide: true,
      });
      expect(r.status).toBe(0);
    };
    command(openssl, [
      "req",
      "-new",
      "-key",
      join(root, "server.key"),
      "-out",
      join(root, "wrong-server.csr"),
      "-subj",
      "/CN=localhost",
      "-addext",
      "subjectAltName=DNS:localhost",
    ]);
    command(openssl, [
      "x509",
      "-req",
      "-in",
      join(root, "wrong-server.csr"),
      "-CA",
      join(root, "ca.pem"),
      "-CAkey",
      join(root, "ca.key"),
      "-CAcreateserial",
      "-out",
      join(root, "wrong-server.pem"),
      "-days",
      "2",
      "-copy_extensions",
      "copy",
    ]);
    const replace = (file: string) => {
      command("docker", [
        "cp",
        file,
        context.container + ":/var/lib/postgresql/data/server.pem",
      ]);
      command("docker", [
        "exec",
        "-u",
        "root",
        context.container,
        "chown",
        "postgres:postgres",
        "/var/lib/postgresql/data/server.pem",
      ]);
      command("docker", ["restart", context.container]);
    };
    try {
      replace(join(root, "wrong-server.pem"));
      await new Promise((r) => setTimeout(r, 500));
      expect((await run()).result.code).toBe("MRD_TLS_REJECTED");
    } finally {
      replace(join(root, "server.pem"));
      await new Promise((r) => setTimeout(r, 500));
    }
    expect((await run()).code).toBe(0);
  });
  it("MRD-008 real catalog lock times out, destroys socket, then recovers", async () => {
    const blocker = new pg.Client(adminOptions);
    await blocker.connect();
    await blocker.query("BEGIN");
    await blocker.query(
      "LOCK TABLE pg_catalog.pg_authid IN ACCESS EXCLUSIVE MODE",
    );
    try {
      const start = performance.now();
      expect((await run()).result.code).toBe("MRD_TIMEOUT");
      expect(performance.now() - start).toBeLessThan(15000);
    } finally {
      await blocker.query("ROLLBACK");
      await blocker.end();
    }
    expect((await run()).code).toBe(0);
    expect(
      await admin(
        "SELECT count(*) FROM pg_stat_activity WHERE application_name='atlas-mrd-local';",
      ),
    ).toBe("0");
  });
  it("MRD-008 initialization and audit failure never report success", async () => {
    const audit = join(root, "audit");
    const saved = join(root, "saved-audit");
    const { renameSync } = await import("node:fs");
    renameSync(audit, saved);
    writeFileSync(audit, "CANARY_FAKE_SECRET", { mode: 0o600 });
    try {
      expect((await run()).result.code).toBe("MRD_AUDIT_FAILED");
    } finally {
      unlinkSync(audit);
      renameSync(saved, audit);
    }
    expect((await run("PING", {})).code).not.toBe(0);
    expect((await run()).code).toBe(0);
  });
  it.each(["terminal-audit", "cleanup"])(
    "MRD-008 injected %s failure suppresses success and preserves foreign resources",
    async (kind) => {
      const original = pg.Client.prototype.query;
      let replacement: string | undefined;
      const spy = vi.spyOn(pg.Client.prototype, "query");
      spy.mockImplementation(function (this: pg.Client, ...a: unknown[]) {
        const result = Reflect.apply(original, this, a);
        if (
          result &&
          typeof result.then === "function" &&
          String(a[0]).startsWith("SELECT 1::")
        )
          return result.then((value: pg.QueryResult) => {
            if (kind === "cleanup") {
              replacement = join(root, "execution.lock");
              unlinkSync(replacement);
              mkdirSync(replacement);
            } else {
              const audit = join(root, "audit");
              const active = readdirSync(audit).find(
                (d) =>
                  existsSync(join(audit, d, "START.json")) &&
                  !existsSync(join(audit, d, "TERMINAL.json")),
              );
              if (!active) throw Error("TEST_AUDIT_INVOCATION_NOT_FOUND");
              replacement = join(audit, active, "TERMINAL.json");
              mkdirSync(replacement);
            }
            return value;
          });
        return result;
      } as typeof original);
      try {
        const r = await observeLocal(args("PING"), input, {});
        expect(r.code).toBe(
          kind === "cleanup" ? "MRD_CLEANUP_FAILED" : "MRD_AUDIT_FAILED",
        );
        expect(r.data).toBeNull();
        expect(replacement && existsSync(replacement)).toBe(true);
      } finally {
        spy.mockRestore();
        if (replacement) rmSync(replacement, { recursive: true });
      }
      expect((await run()).code).toBe(0);
      expect(
        await admin(
          "SELECT count(*) FROM pg_stat_activity WHERE application_name='atlas-mrd-local';",
        ),
      ).toBe("0");
    },
  );
  it("MRD-010 two actual CLI calls never execute concurrently", async () => {
    const blocker = new pg.Client(adminOptions);
    await blocker.connect();
    await blocker.query("BEGIN");
    await blocker.query(
      "LOCK TABLE pg_catalog.pg_authid IN ACCESS EXCLUSIVE MODE",
    );
    let first: ReturnType<typeof run> | undefined;
    try {
      first = run();
      const deadline = performance.now() + 2000;
      while (
        !existsSync(join(root, "execution.lock")) &&
        performance.now() < deadline
      )
        await new Promise((r) => setTimeout(r, 10));
      expect(existsSync(join(root, "execution.lock"))).toBe(true);
      expect((await run()).result.code).toBe("MRD_BUSY");
    } finally {
      await blocker.query("ROLLBACK");
      await blocker.end();
    }
    if (first) expect((await first).code).toBe(0);
  });
  it("MRD-008 interrupt aborts active query, destroys connection, then recovers", async () => {
    const blocker = new pg.Client(adminOptions);
    await blocker.connect();
    await blocker.query("BEGIN");
    await blocker.query(
      "LOCK TABLE pg_catalog.pg_authid IN ACCESS EXCLUSIVE MODE",
    );
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 150);
      try {
        expect(
          (await observeLocal(args("PING"), input, {}, controller.signal)).code,
        ).toBe("MRD_INTERRUPTED");
      } finally {
        clearTimeout(timer);
      }
    } finally {
      await blocker.query("ROLLBACK");
      await blocker.end();
    }
    expect((await run()).code).toBe(0);
  });
  it("MRD-005 privilege inquiry comma lists are OR, not AND; no native effect is executed", async () => {
    const config = localConfiguration(input);
    const client = new pg.Client(config.options);
    await client.connect();
    try {
      const r = await client.query(
        "SELECT has_database_privilege(current_database(),'CREATE') AS c, has_database_privilege(current_database(),'TEMP') AS t, has_database_privilege(current_database(),'CREATE,TEMP') AS either",
      );
      expect(r.rows).toEqual([{ c: false, t: true, either: true }]);
    } finally {
      await client.end();
    }
  });
  it("MRD-005/009 executable application functions, SECURITY DEFINER and delegated grants refuse", async () => {
    await admin(
      "CREATE FUNCTION public.mrd_danger() RETURNS integer LANGUAGE sql AS $$SELECT 1$$; GRANT EXECUTE ON FUNCTION public.mrd_danger() TO atlas_mrd_local;",
    );
    try {
      expect((await run()).result.code).toBe("MRD_IDENTITY_REJECTED");
    } finally {
      await admin("DROP FUNCTION public.mrd_danger();");
    }
    await admin(
      "CREATE FUNCTION pg_catalog.mrd_privileged_fixture() RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER AS $$SELECT 1$$;",
    );
    try {
      expect((await run()).result.code).toBe("MRD_IDENTITY_REJECTED");
    } finally {
      await admin("DROP FUNCTION pg_catalog.mrd_privileged_fixture();");
    }
    await admin(
      "GRANT CONNECT ON DATABASE atlas_mrd_g2 TO atlas_mrd_local WITH GRANT OPTION;",
    );
    try {
      expect((await run()).result.code).toBe("MRD_IDENTITY_REJECTED");
    } finally {
      await admin(
        "REVOKE GRANT OPTION FOR CONNECT ON DATABASE atlas_mrd_g2 FROM atlas_mrd_local;",
      );
    }
  });
  it("MRD-006/015 audit has exactly bounded START/TERMINAL and no secrets", () => {
    const audit = join(root, "audit");
    for (const d of readdirSync(audit))
      for (const f of readdirSync(join(audit, d))) {
        const text = readFileSync(join(audit, d, f), "utf8");
        expect(Buffer.byteLength(text)).toBeLessThanOrEqual(4096);
        expect(text).not.toContain(context.password);
        expect(text).not.toContain("CANARY_FAKE_SECRET");
        expect(["START", "TERMINAL"]).toContain(JSON.parse(text).event);
      }
    expect(Object.isFrozen(catalogHashes)).toBe(true);
    expect(Object.keys(catalogHashes)).toEqual([...operations]);
    const review = JSON.parse(
      readFileSync(resolve("test/mrd/catalog-review.json"), "utf8"),
    );
    expect(catalogHashes).toEqual(review.hashes);
  });
  it("MRD-011/015 rejects symlink manifest before connection", async () => {
    if (process.platform === "win32") {
      // NTFS junctions can be created without symlink privilege.
      const original = readFileSync(context.manifestPath, "utf8");
      unlinkSync(context.manifestPath);
      mkdirSync(context.manifestPath);
      try {
        expect((await run()).code).not.toBe(0);
      } finally {
        rmSync(context.manifestPath, { recursive: true });
        writeFileSync(context.manifestPath, original, { mode: 0o600 });
      }
    } else {
      const original = readFileSync(context.manifestPath, "utf8");
      unlinkSync(context.manifestPath);
      symlinkSync(join(root, "owner"), context.manifestPath);
      try {
        expect((await run()).code).not.toBe(0);
      } finally {
        unlinkSync(context.manifestPath);
        writeFileSync(context.manifestPath, original, { mode: 0o600 });
      }
    }
    expect(existsSync(join(root, "execution.lock"))).toBe(false);
  });
  it("MRD-016 remote path remains blocked in CI; no remote test substituted by skip", async () => {
    const r = await run(
      "PING",
      input,
      ["--profile=remote", "--consent-local=MRD-G2", "--operation=PING"],
      { ...cleanEnv, CI: "true" },
    );
    expect(r.result.code).toBe("MRD_REMOTE_DISABLED");
    console.log("MRD_REMOTE_014_016_BLOCKED_NO_AUTHORIZATION_NO_CLOUD_SOCKETS");
  });
});
