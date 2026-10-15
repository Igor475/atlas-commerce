BEGIN;
DO $$ BEGIN
 IF current_database()<>'atlas_catalog_cat01' OR current_user<>'atlas_inventory_migrator'
 OR current_setting('atlas.inventory_fixture',true) IS DISTINCT FROM 'atlas-inv01-disposable'
 OR current_setting('atlas.catalog_fixture',true) IS DISTINCT FROM 'atlas-cat01-disposable'
 OR current_setting('atlas.pricing_fixture',true) IS DISTINCT FROM 'atlas-pric01-disposable'
 OR current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999
 THEN RAISE EXCEPTION 'INVENTORY_DISPOSABLE_FIXTURE_REQUIRED'; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS inventory;
REVOKE ALL ON SCHEMA inventory FROM PUBLIC;
CREATE TABLE inventory.stock_balance (
 sku uuid PRIMARY KEY REFERENCES catalog.product(id) ON DELETE RESTRICT,
 on_hand bigint NOT NULL DEFAULT 0 CHECK(on_hand BETWEEN 0 AND 2147483647),
 reserved_active bigint NOT NULL DEFAULT 0 CHECK(reserved_active>=0),
 allocated bigint NOT NULL DEFAULT 0 CHECK(allocated>=0),
 CHECK(on_hand>=reserved_active+allocated)
);
CREATE TABLE inventory.reservation (
 id uuid PRIMARY KEY, commercial_ref uuid NOT NULL,
 state text NOT NULL CHECK(state IN ('ACTIVE','CONFIRMED','EXPIRED','RELEASED')),
 created_at timestamptz NOT NULL, expires_at timestamptz NOT NULL,
 CHECK(expires_at=created_at+interval '40 minutes')
);
CREATE INDEX reservation_due ON inventory.reservation(expires_at,id) WHERE state='ACTIVE';
CREATE TABLE inventory.intent (
 key uuid PRIMARY KEY, commercial_ref uuid NOT NULL UNIQUE, fingerprint text NOT NULL CHECK(fingerprint ~ '^[0-9a-f]{64}$'),
 physical_lines jsonb NOT NULL CHECK(jsonb_typeof(physical_lines)='array'),
 reservation_id uuid UNIQUE REFERENCES inventory.reservation(id), created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE inventory.reservation_line (
 reservation_id uuid NOT NULL REFERENCES inventory.reservation(id), sku uuid NOT NULL REFERENCES inventory.stock_balance(sku),
 quantity bigint NOT NULL CHECK(quantity BETWEEN 1 AND 2147483647), PRIMARY KEY(reservation_id,sku)
);
CREATE TABLE inventory.stock_ledger_entry (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sku uuid NOT NULL REFERENCES inventory.stock_balance(sku),
 kind text NOT NULL CHECK(kind IN ('FIXTURE_LOAD','RESERVE','CONFIRMED','EXPIRED','RELEASED')),
 quantity bigint NOT NULL CHECK(quantity BETWEEN 1 AND 2147483647), operation_ref uuid NOT NULL,
 correlation_ref uuid NOT NULL, occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 delta_on_hand bigint NOT NULL, delta_reserved bigint NOT NULL, delta_allocated bigint NOT NULL,
 UNIQUE(sku,kind,operation_ref),
 CHECK((kind='FIXTURE_LOAD' AND delta_on_hand=quantity AND delta_reserved=0 AND delta_allocated=0)
 OR (kind='RESERVE' AND delta_on_hand=0 AND delta_reserved=quantity AND delta_allocated=0)
 OR (kind='CONFIRMED' AND delta_on_hand=0 AND delta_reserved=-quantity AND delta_allocated=quantity)
 OR (kind IN ('EXPIRED','RELEASED') AND delta_on_hand=0 AND delta_reserved=-quantity AND delta_allocated=0))
);
CREATE TABLE inventory.event (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), reservation_id uuid NOT NULL REFERENCES inventory.reservation(id),
 kind text NOT NULL CHECK(kind IN ('ACTIVE','CONFIRMED','EXPIRED','RELEASED','CONFIRMATION_REFUSED')),
 decision_ref uuid, occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE NULLS NOT DISTINCT(reservation_id,kind,decision_ref)
);
-- Durable Inventory facts, not a generic queue. No external consumer enabled.
CREATE FUNCTION inventory.immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN RAISE EXCEPTION 'INVENTORY_IMMUTABLE'; END $$;
CREATE TRIGGER ledger_immutable BEFORE UPDATE OR DELETE ON inventory.stock_ledger_entry FOR EACH ROW EXECUTE FUNCTION inventory.immutable();
CREATE TRIGGER line_immutable BEFORE UPDATE OR DELETE ON inventory.reservation_line FOR EACH ROW EXECUTE FUNCTION inventory.immutable();
CREATE TRIGGER intent_immutable BEFORE UPDATE OR DELETE ON inventory.intent FOR EACH ROW EXECUTE FUNCTION inventory.immutable();
CREATE TRIGGER event_immutable BEFORE UPDATE OR DELETE ON inventory.event FOR EACH ROW EXECUTE FUNCTION inventory.immutable();
CREATE FUNCTION inventory.physical_sku() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM catalog.product WHERE id=NEW.sku AND product_type='PHYSICAL_BOOK')
 THEN RAISE EXCEPTION 'INVENTORY_PHYSICAL_REQUIRED'; END IF;
 IF TG_OP='UPDATE' AND NEW.sku<>OLD.sku THEN RAISE EXCEPTION 'INVENTORY_ID_IMMUTABLE'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER physical_guard BEFORE INSERT OR UPDATE ON inventory.stock_balance FOR EACH ROW EXECUTE FUNCTION inventory.physical_sku();
CREATE FUNCTION inventory.project_ledger() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
BEGIN
 IF NEW.kind='FIXTURE_LOAD' AND session_user<>'atlas_inventory_migrator' THEN RAISE EXCEPTION 'INVENTORY_FIXTURE_ONLY'; END IF;
 IF NEW.kind<>'FIXTURE_LOAD' AND NOT EXISTS(
 SELECT 1 FROM inventory.reservation_line l JOIN inventory.reservation r ON r.id=l.reservation_id
 WHERE l.reservation_id=NEW.operation_ref AND l.sku=NEW.sku AND l.quantity=NEW.quantity
 AND ((NEW.kind='RESERVE' AND r.state='ACTIVE') OR r.state=NEW.kind)) THEN RAISE EXCEPTION 'INVENTORY_EFFECT_REJECTED'; END IF;
 UPDATE inventory.stock_balance SET on_hand=on_hand+NEW.delta_on_hand,
 reserved_active=reserved_active+NEW.delta_reserved,allocated=allocated+NEW.delta_allocated WHERE sku=NEW.sku;
 IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_SKU_REQUIRED'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER ledger_projection AFTER INSERT ON inventory.stock_ledger_entry FOR EACH ROW EXECUTE FUNCTION inventory.project_ledger();
CREATE FUNCTION inventory.guard_state() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.state<>'ACTIVE' THEN RAISE EXCEPTION 'INVENTORY_STATE_REJECTED'; END IF;
 ELSIF TG_OP='DELETE' OR NEW.id<>OLD.id OR NEW.commercial_ref<>OLD.commercial_ref OR NEW.created_at<>OLD.created_at OR NEW.expires_at<>OLD.expires_at
 OR OLD.state<>'ACTIVE' OR NEW.state NOT IN ('CONFIRMED','EXPIRED','RELEASED')
 THEN RAISE EXCEPTION 'INVENTORY_STATE_REJECTED'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER reservation_guard BEFORE INSERT OR UPDATE OR DELETE ON inventory.reservation FOR EACH ROW EXECUTE FUNCTION inventory.guard_state();
CREATE FUNCTION inventory.reserve(p_key uuid,p_ref uuid,p_fingerprint text,p_lines jsonb)
RETURNS TABLE(id uuid,state text,"expiresAt" text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE existing inventory.intent; line record; stock inventory.stock_balance; at_time timestamptz; rid uuid;
BEGIN
 IF p_key IS NULL OR p_ref IS NULL OR p_fingerprint IS NULL OR p_fingerprint !~ '^[0-9a-f]{64}$' OR p_lines IS NULL
 OR jsonb_typeof(p_lines)<>'array' OR jsonb_array_length(p_lines)>100 THEN RAISE EXCEPTION 'INVENTORY_INVALID_INTENT' USING ERRCODE='P0001'; END IF;
 IF EXISTS(SELECT 1 FROM jsonb_to_recordset(p_lines) AS x(sku uuid,quantity bigint) WHERE sku IS NULL OR quantity IS NULL OR quantity NOT BETWEEN 1 AND 2147483647)
 OR (SELECT count(*)<>count(DISTINCT sku) FROM jsonb_to_recordset(p_lines) AS x(sku uuid,quantity bigint)) THEN RAISE EXCEPTION 'INVENTORY_INVALID_INTENT'; END IF;
 -- An intent row is the per-business-operation lock; no global inventory lock.
 INSERT INTO inventory.intent(key,commercial_ref,fingerprint,physical_lines) VALUES(p_key,p_ref,p_fingerprint,p_lines) ON CONFLICT(key) DO NOTHING;
 SELECT * INTO existing FROM inventory.intent WHERE key=p_key FOR UPDATE;
 IF existing.commercial_ref<>p_ref OR existing.fingerprint<>p_fingerprint OR existing.physical_lines<>p_lines THEN RAISE EXCEPTION 'INVENTORY_INTENT_CONFLICT'; END IF;
 IF existing.reservation_id IS NOT NULL THEN
  RETURN QUERY SELECT r.id,r.state,to_char(r.expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') FROM inventory.reservation r WHERE r.id=existing.reservation_id; RETURN;
 END IF;
 IF jsonb_array_length(p_lines)=0 THEN RETURN QUERY SELECT NULL::uuid,'NO_PHYSICAL'::text,NULL::text; RETURN; END IF;
 FOR line IN SELECT * FROM jsonb_to_recordset(p_lines) AS x(sku uuid,quantity bigint) ORDER BY sku LOOP
  SELECT * INTO stock FROM inventory.stock_balance b WHERE b.sku=line.sku FOR UPDATE;
  IF NOT FOUND OR stock.on_hand-stock.reserved_active-stock.allocated<line.quantity THEN RAISE EXCEPTION 'INVENTORY_INSUFFICIENT_STOCK'; END IF;
 END LOOP;
 at_time:=clock_timestamp(); rid:=gen_random_uuid();
 INSERT INTO inventory.reservation VALUES(rid,p_ref,'ACTIVE',at_time,at_time+interval '40 minutes');
 -- Updating just the association is guarded separately by finalize_intent.
 UPDATE inventory.intent SET reservation_id=rid WHERE key=p_key;
 FOR line IN SELECT * FROM jsonb_to_recordset(p_lines) AS x(sku uuid,quantity bigint) ORDER BY sku LOOP
  INSERT INTO inventory.reservation_line VALUES(rid,line.sku,line.quantity);
  INSERT INTO inventory.stock_ledger_entry(sku,kind,quantity,operation_ref,correlation_ref,delta_on_hand,delta_reserved,delta_allocated)
  VALUES(line.sku,'RESERVE',line.quantity,rid,p_key,0,line.quantity,0);
 END LOOP;
 INSERT INTO inventory.event(reservation_id,kind) VALUES(rid,'ACTIVE');
 RETURN QUERY SELECT rid,'ACTIVE'::text,to_char((at_time+interval '40 minutes') AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
END $$;
-- Allow exactly the initial association. It is invisible until commit with all ledger facts.
DROP TRIGGER intent_immutable ON inventory.intent;
CREATE FUNCTION inventory.finalize_intent() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='DELETE' OR OLD.reservation_id IS NOT NULL OR NEW.reservation_id IS NULL
 OR (to_jsonb(OLD)-'reservation_id')<>(to_jsonb(NEW)-'reservation_id') THEN RAISE EXCEPTION 'INVENTORY_IMMUTABLE'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER intent_immutable BEFORE UPDATE OR DELETE ON inventory.intent FOR EACH ROW EXECUTE FUNCTION inventory.finalize_intent();
CREATE FUNCTION inventory.transition(p_id uuid,p_target text,p_decision uuid)
RETURNS TABLE(id uuid,state text,"expiresAt" text) LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE r inventory.reservation; line record; at_time timestamptz;
BEGIN
 IF p_target IS NULL OR p_target NOT IN ('CONFIRMED','EXPIRED','RELEASED') OR (p_target<>'EXPIRED' AND p_decision IS NULL) THEN RAISE EXCEPTION 'INVENTORY_DECISION_DENIED'; END IF;
 SELECT * INTO r FROM inventory.reservation WHERE reservation.id=p_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'INVENTORY_INVALID_INTENT'; END IF;
 IF r.state='ACTIVE' THEN
  FOR line IN SELECT l.sku FROM inventory.reservation_line l WHERE l.reservation_id=p_id ORDER BY l.sku LOOP
   PERFORM 1 FROM inventory.stock_balance b WHERE b.sku=line.sku FOR UPDATE;
  END LOOP;
 END IF;
 at_time:=clock_timestamp();
 IF p_target='CONFIRMED' AND (r.state IN ('EXPIRED','RELEASED') OR (r.state='ACTIVE' AND at_time>=r.expires_at)) THEN
  INSERT INTO inventory.event(reservation_id,kind,decision_ref) VALUES(p_id,'CONFIRMATION_REFUSED',p_decision) ON CONFLICT DO NOTHING;
  RETURN QUERY SELECT r.id,'REFUSED'::text,to_char(r.expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'); RETURN;
 END IF;
 IF r.state='ACTIVE' AND (p_target<>'EXPIRED' OR at_time>=r.expires_at) THEN
  UPDATE inventory.reservation SET state=p_target WHERE reservation.id=p_id;
  FOR line IN SELECT * FROM inventory.reservation_line l WHERE l.reservation_id=p_id ORDER BY l.sku LOOP
   INSERT INTO inventory.stock_ledger_entry(sku,kind,quantity,operation_ref,correlation_ref,delta_on_hand,delta_reserved,delta_allocated)
   VALUES(line.sku,p_target,line.quantity,p_id,p_id,0,-line.quantity,CASE WHEN p_target='CONFIRMED' THEN line.quantity ELSE 0 END);
  END LOOP;
  INSERT INTO inventory.event(reservation_id,kind,decision_ref) VALUES(p_id,p_target,p_decision);
  r.state:=p_target;
 END IF;
 RETURN QUERY SELECT r.id,r.state,to_char(r.expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"');
END $$;
CREATE FUNCTION inventory.expire(p_id uuid) RETURNS TABLE(id uuid,state text,"expiresAt" text)
LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$ SELECT * FROM inventory.transition(p_id,'EXPIRED',NULL) $$;
CREATE FUNCTION inventory.decide(p_id uuid,p_target text,p_decision uuid) RETURNS TABLE(id uuid,state text,"expiresAt" text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
 IF p_target IS NULL OR p_target NOT IN ('CONFIRMED','RELEASED') THEN RAISE EXCEPTION 'INVENTORY_DECISION_DENIED'; END IF;
 RETURN QUERY SELECT * FROM inventory.transition(p_id,p_target,p_decision);
END $$;
GRANT USAGE ON SCHEMA inventory TO atlas_inventory_executor,atlas_inventory_runtime,atlas_inventory_decider;
GRANT CREATE ON SCHEMA inventory TO atlas_inventory_executor;
GRANT SELECT,INSERT,UPDATE ON inventory.stock_balance,inventory.reservation,inventory.intent TO atlas_inventory_executor;
GRANT SELECT,INSERT ON inventory.stock_ledger_entry,inventory.reservation_line,inventory.event TO atlas_inventory_executor;
-- All privileged functions have a fixed search_path, no dynamic SQL, and a NOLOGIN narrow owner.
ALTER FUNCTION inventory.physical_sku() OWNER TO atlas_inventory_executor;
ALTER FUNCTION inventory.project_ledger() OWNER TO atlas_inventory_executor;
ALTER FUNCTION inventory.reserve(uuid,uuid,text,jsonb) OWNER TO atlas_inventory_executor;
ALTER FUNCTION inventory.transition(uuid,text,uuid) OWNER TO atlas_inventory_executor;
ALTER FUNCTION inventory.expire(uuid) OWNER TO atlas_inventory_executor;
ALTER FUNCTION inventory.decide(uuid,text,uuid) OWNER TO atlas_inventory_executor;
REVOKE CREATE ON SCHEMA inventory FROM atlas_inventory_executor;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA inventory FROM PUBLIC;
GRANT EXECUTE ON FUNCTION inventory.immutable(),inventory.guard_state(),inventory.finalize_intent() TO atlas_inventory_executor;
GRANT EXECUTE ON FUNCTION inventory.reserve(uuid,uuid,text,jsonb),inventory.expire(uuid) TO atlas_inventory_runtime;
GRANT EXECUTE ON FUNCTION inventory.decide(uuid,text,uuid) TO atlas_inventory_decider;
COMMIT;
