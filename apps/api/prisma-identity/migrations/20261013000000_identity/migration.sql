-- ID-01 disposable-only migration. Never run on a shared/remote database.
CREATE SCHEMA IF NOT EXISTS identity;
CREATE TABLE identity.customer_account (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'PENDING_VERIFICATION' CHECK (status IN ('PENDING_VERIFICATION','ACTIVE','SUSPENDED','DISABLED')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 CHECK (email = lower(btrim(email)) AND length(email) BETWEEN 3 AND 254)
);
CREATE TABLE identity.password_credential (
 account_id uuid PRIMARY KEY REFERENCES identity.customer_account(id) ON DELETE CASCADE,
 hash text NOT NULL CHECK (hash LIKE '$argon2id$%'), version integer NOT NULL DEFAULT 1 CHECK (version > 0)
);
CREATE TABLE identity.auth_session (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 account_id uuid NOT NULL REFERENCES identity.customer_account(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
 session_class text NOT NULL DEFAULT 'CUSTOMER' CHECK (session_class = 'CUSTOMER'),
 credential_version integer NOT NULL CHECK (credential_version > 0), origin text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 last_seen_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expires_at timestamptz NOT NULL, revoked_at timestamptz,
 CHECK (expires_at > created_at)
);
CREATE INDEX auth_session_account_id_revoked_at_idx ON identity.auth_session(account_id, revoked_at);
CREATE TABLE identity.account_token (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 account_id uuid NOT NULL REFERENCES identity.customer_account(id) ON DELETE CASCADE,
 token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[a-f0-9]{64}$'),
 purpose text NOT NULL CHECK (purpose IN ('VERIFY_EMAIL','RESET_PASSWORD')),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), expires_at timestamptz NOT NULL,
 consumed_at timestamptz, invalidated_at timestamptz, CHECK (expires_at > created_at)
);
CREATE INDEX account_token_account_id_purpose_created_at_idx ON identity.account_token(account_id,purpose,created_at);
CREATE UNIQUE INDEX account_token_one_live_purpose ON identity.account_token(account_id,purpose)
 WHERE consumed_at IS NULL AND invalidated_at IS NULL;
CREATE TABLE identity.email_outbox (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 token_id uuid NOT NULL UNIQUE REFERENCES identity.account_token(id) ON DELETE CASCADE,
 payload text NOT NULL,
 status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','DELIVERED','FAILED')),
 attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 10),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 expires_at timestamptz NOT NULL, lease_until timestamptz
);
CREATE INDEX email_outbox_status_lease_until_idx ON identity.email_outbox(status,lease_until);
CREATE TABLE identity.auth_security_event (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 subject_id uuid REFERENCES identity.customer_account(id) ON DELETE SET NULL,
 action text NOT NULL, request_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX auth_security_event_created_at_idx ON identity.auth_security_event(created_at);
CREATE TABLE identity.auth_abuse_window (
 key text NOT NULL CHECK (key ~ '^[a-f0-9]{64}$'), bucket bigint NOT NULL,
 hits integer NOT NULL CHECK (hits > 0), expires_at timestamptz NOT NULL, PRIMARY KEY (key,bucket)
);
CREATE INDEX auth_abuse_window_expires_at_idx ON identity.auth_abuse_window(expires_at);
CREATE ROLE atlas_identity_runtime LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
REVOKE ALL ON DATABASE atlas_identity_id01 FROM PUBLIC;
GRANT CONNECT ON DATABASE atlas_identity_id01 TO atlas_identity_runtime;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA identity TO atlas_identity_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA identity TO atlas_identity_runtime;
REVOKE ALL ON identity._prisma_migrations FROM atlas_identity_runtime;
