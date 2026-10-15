BEGIN;
DO $$ BEGIN
 IF current_database()<>'atlas_catalog_cat01' OR current_user<>'atlas_pricing_migrator' OR current_setting('atlas.orders_fixture',true) IS DISTINCT FROM 'atlas-ord01-disposable' OR current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999 THEN RAISE EXCEPTION 'ORDERS_FIXTURE_REQUIRED'; END IF;
END $$;
GRANT USAGE ON SCHEMA pricing TO atlas_pricing_orders_reader,atlas_orders_executor,atlas_orders_migrator;
GRANT CREATE ON SCHEMA pricing TO atlas_pricing_orders_reader;
GRANT SELECT(product_id,last_version),UPDATE(product_id) ON pricing.price_product TO atlas_pricing_orders_reader;
GRANT SELECT(id,product_id,version,amount_cents,currency,state,starts_at,ends_at) ON pricing.price_revision TO atlas_pricing_orders_reader;
GRANT REFERENCES(id) ON pricing.price_revision TO atlas_orders_migrator;
CREATE FUNCTION pricing.prepare_orders_prices(p_ids uuid[]) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE product uuid; observed timestamptz; prices jsonb;
BEGIN
 IF current_setting('atlas.orders_fixture',true) IS DISTINCT FROM 'atlas-ord01-disposable' OR p_ids IS NULL OR cardinality(p_ids) NOT BETWEEN 1 AND 100 OR array_position(p_ids,NULL) IS NOT NULL OR cardinality(p_ids)<>(SELECT count(DISTINCT id) FROM unnest(p_ids) AS q(id)) THEN RAISE EXCEPTION 'ORDERS_PRICE_REJECTED'; END IF;
 FOR product IN SELECT id FROM unnest(p_ids) AS q(id) ORDER BY id LOOP
  PERFORM product_id FROM pricing.price_product WHERE product_id=product FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDERS_PRICE_REJECTED'; END IF;
 END LOOP;
 -- A replacement may have committed while waiting: statement_timestamp is stale here.
 observed:=clock_timestamp();
 SELECT jsonb_agg(jsonb_build_object('productId',product_id,'revisionId',id,'version',version,'amountCents',amount_cents,'currency',currency) ORDER BY product_id) INTO prices
 FROM pricing.price_revision WHERE product_id=ANY(p_ids) AND state='CURRENT' AND ends_at IS NULL AND starts_at<=observed AND amount_cents>0 AND currency='BRL';
 IF prices IS NULL OR jsonb_array_length(prices)<>cardinality(p_ids) THEN RAISE EXCEPTION 'ORDERS_PRICE_REJECTED'; END IF;
 RETURN jsonb_build_object('prices',prices,'proof',jsonb_build_object('pid',pg_backend_pid(),'xid',pg_current_xact_id()::text));
END $$;
ALTER FUNCTION pricing.prepare_orders_prices(uuid[]) OWNER TO atlas_pricing_orders_reader;
REVOKE CREATE ON SCHEMA pricing FROM atlas_pricing_orders_reader;
REVOKE ALL ON FUNCTION pricing.prepare_orders_prices(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pricing.prepare_orders_prices(uuid[]) TO atlas_orders_executor;
COMMIT;
