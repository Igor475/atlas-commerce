BEGIN;
DO $$ BEGIN IF current_database()<>'atlas_catalog_cat01' OR current_user<>'atlas_pricing_migrator' OR current_setting('atlas.quotes_fixture',true) IS DISTINCT FROM 'atlas-qte01-disposable' THEN RAISE EXCEPTION 'QUOTE_FIXTURE_REQUIRED'; END IF;END $$;
GRANT USAGE ON SCHEMA pricing TO atlas_quotes_migrator,atlas_quotes_executor;
GRANT REFERENCES(id) ON pricing.price_revision TO atlas_quotes_migrator;
GRANT EXECUTE ON FUNCTION pricing.prepare_orders_prices(uuid[]) TO atlas_quotes_executor;
COMMIT;
