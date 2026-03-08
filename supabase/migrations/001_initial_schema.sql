-- ============================================================
-- 001_initial_schema.sql
-- Tables, ENUM, triggers, and RLS for the RPOS application
-- ============================================================

BEGIN;

-- ---------- ENUM ----------

CREATE TYPE po_status AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'FULFILLED'
);

-- ---------- buyer ----------

CREATE TABLE buyer (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        varchar(255) NOT NULL,
  description varchar(255),
  address     varchar(255),
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

-- ---------- supplier ----------

CREATE TABLE supplier (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name        varchar(255) NOT NULL,
  cr_no       varchar(100) NOT NULL UNIQUE,
  description varchar(100),
  address     varchar(255),
  created_at  timestamptz  NOT NULL DEFAULT now(),
  updated_at  timestamptz  NOT NULL DEFAULT now()
);

-- ---------- catalogue ----------

CREATE TABLE catalogue (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  supplier_id     bigint       NOT NULL REFERENCES supplier(id),
  name            varchar(255) NOT NULL,
  category        varchar(100) NOT NULL,
  manufacturer    varchar(100) NOT NULL,
  model           varchar(100) NOT NULL,
  price_usd       integer      NOT NULL CHECK (price_usd >= 0),
  lead_time_days  integer      NOT NULL CHECK (lead_time_days >= 0),
  in_stock        boolean      DEFAULT false,
  specifications  jsonb,
  created_at      timestamptz  NOT NULL DEFAULT now(),
  updated_at      timestamptz  NOT NULL DEFAULT now(),

  UNIQUE (id, supplier_id)
);

-- ---------- purchase_order ----------

CREATE TABLE purchase_order (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  po_number        varchar(60)  NOT NULL DEFAULT '' UNIQUE,
  buyer_id         bigint       NOT NULL REFERENCES buyer(id),
  supplier_id      bigint       NOT NULL REFERENCES supplier(id),
  needed_by_date   date,
  payment_terms    varchar(20),
  cost_center      varchar(100),
  status           po_status    NOT NULL DEFAULT 'DRAFT',
  created_at       timestamptz  NOT NULL DEFAULT now(),
  updated_at       timestamptz  NOT NULL DEFAULT now(),

  UNIQUE (id, supplier_id)
);

-- ---------- po_line_items ----------

CREATE TABLE po_line_items (
  id            bigint  GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  po_id         bigint  NOT NULL,
  catalogue_id  bigint  NOT NULL,
  supplier_id   bigint  NOT NULL REFERENCES supplier(id),
  quantity      integer NOT NULL CHECK (quantity > 0),
  unit_price    integer NOT NULL CHECK (unit_price >= 0),
  line_total    integer GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT fk_line_catalogue
    FOREIGN KEY (catalogue_id, supplier_id)
    REFERENCES catalogue(id, supplier_id),

  CONSTRAINT fk_line_po
    FOREIGN KEY (po_id, supplier_id)
    REFERENCES purchase_order(id, supplier_id)
    ON DELETE CASCADE
);

-- ---------- po_status_timeline ----------

CREATE TABLE po_status_timeline (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  po_id       bigint    NOT NULL REFERENCES purchase_order(id) ON DELETE CASCADE,
  from_status po_status,
  to_status   po_status NOT NULL,
  notes       varchar(255),
  changed_by  bigint    NOT NULL REFERENCES buyer(id),
  changed_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------- po_sequences (counter for po_number generation) ----------

CREATE TABLE po_sequences (
  supplier_id bigint PRIMARY KEY REFERENCES supplier(id),
  current_seq integer NOT NULL DEFAULT 0
);

-- ---------- idempotency_cache ----------

CREATE TABLE idempotency_cache (
  key         text        PRIMARY KEY,
  response    jsonb       NOT NULL,
  status_code integer     DEFAULT 200,
  created_at  timestamptz DEFAULT now(),
  expires_at  timestamptz NOT NULL
);

-- ============================================================
-- po_number generation trigger
-- Pattern: {buyer_id}-PO-{supplier_id}-{yyyy}-PO-{zero_padded_seq}
-- ============================================================

CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_seq     integer;
  v_year    text;
BEGIN
  INSERT INTO po_sequences (supplier_id, current_seq)
  VALUES (NEW.supplier_id, 1)
  ON CONFLICT (supplier_id) DO UPDATE
    SET current_seq = po_sequences.current_seq + 1
  RETURNING current_seq INTO v_seq;

  v_year := to_char(now(), 'YYYY');

  NEW.po_number := NEW.buyer_id::text
    || '-PO-' || NEW.supplier_id::text
    || '-'    || v_year
    || '-PO-' || lpad(v_seq::text, 4, '0');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_generate_po_number
  BEFORE INSERT ON purchase_order
  FOR EACH ROW
  EXECUTE FUNCTION generate_po_number();

-- ============================================================
-- Row-Level Security
-- ============================================================

ALTER TABLE buyer              ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier           ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalogue          ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order     ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_line_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_status_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_sequences       ENABLE ROW LEVEL SECURITY;
ALTER TABLE idempotency_cache  ENABLE ROW LEVEL SECURITY;

-- Read-only access for anon on reference / transactional tables
CREATE POLICY buyer_select              ON buyer              FOR SELECT TO anon USING (true);
CREATE POLICY supplier_select           ON supplier           FOR SELECT TO anon USING (true);
CREATE POLICY catalogue_select          ON catalogue          FOR SELECT TO anon USING (true);
CREATE POLICY purchase_order_select     ON purchase_order     FOR SELECT TO anon USING (true);
CREATE POLICY po_line_items_select      ON po_line_items      FOR SELECT TO anon USING (true);
CREATE POLICY po_status_timeline_select ON po_status_timeline FOR SELECT TO anon USING (true);

-- po_sequences and idempotency_cache: no direct access (mutations via SECURITY DEFINER RPCs only)

COMMIT;
