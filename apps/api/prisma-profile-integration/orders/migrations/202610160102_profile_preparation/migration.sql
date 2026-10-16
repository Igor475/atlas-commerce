BEGIN;
DO $$ BEGIN IF current_database()<>'atlas_catalog_cat01' OR current_user<>'atlas_orders_migrator' OR current_setting('atlas.profile_integration',true) IS DISTINCT FROM 'atlas-cpint01-disposable' OR current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999 THEN RAISE EXCEPTION 'CPINT_FIXTURE_REQUIRED'; END IF; END $$;
CREATE TABLE orders.profile_address_snapshot(
 preparation_id uuid PRIMARY KEY REFERENCES orders.preparation(id) DEFERRABLE INITIALLY DEFERRED,
 actor_id uuid NOT NULL REFERENCES orders.fixture_principal(actor_id),address_id uuid NOT NULL,address_version int NOT NULL,
 purpose text NOT NULL CHECK(purpose='TEST_ONLY'),recipient text NOT NULL,country text NOT NULL CHECK(country='BR'),postal_code text NOT NULL CHECK(postal_code ~ '^[0-9]{8}$'),region text NOT NULL,city text NOT NULL,district text NOT NULL,street text NOT NULL,number text NOT NULL,complement text,
 FOREIGN KEY(address_id,actor_id) REFERENCES customer_profile.address(id,account_id),
 FOREIGN KEY(address_id,address_version) REFERENCES customer_profile.revision(address_id,version)
);
CREATE TABLE orders.profile_evidence(preparation_id uuid PRIMARY KEY REFERENCES orders.preparation(id),quote_id uuid NOT NULL REFERENCES quotes.profile_reference(quote_id),profile_pid int NOT NULL,profile_xid xid8 NOT NULL);
CREATE TRIGGER profile_snapshot_immutable BEFORE UPDATE OR DELETE ON orders.profile_address_snapshot FOR EACH ROW EXECUTE FUNCTION orders.immutable();
CREATE TRIGGER profile_evidence_immutable BEFORE UPDATE OR DELETE ON orders.profile_evidence FOR EACH ROW EXECUTE FUNCTION orders.immutable();
GRANT SELECT,INSERT ON orders.profile_address_snapshot,orders.profile_evidence TO atlas_orders_executor;
GRANT CREATE ON SCHEMA orders TO atlas_orders_executor;
CREATE FUNCTION orders.read_profile_preparation(p_actor uuid,p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result jsonb; snap jsonb;
BEGIN
 PERFORM customer_profile.assert_actor(p_actor);
 result:=orders.read_preparation(p_actor,p_id);
 IF NOT EXISTS(SELECT 1 FROM orders.profile_evidence WHERE preparation_id=p_id) THEN RAISE EXCEPTION 'CPINT_RESOURCE_NOT_FOUND'; END IF;
 SELECT jsonb_build_object('addressId',address_id,'addressVersion',address_version,'purpose',purpose,'postalAddress',jsonb_build_object('recipient',recipient,'country',country,'postalCode',postal_code,'region',region,'city',city,'district',district,'street',street,'number',number,'complement',complement)) INTO snap FROM orders.profile_address_snapshot WHERE preparation_id=p_id AND actor_id=p_actor;
 IF ((result->>'reservationExpiresAt') IS NULL) IS DISTINCT FROM (snap IS NULL) THEN RAISE EXCEPTION 'CPINT_CONTEXT_INVALID'; END IF;
 RETURN jsonb_build_object('preparation',result,'addressSnapshot',snap);
END $$;
CREATE FUNCTION orders.prepare_profile_quote(p_actor uuid,p_key uuid,p_quote uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE q jsonb; ref jsonb; snap jsonb; postal jsonb; result jsonb; existing orders.request; prep_id uuid;
BEGIN
 PERFORM customer_profile.assert_actor(p_actor);PERFORM orders.assert_fixture_actor(p_actor);
 q:=quotes.read_owned(p_actor,p_quote);ref:=quotes.read_profile_reference(p_actor,p_quote);
 IF ((q->>'delivery_cents') IS NULL) IS DISTINCT FROM ((ref->>'address_id') IS NULL) THEN RAISE EXCEPTION 'CPINT_CONTEXT_INVALID'; END IF;
 IF p_key IS NULL THEN RAISE EXCEPTION 'CPINT_INVALID_REQUEST'; END IF;
 -- Same advisory lock/namespace as QTE-01, acquired before catalog/postal/stock locks.
 PERFORM pg_advisory_xact_lock(('x'||substr(encode(sha256(convert_to('QTE01:PREPARE:'||p_actor::text||':'||p_key::text,'UTF8')),'hex'),1,16))::bit(64)::bigint);
 SELECT * INTO existing FROM orders.request WHERE actor_id=p_actor AND operation='PREPARE_TEST_ONLY_V1' AND key=p_key FOR UPDATE;
 IF FOUND AND existing.result_id IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM orders.profile_evidence WHERE preparation_id=existing.result_id AND quote_id=p_quote) THEN RAISE EXCEPTION 'CPINT_IDEMPOTENCY_CONFLICT'; END IF;
  RETURN orders.read_profile_preparation(p_actor,existing.result_id);
 END IF;
 PERFORM quotes.validate_for_preparation(p_actor,p_quote);
 prep_id:=substr(encode(sha256(convert_to('ORD01:PREPARE_TEST_ONLY_V1:'||p_actor::text||':'||p_key::text,'UTF8')),'hex'),1,32)::uuid;
 IF ref->>'address_id' IS NOT NULL THEN
  snap:=customer_profile.snapshot_with_proof(p_actor,(ref->>'address_id')::uuid,(ref->>'address_version')::int);
  IF (snap->'proof'->>'pid')::int IS DISTINCT FROM pg_backend_pid() OR (snap->'proof'->>'xid')::xid8 IS DISTINCT FROM pg_current_xact_id() THEN RAISE EXCEPTION 'CPINT_CONTEXT_INVALID'; END IF;
  postal:=snap->'postalAddress';
  IF postal->>'country'<>ref->>'country' OR postal->>'postalCode'<>ref->>'postal_code' THEN RAISE EXCEPTION 'CPINT_STALE_INPUT'; END IF;
  INSERT INTO orders.profile_address_snapshot VALUES(prep_id,p_actor,(ref->>'address_id')::uuid,(ref->>'address_version')::int,'TEST_ONLY',postal->>'recipient',postal->>'country',postal->>'postalCode',postal->>'region',postal->>'city',postal->>'district',postal->>'street',postal->>'number',postal->>'complement');
 END IF;
 -- Nested functions share this connection/XID; no intermediate commit or external I/O.
 result:=orders.prepare_quote(p_actor,p_key,p_quote);
 IF (result->>'id')::uuid<>prep_id THEN RAISE EXCEPTION 'CPINT_CONTEXT_INVALID'; END IF;
 INSERT INTO orders.profile_evidence VALUES(prep_id,p_quote,COALESCE((snap->'proof'->>'pid')::int,pg_backend_pid()),COALESCE((snap->'proof'->>'xid')::xid8,pg_current_xact_id()));
 RETURN orders.read_profile_preparation(p_actor,prep_id);
END $$;
ALTER FUNCTION orders.read_profile_preparation(uuid,uuid) OWNER TO atlas_orders_executor;
ALTER FUNCTION orders.prepare_profile_quote(uuid,uuid,uuid) OWNER TO atlas_orders_executor;
REVOKE CREATE ON SCHEMA orders FROM atlas_orders_executor;
REVOKE ALL ON FUNCTION orders.read_profile_preparation(uuid,uuid),orders.prepare_profile_quote(uuid,uuid,uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION orders.prepare(uuid,uuid,uuid,jsonb),orders.prepare_quote(uuid,uuid,uuid),orders.read_preparation(uuid,uuid) FROM atlas_orders_actor_a,atlas_orders_actor_b;
GRANT EXECUTE ON FUNCTION orders.prepare_profile_quote(uuid,uuid,uuid),orders.read_profile_preparation(uuid,uuid) TO atlas_orders_actor_a,atlas_orders_actor_b;
COMMIT;
