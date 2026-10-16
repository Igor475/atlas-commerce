BEGIN;
DO $$ BEGIN
 IF current_database()<>'atlas_profile_cp01' OR current_user<>'atlas_profile_migrator' OR current_setting('atlas.profile_fixture',true) IS DISTINCT FROM 'atlas-cp01-disposable' OR current_setting('server_version_num')::int NOT BETWEEN 170000 AND 179999 THEN RAISE EXCEPTION 'CP_FIXTURE_REQUIRED'; END IF;
END $$;
CREATE SCHEMA IF NOT EXISTS customer_profile;
DO $$ BEGIN IF NOT EXISTS(SELECT 1 FROM pg_namespace WHERE nspname='customer_profile' AND nspowner=current_user::regrole) THEN RAISE EXCEPTION 'CP_SCHEMA_OWNER_REQUIRED'; END IF; END $$;
REVOKE ALL ON SCHEMA customer_profile FROM PUBLIC;
CREATE TABLE customer_profile.fixture_account(id uuid PRIMARY KEY,active boolean NOT NULL,verified boolean NOT NULL,purpose text NOT NULL CHECK(purpose='TEST_ONLY'));
CREATE TABLE customer_profile.fixture_principal(role_name text PRIMARY KEY CHECK(role_name IN ('atlas_profile_actor_a','atlas_profile_actor_b')),account_id uuid NOT NULL REFERENCES customer_profile.fixture_account(id),session_class text NOT NULL CHECK(session_class='CUSTOMER'));
CREATE TABLE customer_profile.address(id uuid PRIMARY KEY,account_id uuid NOT NULL REFERENCES customer_profile.fixture_account(id),current_version integer NOT NULL CHECK(current_version>0),UNIQUE(id,account_id));
CREATE INDEX address_owner ON customer_profile.address(account_id,id);
CREATE TABLE customer_profile.revision(
 address_id uuid NOT NULL,account_id uuid NOT NULL,version integer NOT NULL CHECK(version>0),
 purpose text NOT NULL CHECK(purpose='TEST_ONLY'),eligibility text NOT NULL CHECK(eligibility IN ('ELIGIBLE','INELIGIBLE','RETIRED')),
 recipient text NOT NULL CHECK(length(recipient) BETWEEN 1 AND 160),country text NOT NULL CHECK(country='BR'),
 postal_code text NOT NULL CHECK(postal_code ~ '^[0-9]{8}$'),region text NOT NULL CHECK(region ~ '^[A-Z]{2}$'),
 city text NOT NULL CHECK(length(city) BETWEEN 1 AND 160),district text NOT NULL CHECK(length(district) BETWEEN 1 AND 160),
 street text NOT NULL CHECK(length(street) BETWEEN 1 AND 160),number text NOT NULL CHECK(length(number) BETWEEN 1 AND 160),
 complement text CHECK(length(complement)<=160),created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(address_id,version),FOREIGN KEY(address_id,account_id) REFERENCES customer_profile.address(id,account_id)
);
ALTER TABLE customer_profile.address ADD CONSTRAINT current_revision FOREIGN KEY(id,current_version) REFERENCES customer_profile.revision(address_id,version) DEFERRABLE INITIALLY DEFERRED;
CREATE TABLE customer_profile.request(account_id uuid NOT NULL REFERENCES customer_profile.fixture_account(id),key uuid NOT NULL,fingerprint text NOT NULL CHECK(fingerprint ~ '^[0-9a-f]{64}$'),address_id uuid NOT NULL,revision integer,PRIMARY KEY(account_id,key),FOREIGN KEY(address_id,revision) REFERENCES customer_profile.revision(address_id,version));
CREATE FUNCTION customer_profile.immutable() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN RAISE EXCEPTION 'CP_IMMUTABLE'; END $$;
CREATE TRIGGER revision_immutable BEFORE UPDATE OR DELETE ON customer_profile.revision FOR EACH ROW EXECUTE FUNCTION customer_profile.immutable();
CREATE FUNCTION customer_profile.address_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'CP_IMMUTABLE'; END IF;
 IF NEW.id<>OLD.id OR NEW.account_id<>OLD.account_id OR NEW.current_version<>OLD.current_version+1 THEN RAISE EXCEPTION 'CP_IMMUTABLE'; END IF;RETURN NEW;
END $$;
CREATE TRIGGER address_guard BEFORE UPDATE OR DELETE ON customer_profile.address FOR EACH ROW EXECUTE FUNCTION customer_profile.address_guard();
CREATE FUNCTION customer_profile.request_guard() RETURNS trigger LANGUAGE plpgsql SET search_path=pg_catalog AS $$ BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'CP_IMMUTABLE'; END IF;
 IF (to_jsonb(NEW)-'revision')<>(to_jsonb(OLD)-'revision') OR OLD.revision IS NOT NULL OR NEW.revision IS NULL THEN RAISE EXCEPTION 'CP_IMMUTABLE'; END IF;RETURN NEW;
END $$;
CREATE TRIGGER request_guard BEFORE UPDATE OR DELETE ON customer_profile.request FOR EACH ROW EXECUTE FUNCTION customer_profile.request_guard();
CREATE FUNCTION customer_profile.assert_actor(p_actor uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$ BEGIN
 IF current_database()<>'atlas_profile_cp01' OR current_setting('atlas.profile_fixture',true) IS DISTINCT FROM 'atlas-cp01-disposable' THEN RAISE EXCEPTION 'CP_FIXTURE_REQUIRED'; END IF;
 PERFORM 1 FROM customer_profile.fixture_principal p JOIN customer_profile.fixture_account a ON a.id=p.account_id WHERE p.role_name=session_user AND p.account_id=p_actor AND p.session_class='CUSTOMER' AND a.active AND a.verified AND a.purpose='TEST_ONLY' FOR SHARE OF p,a;
 IF NOT FOUND THEN RAISE EXCEPTION 'CP_UNAUTHENTICATED'; END IF;
END $$;
CREATE FUNCTION customer_profile.project(p_id uuid,p_version int) RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=pg_catalog AS $$
 SELECT jsonb_build_object('addressId',address_id,'addressVersion',version,'purpose',purpose,'postalAddress',jsonb_build_object('recipient',recipient,'country',country,'postalCode',postal_code,'region',region,'city',city,'district',district,'street',street,'number',number,'complement',complement)) FROM customer_profile.revision WHERE address_id=p_id AND version=p_version
$$;
CREATE FUNCTION customer_profile.change(p_actor uuid,p_key uuid,p_id uuid,p_expected int,p_postal jsonb,p_state text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE fp text; req customer_profile.request; addr customer_profile.address; v int; f text;
BEGIN
 PERFORM customer_profile.assert_actor(p_actor);
 IF p_key IS NULL OR p_id IS NULL OR p_expected IS NULL OR p_expected<0 OR p_state IS NULL OR p_state NOT IN ('ELIGIBLE','INELIGIBLE','RETIRED') OR p_postal IS NULL OR jsonb_typeof(p_postal)<>'object' THEN RAISE EXCEPTION 'CP_INVALID_REQUEST'; END IF;
 IF (SELECT count(*) FROM jsonb_object_keys(p_postal))<>9 OR NOT(p_postal ?& ARRAY['recipient','country','postalCode','region','city','district','street','number','complement']) THEN RAISE EXCEPTION 'CP_INVALID_REQUEST'; END IF;
 FOREACH f IN ARRAY ARRAY['recipient','country','postalCode','region','city','district','street','number'] LOOP
  IF jsonb_typeof(p_postal->f)<>'string' OR length(p_postal->>f) NOT BETWEEN 1 AND 160 OR (p_postal->>f) ~ '[[:cntrl:]]' THEN RAISE EXCEPTION 'CP_INVALID_REQUEST'; END IF;
 END LOOP;
 IF p_postal->>'country'<>'BR' OR (p_postal->>'postalCode') !~ '^[0-9]{8}$' OR (p_postal->>'region') !~ '^[A-Z]{2}$' OR (jsonb_typeof(p_postal->'complement') NOT IN ('null','string')) OR length(p_postal->>'complement')>160 OR (p_postal->>'complement') ~ '[[:cntrl:]]' THEN RAISE EXCEPTION 'CP_INVALID_REQUEST'; END IF;
 fp:=encode(sha256(convert_to(jsonb_build_array('CHANGE_TEST_ONLY_V1',p_id,p_expected,p_postal,p_state)::text,'UTF8')),'hex');
 INSERT INTO customer_profile.request VALUES(p_actor,p_key,fp,p_id,NULL) ON CONFLICT DO NOTHING;
 SELECT * INTO STRICT req FROM customer_profile.request WHERE account_id=p_actor AND key=p_key FOR UPDATE;
 IF req.fingerprint<>fp THEN RAISE EXCEPTION 'CP_IDEMPOTENCY_CONFLICT'; END IF;
 IF req.revision IS NOT NULL THEN RETURN customer_profile.project(req.address_id,req.revision); END IF;
 IF p_expected=0 THEN
  INSERT INTO customer_profile.address VALUES(p_id,p_actor,1) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RAISE EXCEPTION 'CP_VERSION_CONFLICT'; END IF;v:=1;
 ELSE
  SELECT * INTO addr FROM customer_profile.address WHERE id=p_id AND account_id=p_actor FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CP_RESOURCE_NOT_FOUND'; END IF;
  IF addr.current_version<>p_expected OR addr.current_version=2147483647 OR EXISTS(SELECT 1 FROM customer_profile.revision WHERE address_id=p_id AND version=addr.current_version AND eligibility='RETIRED') THEN RAISE EXCEPTION 'CP_VERSION_CONFLICT'; END IF;
  v:=addr.current_version+1;
  UPDATE customer_profile.address SET current_version=v WHERE id=p_id;
 END IF;
 INSERT INTO customer_profile.revision(address_id,account_id,version,purpose,eligibility,recipient,country,postal_code,region,city,district,street,number,complement) VALUES(p_id,p_actor,v,'TEST_ONLY',p_state,p_postal->>'recipient',p_postal->>'country',p_postal->>'postalCode',p_postal->>'region',p_postal->>'city',p_postal->>'district',p_postal->>'street',p_postal->>'number',p_postal->>'complement');
 UPDATE customer_profile.request SET revision=v WHERE account_id=p_actor AND key=p_key;
 RETURN customer_profile.project(p_id,v);
END $$;
CREATE FUNCTION customer_profile.snapshot_for_order(p_actor uuid,p_id uuid,p_expected int) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE addr customer_profile.address;
BEGIN
 PERFORM customer_profile.assert_actor(p_actor);
 SELECT * INTO addr FROM customer_profile.address WHERE id=p_id AND account_id=p_actor FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'CP_RESOURCE_NOT_FOUND'; END IF;
 IF p_expected IS NULL OR addr.current_version<>p_expected THEN RAISE EXCEPTION 'CP_VERSION_CONFLICT'; END IF;
 IF NOT EXISTS(SELECT 1 FROM customer_profile.revision WHERE address_id=p_id AND version=addr.current_version AND eligibility='ELIGIBLE') THEN RAISE EXCEPTION 'CP_RESOURCE_NOT_FOUND'; END IF;
 RETURN customer_profile.project(p_id,addr.current_version);
END $$;
CREATE FUNCTION customer_profile.read_for_quote(p_actor uuid,p_id uuid) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog AS $$
DECLARE addr customer_profile.address; snap jsonb;
BEGIN
 PERFORM customer_profile.assert_actor(p_actor);
 SELECT * INTO addr FROM customer_profile.address WHERE id=p_id AND account_id=p_actor FOR SHARE;
 IF NOT FOUND THEN RAISE EXCEPTION 'CP_RESOURCE_NOT_FOUND'; END IF;
 snap:=customer_profile.snapshot_for_order(p_actor,p_id,addr.current_version);
 RETURN jsonb_build_object('addressId',p_id,'addressVersion',addr.current_version,'country',snap->'postalAddress'->'country','postalCode',snap->'postalAddress'->'postalCode','eligible',true);
END $$;
GRANT USAGE ON SCHEMA customer_profile TO atlas_profile_executor,atlas_profile_actor_a,atlas_profile_actor_b;
GRANT SELECT ON ALL TABLES IN SCHEMA customer_profile TO atlas_profile_executor;
GRANT INSERT ON customer_profile.address,customer_profile.revision,customer_profile.request TO atlas_profile_executor;
GRANT UPDATE(current_version) ON customer_profile.address TO atlas_profile_executor;
GRANT UPDATE(revision) ON customer_profile.request TO atlas_profile_executor;
GRANT UPDATE(id) ON customer_profile.fixture_account TO atlas_profile_executor;
GRANT UPDATE(role_name) ON customer_profile.fixture_principal TO atlas_profile_executor;
GRANT CREATE ON SCHEMA customer_profile TO atlas_profile_executor;
ALTER FUNCTION customer_profile.assert_actor(uuid) OWNER TO atlas_profile_executor;
ALTER FUNCTION customer_profile.project(uuid,int) OWNER TO atlas_profile_executor;
ALTER FUNCTION customer_profile.change(uuid,uuid,uuid,int,jsonb,text) OWNER TO atlas_profile_executor;
ALTER FUNCTION customer_profile.snapshot_for_order(uuid,uuid,int) OWNER TO atlas_profile_executor;
ALTER FUNCTION customer_profile.read_for_quote(uuid,uuid) OWNER TO atlas_profile_executor;
REVOKE CREATE ON SCHEMA customer_profile FROM atlas_profile_executor;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA customer_profile FROM PUBLIC;
GRANT EXECUTE ON FUNCTION customer_profile.change(uuid,uuid,uuid,int,jsonb,text),customer_profile.snapshot_for_order(uuid,uuid,int),customer_profile.read_for_quote(uuid,uuid) TO atlas_profile_actor_a,atlas_profile_actor_b;
COMMIT;
