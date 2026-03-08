-- ============================================================
-- 002_indexes.sql
-- Performance indexes for the RPOS application
-- ============================================================
--
-- Indexes auto-created by PRIMARY KEY / UNIQUE constraints in 001:
--   buyer_pkey, supplier_pkey, supplier_cr_no_unique,
--   catalogue_pkey, catalogue_id_supplier_id_key,
--   purchase_order_pkey, purchase_order_po_number_key,
--   purchase_order_id_supplier_id_key,
--   po_line_items_pkey, po_status_timeline_pkey,
--   po_sequences_pkey, idempotency_cache_pkey
-- ============================================================

BEGIN;

-- =========================
-- catalogue
-- =========================

CREATE INDEX catalogue_supplier_id_idx
  ON catalogue (supplier_id);

CREATE INDEX catalogue_category_idx
  ON catalogue (category);

-- Partial index: only rows currently in stock
CREATE INDEX catalogue_in_stock_idx
  ON catalogue (id)
  WHERE in_stock = true;

CREATE INDEX catalogue_price_usd_idx
  ON catalogue (price_usd);

CREATE INDEX catalogue_lead_time_days_idx
  ON catalogue (lead_time_days);

-- Composite: fast lookup for items by supplier + name
CREATE INDEX catalogue_supplier_name_idx
  ON catalogue (supplier_id, name);

-- GIN full-text search across name, model, manufacturer
CREATE INDEX catalogue_search_idx
  ON catalogue
  USING gin (to_tsvector('english', name || ' ' || model || ' ' || manufacturer));

-- =========================
-- purchase_order
-- =========================

CREATE INDEX purchase_order_buyer_id_idx
  ON purchase_order (buyer_id);

CREATE INDEX purchase_order_supplier_id_idx
  ON purchase_order (supplier_id);

CREATE INDEX purchase_order_status_idx
  ON purchase_order (status);

-- Composite: filter POs by buyer + status (dashboard queries)
CREATE INDEX purchase_order_buyer_status_idx
  ON purchase_order (buyer_id, status);

CREATE INDEX purchase_order_created_at_idx
  ON purchase_order (created_at DESC);

-- =========================
-- po_line_items
-- =========================

CREATE INDEX po_line_items_po_id_idx
  ON po_line_items (po_id);

CREATE INDEX po_line_items_catalogue_id_idx
  ON po_line_items (catalogue_id);

CREATE INDEX po_line_items_supplier_id_idx
  ON po_line_items (supplier_id);

-- Composite: join acceleration for lines by PO + supplier
CREATE INDEX po_line_items_po_supplier_idx
  ON po_line_items (po_id, supplier_id);

-- =========================
-- po_status_timeline
-- =========================

CREATE INDEX po_status_timeline_po_id_idx
  ON po_status_timeline (po_id);

CREATE INDEX po_status_timeline_changed_by_idx
  ON po_status_timeline (changed_by);

-- Composite: timeline ordered by changed_at within a PO
CREATE INDEX po_status_timeline_po_id_changed_at_idx
  ON po_status_timeline (po_id, changed_at ASC);

-- =========================
-- idempotency_cache
-- =========================

-- TTL cleanup: enables efficient expiry scans
CREATE INDEX idempotency_cache_expires_at_idx
  ON idempotency_cache (expires_at);

COMMIT;
