-- Only own disposable Catalog/Pricing/Inventory fixture.
CREATE ROLE atlas_inventory_executor NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE atlas_inventory_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT atlas_inventory_executor TO atlas_inventory_migrator;
CREATE ROLE atlas_inventory_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 5;
-- Fixture-only financial decision simulator identity; never part of commercial composition.
CREATE ROLE atlas_inventory_decider LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 4;
GRANT CONNECT,CREATE ON DATABASE atlas_catalog_cat01 TO atlas_inventory_migrator;
GRANT CONNECT ON DATABASE atlas_catalog_cat01 TO atlas_inventory_runtime,atlas_inventory_decider;
ALTER ROLE atlas_inventory_runtime SET statement_timeout='2500ms';
ALTER ROLE atlas_inventory_runtime SET lock_timeout='1500ms';
ALTER ROLE atlas_inventory_decider SET statement_timeout='2500ms';
ALTER ROLE atlas_inventory_decider SET lock_timeout='1500ms';
