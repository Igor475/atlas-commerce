-- Disposable Docker fixture ONLY. Runtime has no table writes or privileged flags.
CREATE ROLE atlas_catalog_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 4;
GRANT CONNECT ON DATABASE atlas_catalog_cat01 TO atlas_catalog_runtime;
ALTER ROLE atlas_catalog_runtime SET statement_timeout='1500ms';
ALTER ROLE atlas_catalog_runtime SET default_transaction_read_only=on;
