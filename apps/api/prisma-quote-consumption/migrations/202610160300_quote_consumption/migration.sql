BEGIN;
DO $$ BEGIN
 IF current_database()<>'atlas_catalog_cat01' OR current_user<>'atlas_orders_migrator'
 OR current_setting('atlas.quote_consumption',true) IS DISTINCT FROM 'atlas-quse01-disposable'
 OR current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999
 OR inet_server_port() IS DISTINCT FROM 5432 THEN RAISE EXCEPTION 'QUSE_FIXTURE_REQUIRED'; END IF;
END $$;
-- Stop before DDL on incompatible historical data. Never delete/consolidate intentions.
LOCK TABLE orders.request,orders.preparation IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM orders.request GROUP BY quote_id HAVING count(*)>1) THEN
  RAISE EXCEPTION 'QUSE_MIGRATION_DUPLICATES';
 END IF;
 IF EXISTS(SELECT 1 FROM orders.request r
  LEFT JOIN orders.preparation p ON p.id=r.result_id AND p.actor_id=r.actor_id
  LEFT JOIN orders.quote_evidence q ON q.preparation_id=p.id AND q.quote_id=r.quote_id
  LEFT JOIN orders.profile_evidence pf ON pf.preparation_id=p.id AND pf.quote_id=r.quote_id
  LEFT JOIN orders.shipping_evidence s ON s.preparation_id=p.id AND s.quote_id=r.quote_id
  WHERE p.id IS NULL OR q.preparation_id IS NULL OR pf.preparation_id IS NULL OR s.preparation_id IS NULL)
 THEN RAISE EXCEPTION 'QUSE_LEGACY_REVIEW_REQUIRED'; END IF;
END $$;
-- Authoritative invariant, including calls through any older coordinator.
ALTER TABLE orders.request ADD CONSTRAINT request_one_quote UNIQUE(quote_id);
ALTER TABLE orders.request ADD CONSTRAINT request_intention_quote UNIQUE(id,quote_id);
CREATE TABLE orders.quote_consumption(
 quote_id uuid PRIMARY KEY REFERENCES quotes.quote(id),
 preparation_id uuid NOT NULL UNIQUE REFERENCES orders.preparation(id),
 purpose text NOT NULL CHECK(purpose='TEST_ONLY'),
 origin text NOT NULL CHECK(origin IN ('NEW_TEST_ONLY','BACKFILL_TEST_ONLY')),
 recorded_pid int NOT NULL,recorded_xid xid8 NOT NULL,
 recorded_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(preparation_id,quote_id) REFERENCES orders.request(id,quote_id)
);
-- Actor, operation, key and canonical fingerprint live in immutable orders.request.
-- For a backfill, recorded_* describe this migration, not the original preparation.
INSERT INTO orders.quote_consumption(quote_id,preparation_id,purpose,origin,recorded_pid,recorded_xid)
 SELECT quote_id,result_id,'TEST_ONLY','BACKFILL_TEST_ONLY',pg_backend_pid(),pg_current_xact_id() FROM orders.request;
CREATE TRIGGER consumption_immutable BEFORE UPDATE OR DELETE ON orders.quote_consumption FOR EACH ROW EXECUTE FUNCTION orders.immutable();
GRANT SELECT,INSERT ON orders.quote_consumption TO atlas_orders_executor;
GRANT CREATE ON SCHEMA orders TO atlas_orders_executor;
CREATE FUNCTION orders.require_complete_consumption() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM orders.request r
  JOIN orders.quote_consumption c ON c.preparation_id=r.result_id AND c.quote_id=r.quote_id
  JOIN orders.quote_evidence q ON q.preparation_id=r.result_id AND q.quote_id=r.quote_id
  JOIN orders.profile_evidence pf ON pf.preparation_id=r.result_id AND pf.quote_id=r.quote_id
  JOIN orders.shipping_evidence s ON s.preparation_id=r.result_id AND s.quote_id=r.quote_id
  WHERE r.id=NEW.id AND r.result_id=NEW.id AND r.actor_id=NEW.actor_id)
 THEN RAISE EXCEPTION 'QUSE_COMPLETE_FLOW_REQUIRED'; END IF;
 RETURN NEW;
END $$;
ALTER FUNCTION orders.require_complete_consumption() OWNER TO atlas_orders_executor;
REVOKE ALL ON FUNCTION orders.require_complete_consumption() FROM PUBLIC;
CREATE CONSTRAINT TRIGGER complete_consumption AFTER INSERT ON orders.preparation DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION orders.require_complete_consumption();
CREATE FUNCTION orders.read_consumed_preparation(p_actor uuid,p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result jsonb;
BEGIN
 result:=orders.read_shipping_preparation(p_actor,p_id);
 IF NOT EXISTS(SELECT 1 FROM orders.quote_consumption WHERE preparation_id=p_id) THEN RAISE EXCEPTION 'QUSE_RESOURCE_NOT_FOUND'; END IF;
 RETURN result;
END $$;
CREATE FUNCTION orders.prepare_consumed_quote(p_actor uuid,p_key uuid,p_quote uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE q jsonb; existing orders.request; result jsonb; prep uuid; fp text;
BEGIN
 IF current_setting('atlas.quote_consumption',true) IS DISTINCT FROM 'atlas-quse01-disposable' THEN RAISE EXCEPTION 'QUSE_FIXTURE_REQUIRED'; END IF;
 PERFORM customer_profile.assert_actor(p_actor);PERFORM orders.assert_fixture_actor(p_actor);
 q:=quotes.read_owned(p_actor,p_quote);
 IF p_key IS NULL THEN RAISE EXCEPTION 'QUSE_INVALID_REQUEST'; END IF;
 fp:=encode(sha256(convert_to(jsonb_build_object('quoteId',p_quote,'items',q->'items')::text,'UTF8')),'hex');
 -- Identical namespace/order to QTE/CPINT; no global or in-memory mutex.
 PERFORM pg_advisory_xact_lock(('x'||substr(encode(sha256(convert_to('QTE01:PREPARE:'||p_actor::text||':'||p_key::text,'UTF8')),'hex'),1,16))::bit(64)::bigint);
 SELECT * INTO existing FROM orders.request WHERE actor_id=p_actor AND operation='PREPARE_TEST_ONLY_V1' AND key=p_key FOR UPDATE;
 IF FOUND THEN
  IF existing.quote_id<>p_quote OR existing.fingerprint<>fp THEN RAISE EXCEPTION 'QUSE_IDEMPOTENCY_CONFLICT'; END IF;
  IF existing.result_id IS NULL THEN RAISE EXCEPTION 'QUSE_CONTEXT_INVALID'; END IF;
  RETURN orders.read_consumed_preparation(p_actor,existing.result_id);
 END IF;
 -- Serialize only contenders for this quote. UNIQUE remains the authority even if bypassed.
 PERFORM pg_advisory_xact_lock(('x'||substr(encode(sha256(convert_to('QUSE01:QUOTE:'||p_quote::text,'UTF8')),'hex'),1,16))::bit(64)::bigint);
 IF EXISTS(SELECT 1 FROM orders.request WHERE quote_id=p_quote) THEN RAISE EXCEPTION 'QUSE_CONSUMPTION_CONFLICT'; END IF;
 result:=orders.prepare_shipping_quote(p_actor,p_key,p_quote);prep:=(result->'preparation'->>'id')::uuid;
 INSERT INTO orders.quote_consumption(quote_id,preparation_id,purpose,origin,recorded_pid,recorded_xid)
 VALUES(p_quote,prep,'TEST_ONLY','NEW_TEST_ONLY',pg_backend_pid(),pg_current_xact_id());
 RETURN orders.read_consumed_preparation(p_actor,prep);
END $$;
ALTER FUNCTION orders.read_consumed_preparation(uuid,uuid) OWNER TO atlas_orders_executor;
ALTER FUNCTION orders.prepare_consumed_quote(uuid,uuid,uuid) OWNER TO atlas_orders_executor;
REVOKE CREATE ON SCHEMA orders FROM atlas_orders_executor;
REVOKE ALL ON FUNCTION orders.read_consumed_preparation(uuid,uuid),orders.prepare_consumed_quote(uuid,uuid,uuid) FROM PUBLIC;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA orders FROM atlas_orders_runtime;
REVOKE EXECUTE ON FUNCTION orders.prepare_shipping_quote(uuid,uuid,uuid),orders.read_shipping_preparation(uuid,uuid) FROM atlas_orders_actor_a,atlas_orders_actor_b;
GRANT EXECUTE ON FUNCTION orders.prepare_consumed_quote(uuid,uuid,uuid),orders.read_consumed_preparation(uuid,uuid) TO atlas_orders_actor_a,atlas_orders_actor_b;
COMMIT;
