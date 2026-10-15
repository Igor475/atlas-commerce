BEGIN;
DO $$ BEGIN
 IF current_database()<>'atlas_catalog_cat01' OR current_user<>'atlas_catalog_migrator' OR current_setting('atlas.orders_fixture',true) IS DISTINCT FROM 'atlas-ord01-disposable' OR current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999 THEN RAISE EXCEPTION 'ORDERS_FIXTURE_REQUIRED'; END IF;
END $$;
-- Catalog-owned transaction port. Runtime gets no raw table access.
GRANT USAGE ON SCHEMA catalog TO atlas_catalog_orders_reader,atlas_orders_executor,atlas_orders_migrator;
GRANT CREATE ON SCHEMA catalog TO atlas_catalog_orders_reader;
GRANT SELECT ON catalog.product,catalog.kit_composition,catalog.edition,catalog.work,catalog.public_products TO atlas_catalog_orders_reader;
-- PostgreSQL row-share locking requires UPDATE on one column; the NOLOGIN owner executes no UPDATE.
GRANT UPDATE(id) ON catalog.product,catalog.edition,catalog.work TO atlas_catalog_orders_reader;
GRANT REFERENCES(id) ON catalog.product,catalog.edition TO atlas_orders_migrator;
CREATE FUNCTION catalog.prepare_orders_snapshot(p_ids uuid[]) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE all_ids uuid[]; checked_ids uuid[]; snapshot jsonb;
BEGIN
 IF current_setting('atlas.orders_fixture',true) IS DISTINCT FROM 'atlas-ord01-disposable' OR p_ids IS NULL OR cardinality(p_ids) NOT BETWEEN 1 AND 100 OR array_position(p_ids,NULL) IS NOT NULL OR cardinality(p_ids)<>(SELECT count(DISTINCT id) FROM unnest(p_ids) AS q(id)) THEN RAISE EXCEPTION 'ORDERS_CATALOG_REJECTED'; END IF;
 SELECT array_agg(id ORDER BY id) INTO all_ids FROM (SELECT unnest(p_ids) id UNION SELECT component_id FROM catalog.kit_composition WHERE kit_id=ANY(p_ids)) q;
 PERFORM p.id FROM catalog.product p WHERE p.id=ANY(all_ids) ORDER BY p.id FOR SHARE;
 SELECT array_agg(id ORDER BY id) INTO checked_ids FROM (SELECT unnest(p_ids) id UNION SELECT component_id FROM catalog.kit_composition WHERE kit_id=ANY(p_ids)) q;
 IF checked_ids IS DISTINCT FROM all_ids THEN RAISE EXCEPTION 'ORDERS_COMPOSITION_CHANGED'; END IF;
 PERFORM e.id FROM catalog.edition e WHERE e.id IN(SELECT p.edition_id FROM catalog.product p WHERE p.id=ANY(all_ids)) ORDER BY e.id FOR SHARE;
 PERFORM w.id FROM catalog.work w WHERE w.id IN(SELECT e.work_id FROM catalog.edition e JOIN catalog.product p ON p.edition_id=e.id WHERE p.id=ANY(all_ids)) ORDER BY w.id FOR SHARE;
 IF (SELECT count(*) FROM catalog.public_products WHERE id=ANY(all_ids))<>cardinality(all_ids)
 OR EXISTS(SELECT 1 FROM catalog.product WHERE id=ANY(p_ids) AND composition_version<>1)
 THEN RAISE EXCEPTION 'ORDERS_CATALOG_REJECTED'; END IF;
 SELECT jsonb_agg(jsonb_build_object('id',p.id,'sku',p.sku,'title',p.title,'productType',p.product_type,'editionId',p.edition_id,'editionLabel',e.label,'workId',e.work_id,'workTitle',w.title,'compositionVersion',p.composition_version,'components',COALESCE((
 SELECT jsonb_agg(jsonb_build_object('id',c.id,'sku',c.sku,'title',c.title,'productType',c.product_type,'editionId',c.edition_id,'editionLabel',ce.label,'workId',ce.work_id,'workTitle',cw.title,'quantity',k.quantity) ORDER BY c.id)
 FROM catalog.kit_composition k JOIN catalog.product c ON c.id=k.component_id JOIN catalog.edition ce ON ce.id=c.edition_id JOIN catalog.work cw ON cw.id=ce.work_id WHERE k.kit_id=p.id),'[]'::jsonb)) ORDER BY p.id)
 INTO snapshot FROM catalog.product p LEFT JOIN catalog.edition e ON e.id=p.edition_id LEFT JOIN catalog.work w ON w.id=e.work_id WHERE p.id=ANY(p_ids);
 RETURN jsonb_build_object('products',snapshot,'proof',jsonb_build_object('pid',pg_backend_pid(),'xid',pg_current_xact_id()::text));
END $$;
ALTER FUNCTION catalog.prepare_orders_snapshot(uuid[]) OWNER TO atlas_catalog_orders_reader;
REVOKE CREATE ON SCHEMA catalog FROM atlas_catalog_orders_reader;
REVOKE ALL ON FUNCTION catalog.prepare_orders_snapshot(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION catalog.prepare_orders_snapshot(uuid[]) TO atlas_orders_executor;
COMMIT;
