DO $$ BEGIN IF current_database()<>'atlas_catalog_cat01' OR current_user<>'atlas_catalog_migrator' OR current_setting('atlas.shipping_fixture',true) IS DISTINCT FROM 'atlas-ship01-disposable' THEN RAISE EXCEPTION 'SHIP_FIXTURE_REQUIRED'; END IF; END $$;
CREATE ROLE atlas_shipping_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE atlas_shipping_executor NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
GRANT atlas_shipping_executor TO atlas_shipping_migrator;
GRANT CREATE,CONNECT ON DATABASE atlas_catalog_cat01 TO atlas_shipping_migrator;
