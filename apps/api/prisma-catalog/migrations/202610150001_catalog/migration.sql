-- Local CAT-01 only; runner verifies the same identity BEFORE Prisma creates its history.
BEGIN;
DO $$ BEGIN
  IF current_database()<>'atlas_catalog_cat01' OR current_user<>'atlas_catalog_migrator'
    OR current_setting('atlas.catalog_fixture',true) IS DISTINCT FROM 'atlas-cat01-disposable'
    OR current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999
  THEN RAISE EXCEPTION 'CATALOG_DISPOSABLE_FIXTURE_REQUIRED'; END IF;
END $$;
-- Prisma Migrate creates its history schema before applying the first migration.
CREATE SCHEMA IF NOT EXISTS catalog;
REVOKE ALL ON SCHEMA catalog FROM PUBLIC;
CREATE TABLE catalog.work (
  id uuid PRIMARY KEY, title varchar(300) NOT NULL CHECK (length(btrim(title))>0),
  status varchar(16) NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PUBLISHED','UNPUBLISHED'))
);
CREATE TABLE catalog.author(id uuid PRIMARY KEY,name varchar(200) NOT NULL CHECK(length(btrim(name))>0));
CREATE TABLE catalog.publisher(id uuid PRIMARY KEY,name varchar(200) NOT NULL CHECK(length(btrim(name))>0));
CREATE TABLE catalog.work_author(
  work_id uuid NOT NULL REFERENCES catalog.work(id) ON DELETE RESTRICT,
  author_id uuid NOT NULL REFERENCES catalog.author(id) ON DELETE RESTRICT, PRIMARY KEY(work_id,author_id)
);
CREATE TABLE catalog.edition(
  id uuid PRIMARY KEY, work_id uuid NOT NULL REFERENCES catalog.work(id) ON DELETE RESTRICT,
  publisher_id uuid NOT NULL REFERENCES catalog.publisher(id) ON DELETE RESTRICT,
  label varchar(200) NOT NULL CHECK(length(btrim(label))>0), language varchar(35) NOT NULL CHECK(length(btrim(language))>0),
  isbn varchar(17), status varchar(16) NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PUBLISHED','UNPUBLISHED'))
);
CREATE TABLE catalog.product(
  id uuid PRIMARY KEY, sku varchar(64) NOT NULL UNIQUE CHECK(sku ~ '^[A-Z0-9][A-Z0-9._-]{0,63}$'),
  title varchar(300) NOT NULL CHECK(length(btrim(title))>0), description varchar(5000) NOT NULL DEFAULT '',
  product_type varchar(24) NOT NULL CHECK(product_type IN ('PHYSICAL_BOOK','EBOOK','DIGITAL_MAGAZINE','KIT')),
  edition_id uuid REFERENCES catalog.edition(id) ON DELETE RESTRICT,
  status varchar(16) NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','PUBLISHED','UNPUBLISHED')),
  composition_version integer NOT NULL DEFAULT 1 CHECK(composition_version=1), sealed boolean NOT NULL DEFAULT false,
  CHECK((product_type='KIT' AND edition_id IS NULL) OR (product_type<>'KIT' AND edition_id IS NOT NULL))
);
CREATE TABLE catalog.category(id uuid PRIMARY KEY,name varchar(200) NOT NULL CHECK(length(btrim(name))>0));
CREATE TABLE catalog.product_category(
  product_id uuid NOT NULL REFERENCES catalog.product(id) ON DELETE RESTRICT,
  category_id uuid NOT NULL REFERENCES catalog.category(id) ON DELETE RESTRICT,PRIMARY KEY(product_id,category_id)
);
CREATE TABLE catalog.kit_composition(
  kit_id uuid NOT NULL REFERENCES catalog.product(id) ON DELETE RESTRICT,
  component_id uuid NOT NULL REFERENCES catalog.product(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK(quantity BETWEEN 1 AND 9999),PRIMARY KEY(kit_id,component_id),CHECK(kit_id<>component_id)
);
-- Serialize edits to a kit and its composition on the kit row; no advisory/global PUBLIC changes.
CREATE FUNCTION catalog.guard_composition() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
DECLARE parent catalog.product; child catalog.product; target uuid;
BEGIN
  target:=CASE WHEN TG_OP='DELETE' THEN OLD.kit_id ELSE NEW.kit_id END;
  IF TG_OP='UPDATE' AND (NEW.kit_id<>OLD.kit_id OR NEW.component_id<>OLD.component_id) THEN RAISE EXCEPTION 'CATALOG_COMPOSITION_ID_IMMUTABLE'; END IF;
  SELECT * INTO parent FROM catalog.product WHERE id=target FOR UPDATE;
  IF NOT FOUND OR parent.product_type<>'KIT' OR parent.sealed THEN RAISE EXCEPTION 'CATALOG_COMPOSITION_REJECTED'; END IF;
  IF TG_OP<>'DELETE' THEN
    SELECT * INTO child FROM catalog.product WHERE id=NEW.component_id;
    IF NOT FOUND OR child.product_type='KIT' THEN RAISE EXCEPTION 'CATALOG_SIMPLE_KIT_REQUIRED'; END IF;
    IF TG_OP='INSERT' AND (SELECT count(*) FROM catalog.kit_composition WHERE kit_id=target)>=100 THEN RAISE EXCEPTION 'CATALOG_COMPONENT_LIMIT'; END IF;
    RETURN NEW;
  END IF;
  RETURN OLD;
END $$;
CREATE TRIGGER composition_guard BEFORE INSERT OR UPDATE OR DELETE ON catalog.kit_composition FOR EACH ROW EXECUTE FUNCTION catalog.guard_composition();
CREATE FUNCTION catalog.guard_product() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$
BEGIN
  IF TG_OP='UPDATE' AND (NEW.id<>OLD.id OR NEW.sku<>OLD.sku OR NEW.product_type<>OLD.product_type OR NEW.edition_id IS DISTINCT FROM OLD.edition_id OR (OLD.sealed AND NOT NEW.sealed)) THEN RAISE EXCEPTION 'CATALOG_STABLE_IDENTITY'; END IF;
  IF NEW.status='PUBLISHED' THEN
    IF NEW.product_type='KIT' THEN
      IF NOT EXISTS(SELECT 1 FROM catalog.kit_composition WHERE kit_id=NEW.id) OR EXISTS(
        SELECT 1 FROM catalog.kit_composition k JOIN catalog.product p ON p.id=k.component_id
        JOIN catalog.edition e ON e.id=p.edition_id JOIN catalog.work w ON w.id=e.work_id
        WHERE k.kit_id=NEW.id AND (p.status<>'PUBLISHED' OR e.status<>'PUBLISHED' OR w.status<>'PUBLISHED')
      ) THEN RAISE EXCEPTION 'CATALOG_KIT_NOT_PUBLISHABLE'; END IF;
      NEW.sealed:=true;
    ELSIF NOT EXISTS(SELECT 1 FROM catalog.edition e JOIN catalog.work w ON w.id=e.work_id WHERE e.id=NEW.edition_id AND e.status='PUBLISHED' AND w.status='PUBLISHED') THEN
      RAISE EXCEPTION 'CATALOG_EDITORIAL_NOT_PUBLISHABLE';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER product_guard BEFORE INSERT OR UPDATE ON catalog.product FOR EACH ROW EXECUTE FUNCTION catalog.guard_product();
-- Owner view exposes only published editorial projections, never raw tables to runtime.
CREATE VIEW catalog.public_products WITH (security_barrier=true) AS
SELECT p.id,p.title,p.product_type,p.description FROM catalog.product p
LEFT JOIN catalog.edition e ON e.id=p.edition_id LEFT JOIN catalog.work w ON w.id=e.work_id
WHERE p.status='PUBLISHED' AND (
 (p.product_type<>'KIT' AND e.status='PUBLISHED' AND w.status='PUBLISHED') OR
 (p.product_type='KIT' AND p.sealed AND EXISTS(SELECT 1 FROM catalog.kit_composition WHERE kit_id=p.id) AND NOT EXISTS(
   SELECT 1 FROM catalog.kit_composition k JOIN catalog.product c ON c.id=k.component_id
   LEFT JOIN catalog.edition ce ON ce.id=c.edition_id LEFT JOIN catalog.work cw ON cw.id=ce.work_id
   WHERE k.kit_id=p.id AND (c.status<>'PUBLISHED' OR c.product_type='KIT' OR ce.status IS DISTINCT FROM 'PUBLISHED' OR cw.status IS DISTINCT FROM 'PUBLISHED')
 )));
-- Partial index supports deterministic public keyset scans; PKs support FK/kit lookups.
CREATE INDEX product_published_id ON catalog.product(id) WHERE status='PUBLISHED';
GRANT USAGE ON SCHEMA catalog TO atlas_catalog_runtime;
GRANT SELECT ON catalog.public_products TO atlas_catalog_runtime;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA catalog FROM PUBLIC;
COMMIT;
