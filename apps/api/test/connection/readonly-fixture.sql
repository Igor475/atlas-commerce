-- Explicit local test setup only. Not a migration or a Supabase role script.
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='atlas_probe_readonly') THEN
  CREATE ROLE atlas_probe_readonly LOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
 END IF;
END $$;
REVOKE TEMPORARY, CREATE ON DATABASE atlas_spike_f0404 FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA IF NOT EXISTS probe_fixture;
REVOKE ALL ON SCHEMA probe_fixture FROM PUBLIC;
CREATE TABLE IF NOT EXISTS probe_fixture.marker (id integer PRIMARY KEY, value integer NOT NULL);
INSERT INTO probe_fixture.marker VALUES (1,7) ON CONFLICT (id) DO NOTHING;
GRANT CONNECT ON DATABASE atlas_spike_f0404 TO atlas_probe_readonly;
GRANT USAGE ON SCHEMA probe_fixture TO atlas_probe_readonly;
GRANT SELECT ON probe_fixture.marker TO atlas_probe_readonly;
ALTER ROLE atlas_probe_readonly SET default_transaction_read_only=on;
