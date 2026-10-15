-- Only the own integrated disposable fixture. Catalog's existing initialization is unchanged.
CREATE ROLE atlas_pricing_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE atlas_pricing_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 4;
GRANT CONNECT,CREATE ON DATABASE atlas_catalog_cat01 TO atlas_pricing_migrator;
GRANT CONNECT ON DATABASE atlas_catalog_cat01 TO atlas_pricing_runtime;
ALTER ROLE atlas_pricing_runtime SET statement_timeout='1500ms';
ALTER ROLE atlas_pricing_runtime SET default_transaction_read_only=on;
