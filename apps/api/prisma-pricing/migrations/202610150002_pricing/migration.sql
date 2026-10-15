BEGIN;
DO $$ BEGIN
 IF current_database()<>'atlas_catalog_cat01' OR current_user<>'atlas_pricing_migrator'
 OR current_setting('atlas.pricing_fixture',true) IS DISTINCT FROM 'atlas-pric01-disposable'
 OR current_setting('atlas.catalog_fixture',true) IS DISTINCT FROM 'atlas-cat01-disposable'
 OR current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999
 THEN RAISE EXCEPTION 'PRICING_LOCAL_FIXTURE_REQUIRED'; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS pricing;
REVOKE ALL ON SCHEMA pricing FROM PUBLIC;
CREATE TABLE pricing.price_product(
 product_id uuid PRIMARY KEY REFERENCES catalog.product(id) ON DELETE RESTRICT,
 last_version integer NOT NULL DEFAULT 0 CHECK(last_version>=0),
 created_at timestamptz(6) NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE pricing.price_revision(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 product_id uuid NOT NULL REFERENCES pricing.price_product(product_id) ON DELETE RESTRICT,
 version integer NOT NULL CHECK(version>0),
 amount_cents bigint NOT NULL CHECK(amount_cents BETWEEN 0 AND 9007199254740991),
 currency varchar(3) NOT NULL CHECK(currency='BRL'),
 state varchar(12) NOT NULL CHECK(state IN ('CURRENT','RETIRED')),
 source varchar(80) NOT NULL CHECK(source ~ '^[A-Za-z0-9._:-]{1,80}$'),
 starts_at timestamptz(6) NOT NULL,ends_at timestamptz(6),created_at timestamptz(6) NOT NULL,
 UNIQUE(product_id,version),CHECK(created_at=starts_at),
 CHECK((state='CURRENT' AND ends_at IS NULL) OR (state='RETIRED' AND ends_at>starts_at))
);
CREATE UNIQUE INDEX price_one_current ON pricing.price_revision(product_id) WHERE state='CURRENT';
CREATE FUNCTION pricing.guard_slot() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.last_version<>0 THEN RAISE EXCEPTION 'PRICING_VERSION_INVALID'; END IF;
 ELSE
  IF NEW.product_id<>OLD.product_id OR NEW.created_at<>OLD.created_at OR NEW.last_version<>OLD.last_version+1
   OR NEW.last_version IS DISTINCT FROM (SELECT max(version) FROM pricing.price_revision WHERE product_id=OLD.product_id)
  THEN RAISE EXCEPTION 'PRICING_VERSION_INVALID'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER slot_guard BEFORE INSERT OR UPDATE ON pricing.price_product FOR EACH ROW EXECUTE FUNCTION pricing.guard_slot();
-- All writers of one product serialize on its slot; no global lock or extension.
CREATE FUNCTION pricing.guard_revision() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE latest integer;
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'PRICING_HISTORY_IMMUTABLE'; END IF;
 SELECT last_version INTO latest FROM pricing.price_product WHERE product_id=NEW.product_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'PRICING_PRODUCT_REQUIRED'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.state<>'CURRENT' OR NEW.version<>latest+1 OR NEW.starts_at>clock_timestamp() THEN RAISE EXCEPTION 'PRICING_REVISION_INVALID'; END IF;
 ELSE
  IF OLD.state<>'CURRENT' OR NEW.state<>'RETIRED' OR NEW.id<>OLD.id OR NEW.product_id<>OLD.product_id OR NEW.version<>OLD.version
   OR NEW.amount_cents<>OLD.amount_cents OR NEW.currency<>OLD.currency OR NEW.source<>OLD.source OR NEW.starts_at<>OLD.starts_at OR NEW.created_at<>OLD.created_at
   OR NEW.ends_at>clock_timestamp()
  THEN RAISE EXCEPTION 'PRICING_HISTORY_IMMUTABLE'; END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM pricing.price_revision p WHERE p.product_id=NEW.product_id AND p.id<>NEW.id
   AND NEW.starts_at<COALESCE(p.ends_at,'infinity'::timestamptz) AND p.starts_at<COALESCE(NEW.ends_at,'infinity'::timestamptz))
 THEN RAISE EXCEPTION 'PRICING_INTERVAL_CONFLICT'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER revision_guard BEFORE INSERT OR UPDATE OR DELETE ON pricing.price_revision FOR EACH ROW EXECUTE FUNCTION pricing.guard_revision();
CREATE FUNCTION pricing.advance_version() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN UPDATE pricing.price_product SET last_version=NEW.version WHERE product_id=NEW.product_id;RETURN NEW;END $$;
CREATE TRIGGER revision_version AFTER INSERT ON pricing.price_revision FOR EACH ROW EXECUTE FUNCTION pricing.advance_version();
-- Internal/local write primitive, not an HTTP API; only the migration owner may execute.
CREATE FUNCTION pricing.replace_base_price(target uuid,cents bigint,unit text,provenance text) RETURNS uuid LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE next_version integer;cutover timestamptz;previous_start timestamptz;created uuid;
BEGIN
 INSERT INTO pricing.price_product(product_id) VALUES(target) ON CONFLICT DO NOTHING;
 SELECT last_version+1 INTO next_version FROM pricing.price_product WHERE product_id=target FOR UPDATE;
 SELECT starts_at INTO previous_start FROM pricing.price_revision WHERE product_id=target AND state='CURRENT';
 cutover:=clock_timestamp();
 IF previous_start IS NOT NULL AND cutover<=previous_start THEN RAISE EXCEPTION 'PRICING_CLOCK_NOT_ADVANCED'; END IF;
 UPDATE pricing.price_revision SET state='RETIRED',ends_at=cutover WHERE product_id=target AND state='CURRENT';
 INSERT INTO pricing.price_revision(product_id,version,amount_cents,currency,state,source,starts_at,created_at)
 VALUES(target,next_version,cents,unit,'CURRENT',provenance,cutover,cutover) RETURNING id INTO created;
 RETURN created;
END $$;
CREATE VIEW pricing.current_prices WITH (security_barrier=true) AS
 WITH observed AS MATERIALIZED(SELECT statement_timestamp() AS at)
 SELECT product_id,amount_cents,currency,source FROM pricing.price_revision CROSS JOIN observed
 WHERE state='CURRENT' AND starts_at<=observed.at AND ends_at IS NULL;
GRANT USAGE ON SCHEMA pricing TO atlas_pricing_runtime;
GRANT SELECT ON pricing.current_prices TO atlas_pricing_runtime;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA pricing FROM PUBLIC;
COMMIT;
