BEGIN;
DO $$ BEGIN IF current_database()<>'atlas_catalog_cat01' OR current_user<>'atlas_catalog_migrator' OR current_setting('atlas.quotes_fixture',true) IS DISTINCT FROM 'atlas-qte01-disposable' THEN RAISE EXCEPTION 'QUOTE_FIXTURE_REQUIRED'; END IF;END $$;
GRANT USAGE ON SCHEMA catalog TO atlas_quotes_migrator,atlas_quotes_executor;
GRANT REFERENCES(id) ON catalog.product,catalog.edition TO atlas_quotes_migrator;
GRANT EXECUTE ON FUNCTION catalog.prepare_orders_snapshot(uuid[]) TO atlas_quotes_executor;
COMMIT;
