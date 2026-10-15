BEGIN;
DO $$ BEGIN
 IF current_database()<>'atlas_catalog_cat01' OR current_user<>'atlas_orders_migrator' OR current_setting('atlas.orders_fixture',true) IS DISTINCT FROM 'atlas-ord01-disposable' OR current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999 THEN RAISE EXCEPTION 'ORDERS_FIXTURE_REQUIRED'; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS orders;
REVOKE ALL ON SCHEMA orders FROM PUBLIC;
-- Deliberately separate from Identity accounts, real quotes and SM-01 commercial Orders.
CREATE TABLE orders.fixture_principal(
 role_name text PRIMARY KEY CHECK(role_name IN ('atlas_orders_actor_a','atlas_orders_actor_b')),
 actor_id uuid NOT NULL UNIQUE, purpose text NOT NULL CHECK(purpose='TEST_ONLY'), active boolean NOT NULL DEFAULT true
);
CREATE TABLE orders.fixture_quote(
 id uuid PRIMARY KEY, actor_id uuid NOT NULL REFERENCES orders.fixture_principal(actor_id),
 purpose text NOT NULL CHECK(purpose='TEST_ONLY'), mode text NOT NULL CHECK(mode='BASE_AT_PREPARE_TEST_ONLY'),
 items jsonb NOT NULL CHECK(jsonb_typeof(items)='array' AND jsonb_array_length(items) BETWEEN 1 AND 100),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), expires_at timestamptz NOT NULL,
 UNIQUE(id,actor_id),CHECK(expires_at>created_at)
);
CREATE TABLE orders.request(
 id uuid PRIMARY KEY, actor_id uuid NOT NULL REFERENCES orders.fixture_principal(actor_id),
 operation text NOT NULL CHECK(operation='PREPARE_TEST_ONLY_V1'), key uuid NOT NULL,
 fingerprint text NOT NULL CHECK(fingerprint ~ '^[0-9a-f]{64}$'), quote_id uuid NOT NULL,
 inventory_key uuid NOT NULL UNIQUE, result_id uuid UNIQUE, created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 UNIQUE(actor_id,operation,key),UNIQUE(id,actor_id),CHECK(result_id IS NULL OR result_id=id),
 FOREIGN KEY(quote_id,actor_id) REFERENCES orders.fixture_quote(id,actor_id)
);
CREATE TABLE orders.preparation(
 id uuid PRIMARY KEY, actor_id uuid NOT NULL, purpose text NOT NULL CHECK(purpose='TEST_ONLY'),
 currency text NOT NULL CHECK(currency='BRL'), base_subtotal_cents bigint NOT NULL CHECK(base_subtotal_cents BETWEEN 1 AND 9007199254740991),
 physical_units bigint NOT NULL CHECK(physical_units BETWEEN 0 AND 2147483647),
 reservation_id uuid UNIQUE REFERENCES inventory.reservation(id), reservation_expires_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 FOREIGN KEY(id,actor_id) REFERENCES orders.request(id,actor_id),
 CHECK((physical_units=0 AND reservation_id IS NULL AND reservation_expires_at IS NULL) OR (physical_units>0 AND reservation_id IS NOT NULL AND reservation_expires_at IS NOT NULL))
);
ALTER TABLE orders.request ADD FOREIGN KEY(result_id) REFERENCES orders.preparation(id);
CREATE INDEX preparation_owner ON orders.preparation(actor_id,id);
CREATE TABLE orders.line_snapshot(
 preparation_id uuid NOT NULL REFERENCES orders.preparation(id), product_id uuid NOT NULL REFERENCES catalog.product(id),
 sku varchar(64) NOT NULL, title varchar(300) NOT NULL, product_type text NOT NULL CHECK(product_type IN ('PHYSICAL_BOOK','EBOOK','DIGITAL_MAGAZINE','KIT')),
 edition_id uuid REFERENCES catalog.edition(id), quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 9999),
 base_unit_cents bigint NOT NULL CHECK(base_unit_cents BETWEEN 1 AND 9007199254740991), price_revision_id uuid NOT NULL REFERENCES pricing.price_revision(id),
 composition_version integer NOT NULL CHECK(composition_version=1), editorial_snapshot jsonb NOT NULL CHECK(jsonb_typeof(editorial_snapshot)='object'),
 PRIMARY KEY(preparation_id,product_id),CHECK((product_type='KIT' AND edition_id IS NULL) OR (product_type<>'KIT' AND edition_id IS NOT NULL))
);
CREATE TABLE orders.kit_component_snapshot(
 preparation_id uuid NOT NULL, kit_product_id uuid NOT NULL, component_id uuid NOT NULL REFERENCES catalog.product(id),
 sku varchar(64) NOT NULL,title varchar(300) NOT NULL,product_type text NOT NULL CHECK(product_type IN ('PHYSICAL_BOOK','EBOOK','DIGITAL_MAGAZINE')),
 edition_id uuid NOT NULL REFERENCES catalog.edition(id),quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 9999),
 editorial_snapshot jsonb NOT NULL CHECK(jsonb_typeof(editorial_snapshot)='object'),
 PRIMARY KEY(preparation_id,kit_product_id,component_id),FOREIGN KEY(preparation_id,kit_product_id) REFERENCES orders.line_snapshot(preparation_id,product_id)
);
CREATE TABLE orders.event(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),preparation_id uuid NOT NULL UNIQUE REFERENCES orders.preparation(id),
 kind text NOT NULL CHECK(kind='PREPARATION_RECORDED_TEST_ONLY'),occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 participant_proof jsonb NOT NULL CHECK(jsonb_typeof(participant_proof)='object')
);
CREATE FUNCTION orders.immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN RAISE EXCEPTION 'ORDERS_SNAPSHOT_IMMUTABLE'; END $$;
CREATE TRIGGER preparation_immutable BEFORE UPDATE OR DELETE ON orders.preparation FOR EACH ROW EXECUTE FUNCTION orders.immutable();
CREATE TRIGGER line_immutable BEFORE UPDATE OR DELETE ON orders.line_snapshot FOR EACH ROW EXECUTE FUNCTION orders.immutable();
CREATE TRIGGER component_immutable BEFORE UPDATE OR DELETE ON orders.kit_component_snapshot FOR EACH ROW EXECUTE FUNCTION orders.immutable();
CREATE TRIGGER event_immutable BEFORE UPDATE OR DELETE ON orders.event FOR EACH ROW EXECUTE FUNCTION orders.immutable();
CREATE FUNCTION orders.finalize_request() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
 IF TG_OP='DELETE' OR OLD.result_id IS NOT NULL OR NEW.result_id IS NULL OR NEW.result_id<>OLD.id OR (to_jsonb(OLD)-'result_id')<>(to_jsonb(NEW)-'result_id') THEN RAISE EXCEPTION 'ORDERS_REQUEST_IMMUTABLE'; END IF;RETURN NEW;
END $$;
CREATE TRIGGER request_immutable BEFORE UPDATE OR DELETE ON orders.request FOR EACH ROW EXECUTE FUNCTION orders.finalize_request();
CREATE FUNCTION orders.assert_fixture_actor(p_actor uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
 IF current_setting('atlas.orders_fixture',true) IS DISTINCT FROM 'atlas-ord01-disposable' OR current_database()<>'atlas_catalog_cat01' THEN RAISE EXCEPTION 'ORDERS_FIXTURE_REQUIRED'; END IF;
 PERFORM 1 FROM orders.fixture_principal WHERE role_name=session_user AND actor_id=p_actor AND active AND purpose='TEST_ONLY' FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'ORDERS_UNAUTHENTICATED'; END IF;
END $$;
CREATE FUNCTION orders.read_preparation(p_actor uuid,p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE p orders.preparation; lines jsonb;
BEGIN
 PERFORM orders.assert_fixture_actor(p_actor);
 SELECT * INTO p FROM orders.preparation WHERE id=p_id AND actor_id=p_actor;
 IF NOT FOUND THEN RAISE EXCEPTION 'ORDERS_RESOURCE_NOT_FOUND'; END IF;
 SELECT jsonb_agg(jsonb_build_object('productId',l.product_id,'sku',l.sku,'title',l.title,'productType',l.product_type,'editionId',l.edition_id,'quantity',l.quantity,'baseUnitCents',l.base_unit_cents,'components',COALESCE((
 SELECT jsonb_agg(jsonb_build_object('productId',c.component_id,'sku',c.sku,'title',c.title,'productType',c.product_type,'editionId',c.edition_id,'quantity',c.quantity) ORDER BY c.component_id) FROM orders.kit_component_snapshot c WHERE c.preparation_id=l.preparation_id AND c.kit_product_id=l.product_id),'[]'::jsonb)) ORDER BY l.product_id)
 INTO lines FROM orders.line_snapshot l WHERE l.preparation_id=p_id;
 RETURN jsonb_build_object('id',p.id,'kind','TEST_ONLY_PREPARATION','baseSubtotal',jsonb_build_object('currency',p.currency,'amountCents',p.base_subtotal_cents),'reservationExpiresAt',CASE WHEN p.reservation_expires_at IS NULL THEN NULL ELSE to_char(p.reservation_expires_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') END,'lines',lines);
END $$;
CREATE FUNCTION orders.prepare(p_actor uuid,p_key uuid,p_quote uuid,p_items jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE raw jsonb; canonical jsonb; ids uuid[]; fp text; prep_id uuid; inv_key uuid; existing orders.request; quote orders.fixture_quote;
 cat jsonb; prices jsonb; physical jsonb; units numeric; subtotal numeric; reservation jsonb; item record; snap_product jsonb; snap_price jsonb; snap_component jsonb;
BEGIN
 PERFORM orders.assert_fixture_actor(p_actor);
 IF p_key IS NULL OR p_quote IS NULL OR p_items IS NULL OR jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'ORDERS_INVALID_PREPARATION'; END IF;
 FOR raw IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  IF jsonb_typeof(raw)<>'object' THEN RAISE EXCEPTION 'ORDERS_INVALID_PREPARATION'; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(raw))<>2 OR NOT(raw ? 'id' AND raw ? 'quantity') OR jsonb_typeof(raw->'id')<>'string' OR jsonb_typeof(raw->'quantity')<>'number' THEN RAISE EXCEPTION 'ORDERS_INVALID_PREPARATION'; END IF;
  IF (raw->>'id') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR (raw->>'quantity')::numeric NOT BETWEEN 1 AND 9999 OR (raw->>'quantity')::numeric<>trunc((raw->>'quantity')::numeric) THEN RAISE EXCEPTION 'ORDERS_INVALID_PREPARATION'; END IF;
 END LOOP;
 SELECT jsonb_agg(jsonb_build_object('id',id,'quantity',quantity) ORDER BY id),array_agg(id ORDER BY id) INTO canonical,ids FROM(SELECT id,sum(quantity) quantity FROM jsonb_to_recordset(p_items) AS q(id uuid,quantity integer) GROUP BY id) s;
 IF EXISTS(SELECT 1 FROM jsonb_to_recordset(canonical) AS q(quantity integer) WHERE quantity>9999) THEN RAISE EXCEPTION 'ORDERS_INVALID_PREPARATION'; END IF;
 fp:=encode(sha256(convert_to(jsonb_build_object('quoteId',p_quote,'items',canonical)::text,'UTF8')),'hex');
 prep_id:=substr(encode(sha256(convert_to('ORD01:PREPARE_TEST_ONLY_V1:'||p_actor::text||':'||p_key::text,'UTF8')),'hex'),1,32)::uuid;
 inv_key:=substr(encode(sha256(convert_to('ORD01:INVENTORY:'||prep_id::text,'UTF8')),'hex'),1,32)::uuid;
 INSERT INTO orders.request(id,actor_id,operation,key,fingerprint,quote_id,inventory_key) VALUES(prep_id,p_actor,'PREPARE_TEST_ONLY_V1',p_key,fp,p_quote,inv_key) ON CONFLICT(actor_id,operation,key) DO NOTHING;
 SELECT * INTO STRICT existing FROM orders.request WHERE actor_id=p_actor AND operation='PREPARE_TEST_ONLY_V1' AND key=p_key FOR UPDATE;
 IF existing.fingerprint<>fp THEN RAISE EXCEPTION 'ORDERS_PREPARATION_CONFLICT'; END IF;
 -- Replay is served before re-reading changed prices/publication or expired quotes.
 IF existing.result_id IS NOT NULL THEN RETURN orders.read_preparation(p_actor,existing.result_id); END IF;
 SELECT * INTO quote FROM orders.fixture_quote WHERE id=p_quote AND actor_id=p_actor FOR SHARE;
 IF NOT FOUND OR quote.items<>canonical OR quote.purpose<>'TEST_ONLY' OR quote.mode<>'BASE_AT_PREPARE_TEST_ONLY' OR quote.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'ORDERS_QUOTE_REJECTED'; END IF;
 cat:=catalog.prepare_orders_snapshot(ids); prices:=pricing.prepare_orders_prices(ids);
 SELECT sum((line->>'quantity')::numeric*(price->>'amountCents')::numeric) INTO subtotal FROM jsonb_array_elements(canonical) AS q(line) JOIN jsonb_array_elements(prices->'prices') AS p(price) ON price->>'productId'=line->>'id';
 IF subtotal IS NULL OR subtotal NOT BETWEEN 1 AND 9007199254740991 THEN RAISE EXCEPTION 'ORDERS_MONEY_REJECTED'; END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('sku',sku,'quantity',quantity) ORDER BY sku),'[]'::jsonb),COALESCE(sum(quantity),0) INTO physical,units FROM (
 SELECT sku,sum(quantity) quantity FROM (
  SELECT (product->>'id')::uuid sku,(line->>'quantity')::bigint quantity FROM jsonb_array_elements(canonical) q(line) JOIN jsonb_array_elements(cat->'products') p(product) ON product->>'id'=line->>'id' WHERE product->>'productType'='PHYSICAL_BOOK'
  UNION ALL
  SELECT (component->>'id')::uuid,(line->>'quantity')::bigint*(component->>'quantity')::bigint FROM jsonb_array_elements(canonical) q(line) JOIN jsonb_array_elements(cat->'products') p(product) ON product->>'id'=line->>'id' CROSS JOIN LATERAL jsonb_array_elements(product->'components') c(component) WHERE product->>'productType'='KIT' AND component->>'productType'='PHYSICAL_BOOK'
 ) components GROUP BY sku) grouped;
 IF units>2147483647 OR jsonb_array_length(physical)>100 OR EXISTS(SELECT 1 FROM jsonb_to_recordset(physical) AS q(quantity bigint) WHERE quantity NOT BETWEEN 1 AND 2147483647) THEN RAISE EXCEPTION 'ORDERS_INVALID_PREPARATION'; END IF;
 reservation:=inventory.prepare_order_reservation(inv_key,prep_id,fp,physical);
 -- All quote/catalog/price locks are still held after the stock wait.
 IF quote.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'ORDERS_QUOTE_REJECTED'; END IF;
 INSERT INTO orders.preparation(id,actor_id,purpose,currency,base_subtotal_cents,physical_units,reservation_id,reservation_expires_at)
 VALUES(prep_id,p_actor,'TEST_ONLY','BRL',subtotal::bigint,units::bigint,(reservation->>'id')::uuid,(reservation->>'expiresAt')::timestamptz);
 FOR item IN SELECT * FROM jsonb_to_recordset(canonical) AS q(id uuid,quantity integer) ORDER BY id LOOP
  SELECT value INTO STRICT snap_product FROM jsonb_array_elements(cat->'products') WHERE value->>'id'=item.id::text;
  SELECT value INTO STRICT snap_price FROM jsonb_array_elements(prices->'prices') WHERE value->>'productId'=item.id::text;
  INSERT INTO orders.line_snapshot VALUES(prep_id,item.id,snap_product->>'sku',snap_product->>'title',snap_product->>'productType',(snap_product->>'editionId')::uuid,item.quantity,(snap_price->>'amountCents')::bigint,(snap_price->>'revisionId')::uuid,(snap_product->>'compositionVersion')::int,snap_product-'components');
  FOR snap_component IN SELECT value FROM jsonb_array_elements(snap_product->'components') LOOP
   INSERT INTO orders.kit_component_snapshot VALUES(prep_id,item.id,(snap_component->>'id')::uuid,snap_component->>'sku',snap_component->>'title',snap_component->>'productType',(snap_component->>'editionId')::uuid,(snap_component->>'quantity')::int,snap_component);
  END LOOP;
 END LOOP;
 INSERT INTO orders.event(preparation_id,kind,participant_proof) VALUES(prep_id,'PREPARATION_RECORDED_TEST_ONLY',jsonb_build_object('catalog',cat->'proof','pricing',prices->'proof','inventory',reservation->'proof','orders',jsonb_build_object('pid',pg_backend_pid(),'xid',pg_current_xact_id()::text)));
 UPDATE orders.request SET result_id=prep_id WHERE id=prep_id;
 RETURN orders.read_preparation(p_actor,prep_id);
END $$;
GRANT USAGE ON SCHEMA orders TO atlas_orders_executor,atlas_orders_runtime,atlas_orders_actor_a,atlas_orders_actor_b;
GRANT CREATE ON SCHEMA orders TO atlas_orders_executor;
GRANT SELECT ON ALL TABLES IN SCHEMA orders TO atlas_orders_executor;
GRANT INSERT ON orders.request,orders.preparation,orders.line_snapshot,orders.kit_component_snapshot,orders.event TO atlas_orders_executor;
GRANT UPDATE(result_id) ON orders.request TO atlas_orders_executor;
GRANT UPDATE(role_name) ON orders.fixture_principal TO atlas_orders_executor;
GRANT UPDATE(id) ON orders.fixture_quote TO atlas_orders_executor;
ALTER FUNCTION orders.assert_fixture_actor(uuid) OWNER TO atlas_orders_executor;
ALTER FUNCTION orders.read_preparation(uuid,uuid) OWNER TO atlas_orders_executor;
ALTER FUNCTION orders.prepare(uuid,uuid,uuid,jsonb) OWNER TO atlas_orders_executor;
REVOKE CREATE ON SCHEMA orders FROM atlas_orders_executor;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA orders FROM PUBLIC;
GRANT EXECUTE ON FUNCTION orders.immutable(),orders.finalize_request() TO atlas_orders_executor;
GRANT EXECUTE ON FUNCTION orders.prepare(uuid,uuid,uuid,jsonb),orders.read_preparation(uuid,uuid) TO atlas_orders_runtime,atlas_orders_actor_a,atlas_orders_actor_b;
COMMIT;
