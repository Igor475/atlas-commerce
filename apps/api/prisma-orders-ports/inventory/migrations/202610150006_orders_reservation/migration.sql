BEGIN;
DO $$ BEGIN
 IF current_database()<>'atlas_catalog_cat01' OR current_user<>'atlas_inventory_migrator' OR current_setting('atlas.orders_fixture',true) IS DISTINCT FROM 'atlas-ord01-disposable' OR current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999 THEN RAISE EXCEPTION 'ORDERS_FIXTURE_REQUIRED'; END IF;
END $$;
GRANT USAGE ON SCHEMA inventory TO atlas_orders_executor,atlas_orders_migrator;
GRANT REFERENCES(id) ON inventory.reservation TO atlas_orders_migrator;
GRANT CREATE ON SCHEMA inventory TO atlas_inventory_executor;
CREATE FUNCTION inventory.prepare_order_reservation(p_key uuid,p_ref uuid,p_fingerprint text,p_lines jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE r record;
BEGIN
 IF current_setting('atlas.orders_fixture',true) IS DISTINCT FROM 'atlas-ord01-disposable' OR p_lines IS NULL OR jsonb_typeof(p_lines)<>'array' THEN RAISE EXCEPTION 'ORDERS_INVENTORY_REJECTED'; END IF;
 IF jsonb_array_length(p_lines)=0 THEN
  RETURN jsonb_build_object('id',NULL,'expiresAt',NULL,'proof',jsonb_build_object('pid',pg_backend_pid(),'xid',pg_current_xact_id()::text));
 END IF;
 SELECT * INTO STRICT r FROM inventory.reserve(p_key,p_ref,p_fingerprint,p_lines);
 IF r.state<>'ACTIVE' THEN RAISE EXCEPTION 'ORDERS_INVENTORY_REJECTED'; END IF;
 RETURN jsonb_build_object('id',r.id,'expiresAt',r."expiresAt",'proof',jsonb_build_object('pid',pg_backend_pid(),'xid',pg_current_xact_id()::text));
END $$;
ALTER FUNCTION inventory.prepare_order_reservation(uuid,uuid,text,jsonb) OWNER TO atlas_inventory_executor;
REVOKE CREATE ON SCHEMA inventory FROM atlas_inventory_executor;
REVOKE ALL ON FUNCTION inventory.prepare_order_reservation(uuid,uuid,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION inventory.prepare_order_reservation(uuid,uuid,text,jsonb) TO atlas_orders_executor;
COMMIT;
