BEGIN;
DO $$ BEGIN IF current_database()<>'atlas_catalog_cat01' OR current_user<>'atlas_profile_migrator' OR current_setting('atlas.shipping_fixture',true) IS DISTINCT FROM 'atlas-ship01-disposable' OR current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999 THEN RAISE EXCEPTION 'SHIP_FIXTURE_REQUIRED'; END IF; END $$;
GRANT USAGE ON SCHEMA customer_profile TO atlas_shipping_executor;
GRANT EXECUTE ON FUNCTION customer_profile.read_for_quote(uuid,uuid) TO atlas_shipping_executor;
COMMIT;
