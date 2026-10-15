-- Disposable fixture only. No passwords; loopback Docker trust, never provider roles.
DO $$ BEGIN
 IF current_database()<>'atlas_catalog_cat01' OR current_user<>'atlas_catalog_migrator' OR current_setting('atlas.orders_fixture',true) IS DISTINCT FROM 'atlas-ord01-disposable' THEN RAISE EXCEPTION 'ORDERS_FIXTURE_REQUIRED'; END IF;
END $$;
CREATE ROLE atlas_orders_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE atlas_orders_executor NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE atlas_catalog_orders_reader NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE atlas_pricing_orders_reader NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE atlas_orders_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 3;
CREATE ROLE atlas_orders_actor_a LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 6;
CREATE ROLE atlas_orders_actor_b LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 6;
GRANT atlas_orders_executor TO atlas_orders_migrator;
GRANT atlas_pricing_orders_reader TO atlas_pricing_migrator;
GRANT CREATE ON DATABASE atlas_catalog_cat01 TO atlas_orders_migrator;
ALTER ROLE atlas_orders_actor_a SET statement_timeout='2500ms';
ALTER ROLE atlas_orders_actor_b SET statement_timeout='2500ms';
ALTER ROLE atlas_orders_runtime SET statement_timeout='2500ms';
