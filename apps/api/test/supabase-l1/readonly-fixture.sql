-- LOCAL disposable fixture only. Never run on Supabase.
CREATE ROLE atlas_l1_readonly LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
REVOKE CREATE,TEMP ON DATABASE atlas_spike_f0404 FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
-- PostgreSQL grants UPDATE on the pg_settings view to PUBLIC by default.
-- The diagnostic is deliberately conservative; this change is fixture-only.
REVOKE UPDATE ON pg_catalog.pg_settings FROM PUBLIC;
CREATE SCHEMA identity;
REVOKE ALL ON SCHEMA identity FROM PUBLIC;
CREATE TABLE identity.empty_fixture (id integer PRIMARY KEY, value integer);
CREATE SEQUENCE identity.empty_sequence;
GRANT CONNECT ON DATABASE atlas_spike_f0404 TO atlas_l1_readonly;
GRANT USAGE ON SCHEMA identity TO atlas_l1_readonly;
GRANT SELECT ON identity.empty_fixture TO atlas_l1_readonly;
ALTER ROLE atlas_l1_readonly SET default_transaction_read_only=on;
-- Conservative diagnostic policy: revoke all volatile builtins for PUBLIC in
-- this disposable DB. No equivalent provider mutation is authorized by INT-02.
DO $$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='pg_catalog' AND p.provolatile='v' AND p.proname <> 'pg_backend_pid'
 LOOP EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC',f.signature); END LOOP;
END $$;
