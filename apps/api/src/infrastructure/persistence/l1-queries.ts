// Complete diagnostic allowlist. No caller-supplied SQL or application data.
// PG17 pg_settings UPDATE and its native set_config are session SET interfaces.
// Only their bootstrap-owned builtins qualify; elevated SET ACLs remain denied.
export const l1Queries = Object.freeze({
  server: `SELECT current_user AS role, session_user AS login,
    pg_catalog.current_database() AS database, pg_catalog.current_setting('server_version') AS version,
    pg_catalog.current_setting('default_transaction_read_only') AS readonly,
    pg_catalog.current_setting('pgrst.db_schemas',true) AS exposed,
    s.ssl,s.version AS tls_version,s.cipher
    FROM pg_catalog.pg_stat_ssl s WHERE s.pid=pg_catalog.pg_backend_pid()`,
  role: `SELECT r.rolcanlogin AS canlogin,
    (r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolbypassrls OR r.rolreplication
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_auth_members m WHERE m.member=r.oid OR m.roleid=r.oid)
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_shdepend d WHERE d.refobjid=r.oid AND d.deptype='o')
    OR pg_catalog.has_database_privilege(pg_catalog.current_database(),'CREATE,TEMP,CONNECT WITH GRANT OPTION')
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_namespace n WHERE pg_catalog.has_schema_privilege(n.oid,'CREATE,USAGE WITH GRANT OPTION'))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_class c WHERE c.relkind IN ('r','p','v','m','f')
      AND (pg_catalog.has_table_privilege(c.oid,'INSERT,DELETE,TRUNCATE,REFERENCES,TRIGGER,SELECT WITH GRANT OPTION')
        OR pg_catalog.has_any_column_privilege(c.oid,'INSERT,REFERENCES,SELECT WITH GRANT OPTION')
        OR ((pg_catalog.has_table_privilege(c.oid,'UPDATE')
          OR pg_catalog.has_any_column_privilege(c.oid,'UPDATE'))
          AND NOT (c.oid='pg_catalog.pg_settings'::pg_catalog.regclass
            AND c.oid < 16384 AND c.relkind='v' AND c.relowner=10
            AND pg_catalog.current_setting('server_version_num')::integer / 10000 = 17))))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_class c WHERE CASE WHEN c.relkind='S'
      THEN pg_catalog.has_sequence_privilege(c.oid,'SELECT,USAGE,UPDATE') ELSE false END)
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_proc p JOIN pg_catalog.pg_namespace n ON n.oid=p.pronamespace
      WHERE pg_catalog.has_function_privilege(p.oid,'EXECUTE')
      AND (n.nspname NOT IN ('pg_catalog','information_schema') OR p.prosecdef
        OR pg_catalog.has_function_privilege(p.oid,'EXECUTE WITH GRANT OPTION')
        OR (n.nspname='pg_catalog' AND p.provolatile='v'
          AND NOT (p.oid='pg_catalog.set_config(text,text,boolean)'::pg_catalog.regprocedure
            AND p.oid < 16384 AND p.proowner=10 AND p.prolang=12
            AND pg_catalog.current_setting('server_version_num')::integer / 10000 = 17))))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_default_acl d,
      LATERAL pg_catalog.aclexplode(d.defaclacl) a WHERE a.grantee IN (0,r.oid)
      AND a.privilege_type <> 'SELECT')
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_parameter_acl d,
      LATERAL pg_catalog.aclexplode(d.paracl) a WHERE a.grantee IN (0,r.oid))
    OR EXISTS (SELECT 1 FROM pg_catalog.pg_db_role_setting d,
      LATERAL pg_catalog.unnest(d.setconfig) setting WHERE d.setrole IN (0,r.oid)
      AND d.setdatabase IN (0,(SELECT oid FROM pg_catalog.pg_database WHERE datname=pg_catalog.current_database()))
      AND setting <> 'default_transaction_read_only=on')) AS unsafe
    FROM pg_catalog.pg_roles r WHERE r.rolname=current_user`,
  schemas: `SELECT n.nspname AS schema,
    pg_catalog.has_schema_privilege(n.oid,'USAGE') AS usage,
    pg_catalog.has_schema_privilege(n.oid,'CREATE') AS create
    FROM pg_catalog.pg_namespace n WHERE n.nspname IN ('public','identity') ORDER BY 1`,
  exposure: `SELECT n.nspname AS schema,c.relname AS relation,c.relkind,c.relrowsecurity AS rls,
    c.relforcerowsecurity AS force_rls,
    EXISTS (SELECT 1 FROM pg_catalog.aclexplode(COALESCE(c.relacl,pg_catalog.acldefault('r',c.relowner))) a
      WHERE a.grantee=0) AS public_grant,
    EXISTS (SELECT 1 FROM pg_catalog.pg_roles r WHERE r.rolname IN ('anon','authenticated')
      AND pg_catalog.has_table_privilege(r.oid,c.oid,'SELECT,INSERT,UPDATE,DELETE')) AS api_grant
    FROM pg_catalog.pg_class c JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
    WHERE c.relkind IN ('r','p','v','m','f')
      AND (n.nspname IN ('identity','public') OR n.nspname=ANY($1::text[])) ORDER BY 1,2`,
  ping: "SELECT 1 AS ok",
});
