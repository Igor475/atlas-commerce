BEGIN;
DO $$ BEGIN IF current_database()<>'atlas_catalog_cat01' OR current_user<>'atlas_orders_migrator' OR current_setting('atlas.shipping_fixture',true) IS DISTINCT FROM 'atlas-ship01-disposable' OR current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999 THEN RAISE EXCEPTION 'SHIP_FIXTURE_REQUIRED'; END IF; END $$;
CREATE TABLE orders.shipping_evidence(preparation_id uuid PRIMARY KEY REFERENCES orders.preparation(id),quote_id uuid NOT NULL REFERENCES quotes.quote(id),policy_id uuid,policy_version int,zone_id uuid,delivery jsonb,pid int NOT NULL,xact_id xid8 NOT NULL,FOREIGN KEY(policy_id,policy_version,zone_id) REFERENCES shipping.zone(policy_id,version,id),CHECK((delivery IS NULL AND policy_id IS NULL AND policy_version IS NULL AND zone_id IS NULL) OR (delivery IS NOT NULL AND policy_id IS NOT NULL AND policy_version IS NOT NULL AND zone_id IS NOT NULL AND delivery->>'purpose'='TEST_ONLY' AND delivery->>'policyId'=policy_id::text AND (delivery->>'policyVersion')::int=policy_version AND delivery->>'zoneId'=zone_id::text)));
CREATE TRIGGER shipping_evidence_immutable BEFORE UPDATE OR DELETE ON orders.shipping_evidence FOR EACH ROW EXECUTE FUNCTION orders.immutable();
GRANT SELECT,INSERT ON orders.shipping_evidence TO atlas_orders_executor;
GRANT CREATE ON SCHEMA orders TO atlas_orders_executor;
CREATE FUNCTION orders.read_shipping_preparation(p_actor uuid,p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result jsonb; fact orders.shipping_evidence;
BEGIN
 result:=orders.read_profile_preparation(p_actor,p_id);
 SELECT * INTO fact FROM orders.shipping_evidence WHERE preparation_id=p_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'SHIP_RESOURCE_NOT_FOUND'; END IF;
 RETURN result||jsonb_build_object('delivery',fact.delivery,'total',(SELECT jsonb_build_object('currency','BRL','amountCents',total_cents) FROM orders.quote_evidence WHERE preparation_id=p_id));
END $$;
CREATE FUNCTION orders.prepare_shipping_quote(p_actor uuid,p_key uuid,p_quote uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE result jsonb; terms jsonb; prep uuid;
BEGIN
 IF current_setting('atlas.shipping_fixture',true) IS DISTINCT FROM 'atlas-ship01-disposable' THEN RAISE EXCEPTION 'SHIP_FIXTURE_REQUIRED'; END IF;
 result:=orders.prepare_profile_quote(p_actor,p_key,p_quote);prep:=(result->'preparation'->>'id')::uuid;
 -- CPINT revalidated Shipping via Quotes under held locks; no second client/transaction.
 SELECT NULLIF(delivery,'null'::jsonb) INTO terms FROM orders.quote_evidence WHERE preparation_id=prep AND quote_id=p_quote;
 IF NOT FOUND THEN RAISE EXCEPTION 'SHIP_CONTEXT_INVALID'; END IF;
 INSERT INTO orders.shipping_evidence VALUES(prep,p_quote,(terms->>'policyId')::uuid,(terms->>'policyVersion')::int,(terms->>'zoneId')::uuid,terms,pg_backend_pid(),pg_current_xact_id()) ON CONFLICT(preparation_id) DO NOTHING;
 RETURN orders.read_shipping_preparation(p_actor,prep);
END $$;
ALTER FUNCTION orders.read_shipping_preparation(uuid,uuid) OWNER TO atlas_orders_executor;
ALTER FUNCTION orders.prepare_shipping_quote(uuid,uuid,uuid) OWNER TO atlas_orders_executor;
REVOKE CREATE ON SCHEMA orders FROM atlas_orders_executor;
REVOKE ALL ON FUNCTION orders.read_shipping_preparation(uuid,uuid),orders.prepare_shipping_quote(uuid,uuid,uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION orders.prepare_profile_quote(uuid,uuid,uuid),orders.read_profile_preparation(uuid,uuid) FROM atlas_orders_actor_a,atlas_orders_actor_b;
GRANT EXECUTE ON FUNCTION orders.prepare_shipping_quote(uuid,uuid,uuid),orders.read_shipping_preparation(uuid,uuid) TO atlas_orders_actor_a,atlas_orders_actor_b;
COMMIT;
