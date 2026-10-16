BEGIN;
DO $$ BEGIN IF current_database()<>'atlas_catalog_cat01' OR current_user<>'atlas_shipping_migrator' OR current_setting('atlas.shipping_fixture',true) IS DISTINCT FROM 'atlas-ship01-disposable' OR current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999 OR inet_server_port() IS DISTINCT FROM 5432 THEN RAISE EXCEPTION 'SHIP_FIXTURE_REQUIRED'; END IF; END $$;
CREATE SCHEMA shipping;
REVOKE ALL ON SCHEMA shipping FROM PUBLIC;
CREATE TABLE shipping.policy(id uuid PRIMARY KEY,purpose text NOT NULL CHECK(purpose='TEST_ONLY'),active boolean NOT NULL,current_version int NOT NULL CHECK(current_version>0));
CREATE TABLE shipping.revision(policy_id uuid NOT NULL REFERENCES shipping.policy(id),version int NOT NULL CHECK(version>0),state text NOT NULL CHECK(state IN ('DRAFT','SEALED')),country text NOT NULL CHECK(country='BR'),currency text NOT NULL CHECK(currency='BRL'),max_dimension_mm int NOT NULL CHECK(max_dimension_mm BETWEEN 1 AND 10000),PRIMARY KEY(policy_id,version));
ALTER TABLE shipping.policy ADD FOREIGN KEY(id,current_version) REFERENCES shipping.revision(policy_id,version) DEFERRABLE INITIALLY DEFERRED;
-- Inclusive textual bounds: eight ASCII digits sort identically to their numeric values.
CREATE TABLE shipping.zone(policy_id uuid NOT NULL,version int NOT NULL,id uuid NOT NULL,cep_from text COLLATE "C" NOT NULL CHECK(cep_from ~ '^[0-9]{8}$'),cep_to text COLLATE "C" NOT NULL CHECK(cep_to ~ '^[0-9]{8}$'),eligible boolean NOT NULL,option_id text NOT NULL CHECK(option_id ~ '^TEST_[A-Z_]{1,40}$'),amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 1 AND 9007199254740991),estimate_fixture jsonb,PRIMARY KEY(policy_id,version,id),FOREIGN KEY(policy_id,version) REFERENCES shipping.revision(policy_id,version),CHECK(cep_from<=cep_to),CHECK(estimate_fixture IS NULL OR (jsonb_typeof(estimate_fixture)='object' AND estimate_fixture ?& ARRAY['purpose','min','max','unit'] AND (estimate_fixture-ARRAY['purpose','min','max','unit'])='{}'::jsonb AND estimate_fixture->>'purpose'='TEST_ONLY' AND estimate_fixture->>'unit'='TEST_ONLY_UNAPPROVED_UNIT' AND jsonb_typeof(estimate_fixture->'min')='number' AND jsonb_typeof(estimate_fixture->'max')='number' AND (estimate_fixture->>'min')::numeric BETWEEN 1 AND 100 AND (estimate_fixture->>'max')::numeric BETWEEN (estimate_fixture->>'min')::numeric AND 100 AND (estimate_fixture->>'min')::numeric=trunc((estimate_fixture->>'min')::numeric) AND (estimate_fixture->>'max')::numeric=trunc((estimate_fixture->>'max')::numeric))));
CREATE FUNCTION shipping.guard_zone() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE s text;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'SHIP_IMMUTABLE'; END IF;
 -- Serializes inserts and sealing per revision, including concurrent overlapping ranges.
 SELECT state INTO s FROM shipping.revision WHERE policy_id=NEW.policy_id AND version=NEW.version FOR UPDATE;
 IF s IS DISTINCT FROM 'DRAFT' THEN RAISE EXCEPTION 'SHIP_VERSION_SEALED'; END IF;
 IF EXISTS(SELECT 1 FROM shipping.zone WHERE policy_id=NEW.policy_id AND version=NEW.version AND cep_from<=NEW.cep_to AND cep_to>=NEW.cep_from) THEN RAISE EXCEPTION 'SHIP_ZONE_OVERLAP'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER zone_guard BEFORE INSERT OR UPDATE OR DELETE ON shipping.zone FOR EACH ROW EXECUTE FUNCTION shipping.guard_zone();
CREATE FUNCTION shipping.guard_revision() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
 IF TG_OP='INSERT' THEN IF NEW.state<>'DRAFT' THEN RAISE EXCEPTION 'SHIP_DRAFT_REQUIRED'; END IF; RETURN NEW; END IF;
 IF TG_OP='DELETE' OR OLD.state<>'DRAFT' OR NEW.state<>'SEALED' OR (to_jsonb(OLD)-'state')<>(to_jsonb(NEW)-'state') OR NOT EXISTS(SELECT 1 FROM shipping.zone WHERE policy_id=OLD.policy_id AND version=OLD.version) THEN RAISE EXCEPTION 'SHIP_IMMUTABLE'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER revision_guard BEFORE INSERT OR UPDATE OR DELETE ON shipping.revision FOR EACH ROW EXECUTE FUNCTION shipping.guard_revision();
CREATE FUNCTION shipping.guard_policy() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
 IF TG_OP='DELETE' OR NEW.purpose<>'TEST_ONLY' THEN RAISE EXCEPTION 'SHIP_IMMUTABLE'; END IF;
 IF TG_OP='UPDATE' AND (NEW.id<>OLD.id OR NEW.purpose<>OLD.purpose OR NEW.current_version<OLD.current_version) THEN RAISE EXCEPTION 'SHIP_IMMUTABLE'; END IF;
 IF NEW.active AND NOT EXISTS(SELECT 1 FROM shipping.revision WHERE policy_id=NEW.id AND version=NEW.current_version AND state='SEALED') THEN RAISE EXCEPTION 'SHIP_INCOMPLETE_POLICY'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER policy_guard BEFORE INSERT OR UPDATE OR DELETE ON shipping.policy FOR EACH ROW EXECUTE FUNCTION shipping.guard_policy();
CREATE FUNCTION shipping.resolve(p_actor uuid,p_physical jsonb,p_address uuid,p_policy uuid,p_option text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE postal jsonb; p shipping.policy; r shipping.revision; z shipping.zone; matches int; eligibility jsonb;
BEGIN
 IF current_database()<>'atlas_catalog_cat01' OR current_setting('atlas.shipping_fixture',true) IS DISTINCT FROM 'atlas-ship01-disposable' THEN RAISE EXCEPTION 'SHIP_FIXTURE_REQUIRED'; END IF;
 IF p_physical IS NULL OR jsonb_typeof(p_physical)<>'array' OR jsonb_array_length(p_physical)<1 THEN RAISE EXCEPTION 'SHIP_PHYSICAL_REQUIRED'; END IF;
 postal:=customer_profile.read_for_quote(p_actor,p_address);
 IF postal->>'eligible' IS DISTINCT FROM 'true' OR postal->>'postalCode' IS NULL OR (postal->>'postalCode') !~ '^[0-9]{8}$' THEN RAISE EXCEPTION 'SHIP_ADDRESS_REQUIRED'; END IF;
 SELECT * INTO p FROM shipping.policy WHERE id=p_policy FOR SHARE;
 IF NOT FOUND OR NOT p.active OR p.purpose<>'TEST_ONLY' THEN RAISE EXCEPTION 'SHIP_POLICY_REQUIRED'; END IF;
 SELECT * INTO r FROM shipping.revision WHERE policy_id=p.id AND version=p.current_version FOR SHARE;
 IF NOT FOUND OR r.state<>'SEALED' OR r.country IS DISTINCT FROM postal->>'country' OR r.currency<>'BRL' THEN RAISE EXCEPTION 'SHIP_POLICY_REQUIRED'; END IF;
 SELECT count(*) INTO matches FROM shipping.zone WHERE policy_id=p.id AND version=r.version AND cep_from<=postal->>'postalCode' COLLATE "C" AND cep_to>=postal->>'postalCode' COLLATE "C";
 IF matches<>1 THEN RAISE EXCEPTION 'SHIP_ZONE_UNAVAILABLE'; END IF;
 SELECT * INTO STRICT z FROM shipping.zone WHERE policy_id=p.id AND version=r.version AND cep_from<=postal->>'postalCode' COLLATE "C" AND cep_to>=postal->>'postalCode' COLLATE "C";
 IF NOT z.eligible OR z.option_id IS DISTINCT FROM p_option THEN RAISE EXCEPTION 'SHIP_OPTION_UNAVAILABLE'; END IF;
 eligibility:=quotes.shipping_physical_eligibility(p_actor,p_physical,r.max_dimension_mm);
 RETURN jsonb_build_object('purpose','TEST_ONLY','policyId',p.id,'policyVersion',r.version,'zoneId',z.id,'option',z.option_id,'currency',r.currency,'amountCents',z.amount_cents,'addressId',p_address,'addressVersion',postal->'addressVersion','country',postal->'country','postalCode',postal->'postalCode','eligibility',eligibility,'estimateFixture',z.estimate_fixture);
END $$;
GRANT USAGE ON SCHEMA shipping TO atlas_shipping_executor,atlas_quotes_executor,atlas_quotes_migrator,atlas_orders_migrator;
GRANT SELECT ON ALL TABLES IN SCHEMA shipping TO atlas_shipping_executor;
GRANT UPDATE(id) ON shipping.policy TO atlas_shipping_executor;
GRANT UPDATE(policy_id) ON shipping.revision TO atlas_shipping_executor;
GRANT REFERENCES(policy_id,version,id) ON shipping.zone TO atlas_orders_migrator;
GRANT CREATE ON SCHEMA shipping TO atlas_shipping_executor;
ALTER FUNCTION shipping.resolve(uuid,jsonb,uuid,uuid,text) OWNER TO atlas_shipping_executor;
REVOKE CREATE ON SCHEMA shipping FROM atlas_shipping_executor;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA shipping FROM PUBLIC;
GRANT EXECUTE ON FUNCTION shipping.resolve(uuid,jsonb,uuid,uuid,text) TO atlas_quotes_executor;
COMMIT;
