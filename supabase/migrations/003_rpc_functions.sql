-- ============================================================
-- 003_rpc_functions.sql
-- RPC functions for the RPOS application.
-- All RPCs use SECURITY DEFINER and return jsonb.
-- ============================================================

BEGIN;

-- ============================================================
-- Helper: _build_po_response
-- Assembles the full PurchaseOrder shape expected by the frontend.
-- Casts all bigint IDs to text in the JSON output.
-- Returns header as null when all three header columns are NULL.
-- ============================================================

CREATE OR REPLACE FUNCTION _build_po_response(p_po_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_po       record;
  v_lines    jsonb;
  v_timeline jsonb;
  v_header   jsonb;
BEGIN
  SELECT
    po.id,
    po.po_number,
    po.buyer_id,
    po.supplier_id,
    s.name  AS supplier_name,
    b.name  AS buyer_name,
    po.status,
    po.cost_center,
    po.needed_by_date,
    po.payment_terms,
    po.created_at,
    po.updated_at
  INTO v_po
  FROM purchase_order po
  JOIN supplier s ON s.id = po.supplier_id
  JOIN buyer    b ON b.id = po.buyer_id
  WHERE po.id = p_po_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order % not found', p_po_id;
  END IF;

  -- Line items enriched with catalogue name, model, lead_time_days
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',           li.id::text,
      'poId',         li.po_id::text,
      'catalogueId',  li.catalogue_id::text,
      'supplierId',   li.supplier_id::text,
      'name',         c.name,
      'model',        c.model,
      'quantity',      li.quantity,
      'unitPrice',     li.unit_price,
      'lineTotal',     li.line_total,
      'leadTimeDays',  c.lead_time_days
    ) ORDER BY li.id
  ), '[]'::jsonb)
  INTO v_lines
  FROM po_line_items li
  JOIN catalogue c ON c.id = li.catalogue_id
  WHERE li.po_id = p_po_id;

  -- Status timeline ordered chronologically
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id',         st.id::text,
      'poId',       st.po_id::text,
      'fromStatus', st.from_status,
      'toStatus',   st.to_status,
      'changedBy',  st.changed_by::text,
      'changedAt',  st.changed_at,
      'notes',      st.notes
    ) ORDER BY st.changed_at ASC
  ), '[]'::jsonb)
  INTO v_timeline
  FROM po_status_timeline st
  WHERE st.po_id = p_po_id;

  -- Header is null when no header data has been saved yet
  IF v_po.cost_center IS NULL
     AND v_po.needed_by_date IS NULL
     AND v_po.payment_terms IS NULL THEN
    v_header := 'null'::jsonb;
  ELSE
    v_header := jsonb_build_object(
      'requestor',    v_po.buyer_name,
      'costCenter',   v_po.cost_center,
      'neededByDate', v_po.needed_by_date,
      'paymentTerms', v_po.payment_terms
    );
  END IF;

  RETURN jsonb_build_object(
    'id',              v_po.id::text,
    'poNumber',        v_po.po_number,
    'buyerId',         v_po.buyer_id::text,
    'supplierId',      v_po.supplier_id::text,
    'supplierName',    v_po.supplier_name,
    'status',          v_po.status,
    'header',          v_header,
    'lineItems',       v_lines,
    'statusTimeline',  v_timeline,
    'createdAt',       v_po.created_at,
    'updatedAt',       v_po.updated_at
  );
END;
$$;

-- ============================================================
-- rpc_create_draft
-- Creates a new DRAFT PO with the given line items.
-- All items must belong to the same supplier.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_create_draft(
  p_idempotency_key text,
  p_buyer_id        bigint,
  p_line_items      jsonb   -- [{ "catalogueId": "1", "quantity": 2 }, ...]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cached      jsonb;
  v_supplier_id bigint;
  v_po_id       bigint;
  v_response    jsonb;
BEGIN
  SELECT response INTO v_cached
  FROM idempotency_cache
  WHERE key = p_idempotency_key AND expires_at > now();
  IF FOUND THEN RETURN v_cached; END IF;

  IF p_line_items IS NULL OR jsonb_array_length(p_line_items) = 0 THEN
    RAISE EXCEPTION 'At least one line item is required';
  END IF;

  -- Resolve supplier from first catalogue item
  SELECT c.supplier_id INTO v_supplier_id
  FROM catalogue c
  WHERE c.id = (p_line_items -> 0 ->> 'catalogueId')::bigint;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Catalogue item % not found', p_line_items -> 0 ->> 'catalogueId';
  END IF;

  -- Validate all items belong to the same supplier
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_line_items) AS elem
    JOIN catalogue c ON c.id = (elem ->> 'catalogueId')::bigint
    WHERE c.supplier_id <> v_supplier_id
  ) THEN
    RAISE EXCEPTION 'All line items must belong to the same supplier';
  END IF;

  -- Create PO (trigger generates po_number)
  INSERT INTO purchase_order (buyer_id, supplier_id)
  VALUES (p_buyer_id, v_supplier_id)
  RETURNING id INTO v_po_id;

  -- Bulk-insert line items with current catalogue prices
  INSERT INTO po_line_items (po_id, catalogue_id, supplier_id, quantity, unit_price)
  SELECT
    v_po_id,
    (elem ->> 'catalogueId')::bigint,
    v_supplier_id,
    GREATEST(COALESCE((elem ->> 'quantity')::integer, 1), 1),
    c.price_usd
  FROM jsonb_array_elements(p_line_items) AS elem
  JOIN catalogue c ON c.id = (elem ->> 'catalogueId')::bigint;

  INSERT INTO po_status_timeline (po_id, from_status, to_status, changed_by)
  VALUES (v_po_id, NULL, 'DRAFT', p_buyer_id);

  v_response := _build_po_response(v_po_id);

  INSERT INTO idempotency_cache (key, response, expires_at)
  VALUES (p_idempotency_key, v_response, now() + interval '24 hours')
  ON CONFLICT (key) DO NOTHING;

  RETURN v_response;
END;
$$;

-- ============================================================
-- rpc_add_line
-- Adds a catalogue item to an existing DRAFT PO.
-- UPSERTs: increments quantity if the catalogue item already exists.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_add_line(
  p_idempotency_key text,
  p_po_id           bigint,
  p_catalogue_id    bigint,
  p_quantity        integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cached          jsonb;
  v_po_supplier_id  bigint;
  v_po_status       po_status;
  v_cat_supplier_id bigint;
  v_cat_price       integer;
  v_response        jsonb;
BEGIN
  SELECT response INTO v_cached
  FROM idempotency_cache
  WHERE key = p_idempotency_key AND expires_at > now();
  IF FOUND THEN RETURN v_cached; END IF;

  SELECT supplier_id, status INTO v_po_supplier_id, v_po_status
  FROM purchase_order
  WHERE id = p_po_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order % not found', p_po_id;
  END IF;
  IF v_po_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Purchase order is not in DRAFT status';
  END IF;

  SELECT c.supplier_id, c.price_usd
  INTO v_cat_supplier_id, v_cat_price
  FROM catalogue c
  WHERE c.id = p_catalogue_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Catalogue item % not found', p_catalogue_id;
  END IF;
  IF v_cat_supplier_id <> v_po_supplier_id THEN
    RAISE EXCEPTION 'Catalogue item belongs to a different supplier';
  END IF;

  -- UPSERT: increment quantity if same catalogue_id already on this PO
  IF EXISTS (
    SELECT 1 FROM po_line_items
    WHERE po_id = p_po_id AND catalogue_id = p_catalogue_id
  ) THEN
    UPDATE po_line_items
    SET quantity = quantity + p_quantity
    WHERE po_id = p_po_id AND catalogue_id = p_catalogue_id;
  ELSE
    INSERT INTO po_line_items (po_id, catalogue_id, supplier_id, quantity, unit_price)
    VALUES (p_po_id, p_catalogue_id, v_po_supplier_id, p_quantity, v_cat_price);
  END IF;

  UPDATE purchase_order SET updated_at = now() WHERE id = p_po_id;

  v_response := _build_po_response(p_po_id);

  INSERT INTO idempotency_cache (key, response, expires_at)
  VALUES (p_idempotency_key, v_response, now() + interval '24 hours')
  ON CONFLICT (key) DO NOTHING;

  RETURN v_response;
END;
$$;

-- ============================================================
-- rpc_update_line_qty
-- Sets the quantity of an existing line item (line_total recomputes).
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_update_line_qty(
  p_idempotency_key text,
  p_po_id           bigint,
  p_line_id         bigint,
  p_quantity        integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cached   jsonb;
  v_status   po_status;
  v_response jsonb;
BEGIN
  SELECT response INTO v_cached
  FROM idempotency_cache
  WHERE key = p_idempotency_key AND expires_at > now();
  IF FOUND THEN RETURN v_cached; END IF;

  SELECT status INTO v_status
  FROM purchase_order
  WHERE id = p_po_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order % not found', p_po_id;
  END IF;
  IF v_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Purchase order is not in DRAFT status';
  END IF;

  UPDATE po_line_items
  SET quantity = p_quantity
  WHERE id = p_line_id AND po_id = p_po_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Line item % not found on PO %', p_line_id, p_po_id;
  END IF;

  UPDATE purchase_order SET updated_at = now() WHERE id = p_po_id;

  v_response := _build_po_response(p_po_id);

  INSERT INTO idempotency_cache (key, response, expires_at)
  VALUES (p_idempotency_key, v_response, now() + interval '24 hours')
  ON CONFLICT (key) DO NOTHING;

  RETURN v_response;
END;
$$;

-- ============================================================
-- rpc_remove_line
-- Removes a line item from a DRAFT PO. No idempotency needed.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_remove_line(
  p_po_id   bigint,
  p_line_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status po_status;
BEGIN
  SELECT status INTO v_status
  FROM purchase_order
  WHERE id = p_po_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order % not found', p_po_id;
  END IF;
  IF v_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Purchase order is not in DRAFT status';
  END IF;

  DELETE FROM po_line_items
  WHERE id = p_line_id AND po_id = p_po_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Line item % not found on PO %', p_line_id, p_po_id;
  END IF;

  UPDATE purchase_order SET updated_at = now() WHERE id = p_po_id;

  RETURN _build_po_response(p_po_id);
END;
$$;

-- ============================================================
-- rpc_delete_draft
-- Deletes a DRAFT PO entirely (CASCADE removes lines + timeline).
-- No idempotency needed.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_delete_draft(
  p_po_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_status po_status;
BEGIN
  SELECT status INTO v_status
  FROM purchase_order
  WHERE id = p_po_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order % not found', p_po_id;
  END IF;
  IF v_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Only DRAFT purchase orders can be deleted';
  END IF;

  DELETE FROM purchase_order WHERE id = p_po_id;

  RETURN jsonb_build_object('deleted', true, 'id', p_po_id::text);
END;
$$;

-- ============================================================
-- rpc_patch_draft_header
-- Saves header fields (cost_center, needed_by_date, payment_terms)
-- on a DRAFT PO.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_patch_draft_header(
  p_idempotency_key text,
  p_po_id           bigint,
  p_cost_center     varchar(100),
  p_needed_by_date  date,
  p_payment_terms   varchar(20)
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cached   jsonb;
  v_status   po_status;
  v_response jsonb;
BEGIN
  SELECT response INTO v_cached
  FROM idempotency_cache
  WHERE key = p_idempotency_key AND expires_at > now();
  IF FOUND THEN RETURN v_cached; END IF;

  IF length(p_cost_center) > 100 THEN
    RAISE EXCEPTION 'cost_center exceeds 100 characters';
  END IF;
  IF length(p_payment_terms) > 20 THEN
    RAISE EXCEPTION 'payment_terms exceeds 20 characters';
  END IF;

  SELECT status INTO v_status
  FROM purchase_order
  WHERE id = p_po_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order % not found', p_po_id;
  END IF;
  IF v_status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Purchase order is not in DRAFT status';
  END IF;

  UPDATE purchase_order
  SET cost_center    = p_cost_center,
      needed_by_date = p_needed_by_date,
      payment_terms  = p_payment_terms,
      updated_at     = now()
  WHERE id = p_po_id;

  v_response := _build_po_response(p_po_id);

  INSERT INTO idempotency_cache (key, response, expires_at)
  VALUES (p_idempotency_key, v_response, now() + interval '24 hours')
  ON CONFLICT (key) DO NOTHING;

  RETURN v_response;
END;
$$;

-- ============================================================
-- rpc_submit_po
-- Transitions a DRAFT PO to SUBMITTED.
-- Re-snapshots unit_price from catalogue before finalising.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_submit_po(
  p_idempotency_key text,
  p_po_id           bigint,
  p_buyer_id        bigint
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cached   jsonb;
  v_po       record;
  v_response jsonb;
BEGIN
  SELECT response INTO v_cached
  FROM idempotency_cache
  WHERE key = p_idempotency_key AND expires_at > now();
  IF FOUND THEN RETURN v_cached; END IF;

  SELECT id, status, cost_center, needed_by_date, payment_terms
  INTO v_po
  FROM purchase_order
  WHERE id = p_po_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order % not found', p_po_id;
  END IF;
  IF v_po.status <> 'DRAFT' THEN
    RAISE EXCEPTION 'Purchase order is not in DRAFT status';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM po_line_items WHERE po_id = p_po_id) THEN
    RAISE EXCEPTION 'Purchase order has no line items';
  END IF;

  IF v_po.cost_center IS NULL
     OR v_po.needed_by_date IS NULL
     OR v_po.payment_terms IS NULL THEN
    RAISE EXCEPTION 'Purchase order header is incomplete';
  END IF;

  -- Re-snapshot prices from current catalogue
  UPDATE po_line_items li
  SET unit_price = c.price_usd
  FROM catalogue c
  WHERE li.po_id = p_po_id
    AND c.id = li.catalogue_id;

  UPDATE purchase_order
  SET status = 'SUBMITTED', updated_at = now()
  WHERE id = p_po_id;

  INSERT INTO po_status_timeline (po_id, from_status, to_status, changed_by)
  VALUES (p_po_id, 'DRAFT', 'SUBMITTED', p_buyer_id);

  v_response := _build_po_response(p_po_id);

  INSERT INTO idempotency_cache (key, response, expires_at)
  VALUES (p_idempotency_key, v_response, now() + interval '24 hours')
  ON CONFLICT (key) DO NOTHING;

  RETURN v_response;
END;
$$;

-- ============================================================
-- rpc_approve_po
-- Transitions a SUBMITTED PO to APPROVED.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_approve_po(
  p_idempotency_key text,
  p_po_id           bigint,
  p_actor           bigint,
  p_notes           text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cached   jsonb;
  v_status   po_status;
  v_response jsonb;
BEGIN
  SELECT response INTO v_cached
  FROM idempotency_cache
  WHERE key = p_idempotency_key AND expires_at > now();
  IF FOUND THEN RETURN v_cached; END IF;

  IF length(p_notes) > 255 THEN
    RAISE EXCEPTION 'notes exceeds 255 characters';
  END IF;

  SELECT status INTO v_status
  FROM purchase_order
  WHERE id = p_po_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order % not found', p_po_id;
  END IF;
  IF v_status <> 'SUBMITTED' THEN
    RAISE EXCEPTION 'Purchase order must be SUBMITTED to approve';
  END IF;

  UPDATE purchase_order
  SET status = 'APPROVED', updated_at = now()
  WHERE id = p_po_id;

  INSERT INTO po_status_timeline (po_id, from_status, to_status, notes, changed_by)
  VALUES (p_po_id, 'SUBMITTED', 'APPROVED', p_notes, p_actor);

  v_response := _build_po_response(p_po_id);

  INSERT INTO idempotency_cache (key, response, expires_at)
  VALUES (p_idempotency_key, v_response, now() + interval '24 hours')
  ON CONFLICT (key) DO NOTHING;

  RETURN v_response;
END;
$$;

-- ============================================================
-- rpc_reject_po
-- Transitions a SUBMITTED PO to REJECTED. Notes are required.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_reject_po(
  p_idempotency_key text,
  p_po_id           bigint,
  p_actor           bigint,
  p_notes           text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cached   jsonb;
  v_status   po_status;
  v_response jsonb;
BEGIN
  SELECT response INTO v_cached
  FROM idempotency_cache
  WHERE key = p_idempotency_key AND expires_at > now();
  IF FOUND THEN RETURN v_cached; END IF;

  IF p_notes IS NULL OR trim(p_notes) = '' THEN
    RAISE EXCEPTION 'Rejection notes are required';
  END IF;
  IF length(p_notes) > 255 THEN
    RAISE EXCEPTION 'notes exceeds 255 characters';
  END IF;

  SELECT status INTO v_status
  FROM purchase_order
  WHERE id = p_po_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order % not found', p_po_id;
  END IF;
  IF v_status <> 'SUBMITTED' THEN
    RAISE EXCEPTION 'Purchase order must be SUBMITTED to reject';
  END IF;

  UPDATE purchase_order
  SET status = 'REJECTED', updated_at = now()
  WHERE id = p_po_id;

  INSERT INTO po_status_timeline (po_id, from_status, to_status, notes, changed_by)
  VALUES (p_po_id, 'SUBMITTED', 'REJECTED', p_notes, p_actor);

  v_response := _build_po_response(p_po_id);

  INSERT INTO idempotency_cache (key, response, expires_at)
  VALUES (p_idempotency_key, v_response, now() + interval '24 hours')
  ON CONFLICT (key) DO NOTHING;

  RETURN v_response;
END;
$$;

-- ============================================================
-- rpc_fulfill_po
-- Transitions an APPROVED PO to FULFILLED.
-- Combines notes and delivery reference into a single notes string.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_fulfill_po(
  p_idempotency_key text,
  p_po_id           bigint,
  p_actor           bigint,
  p_notes           text DEFAULT NULL,
  p_delivery_ref    text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cached         jsonb;
  v_status         po_status;
  v_combined_notes text;
  v_response       jsonb;
BEGIN
  SELECT response INTO v_cached
  FROM idempotency_cache
  WHERE key = p_idempotency_key AND expires_at > now();
  IF FOUND THEN RETURN v_cached; END IF;

  SELECT status INTO v_status
  FROM purchase_order
  WHERE id = p_po_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Purchase order % not found', p_po_id;
  END IF;
  IF v_status <> 'APPROVED' THEN
    RAISE EXCEPTION 'Purchase order must be APPROVED to fulfill';
  END IF;

  -- Combine delivery reference and notes into a single string
  v_combined_notes := '';
  IF p_delivery_ref IS NOT NULL AND trim(p_delivery_ref) <> '' THEN
    v_combined_notes := 'Delivery Ref: ' || trim(p_delivery_ref);
  END IF;
  IF p_notes IS NOT NULL AND trim(p_notes) <> '' THEN
    IF v_combined_notes <> '' THEN
      v_combined_notes := v_combined_notes || ' — ' || trim(p_notes);
    ELSE
      v_combined_notes := trim(p_notes);
    END IF;
  END IF;
  IF v_combined_notes = '' THEN
    v_combined_notes := NULL;
  END IF;

  IF length(v_combined_notes) > 255 THEN
    RAISE EXCEPTION 'Combined notes and delivery reference exceed 255 characters';
  END IF;

  UPDATE purchase_order
  SET status = 'FULFILLED', updated_at = now()
  WHERE id = p_po_id;

  INSERT INTO po_status_timeline (po_id, from_status, to_status, notes, changed_by)
  VALUES (p_po_id, 'APPROVED', 'FULFILLED', v_combined_notes, p_actor);

  v_response := _build_po_response(p_po_id);

  INSERT INTO idempotency_cache (key, response, expires_at)
  VALUES (p_idempotency_key, v_response, now() + interval '24 hours')
  ON CONFLICT (key) DO NOTHING;

  RETURN v_response;
END;
$$;

COMMIT;
