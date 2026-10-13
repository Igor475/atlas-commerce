-- Disposable F04-04 fixtures only; custom CHECKs and terminal guard are intentional.
CREATE SCHEMA IF NOT EXISTS spike;
CREATE TABLE spike.stock (
 sku TEXT PRIMARY KEY, on_hand INTEGER NOT NULL, reserved_active INTEGER NOT NULL DEFAULT 0,
 allocated INTEGER NOT NULL DEFAULT 0,
 CONSTRAINT stock_nonnegative CHECK (on_hand >= 0 AND reserved_active >= 0 AND allocated >= 0),
 CONSTRAINT stock_capacity CHECK (on_hand::bigint >= reserved_active::bigint + allocated::bigint)
);
CREATE TABLE spike.reservation (
 id TEXT PRIMARY KEY, actor TEXT NOT NULL, operation TEXT NOT NULL, key TEXT NOT NULL,
 fingerprint TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'ACTIVE',
 created_at TIMESTAMPTZ(6) NOT NULL DEFAULT clock_timestamp(),
 expires_at TIMESTAMPTZ(6) NOT NULL DEFAULT (clock_timestamp() + interval '40 minutes'),
 CONSTRAINT reservation_status CHECK (status IN ('ACTIVE','CONFIRMED','EXPIRED','RELEASED')),
 CONSTRAINT reservation_identity UNIQUE (actor, operation, key)
);
CREATE TABLE spike.reservation_line (
 reservation_id TEXT NOT NULL REFERENCES spike.reservation(id), sku TEXT NOT NULL REFERENCES spike.stock(sku),
 quantity INTEGER NOT NULL CHECK (quantity > 0), PRIMARY KEY (reservation_id,sku)
);
CREATE TABLE spike.simulated_event (
 id TEXT PRIMARY KEY, reservation_id TEXT NOT NULL REFERENCES spike.reservation(id),
 outcome TEXT NOT NULL CHECK (outcome IN ('CONFIRMED','PAYMENT_REVIEW'))
);
CREATE TABLE spike.outbox (
 id TEXT PRIMARY KEY, fact_id TEXT NOT NULL, kind TEXT NOT NULL, owner TEXT,
 lease_until TIMESTAMPTZ(6), created_at TIMESTAMPTZ(6) NOT NULL DEFAULT clock_timestamp(),
 CONSTRAINT outbox_identity UNIQUE (fact_id,kind),
 CONSTRAINT outbox_lease CHECK ((owner IS NULL) = (lease_until IS NULL))
);
CREATE INDEX outbox_pending ON spike.outbox(lease_until,created_at);
CREATE TABLE spike.capture (
 id TEXT PRIMARY KEY, currency TEXT NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
 captured_cents INTEGER NOT NULL CHECK (captured_cents >= 0),
 succeeded_cents INTEGER NOT NULL DEFAULT 0 CHECK (succeeded_cents >= 0),
 pending_cents INTEGER NOT NULL DEFAULT 0 CHECK (pending_cents >= 0),
 CONSTRAINT refund_capacity CHECK (captured_cents::bigint >= succeeded_cents::bigint + pending_cents::bigint)
);
CREATE TABLE spike.refund (
 id TEXT PRIMARY KEY, capture_id TEXT NOT NULL REFERENCES spike.capture(id), key TEXT NOT NULL,
 cents INTEGER NOT NULL CHECK (cents > 0), status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status = 'PENDING'),
 CONSTRAINT refund_identity UNIQUE (capture_id,key)
);
CREATE FUNCTION spike.guard_terminal() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.status <> 'ACTIVE' AND NEW.status <> OLD.status THEN
   RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'fixture terminal state is immutable';
 END IF;
 IF OLD.status = 'ACTIVE' AND NEW.status = 'CONFIRMED' AND clock_timestamp() >= OLD.expires_at THEN
   RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'fixture confirmation deadline has elapsed';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER reservation_terminal BEFORE UPDATE ON spike.reservation
 FOR EACH ROW EXECUTE FUNCTION spike.guard_terminal();
