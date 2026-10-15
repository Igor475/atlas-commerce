DO $$ BEGIN IF current_database()<>'atlas_catalog_cat01' OR current_user<>'atlas_catalog_migrator' OR current_setting('atlas.quotes_fixture',true) IS DISTINCT FROM 'atlas-qte01-disposable' THEN RAISE EXCEPTION 'QUOTE_FIXTURE_REQUIRED'; END IF;END $$;
CREATE ROLE atlas_quotes_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE atlas_quotes_executor NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
CREATE ROLE atlas_quotes_actor_a LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 5;
CREATE ROLE atlas_quotes_actor_b LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS CONNECTION LIMIT 5;
GRANT atlas_quotes_executor TO atlas_quotes_migrator;
GRANT CREATE,CONNECT ON DATABASE atlas_catalog_cat01 TO atlas_quotes_migrator;
ALTER ROLE atlas_quotes_actor_a SET statement_timeout='2500ms';
ALTER ROLE atlas_quotes_actor_b SET statement_timeout='2500ms';
