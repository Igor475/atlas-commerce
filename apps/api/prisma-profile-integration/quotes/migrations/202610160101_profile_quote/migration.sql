BEGIN;
DO $$ BEGIN IF current_database()<>'atlas_catalog_cat01' OR current_user<>'atlas_quotes_migrator' OR current_setting('atlas.profile_integration',true) IS DISTINCT FROM 'atlas-cpint01-disposable' OR current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999 THEN RAISE EXCEPTION 'CPINT_FIXTURE_REQUIRED'; END IF; END $$;
CREATE TABLE quotes.profile_reference(
 quote_id uuid PRIMARY KEY,actor_id uuid NOT NULL,address_id uuid,address_version int,country text,postal_code text,
 FOREIGN KEY(quote_id,actor_id) REFERENCES quotes.quote(id,actor_id),
 FOREIGN KEY(address_id,actor_id) REFERENCES customer_profile.address(id,account_id),
 FOREIGN KEY(address_id,address_version) REFERENCES customer_profile.revision(address_id,version),
 CHECK((address_id IS NULL AND address_version IS NULL AND country IS NULL AND postal_code IS NULL) OR (address_id IS NOT NULL AND address_version IS NOT NULL AND country IS NOT NULL AND postal_code IS NOT NULL AND address_version>0 AND country='BR' AND postal_code ~ '^[0-9]{8}$'))
);
CREATE TRIGGER profile_reference_immutable BEFORE UPDATE OR DELETE ON quotes.profile_reference FOR EACH ROW EXECUTE FUNCTION quotes.immutable();
GRANT SELECT,INSERT ON quotes.profile_reference TO atlas_quotes_executor;
GRANT REFERENCES(quote_id) ON quotes.profile_reference TO atlas_orders_migrator;
GRANT CREATE ON SCHEMA quotes TO atlas_quotes_executor;
CREATE FUNCTION quotes.issue_profile(p_actor uuid,p_items jsonb,p_address uuid,p_policy uuid,p_option text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE resolved jsonb; postal jsonb; result jsonb;
BEGIN
 PERFORM customer_profile.assert_actor(p_actor);
 -- Catalog/Pricing and artificial delivery locks precede the postal address in both flows.
 resolved:=quotes.resolve(p_actor,p_items,p_address,p_policy,p_option);
 IF resolved->'delivery'<>'null'::jsonb THEN
  postal:=customer_profile.read_for_quote(p_actor,p_address);
  IF postal IS NULL OR (postal->>'addressId')::uuid IS DISTINCT FROM p_address OR (postal->>'addressVersion')::int IS NULL OR postal->>'country' IS DISTINCT FROM 'BR' OR postal->>'eligible' IS DISTINCT FROM 'true' OR postal->>'postalCode' IS NULL THEN RAISE EXCEPTION 'CPINT_CONTEXT_INVALID'; END IF;
 ELSIF p_address IS NOT NULL THEN RAISE EXCEPTION 'CPINT_ADDRESS_INAPPLICABLE';
 END IF;
 result:=quotes.issue(p_actor,p_items,p_address,p_policy,p_option);
 INSERT INTO quotes.profile_reference VALUES((result->>'quoteId')::uuid,p_actor,(postal->>'addressId')::uuid,(postal->>'addressVersion')::int,postal->>'country',postal->>'postalCode');
 RETURN result;
END $$;
CREATE FUNCTION quotes.read_profile_reference(p_actor uuid,p_quote uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE r quotes.profile_reference;
BEGIN
 PERFORM customer_profile.assert_actor(p_actor);PERFORM quotes.assert_actor(p_actor);
 SELECT * INTO r FROM quotes.profile_reference WHERE quote_id=p_quote AND actor_id=p_actor;
 IF NOT FOUND THEN RAISE EXCEPTION 'CPINT_RESOURCE_NOT_FOUND'; END IF;
 RETURN to_jsonb(r);
END $$;
CREATE FUNCTION quotes.project_profile(p_actor uuid,p_quote uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
 PERFORM quotes.read_profile_reference(p_actor,p_quote);RETURN quotes.project(p_actor,p_quote);
END $$;
ALTER FUNCTION quotes.issue_profile(uuid,jsonb,uuid,uuid,text) OWNER TO atlas_quotes_executor;
ALTER FUNCTION quotes.read_profile_reference(uuid,uuid) OWNER TO atlas_quotes_executor;
ALTER FUNCTION quotes.project_profile(uuid,uuid) OWNER TO atlas_quotes_executor;
REVOKE CREATE ON SCHEMA quotes FROM atlas_quotes_executor;
REVOKE ALL ON FUNCTION quotes.issue_profile(uuid,jsonb,uuid,uuid,text),quotes.read_profile_reference(uuid,uuid),quotes.project_profile(uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION quotes.read_profile_reference(uuid,uuid) TO atlas_orders_executor;
REVOKE EXECUTE ON FUNCTION quotes.issue(uuid,jsonb,uuid,uuid,text),quotes.project(uuid,uuid) FROM atlas_quotes_actor_a,atlas_quotes_actor_b;
GRANT EXECUTE ON FUNCTION quotes.issue_profile(uuid,jsonb,uuid,uuid,text),quotes.project_profile(uuid,uuid) TO atlas_quotes_actor_a,atlas_quotes_actor_b;
COMMIT;
