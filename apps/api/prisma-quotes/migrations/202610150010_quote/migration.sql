BEGIN;
DO $$ BEGIN IF current_database()<>'atlas_catalog_cat01' OR current_user<>'atlas_quotes_migrator' OR current_setting('atlas.quotes_fixture',true) IS DISTINCT FROM 'atlas-qte01-disposable' OR current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999 THEN RAISE EXCEPTION 'QUOTE_FIXTURE_REQUIRED'; END IF;END $$;
CREATE SCHEMA IF NOT EXISTS quotes;
REVOKE ALL ON SCHEMA quotes FROM PUBLIC;
CREATE TABLE quotes.fixture_customer(id uuid PRIMARY KEY,purpose text NOT NULL CHECK(purpose='TEST_ONLY'));
CREATE TABLE quotes.fixture_principal(role_name text PRIMARY KEY CHECK(role_name IN ('atlas_quotes_actor_a','atlas_quotes_actor_b','atlas_orders_actor_a','atlas_orders_actor_b')),actor_id uuid NOT NULL REFERENCES quotes.fixture_customer(id),active boolean NOT NULL DEFAULT true);
CREATE TABLE quotes.fixture_address(id uuid PRIMARY KEY,actor_id uuid NOT NULL REFERENCES quotes.fixture_customer(id),purpose text NOT NULL CHECK(purpose='TEST_ONLY'),zone text NOT NULL CHECK(zone ~ '^TEST_[A-Z_]+$'),complete boolean NOT NULL,eligible boolean NOT NULL,UNIQUE(id,actor_id));
CREATE TABLE quotes.fixture_physical(product_id uuid PRIMARY KEY REFERENCES catalog.product(id),purpose text NOT NULL CHECK(purpose='TEST_ONLY'),weight_grams integer NOT NULL CHECK(weight_grams BETWEEN 1 AND 100000),length_mm integer NOT NULL CHECK(length_mm BETWEEN 1 AND 10000),width_mm integer NOT NULL CHECK(width_mm BETWEEN 1 AND 10000),height_mm integer NOT NULL CHECK(height_mm BETWEEN 1 AND 10000));
-- No seed/default commercial TTL, tariff, deadline, address, carrier or physical attribute.
CREATE TABLE quotes.fixture_policy(id uuid PRIMARY KEY,purpose text NOT NULL CHECK(purpose='TEST_ONLY'),version integer NOT NULL CHECK(version>0),active boolean NOT NULL,ttl_seconds integer NOT NULL CHECK(ttl_seconds BETWEEN 1 AND 3600),option text NOT NULL CHECK(option ~ '^TEST_[A-Z_]+$'),zone text NOT NULL CHECK(zone ~ '^TEST_[A-Z_]+$'),base_cents bigint NOT NULL CHECK(base_cents BETWEEN 0 AND 9007199254740991),per_gram_cents bigint NOT NULL CHECK(per_gram_cents BETWEEN 0 AND 9007199254740991),max_dimension_mm integer NOT NULL CHECK(max_dimension_mm BETWEEN 1 AND 10000),min_days integer NOT NULL CHECK(min_days BETWEEN 1 AND 100),max_days integer NOT NULL CHECK(max_days BETWEEN min_days AND 100));
CREATE TABLE quotes.quote(id uuid PRIMARY KEY,actor_id uuid NOT NULL REFERENCES quotes.fixture_customer(id),purpose text NOT NULL CHECK(purpose='TEST_ONLY'),state text NOT NULL CHECK(state='ISSUED_TEST_ONLY'),currency text NOT NULL CHECK(currency='BRL'),items jsonb NOT NULL CHECK(jsonb_typeof(items)='array'),products jsonb NOT NULL CHECK(jsonb_typeof(products)='array'),prices jsonb NOT NULL CHECK(jsonb_typeof(prices)='array'),policy_id uuid NOT NULL REFERENCES quotes.fixture_policy(id),policy_version integer NOT NULL CHECK(policy_version>0),base_subtotal_cents bigint NOT NULL CHECK(base_subtotal_cents BETWEEN 1 AND 9007199254740991),delivery_cents bigint CHECK(delivery_cents BETWEEN 0 AND 9007199254740991),total_cents bigint NOT NULL CHECK(total_cents BETWEEN 1 AND 9007199254740991),created_at timestamptz NOT NULL,expires_at timestamptz NOT NULL,CHECK(expires_at>created_at),CHECK(total_cents=base_subtotal_cents+COALESCE(delivery_cents,0)),UNIQUE(id,actor_id));
CREATE INDEX quote_owner ON quotes.quote(actor_id,id);
CREATE TABLE quotes.line_snapshot(quote_id uuid NOT NULL REFERENCES quotes.quote(id),product_id uuid NOT NULL REFERENCES catalog.product(id),edition_id uuid REFERENCES catalog.edition(id),quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 9999),unit_cents bigint NOT NULL CHECK(unit_cents BETWEEN 1 AND 9007199254740991),subtotal_cents bigint NOT NULL CHECK(subtotal_cents BETWEEN 1 AND 9007199254740991),price_revision_id uuid NOT NULL REFERENCES pricing.price_revision(id),editorial jsonb NOT NULL CHECK(jsonb_typeof(editorial)='object'),PRIMARY KEY(quote_id,product_id),CHECK(subtotal_cents=quantity::numeric*unit_cents));
CREATE TABLE quotes.delivery_selection(quote_id uuid PRIMARY KEY REFERENCES quotes.quote(id),address_id uuid NOT NULL REFERENCES quotes.fixture_address(id),terms jsonb NOT NULL CHECK(jsonb_typeof(terms)='object'));
CREATE FUNCTION quotes.immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN RAISE EXCEPTION 'QUOTE_IMMUTABLE'; END $$;
CREATE TRIGGER quote_immutable BEFORE UPDATE OR DELETE ON quotes.quote FOR EACH ROW EXECUTE FUNCTION quotes.immutable();
CREATE TRIGGER line_immutable BEFORE UPDATE OR DELETE ON quotes.line_snapshot FOR EACH ROW EXECUTE FUNCTION quotes.immutable();
CREATE TRIGGER delivery_immutable BEFORE UPDATE OR DELETE ON quotes.delivery_selection FOR EACH ROW EXECUTE FUNCTION quotes.immutable();
CREATE FUNCTION quotes.assert_actor(p_actor uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
 IF current_database()<>'atlas_catalog_cat01' OR current_setting('atlas.quotes_fixture',true) IS DISTINCT FROM 'atlas-qte01-disposable' THEN RAISE EXCEPTION 'QUOTE_FIXTURE_REQUIRED'; END IF;
 PERFORM 1 FROM quotes.fixture_principal p JOIN quotes.fixture_customer c ON c.id=p.actor_id WHERE p.role_name=session_user AND p.actor_id=p_actor AND p.active AND c.purpose='TEST_ONLY' FOR SHARE OF p,c;
 IF NOT FOUND THEN RAISE EXCEPTION 'QUOTE_UNAUTHENTICATED'; END IF;
END $$;
-- DeliveryConditions SQL port; this fixture-only adapter is never called for digital-only goods.
CREATE FUNCTION quotes.resolve_fixture_delivery(p_actor uuid,p_physical jsonb,p_address uuid,p_policy uuid,p_option text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE address quotes.fixture_address; policy quotes.fixture_policy; grams numeric; fee numeric; physical_row record; attributes quotes.fixture_physical;
BEGIN
 PERFORM quotes.assert_actor(p_actor);
 IF jsonb_array_length(p_physical)<1 OR p_address IS NULL OR p_option IS NULL THEN RAISE EXCEPTION 'QUOTE_DELIVERY_REJECTED'; END IF;
 SELECT * INTO address FROM quotes.fixture_address WHERE id=p_address AND actor_id=p_actor FOR SHARE;
 IF NOT FOUND OR NOT address.complete OR NOT address.eligible OR address.purpose<>'TEST_ONLY' THEN RAISE EXCEPTION 'QUOTE_DELIVERY_REJECTED'; END IF;
 SELECT * INTO policy FROM quotes.fixture_policy WHERE id=p_policy FOR SHARE;
 IF NOT FOUND OR NOT policy.active OR policy.purpose<>'TEST_ONLY' OR policy.option<>p_option OR policy.zone<>address.zone THEN RAISE EXCEPTION 'QUOTE_DELIVERY_REJECTED'; END IF;
 grams:=0;
 FOR physical_row IN SELECT * FROM jsonb_to_recordset(p_physical) AS p(id uuid,quantity bigint) ORDER BY id LOOP
  SELECT * INTO attributes FROM quotes.fixture_physical WHERE product_id=physical_row.id FOR SHARE;
  IF NOT FOUND OR attributes.purpose<>'TEST_ONLY' OR greatest(attributes.length_mm,attributes.width_mm,attributes.height_mm)>policy.max_dimension_mm THEN RAISE EXCEPTION 'QUOTE_PHYSICAL_DATA_REQUIRED'; END IF;
  grams:=grams+physical_row.quantity::numeric*attributes.weight_grams;
 END LOOP;
 fee:=policy.base_cents::numeric+policy.per_gram_cents::numeric*grams;
 IF fee NOT BETWEEN 0 AND 9007199254740991 THEN RAISE EXCEPTION 'QUOTE_MONEY_REJECTED'; END IF;
 RETURN jsonb_build_object('purpose','TEST_ONLY','policyId',policy.id,'policyVersion',policy.version,'option',policy.option,'addressId',address.id,'addressSnapshot',jsonb_build_object('purpose',address.purpose,'zone',address.zone),'weightGrams',grams,'amountCents',fee,'minDays',policy.min_days,'maxDays',policy.max_days);
END $$;
CREATE FUNCTION quotes.resolve(p_actor uuid,p_items jsonb,p_address uuid,p_policy uuid,p_option text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE raw jsonb; canonical jsonb; ids uuid[]; cat jsonb; prices jsonb; base numeric; physical jsonb; delivery jsonb; policy quotes.fixture_policy;
BEGIN
 PERFORM quotes.assert_actor(p_actor);
 IF p_items IS NULL OR jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 100 THEN RAISE EXCEPTION 'QUOTE_INVALID_REQUEST'; END IF;
 FOR raw IN SELECT value FROM jsonb_array_elements(p_items) LOOP
  IF jsonb_typeof(raw)<>'object' THEN RAISE EXCEPTION 'QUOTE_INVALID_REQUEST'; END IF;
  IF (SELECT count(*) FROM jsonb_object_keys(raw))<>2 OR NOT(raw ? 'id' AND raw ? 'quantity') OR jsonb_typeof(raw->'id')<>'string' OR jsonb_typeof(raw->'quantity')<>'number' THEN RAISE EXCEPTION 'QUOTE_INVALID_REQUEST'; END IF;
  IF (raw->>'id') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR (raw->>'quantity')::numeric NOT BETWEEN 1 AND 9999 OR (raw->>'quantity')::numeric<>trunc((raw->>'quantity')::numeric) THEN RAISE EXCEPTION 'QUOTE_INVALID_REQUEST'; END IF;
 END LOOP;
 SELECT jsonb_agg(jsonb_build_object('id',id,'quantity',quantity) ORDER BY id),array_agg(id ORDER BY id) INTO canonical,ids FROM(SELECT id,sum(quantity) quantity FROM jsonb_to_recordset(p_items) AS q(id uuid,quantity integer) GROUP BY id) s;
 IF EXISTS(SELECT 1 FROM jsonb_to_recordset(canonical) AS q(quantity integer) WHERE quantity>9999) THEN RAISE EXCEPTION 'QUOTE_INVALID_REQUEST'; END IF;
 cat:=catalog.prepare_orders_snapshot(ids);prices:=pricing.prepare_orders_prices(ids);
 SELECT sum((line->>'quantity')::numeric*(price->>'amountCents')::numeric) INTO base FROM jsonb_array_elements(canonical) q(line) JOIN jsonb_array_elements(prices->'prices') p(price) ON price->>'productId'=line->>'id';
 IF base IS NULL OR base NOT BETWEEN 1 AND 9007199254740991 THEN RAISE EXCEPTION 'QUOTE_MONEY_REJECTED'; END IF;
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',id,'quantity',quantity) ORDER BY id),'[]'::jsonb) INTO physical FROM(
 SELECT id,sum(quantity) quantity FROM(
 SELECT (product->>'id')::uuid id,(line->>'quantity')::bigint quantity FROM jsonb_array_elements(canonical) q(line) JOIN jsonb_array_elements(cat->'products') p(product) ON product->>'id'=line->>'id' WHERE product->>'productType'='PHYSICAL_BOOK'
 UNION ALL SELECT (component->>'id')::uuid,(line->>'quantity')::bigint*(component->>'quantity')::bigint FROM jsonb_array_elements(canonical) q(line) JOIN jsonb_array_elements(cat->'products') p(product) ON product->>'id'=line->>'id' CROSS JOIN LATERAL jsonb_array_elements(product->'components') c(component) WHERE product->>'productType'='KIT' AND component->>'productType'='PHYSICAL_BOOK'
 ) source GROUP BY id) consolidated;
 SELECT * INTO policy FROM quotes.fixture_policy WHERE id=p_policy FOR SHARE;
 IF NOT FOUND OR NOT policy.active OR policy.purpose<>'TEST_ONLY' THEN RAISE EXCEPTION 'QUOTE_POLICY_REQUIRED'; END IF;
 delivery:=NULL;
 IF jsonb_array_length(physical)>0 THEN delivery:=quotes.resolve_fixture_delivery(p_actor,physical,p_address,p_policy,p_option); END IF;
 IF base+COALESCE((delivery->>'amountCents')::numeric,0)>9007199254740991 THEN RAISE EXCEPTION 'QUOTE_MONEY_REJECTED'; END IF;
 RETURN jsonb_build_object('items',canonical,'products',cat->'products','prices',prices->'prices','base',base,'delivery',delivery,'policyId',policy.id,'policyVersion',policy.version,'ttlSeconds',policy.ttl_seconds);
END $$;
CREATE FUNCTION quotes.read_owned(p_actor uuid,p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result quotes.quote;
BEGIN PERFORM quotes.assert_actor(p_actor);SELECT * INTO result FROM quotes.quote WHERE id=p_id AND actor_id=p_actor;IF NOT FOUND THEN RAISE EXCEPTION 'QUOTE_RESOURCE_NOT_FOUND'; END IF;RETURN to_jsonb(result);END $$;
CREATE FUNCTION quotes.project(p_actor uuid,p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE q jsonb;BEGIN q:=quotes.read_owned(p_actor,p_id);RETURN jsonb_build_object('quoteId',q->'id','expiresAt',to_char((q->>'expires_at')::timestamptz AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'total',jsonb_build_object('currency','BRL','amountCents',q->'total_cents'),'note','TEST_ONLY; cotação não garante estoque nem preço futuro.');END $$;
CREATE FUNCTION quotes.issue(p_actor uuid,p_items jsonb,p_address uuid,p_policy uuid,p_option text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE resolved jsonb; qid uuid; observed timestamptz; item record; product jsonb; price jsonb;
BEGIN
 resolved:=quotes.resolve(p_actor,p_items,p_address,p_policy,p_option);observed:=clock_timestamp();qid:=gen_random_uuid();
 INSERT INTO quotes.quote VALUES(qid,p_actor,'TEST_ONLY','ISSUED_TEST_ONLY','BRL',resolved->'items',resolved->'products',resolved->'prices',p_policy,(resolved->>'policyVersion')::int,(resolved->>'base')::bigint,(resolved->'delivery'->>'amountCents')::bigint,((resolved->>'base')::numeric+COALESCE((resolved->'delivery'->>'amountCents')::numeric,0))::bigint,observed,observed+(resolved->>'ttlSeconds')::int*interval '1 second');
 FOR item IN SELECT * FROM jsonb_to_recordset(resolved->'items') AS q(id uuid,quantity integer) ORDER BY id LOOP
  SELECT value INTO STRICT product FROM jsonb_array_elements(resolved->'products') WHERE value->>'id'=item.id::text;
  SELECT value INTO STRICT price FROM jsonb_array_elements(resolved->'prices') WHERE value->>'productId'=item.id::text;
  INSERT INTO quotes.line_snapshot VALUES(qid,item.id,(product->>'editionId')::uuid,item.quantity,(price->>'amountCents')::bigint,(item.quantity::numeric*(price->>'amountCents')::numeric)::bigint,(price->>'revisionId')::uuid,product);
 END LOOP;
 IF resolved->'delivery'<>'null'::jsonb THEN INSERT INTO quotes.delivery_selection VALUES(qid,p_address,resolved->'delivery'); END IF;
 RETURN quotes.project(p_actor,qid);
END $$;
-- For Orders only. This port checks freshness under locks, without creating a reserve.
CREATE FUNCTION quotes.validate_for_preparation(p_actor uuid,p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE q quotes.quote; selection quotes.delivery_selection; resolved jsonb;
BEGIN
 PERFORM quotes.assert_actor(p_actor);SELECT * INTO q FROM quotes.quote WHERE id=p_id AND actor_id=p_actor;
 IF NOT FOUND OR q.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'QUOTE_EXPIRED_OR_UNAVAILABLE'; END IF;
 SELECT * INTO selection FROM quotes.delivery_selection WHERE quote_id=p_id;
 resolved:=quotes.resolve(p_actor,q.items,selection.address_id,q.policy_id,selection.terms->>'option');
 IF resolved->'products'<>q.products OR resolved->'prices'<>q.prices OR (resolved->>'base')::bigint<>q.base_subtotal_cents OR (resolved->>'policyVersion')::int<>q.policy_version OR resolved->'delivery' IS DISTINCT FROM COALESCE(selection.terms,'null'::jsonb) OR q.expires_at<=clock_timestamp() THEN RAISE EXCEPTION 'QUOTE_STALE'; END IF;
 RETURN to_jsonb(q)||jsonb_build_object('delivery',selection.terms,'proof',jsonb_build_object('pid',pg_backend_pid(),'xid',pg_current_xact_id()::text));
END $$;
GRANT USAGE ON SCHEMA quotes TO atlas_quotes_executor,atlas_quotes_actor_a,atlas_quotes_actor_b,atlas_orders_executor,atlas_orders_migrator;
GRANT SELECT ON ALL TABLES IN SCHEMA quotes TO atlas_quotes_executor;
GRANT INSERT ON quotes.quote,quotes.line_snapshot,quotes.delivery_selection TO atlas_quotes_executor;
GRANT UPDATE(id) ON quotes.fixture_customer,quotes.fixture_address,quotes.fixture_policy TO atlas_quotes_executor;
GRANT UPDATE(role_name) ON quotes.fixture_principal TO atlas_quotes_executor;
GRANT UPDATE(product_id) ON quotes.fixture_physical TO atlas_quotes_executor;
GRANT REFERENCES(id) ON quotes.quote TO atlas_orders_migrator;
GRANT CREATE ON SCHEMA quotes TO atlas_quotes_executor;
ALTER FUNCTION quotes.assert_actor(uuid) OWNER TO atlas_quotes_executor;
ALTER FUNCTION quotes.resolve_fixture_delivery(uuid,jsonb,uuid,uuid,text) OWNER TO atlas_quotes_executor;
ALTER FUNCTION quotes.resolve(uuid,jsonb,uuid,uuid,text) OWNER TO atlas_quotes_executor;
ALTER FUNCTION quotes.read_owned(uuid,uuid) OWNER TO atlas_quotes_executor;
ALTER FUNCTION quotes.project(uuid,uuid) OWNER TO atlas_quotes_executor;
ALTER FUNCTION quotes.issue(uuid,jsonb,uuid,uuid,text) OWNER TO atlas_quotes_executor;
ALTER FUNCTION quotes.validate_for_preparation(uuid,uuid) OWNER TO atlas_quotes_executor;
REVOKE CREATE ON SCHEMA quotes FROM atlas_quotes_executor;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA quotes FROM PUBLIC;
GRANT EXECUTE ON FUNCTION quotes.immutable() TO atlas_quotes_executor;
GRANT EXECUTE ON FUNCTION quotes.issue(uuid,jsonb,uuid,uuid,text),quotes.project(uuid,uuid) TO atlas_quotes_actor_a,atlas_quotes_actor_b;
GRANT EXECUTE ON FUNCTION quotes.read_owned(uuid,uuid),quotes.validate_for_preparation(uuid,uuid) TO atlas_orders_executor;
COMMIT;
