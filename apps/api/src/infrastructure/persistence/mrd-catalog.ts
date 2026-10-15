// Private SQL registry: not exported or loaded from runtime files.
import type { PoolClient } from "pg";
import type { Operation } from "./mrd-contract.js";
import { createHash } from "node:crypto";
const sql = Object.freeze({
  PING: `SELECT 1::pg_catalog.int4 AS ok;`,
  SERVER_METADATA: `SELECT pg_catalog.current_database() AS database_name,
       current_user AS effective_role,
       session_user AS login_role,
       pg_catalog.current_setting('server_version_num')::pg_catalog.int4 AS version_num,
       pg_catalog.current_setting('default_transaction_read_only')::pg_catalog.bool AS default_readonly,
       s.ssl AS tls,
       s.version AS tls_version
FROM (VALUES (1)) AS seed(n)
LEFT JOIN pg_catalog.pg_stat_ssl AS s
  ON s.pid = pg_catalog.pg_backend_pid();`,
  PRIVILEGES_SUMMARY: `SELECT r.rolcanlogin AS can_login,
       (r.rolsuper OR r.rolbypassrls OR r.rolcreatedb OR
        r.rolcreaterole OR r.rolreplication) AS elevated_flags,
       EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members AS m
               WHERE m.member = r.oid OR m.roleid = r.oid) AS membership,
       EXISTS (SELECT 1 FROM pg_catalog.pg_shdepend AS d
               WHERE d.refobjid = r.oid AND d.deptype = 'o') AS ownership,
       pg_catalog.has_database_privilege(pg_catalog.current_database(),
         'CREATE,CONNECT WITH GRANT OPTION') AS database_delegation,
       pg_catalog.has_database_privilege(pg_catalog.current_database(),
         'TEMP') AS temp_capability,
       EXISTS (SELECT 1 FROM pg_catalog.pg_namespace AS n
               WHERE pg_catalog.has_schema_privilege(n.oid,
                 'CREATE,USAGE WITH GRANT OPTION')) AS schema_delegation,
       EXISTS (SELECT 1 FROM pg_catalog.pg_class AS c
               JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
               WHERE n.nspname NOT IN ('pg_catalog','information_schema')
                 AND c.relkind IN ('r','p','v','m','f')
                 AND (pg_catalog.has_table_privilege(c.oid,
                   'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER,SELECT WITH GRANT OPTION')
                   OR pg_catalog.has_any_column_privilege(c.oid,
                     'INSERT,UPDATE,REFERENCES,SELECT WITH GRANT OPTION'))) AS non_system_relation_risk,
       EXISTS (SELECT 1 FROM pg_catalog.pg_class AS c
               WHERE CASE WHEN c.relkind = 'S' THEN
                 pg_catalog.has_sequence_privilege(c.oid,
                   'USAGE,UPDATE,SELECT WITH GRANT OPTION') ELSE false END) AS sequence_risk,
       EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS p
               JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
               WHERE pg_catalog.has_function_privilege(p.oid,'EXECUTE')
                 AND pg_catalog.has_schema_privilege(n.oid,'USAGE')
                 AND (p.prosecdef OR n.nspname NOT IN ('pg_catalog','information_schema')
                   OR pg_catalog.has_function_privilege(p.oid,
                     'EXECUTE WITH GRANT OPTION'))) AS executable_function_risk,
       EXISTS (SELECT 1 FROM pg_catalog.pg_proc AS p
               JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
               WHERE n.nspname = 'pg_catalog' AND p.provolatile = 'v'
                 AND pg_catalog.has_function_privilege(p.oid,'EXECUTE')) AS native_volatile_capability,
       pg_catalog.has_function_privilege(
         'pg_catalog.lo_create(oid)'::pg_catalog.regprocedure,
         'EXECUTE') AS large_object_capability,
       EXISTS (SELECT 1 FROM pg_catalog.pg_parameter_acl AS p,
                 LATERAL pg_catalog.aclexplode(p.paracl) AS a
               WHERE a.grantee IN (0,r.oid)) AS parameter_acl,
       EXISTS (SELECT 1 FROM pg_catalog.pg_default_acl AS d,
                 LATERAL pg_catalog.aclexplode(d.defaclacl) AS a
               WHERE a.grantee IN (0,r.oid)
                 AND (a.privilege_type <> 'SELECT' OR a.is_grantable)) AS default_acl_risk
FROM pg_catalog.pg_roles AS r
WHERE r.rolname = current_user;`,
  SCHEMA_EXPOSURE_SUMMARY: `SELECT target.name AS schema_name,
       (n.oid IS NOT NULL) AS present,
       CASE WHEN n.oid IS NULL THEN NULL ELSE EXISTS (
         SELECT 1 FROM pg_catalog.pg_class AS c
         WHERE c.relnamespace = n.oid
           AND c.relkind IN ('r','p','v','m','f')) END AS has_relations,
       CASE WHEN n.oid IS NULL THEN NULL ELSE EXISTS (
         SELECT 1 FROM pg_catalog.pg_class AS c,
           LATERAL pg_catalog.aclexplode(COALESCE(c.relacl,
             pg_catalog.acldefault('r',c.relowner))) AS a
         WHERE c.relnamespace = n.oid
           AND c.relkind IN ('r','p','v','m','f')
           AND a.grantee = 0
         UNION ALL
         SELECT 1 FROM pg_catalog.pg_class AS c
         JOIN pg_catalog.pg_attribute AS col ON col.attrelid = c.oid,
           LATERAL pg_catalog.aclexplode(col.attacl) AS a
         WHERE c.relnamespace = n.oid
           AND c.relkind IN ('r','p','v','m','f')
           AND col.attnum > 0 AND NOT col.attisdropped
           AND a.grantee = 0) END AS public_relation_grant,
       CASE WHEN n.oid IS NULL OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='anon') OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='authenticated') THEN NULL ELSE EXISTS (
         SELECT 1 FROM pg_catalog.pg_class AS c
         JOIN pg_catalog.pg_roles AS api
           ON api.rolname IN ('anon','authenticated')
         WHERE c.relnamespace = n.oid
           AND c.relkind IN ('r','p','v','m','f')
           AND (pg_catalog.has_table_privilege(api.oid,c.oid,
             'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
             OR pg_catalog.has_any_column_privilege(api.oid,c.oid,
               'SELECT,INSERT,UPDATE,REFERENCES'))) END AS api_relation_grant,
       (EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='anon') AND EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname='authenticated')) AS api_roles_present
FROM (VALUES ('identity'::pg_catalog.text),
             ('public'::pg_catalog.text)) AS target(name)
LEFT JOIN pg_catalog.pg_namespace AS n ON n.nspname = target.name
ORDER BY target.name;`,
});
export const catalogHashes = Object.freeze(
  Object.fromEntries(
    Object.entries(sql).map(([id, text]) => [
      id,
      createHash("sha256").update(text).digest("hex"),
    ]),
  ),
);
// Only executor imports this function. No caller-supplied SQL or pool options.
export async function fixedQuery(client: PoolClient, id: Operation) {
  return client.query(sql[id]);
}
