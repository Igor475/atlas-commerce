BEGIN;
DO $$ BEGIN IF current_database()<>'atlas_catalog_cat01' OR current_user<>'atlas_orders_migrator' OR current_setting('atlas.quotes_fixture',true) IS DISTINCT FROM 'atlas-qte01-disposable' THEN RAISE EXCEPTION 'QUOTE_FIXTURE_REQUIRED'; END IF;END $$;
CREATE TABLE orders.quote_evidence(preparation_id uuid PRIMARY KEY REFERENCES orders.preparation(id),quote_id uuid NOT NULL REFERENCES quotes.quote(id),total_cents bigint NOT NULL CHECK(total_cents BETWEEN 1 AND 9007199254740991),delivery jsonb,participant_proof jsonb NOT NULL);
CREATE TRIGGER quote_evidence_immutable BEFORE UPDATE OR DELETE ON orders.quote_evidence FOR EACH ROW EXECUTE FUNCTION orders.immutable();
GRANT SELECT,INSERT ON orders.quote_evidence TO atlas_orders_executor;
CREATE TABLE orders.quote_binding(quote_id uuid PRIMARY KEY REFERENCES quotes.quote(id),actor_id uuid NOT NULL REFERENCES orders.fixture_principal(actor_id));
CREATE TABLE orders.quote_validation(quote_id uuid NOT NULL REFERENCES orders.quote_binding(quote_id),actor_id uuid NOT NULL REFERENCES orders.fixture_principal(actor_id),xact_id xid8 NOT NULL,PRIMARY KEY(quote_id,xact_id));
CREATE TRIGGER quote_binding_immutable BEFORE UPDATE OR DELETE ON orders.quote_binding FOR EACH ROW EXECUTE FUNCTION orders.immutable();
CREATE TRIGGER quote_validation_immutable BEFORE UPDATE OR DELETE ON orders.quote_validation FOR EACH ROW EXECUTE FUNCTION orders.immutable();
GRANT SELECT,INSERT ON orders.quote_binding,orders.quote_validation TO atlas_orders_executor;
CREATE FUNCTION orders.require_quote_validation() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
 IF EXISTS(SELECT 1 FROM orders.quote_binding WHERE quote_id=NEW.quote_id)
 AND NOT EXISTS(SELECT 1 FROM orders.quote_validation WHERE quote_id=NEW.quote_id AND actor_id=NEW.actor_id AND xact_id=pg_current_xact_id())
 AND NOT EXISTS(SELECT 1 FROM orders.request WHERE actor_id=NEW.actor_id AND operation=NEW.operation AND key=NEW.key AND result_id IS NOT NULL)
 THEN RAISE EXCEPTION 'QUOTE_VALIDATION_REQUIRED'; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION orders.require_quote_validation() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION orders.require_quote_validation() TO atlas_orders_executor;
CREATE TRIGGER quote_validation_required BEFORE INSERT ON orders.request FOR EACH ROW EXECUTE FUNCTION orders.require_quote_validation();
-- A narrow bridge keeps the original ORD-01 coordinator/migrations unchanged.
GRANT INSERT ON orders.fixture_quote TO atlas_orders_executor;
GRANT CREATE ON SCHEMA orders TO atlas_orders_executor;
CREATE FUNCTION orders.prepare_quote(p_actor uuid,p_key uuid,p_quote uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE q jsonb; checked jsonb; result jsonb; existing orders.request;
BEGIN
 PERFORM orders.assert_fixture_actor(p_actor);q:=quotes.read_owned(p_actor,p_quote);
 IF p_key IS NULL THEN RAISE EXCEPTION 'ORDERS_INVALID_PREPARATION'; END IF;
 -- Per actor/operation/key, not a global lock. Replay is checked after any wait.
 PERFORM pg_advisory_xact_lock(('x'||substr(encode(sha256(convert_to('QTE01:PREPARE:'||p_actor::text||':'||p_key::text,'UTF8')),'hex'),1,16))::bit(64)::bigint);
 SELECT * INTO existing FROM orders.request WHERE actor_id=p_actor AND operation='PREPARE_TEST_ONLY_V1' AND key=p_key FOR UPDATE;
 IF FOUND AND existing.result_id IS NOT NULL THEN
  IF NOT EXISTS(SELECT 1 FROM orders.quote_evidence WHERE preparation_id=existing.result_id AND quote_id=p_quote) THEN RAISE EXCEPTION 'ORDERS_PREPARATION_CONFLICT'; END IF;
  RETURN orders.prepare(p_actor,p_key,p_quote,q->'items');
 END IF;
 checked:=quotes.validate_for_preparation(p_actor,p_quote);
 INSERT INTO orders.quote_binding VALUES(p_quote,p_actor) ON CONFLICT(quote_id) DO NOTHING;
 INSERT INTO orders.quote_validation VALUES(p_quote,p_actor,pg_current_xact_id()) ON CONFLICT DO NOTHING;
 INSERT INTO orders.fixture_quote(id,actor_id,purpose,mode,items,created_at,expires_at) VALUES(p_quote,p_actor,'TEST_ONLY','BASE_AT_PREPARE_TEST_ONLY',q->'items',(q->>'created_at')::timestamptz,(q->>'expires_at')::timestamptz) ON CONFLICT(id) DO NOTHING;
 result:=orders.prepare(p_actor,p_key,p_quote,q->'items');
 IF (q->>'expires_at')::timestamptz<=clock_timestamp() THEN RAISE EXCEPTION 'QUOTE_EXPIRED_OR_UNAVAILABLE'; END IF;
 INSERT INTO orders.quote_evidence VALUES((result->>'id')::uuid,p_quote,(checked->>'total_cents')::bigint,checked->'delivery',checked->'proof') ON CONFLICT(preparation_id) DO NOTHING;
 RETURN result;
END $$;
ALTER FUNCTION orders.prepare_quote(uuid,uuid,uuid) OWNER TO atlas_orders_executor;
REVOKE CREATE ON SCHEMA orders FROM atlas_orders_executor;
REVOKE ALL ON FUNCTION orders.prepare_quote(uuid,uuid,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION orders.prepare_quote(uuid,uuid,uuid) TO atlas_orders_actor_a,atlas_orders_actor_b;
COMMIT;
