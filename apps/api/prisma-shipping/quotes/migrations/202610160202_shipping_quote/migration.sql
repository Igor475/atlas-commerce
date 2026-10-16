BEGIN;
DO $$ BEGIN IF current_database()<>'atlas_catalog_cat01' OR current_user<>'atlas_quotes_migrator' OR current_setting('atlas.shipping_fixture',true) IS DISTINCT FROM 'atlas-ship01-disposable' OR current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999 THEN RAISE EXCEPTION 'SHIP_FIXTURE_REQUIRED'; END IF; END $$;
GRANT CREATE ON SCHEMA quotes TO atlas_quotes_executor;
CREATE FUNCTION quotes.shipping_physical_eligibility(p_actor uuid,p_physical jsonb,p_max int) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE item record; attrs quotes.fixture_physical;
BEGIN
 PERFORM quotes.assert_actor(p_actor);
 IF jsonb_typeof(p_physical) IS DISTINCT FROM 'array' OR jsonb_array_length(p_physical) NOT BETWEEN 1 AND 100 OR p_max IS NULL OR p_max NOT BETWEEN 1 AND 10000 THEN RAISE EXCEPTION 'SHIP_PHYSICAL_REQUIRED'; END IF;
 FOR item IN SELECT * FROM jsonb_to_recordset(p_physical) AS t(id uuid,quantity bigint) ORDER BY id LOOP
  IF item.quantity IS NULL OR item.quantity NOT BETWEEN 1 AND 2147483647 THEN RAISE EXCEPTION 'SHIP_PHYSICAL_REQUIRED'; END IF;
  SELECT * INTO attrs FROM quotes.fixture_physical WHERE product_id=item.id FOR SHARE;
  IF NOT FOUND OR attrs.purpose<>'TEST_ONLY' OR greatest(attrs.length_mm,attrs.width_mm,attrs.height_mm)>p_max THEN RAISE EXCEPTION 'SHIP_PHYSICAL_REQUIRED'; END IF;
 END LOOP;
 RETURN jsonb_build_object('purpose','TEST_ONLY','physicalDataComplete',true,'maxDimensionMm',p_max,'kitGrouping','PC04_PHYSICAL_COMPONENTS_TOGETHER','chargeScope','ORDER');
END $$;
-- Replaces only the laboratory resolver in this dedicated fixture. Historical SQL is unchanged.
CREATE OR REPLACE FUNCTION quotes.resolve_fixture_delivery(p_actor uuid,p_physical jsonb,p_address uuid,p_policy uuid,p_option text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result jsonb; expected_version int;
BEGIN
 result:=shipping.resolve(p_actor,p_physical,p_address,p_policy,p_option);
 SELECT version INTO expected_version FROM quotes.fixture_policy WHERE id=p_policy;
 -- The legacy quote FK/TTL fixture is a bridge, not a second source of Shipping prices.
 IF expected_version IS DISTINCT FROM (result->>'policyVersion')::int THEN RAISE EXCEPTION 'SHIP_POLICY_VERSION_MISMATCH'; END IF;
 RETURN result;
END $$;
CREATE FUNCTION quotes.project_shipping(p_actor uuid,p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE q jsonb; terms jsonb;
BEGIN
 PERFORM quotes.read_profile_reference(p_actor,p_id);q:=quotes.read_owned(p_actor,p_id);
 SELECT s.terms INTO terms FROM quotes.delivery_selection s WHERE quote_id=p_id;
 RETURN quotes.project(p_actor,p_id)||jsonb_build_object('subtotal',jsonb_build_object('currency','BRL','amountCents',q->'base_subtotal_cents'),'delivery',terms);
END $$;
CREATE FUNCTION quotes.issue_shipping(p_actor uuid,p_items jsonb,p_address uuid,p_policy uuid,p_option text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result jsonb;
BEGIN
 IF current_setting('atlas.shipping_fixture',true) IS DISTINCT FROM 'atlas-ship01-disposable' THEN RAISE EXCEPTION 'SHIP_FIXTURE_REQUIRED'; END IF;
 result:=quotes.issue_profile(p_actor,p_items,p_address,p_policy,p_option);
 RETURN quotes.project_shipping(p_actor,(result->>'quoteId')::uuid);
END $$;
ALTER FUNCTION quotes.shipping_physical_eligibility(uuid,jsonb,int) OWNER TO atlas_quotes_executor;
ALTER FUNCTION quotes.project_shipping(uuid,uuid) OWNER TO atlas_quotes_executor;
ALTER FUNCTION quotes.issue_shipping(uuid,jsonb,uuid,uuid,text) OWNER TO atlas_quotes_executor;
REVOKE CREATE ON SCHEMA quotes FROM atlas_quotes_executor;
REVOKE ALL ON FUNCTION quotes.shipping_physical_eligibility(uuid,jsonb,int),quotes.project_shipping(uuid,uuid),quotes.issue_shipping(uuid,jsonb,uuid,uuid,text) FROM PUBLIC;
GRANT USAGE ON SCHEMA quotes TO atlas_shipping_executor;
GRANT EXECUTE ON FUNCTION quotes.shipping_physical_eligibility(uuid,jsonb,int) TO atlas_shipping_executor;
REVOKE EXECUTE ON FUNCTION quotes.issue_profile(uuid,jsonb,uuid,uuid,text),quotes.project_profile(uuid,uuid) FROM atlas_quotes_actor_a,atlas_quotes_actor_b;
GRANT EXECUTE ON FUNCTION quotes.issue_shipping(uuid,jsonb,uuid,uuid,text),quotes.project_shipping(uuid,uuid) TO atlas_quotes_actor_a,atlas_quotes_actor_b;
COMMIT;
