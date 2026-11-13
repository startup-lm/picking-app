-- 20261112000004_rpc.sql
-- RPC functions for Pickflow: scanning, picking/dispatch completion, order status, order saving, product/order imports, and reporting

-- ==============================================================================
-- INTERNAL HELPERS (SECURITY DEFINER / IMMUTABLE)
-- ==============================================================================

CREATE OR REPLACE FUNCTION pf_int(p text)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE WHEN p ~ '^\s*-?\d{1,9}\s*$' THEN btrim(p)::int ELSE NULL END;
$$;

CREATE OR REPLACE FUNCTION pf_blank(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(btrim(p), '');
$$;

CREATE OR REPLACE FUNCTION pf_customer_id(p_name text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id bigint;
BEGIN
  INSERT INTO customers (name)
  VALUES (btrim(p_name))
  ON CONFLICT ((lower(btrim(name)))) DO NOTHING
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM customers WHERE lower(btrim(name)) = lower(btrim(p_name));
  END IF;

  RETURN v_id;
END;
$$;

-- ==============================================================================
-- 1. api_scan
-- ==============================================================================

CREATE OR REPLACE FUNCTION api_scan(
  p_order_line_id bigint,
  p_stage text,
  p_kind text,
  p_delta int,
  p_client_event_id uuid,
  p_code text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id bigint;
  v_order orders%ROWTYPE;
  v_line order_lines%ROWTYPE;
  v_event_id bigint;
BEGIN
  -- Chequeo de rol: operador activo (o admin)
  IF NOT is_active_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Validación de argumentos
  IF p_stage NOT IN ('picking', 'dispatch')
     OR p_kind NOT IN ('unit', 'package')
     OR p_delta IS NULL
     OR p_delta = 0
     OR p_client_event_id IS NULL THEN
    RAISE EXCEPTION 'invalid_argument' USING ERRCODE = '22023';
  END IF;

  -- Buscar línea y pedido
  SELECT order_id INTO v_order_id FROM order_lines WHERE id = p_order_line_id;
  IF v_order_id IS NULL THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Bloqueo serializado por pedido (D-T2-3)
  SELECT * INTO v_order FROM orders WHERE id = v_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Operador no puede ver ni operar sobre borrador
  IF v_order.status = 'draft' AND NOT is_admin() THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Idempotencia ANTES de validar estado: reintento de red
  IF EXISTS (SELECT 1 FROM scan_events WHERE client_event_id = p_client_event_id) THEN
    SELECT * INTO v_line FROM order_lines WHERE id = p_order_line_id;
    RETURN jsonb_build_object('status', 'duplicate', 'line', to_jsonb(v_line), 'order_status', v_order.status);
  END IF;

  -- Validación de transiciones por etapa
  IF p_stage = 'picking' AND v_order.status NOT IN ('pending', 'in_progress') THEN
    RAISE EXCEPTION 'invalid_transition' USING ERRCODE = 'P0001';
  END IF;

  IF p_stage = 'dispatch' THEN
    IF NOT (SELECT dispatch_check_enabled FROM app_settings WHERE id = 1) THEN
      RAISE EXCEPTION 'dispatch_check_disabled' USING ERRCODE = 'P0001';
    END IF;
    IF v_order.status <> 'assembled' THEN
      RAISE EXCEPTION 'invalid_transition' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  -- Registro de scan_event
  INSERT INTO scan_events (client_event_id, order_line_id, stage, kind, delta, code, user_id)
  VALUES (p_client_event_id, p_order_line_id, p_stage, p_kind, p_delta, p_code, auth.uid())
  ON CONFLICT (client_event_id) DO NOTHING
  RETURNING id INTO v_event_id;

  IF v_event_id IS NULL THEN
    SELECT * INTO v_line FROM order_lines WHERE id = p_order_line_id;
    RETURN jsonb_build_object('status', 'duplicate', 'line', to_jsonb(v_line), 'order_status', v_order.status);
  END IF;

  -- UPDATE condicional atómico en 4 ramas explícitas
  IF p_stage = 'picking' AND p_kind = 'package' THEN
    UPDATE order_lines
    SET package_scanned = package_scanned + p_delta
    WHERE id = p_order_line_id
      AND package_scanned + p_delta BETWEEN 0 AND package_total
    RETURNING * INTO v_line;
  ELSIF p_stage = 'picking' AND p_kind = 'unit' THEN
    UPDATE order_lines
    SET unit_scanned = unit_scanned + p_delta
    WHERE id = p_order_line_id
      AND unit_scanned + p_delta BETWEEN 0 AND unit_total
    RETURNING * INTO v_line;
  ELSIF p_stage = 'dispatch' AND p_kind = 'package' THEN
    UPDATE order_lines
    SET package_checked = package_checked + p_delta
    WHERE id = p_order_line_id
      AND package_checked + p_delta BETWEEN 0 AND package_total
    RETURNING * INTO v_line;
  ELSIF p_stage = 'dispatch' AND p_kind = 'unit' THEN
    UPDATE order_lines
    SET unit_checked = unit_checked + p_delta
    WHERE id = p_order_line_id
      AND unit_checked + p_delta BETWEEN 0 AND unit_total
    RETURNING * INTO v_line;
  END IF;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'out_of_range' USING ERRCODE = 'P0001';
  END IF;

  -- Transición de pending a in_progress al primer escaneo de picking
  IF p_stage = 'picking' AND v_order.status = 'pending' THEN
    UPDATE orders
    SET status = 'in_progress', started_by = auth.uid(), started_at = now()
    WHERE id = v_order_id;
    v_order.status := 'in_progress';
  END IF;

  RETURN jsonb_build_object('status', 'ok', 'line', to_jsonb(v_line), 'order_status', v_order.status);
END;
$$;

-- ==============================================================================
-- 2. api_find_line_by_code
-- ==============================================================================

CREATE OR REPLACE FUNCTION api_find_line_by_code(
  p_order_id bigint,
  p_code text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_pid bigint;
  v_kind text;
  v_line order_lines%ROWTYPE;
  v_product products%ROWTYPE;
BEGIN
  IF NOT is_active_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Validar orden existente y visible
  SELECT * INTO v_order FROM orders WHERE id = p_order_id;
  IF NOT FOUND OR (v_order.status = 'draft' AND NOT is_admin()) THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  -- Buscar producto y tipo por código
  SELECT product_id, kind INTO v_pid, v_kind
  FROM product_barcodes
  WHERE code = btrim(p_code);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown_code' USING ERRCODE = 'P0001';
  END IF;

  -- Buscar línea en el pedido
  SELECT * INTO v_line
  FROM order_lines
  WHERE order_id = p_order_id AND product_id = v_pid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_in_order' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO v_product FROM products WHERE id = v_pid;

  RETURN jsonb_build_object(
    'line', to_jsonb(v_line),
    'kind', v_kind,
    'product', jsonb_build_object(
      'id', v_product.id,
      'sku', v_product.sku,
      'description', v_product.description,
      'units_per_package', v_product.units_per_package
    )
  );
END;
$$;

-- ==============================================================================
-- 3. api_complete_picking
-- ==============================================================================

CREATE OR REPLACE FUNCTION api_complete_picking(p_order_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  IF NOT is_active_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR (v_order.status = 'draft' AND NOT is_admin()) THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_order.status NOT IN ('pending', 'in_progress') THEN
    RAISE EXCEPTION 'invalid_transition' USING ERRCODE = 'P0001';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM order_lines WHERE order_id = p_order_id) THEN
    RAISE EXCEPTION 'invalid_transition' USING ERRCODE = 'P0001';
  END IF;

  IF EXISTS (
    SELECT 1 FROM order_lines
    WHERE order_id = p_order_id
      AND (package_scanned < package_total OR unit_scanned < unit_total)
  ) THEN
    RAISE EXCEPTION 'incomplete' USING ERRCODE = 'P0001';
  END IF;

  UPDATE orders
  SET
    status = 'assembled',
    assembled_by = auth.uid(),
    assembled_at = now(),
    started_at = COALESCE(started_at, now()),
    started_by = COALESCE(started_by, auth.uid())
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN to_jsonb(v_order);
END;
$$;

-- ==============================================================================
-- 4. api_complete_dispatch
-- ==============================================================================

CREATE OR REPLACE FUNCTION api_complete_dispatch(p_order_id bigint)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
  v_dispatch_enabled boolean;
BEGIN
  IF NOT is_active_user() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND OR (v_order.status = 'draft' AND NOT is_admin()) THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_order.status <> 'assembled' THEN
    RAISE EXCEPTION 'invalid_transition' USING ERRCODE = 'P0001';
  END IF;

  SELECT dispatch_check_enabled INTO v_dispatch_enabled FROM app_settings WHERE id = 1;
  IF COALESCE(v_dispatch_enabled, true) THEN
    IF EXISTS (
      SELECT 1 FROM order_lines
      WHERE order_id = p_order_id
        AND (package_checked < package_total OR unit_checked < unit_total)
    ) THEN
      RAISE EXCEPTION 'incomplete' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  UPDATE orders
  SET
    status = 'dispatched',
    dispatched_by = auth.uid(),
    dispatched_at = now()
  WHERE id = p_order_id
  RETURNING * INTO v_order;

  RETURN to_jsonb(v_order);
END;
$$;

-- ==============================================================================
-- 5. api_set_order_status
-- ==============================================================================

CREATE OR REPLACE FUNCTION api_set_order_status(
  p_order_id bigint,
  p_status text,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order orders%ROWTYPE;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_order FROM orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
  END IF;

  IF p_status NOT IN ('pending', 'draft', 'cancelled') THEN
    RAISE EXCEPTION 'invalid_argument' USING ERRCODE = '22023';
  END IF;

  -- Idempotente: si ya tiene el estado solicitado, no-op
  IF p_status = v_order.status THEN
    RETURN to_jsonb(v_order);
  END IF;

  IF p_status = 'pending' THEN
    IF v_order.status <> 'draft' THEN
      RAISE EXCEPTION 'invalid_transition' USING ERRCODE = 'P0001';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM order_lines WHERE order_id = p_order_id) THEN
      RAISE EXCEPTION 'invalid_transition' USING ERRCODE = 'P0001';
    END IF;

    UPDATE orders
    SET status = 'pending'
    WHERE id = p_order_id
    RETURNING * INTO v_order;

  ELSIF p_status = 'draft' THEN
    IF v_order.status <> 'pending' THEN
      RAISE EXCEPTION 'invalid_transition' USING ERRCODE = 'P0001';
    END IF;
    IF EXISTS (SELECT 1 FROM order_lines WHERE order_id = p_order_id AND (package_scanned + unit_scanned > 0)) THEN
      RAISE EXCEPTION 'invalid_transition' USING ERRCODE = 'P0001';
    END IF;

    UPDATE orders
    SET status = 'draft'
    WHERE id = p_order_id
    RETURNING * INTO v_order;

  ELSIF p_status = 'cancelled' THEN
    IF v_order.status IN ('dispatched', 'cancelled') THEN
      RAISE EXCEPTION 'invalid_transition' USING ERRCODE = 'P0001';
    END IF;
    IF pf_blank(p_reason) IS NULL THEN
      RAISE EXCEPTION 'reason_required' USING ERRCODE = 'P0001';
    END IF;

    UPDATE orders
    SET
      status = 'cancelled',
      cancelled_by = auth.uid(),
      cancelled_at = now(),
      cancel_reason = btrim(p_reason)
    WHERE id = p_order_id
    RETURNING * INTO v_order;
  END IF;

  RETURN to_jsonb(v_order);
END;
$$;

-- ==============================================================================
-- 6. api_save_order
-- ==============================================================================

CREATE OR REPLACE FUNCTION api_save_order(p_order jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id bigint;
  v_order_number text;
  v_customer_id bigint;
  v_customer_id_raw int;
  v_customer_name text;
  v_priority text;
  v_priority_raw text;
  v_due_date date;
  v_due_date_raw text;
  v_notes text;
  v_release boolean;
  v_status text;
  v_lines jsonb;
  v_line_elem jsonb;
  v_seen_pids bigint[] := '{}';
  v_existing_order orders%ROWTYPE;

  v_pid bigint;
  v_pkg int;
  v_unt int;
  v_loc text;
  v_is_active boolean;

  -- Array para almacenar líneas validadas temporalmente: (pid, pkg, unt, loc)
  v_valid_lines jsonb := '[]'::jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- Regla 0: p_order null u objeto
  IF p_order IS NULL OR jsonb_typeof(p_order) <> 'object' THEN
    RAISE EXCEPTION 'invalid_argument' USING ERRCODE = '22023';
  END IF;

  -- Regla 6: priority y due_date
  v_priority_raw := p_order->>'priority';
  IF pf_blank(v_priority_raw) IS NULL THEN
    v_priority := 'normal';
  ELSIF btrim(v_priority_raw) IN ('normal', 'urgent') THEN
    v_priority := btrim(v_priority_raw);
  ELSE
    RAISE EXCEPTION 'invalid_argument' USING ERRCODE = '22023';
  END IF;

  v_due_date_raw := p_order->>'due_date';
  IF pf_blank(v_due_date_raw) IS NOT NULL THEN
    BEGIN
      v_due_date := (btrim(v_due_date_raw))::date;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'invalid_argument' USING ERRCODE = '22023';
    END;
  ELSE
    v_due_date := NULL;
  END IF;

  -- Regla 1: Cliente
  v_customer_id_raw := pf_int(p_order->>'customer_id');
  v_customer_name := pf_blank(p_order->>'customer_name');
  IF v_customer_id_raw IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM customers WHERE id = v_customer_id_raw) THEN
      RAISE EXCEPTION 'invalid_order' DETAIL 'missing_customer' USING ERRCODE = 'P0001';
    END IF;
    v_customer_id := v_customer_id_raw;
  ELSIF v_customer_name IS NOT NULL THEN
    v_customer_id := pf_customer_id(v_customer_name);
  ELSE
    RAISE EXCEPTION 'invalid_order' DETAIL 'missing_customer' USING ERRCODE = 'P0001';
  END IF;

  -- Regla 2: Líneas
  v_lines := p_order->'lines';
  IF v_lines IS NULL OR jsonb_typeof(v_lines) <> 'array' OR jsonb_array_length(v_lines) = 0 THEN
    RAISE EXCEPTION 'invalid_order' DETAIL 'no_lines' USING ERRCODE = 'P0001';
  END IF;

  FOR v_line_elem IN SELECT * FROM jsonb_array_elements(v_lines)
  LOOP
    v_pid := pf_int(v_line_elem->>'product_id');
    IF v_pid IS NULL THEN
      RAISE EXCEPTION 'invalid_order' DETAIL 'inactive_product' USING ERRCODE = 'P0001';
    END IF;

    -- Unicidad de producto en el pedido
    IF v_pid = ANY(v_seen_pids) THEN
      RAISE EXCEPTION 'invalid_order' DETAIL 'duplicate_product' USING ERRCODE = 'P0001';
    END IF;
    v_seen_pids := v_seen_pids || v_pid;

    -- Cantidades
    IF v_line_elem ? 'package_total' AND pf_blank(v_line_elem->>'package_total') IS NOT NULL AND pf_int(v_line_elem->>'package_total') IS NULL THEN
      RAISE EXCEPTION 'invalid_order' DETAIL 'invalid_quantity' USING ERRCODE = 'P0001';
    END IF;
    IF v_line_elem ? 'unit_total' AND pf_blank(v_line_elem->>'unit_total') IS NOT NULL AND pf_int(v_line_elem->>'unit_total') IS NULL THEN
      RAISE EXCEPTION 'invalid_order' DETAIL 'invalid_quantity' USING ERRCODE = 'P0001';
    END IF;

    v_pkg := COALESCE(pf_int(v_line_elem->>'package_total'), 0);
    v_unt := COALESCE(pf_int(v_line_elem->>'unit_total'), 0);
    IF v_pkg < 0 OR v_unt < 0 OR (v_pkg + v_unt = 0) THEN
      RAISE EXCEPTION 'invalid_order' DETAIL 'invalid_quantity' USING ERRCODE = 'P0001';
    END IF;

    -- Producto existente y activo
    SELECT location, is_active INTO v_loc, v_is_active FROM products WHERE id = v_pid;
    IF NOT FOUND OR NOT v_is_active THEN
      RAISE EXCEPTION 'invalid_order' DETAIL 'inactive_product' USING ERRCODE = 'P0001';
    END IF;

    v_valid_lines := v_valid_lines || jsonb_build_object(
      'product_id', v_pid,
      'package_total', v_pkg,
      'unit_total', v_unt,
      'location', v_loc
    );
  END LOOP;

  v_release := COALESCE((p_order->>'release')::boolean, false);
  v_id := pf_int(p_order->>'id');
  v_notes := pf_blank(p_order->>'notes');

  IF v_id IS NULL THEN
    -- Regla 3: Alta
    v_order_number := pf_blank(p_order->>'order_number');
    IF v_order_number IS NOT NULL THEN
      IF EXISTS (SELECT 1 FROM orders WHERE order_number = v_order_number) THEN
        RAISE EXCEPTION 'invalid_order' DETAIL 'order_number_taken' USING ERRCODE = 'P0001';
      END IF;
    ELSE
      v_order_number := next_order_number();
    END IF;

    v_status := CASE WHEN v_release THEN 'pending' ELSE 'draft' END;

    INSERT INTO orders (order_number, customer_id, status, due_date, priority, notes, created_by)
    VALUES (v_order_number, v_customer_id, v_status, v_due_date, v_priority, v_notes, auth.uid())
    RETURNING id INTO v_id;

  ELSE
    -- Regla 4: Edición
    SELECT * INTO v_existing_order FROM orders WHERE id = v_id FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'not_found' USING ERRCODE = 'P0002';
    END IF;

    IF v_existing_order.status = 'draft' THEN
      NULL;
    ELSIF v_existing_order.status = 'pending' THEN
      IF EXISTS (SELECT 1 FROM order_lines WHERE order_id = v_id AND (package_scanned + unit_scanned > 0)) THEN
        RAISE EXCEPTION 'order_locked' USING ERRCODE = 'P0001';
      END IF;
    ELSE
      RAISE EXCEPTION 'order_locked' USING ERRCODE = 'P0001';
    END IF;

    v_order_number := pf_blank(p_order->>'order_number');
    IF v_order_number IS NOT NULL AND v_order_number <> v_existing_order.order_number THEN
      IF EXISTS (SELECT 1 FROM orders WHERE order_number = v_order_number AND id <> v_id) THEN
        RAISE EXCEPTION 'invalid_order' DETAIL 'order_number_taken' USING ERRCODE = 'P0001';
      END IF;
    ELSE
      v_order_number := v_existing_order.order_number;
    END IF;

    v_status := v_existing_order.status;
    IF v_release AND v_status = 'draft' THEN
      v_status := 'pending';
    END IF;

    UPDATE orders
    SET
      order_number = v_order_number,
      customer_id = v_customer_id,
      status = v_status,
      due_date = v_due_date,
      priority = v_priority,
      notes = v_notes
    WHERE id = v_id;

    DELETE FROM order_lines WHERE order_id = v_id;
  END IF;

  -- Insertar líneas validadas (copiando location)
  FOR v_line_elem IN SELECT * FROM jsonb_array_elements(v_valid_lines)
  LOOP
    INSERT INTO order_lines (order_id, product_id, location, package_total, unit_total)
    VALUES (
      v_id,
      (v_line_elem->>'product_id')::bigint,
      v_line_elem->>'location',
      (v_line_elem->>'package_total')::int,
      (v_line_elem->>'unit_total')::int
    );
  END LOOP;

  RETURN jsonb_build_object(
    'order_id', v_id,
    'order_number', v_order_number,
    'status', v_status
  );
END;
$$;

-- ==============================================================================
-- 7. api_import_products
-- ==============================================================================

CREATE OR REPLACE FUNCTION api_import_products(
  p_rows jsonb,
  p_dry_run boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_created int := 0;
  v_updated int := 0;
  v_errors jsonb := '[]'::jsonb;
  v_row_errors jsonb;
  v_seen_skus text[] := '{}';
  v_file_barcodes jsonb := '{}'::jsonb;

  r record;
  v_sku text;
  v_upp_raw text;
  v_upp_int int;
  v_prod products%ROWTYPE;
  v_exists boolean;

  v_final_desc text;
  v_final_unit_bc text;
  v_final_pkg_bc text;
  v_final_location text;
  v_final_upp int;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) > 5000 THEN
    RAISE EXCEPTION 'invalid_argument' USING ERRCODE = '22023';
  END IF;

  BEGIN
    FOR r IN
      SELECT *
      FROM jsonb_to_recordset(p_rows) AS x(
        row int,
        sku text,
        description text,
        unit_barcode text,
        package_barcode text,
        units_per_package text,
        location text
      )
      ORDER BY row
    LOOP
      v_row_errors := '[]'::jsonb;
      v_sku := pf_blank(r.sku);

      -- Paso 1: SKU obligatorio
      IF v_sku IS NULL THEN
        v_errors := v_errors || jsonb_build_object('row', r.row, 'code', 'missing_sku');
        CONTINUE;
      END IF;

      -- Paso 2: SKU duplicado en archivo
      IF v_sku = ANY(v_seen_skus) THEN
        v_errors := v_errors || jsonb_build_object('row', r.row, 'sku', v_sku, 'code', 'duplicate_sku_in_file');
        CONTINUE;
      END IF;
      v_seen_skus := v_seen_skus || v_sku;

      -- Paso 3: units_per_package
      v_upp_raw := pf_blank(r.units_per_package);
      v_upp_int := NULL;
      IF v_upp_raw IS NOT NULL THEN
        v_upp_int := pf_int(v_upp_raw);
        IF v_upp_int IS NULL OR v_upp_int <= 0 THEN
          v_row_errors := v_row_errors || jsonb_build_object('row', r.row, 'sku', v_sku, 'code', 'invalid_units_per_package', 'field', 'units_per_package');
        END IF;
      END IF;

      -- Paso 4: Búsqueda y valores finales
      SELECT * INTO v_prod FROM products WHERE sku = v_sku;
      v_exists := FOUND;

      v_final_desc := COALESCE(pf_blank(r.description), v_prod.description);
      v_final_unit_bc := COALESCE(pf_blank(r.unit_barcode), v_prod.unit_barcode);
      v_final_pkg_bc := COALESCE(pf_blank(r.package_barcode), v_prod.package_barcode);
      v_final_location := COALESCE(pf_blank(r.location), v_prod.location);
      v_final_upp := COALESCE(v_upp_int, v_prod.units_per_package, 1);

      IF NOT v_exists THEN
        IF v_final_desc IS NULL THEN
          v_row_errors := v_row_errors || jsonb_build_object('row', r.row, 'sku', v_sku, 'code', 'missing_description', 'field', 'description');
        END IF;
        IF v_final_unit_bc IS NULL AND v_final_pkg_bc IS NULL THEN
          v_row_errors := v_row_errors || jsonb_build_object('row', r.row, 'sku', v_sku, 'code', 'missing_barcode');
        END IF;
      END IF;

      -- Paso 5: Mismo código unit y package
      IF v_final_unit_bc IS NOT NULL AND v_final_pkg_bc IS NOT NULL AND v_final_unit_bc = v_final_pkg_bc THEN
        v_row_errors := v_row_errors || jsonb_build_object('row', r.row, 'sku', v_sku, 'code', 'same_barcode');
      END IF;

      -- Paso 6: Unicidad de códigos
      IF v_final_unit_bc IS NOT NULL THEN
        IF v_file_barcodes ? v_final_unit_bc AND v_file_barcodes->>v_final_unit_bc <> v_sku THEN
          v_row_errors := v_row_errors || jsonb_build_object('row', r.row, 'sku', v_sku, 'code', 'duplicate_barcode_in_file', 'field', 'unit_barcode');
        END IF;
        IF EXISTS (
          SELECT 1 FROM product_barcodes pb
          WHERE pb.code = v_final_unit_bc
            AND (NOT v_exists OR pb.product_id <> v_prod.id)
        ) THEN
          v_row_errors := v_row_errors || jsonb_build_object('row', r.row, 'sku', v_sku, 'code', 'barcode_in_use', 'field', 'unit_barcode');
        END IF;
      END IF;

      IF v_final_pkg_bc IS NOT NULL THEN
        IF v_file_barcodes ? v_final_pkg_bc AND v_file_barcodes->>v_final_pkg_bc <> v_sku THEN
          v_row_errors := v_row_errors || jsonb_build_object('row', r.row, 'sku', v_sku, 'code', 'duplicate_barcode_in_file', 'field', 'package_barcode');
        END IF;
        IF EXISTS (
          SELECT 1 FROM product_barcodes pb
          WHERE pb.code = v_final_pkg_bc
            AND (NOT v_exists OR pb.product_id <> v_prod.id)
        ) THEN
          v_row_errors := v_row_errors || jsonb_build_object('row', r.row, 'sku', v_sku, 'code', 'barcode_in_use', 'field', 'package_barcode');
        END IF;
      END IF;

      -- Si hubo errores en la fila, los agregamos y continuamos
      IF jsonb_array_length(v_row_errors) > 0 THEN
        v_errors := v_errors || v_row_errors;
        CONTINUE;
      END IF;

      -- Registrar códigos en el archivo
      IF v_final_unit_bc IS NOT NULL THEN
        v_file_barcodes := jsonb_set(v_file_barcodes, ARRAY[v_final_unit_bc], to_jsonb(v_sku));
      END IF;
      IF v_final_pkg_bc IS NOT NULL THEN
        v_file_barcodes := jsonb_set(v_file_barcodes, ARRAY[v_final_pkg_bc], to_jsonb(v_sku));
      END IF;

      -- Paso 7: Mutación
      BEGIN
        IF v_exists THEN
          UPDATE products
          SET
            description = v_final_desc,
            unit_barcode = v_final_unit_bc,
            package_barcode = v_final_pkg_bc,
            units_per_package = v_final_upp,
            location = v_final_location
          WHERE id = v_prod.id;
          v_updated := v_updated + 1;
        ELSE
          INSERT INTO products (sku, description, unit_barcode, package_barcode, units_per_package, location)
          VALUES (v_sku, v_final_desc, v_final_unit_bc, v_final_pkg_bc, v_final_upp, v_final_location);
          v_created := v_created + 1;
        END IF;
      EXCEPTION WHEN unique_violation THEN
        v_errors := v_errors || jsonb_build_object('row', r.row, 'sku', v_sku, 'code', 'barcode_in_use');
      END;
    END LOOP;

    IF p_dry_run THEN
      RAISE EXCEPTION USING ERRCODE = 'PFDRY';
    END IF;
  EXCEPTION WHEN SQLSTATE 'PFDRY' THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'dry_run', p_dry_run,
    'created', v_created,
    'updated', v_updated,
    'errors', v_errors
  );
END;
$$;

-- ==============================================================================
-- 8. api_import_orders
-- ==============================================================================

CREATE OR REPLACE FUNCTION api_import_orders(
  p_rows jsonb,
  p_release boolean DEFAULT false,
  p_dry_run boolean DEFAULT true,
  p_import_id bigint DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_orders_created int := 0;
  v_lines_created int := 0;
  v_created_orders jsonb := '[]'::jsonb;
  v_errors jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;

  v_distinct_orders text[] := '{}';
  v_order_num text;
  v_first_row int;

  r record;
  lr record;
  v_order_has_error boolean;
  v_cust_name text;
  v_due_date_str text;
  v_due_date date;
  v_priority_str text;
  v_priority text;
  v_notes text;

  v_sku text;
  v_prod products%ROWTYPE;
  v_pkg_raw text;
  v_unt_raw text;
  v_qty_raw text;
  v_pkg_val int;
  v_unt_val int;
  v_qty_val int;
  v_final_pkg int;
  v_final_unt int;

  -- Variables para consolidar líneas del pedido actual
  -- jsonb array de objetos: { "sku", "product_id", "location", "packages", "units" }
  v_order_lines jsonb;
  v_line_idx int;
  v_found_idx int;
  v_existing_line jsonb;
  v_merged_pkg int;
  v_merged_unt int;

  v_cust_id bigint;
  v_status text;
  v_order_id bigint;
  v_constraint text;
  v_result jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_rows IS NULL OR jsonb_typeof(p_rows) <> 'array' OR jsonb_array_length(p_rows) > 5000 THEN
    RAISE EXCEPTION 'invalid_argument' USING ERRCODE = '22023';
  END IF;

  BEGIN
    -- 1. Identificar filas sin order_number y agrupar los números válidos en orden de aparición
    FOR r IN
      SELECT *
      FROM jsonb_to_recordset(p_rows) AS x(
        row int,
        order_number text,
        customer text,
        sku text,
        packages text,
        units text,
        quantity text,
        due_date text,
        priority text,
        notes text
      )
      ORDER BY row
    LOOP
      v_order_num := pf_blank(r.order_number);
      IF v_order_num IS NULL THEN
        v_errors := v_errors || jsonb_build_object('row', r.row, 'code', 'missing_order_number');
      ELSIF NOT (v_order_num = ANY(v_distinct_orders)) THEN
        v_distinct_orders := v_distinct_orders || v_order_num;
      END IF;
    END LOOP;

    -- 2. Procesar cada pedido
    FOREACH v_order_num IN ARRAY v_distinct_orders
    LOOP
      v_order_has_error := false;
      v_order_lines := '[]'::jsonb;
      v_cust_name := NULL;
      v_due_date_str := NULL;
      v_due_date := NULL;
      v_priority_str := NULL;
      v_priority := 'normal';
      v_notes := NULL;

      -- Obtener primera fila para reportes de cabecera
      SELECT row INTO v_first_row
      FROM jsonb_to_recordset(p_rows) AS x(row int, order_number text)
      WHERE pf_blank(order_number) = v_order_num
      ORDER BY row
      LIMIT 1;

      -- Verificar si el order_number ya existe en orders
      IF EXISTS (SELECT 1 FROM orders WHERE order_number = v_order_num) THEN
        v_errors := v_errors || jsonb_build_object('row', v_first_row, 'order_number', v_order_num, 'code', 'order_exists');
        v_order_has_error := true;
      END IF;

      -- Obtener atributos de cabecera del pedido (primer valor no vacío del grupo)
      SELECT pf_blank(customer) INTO v_cust_name
      FROM jsonb_to_recordset(p_rows) AS x(row int, order_number text, customer text)
      WHERE pf_blank(order_number) = v_order_num AND pf_blank(customer) IS NOT NULL
      ORDER BY row LIMIT 1;

      IF v_cust_name IS NULL THEN
        v_errors := v_errors || jsonb_build_object('row', v_first_row, 'order_number', v_order_num, 'code', 'missing_customer');
        v_order_has_error := true;
      END IF;

      SELECT pf_blank(due_date) INTO v_due_date_str
      FROM jsonb_to_recordset(p_rows) AS x(row int, order_number text, due_date text)
      WHERE pf_blank(order_number) = v_order_num AND pf_blank(due_date) IS NOT NULL
      ORDER BY row LIMIT 1;

      IF v_due_date_str IS NOT NULL THEN
        IF v_due_date_str !~ '^\d{4}-\d{2}-\d{2}$' THEN
          v_errors := v_errors || jsonb_build_object('row', v_first_row, 'order_number', v_order_num, 'code', 'invalid_date');
          v_order_has_error := true;
        ELSE
          BEGIN
            v_due_date := v_due_date_str::date;
          EXCEPTION WHEN OTHERS THEN
            v_errors := v_errors || jsonb_build_object('row', v_first_row, 'order_number', v_order_num, 'code', 'invalid_date');
            v_order_has_error := true;
          END;
        END IF;
      END IF;

      SELECT pf_blank(priority) INTO v_priority_str
      FROM jsonb_to_recordset(p_rows) AS x(row int, order_number text, priority text)
      WHERE pf_blank(order_number) = v_order_num AND pf_blank(priority) IS NOT NULL
      ORDER BY row LIMIT 1;

      IF v_priority_str IS NOT NULL THEN
        IF v_priority_str NOT IN ('normal', 'urgent') THEN
          v_errors := v_errors || jsonb_build_object('row', v_first_row, 'order_number', v_order_num, 'code', 'invalid_priority');
          v_order_has_error := true;
        ELSE
          v_priority := v_priority_str;
        END IF;
      END IF;

      SELECT pf_blank(notes) INTO v_notes
      FROM jsonb_to_recordset(p_rows) AS x(row int, order_number text, notes text)
      WHERE pf_blank(order_number) = v_order_num AND pf_blank(notes) IS NOT NULL
      ORDER BY row LIMIT 1;

      -- Validar líneas del pedido
      FOR r IN
        SELECT *
        FROM jsonb_to_recordset(p_rows) AS x(
          row int,
          order_number text,
          sku text,
          packages text,
          units text,
          quantity text
        )
        WHERE pf_blank(order_number) = v_order_num
        ORDER BY row
      LOOP
        v_sku := pf_blank(r.sku);
        IF v_sku IS NULL THEN
          v_errors := v_errors || jsonb_build_object('row', r.row, 'order_number', v_order_num, 'code', 'unknown_sku', 'sku', '');
          v_order_has_error := true;
          CONTINUE;
        END IF;

        SELECT * INTO v_prod FROM products WHERE sku = v_sku;
        IF NOT FOUND THEN
          v_errors := v_errors || jsonb_build_object('row', r.row, 'order_number', v_order_num, 'code', 'unknown_sku', 'sku', v_sku);
          v_order_has_error := true;
        ELSIF NOT v_prod.is_active THEN
          v_errors := v_errors || jsonb_build_object('row', r.row, 'order_number', v_order_num, 'code', 'inactive_sku', 'sku', v_sku);
          v_order_has_error := true;
        END IF;

        -- Cantidades
        v_pkg_raw := pf_blank(r.packages);
        v_unt_raw := pf_blank(r.units);
        v_qty_raw := pf_blank(r.quantity);

        IF v_pkg_raw IS NOT NULL OR v_unt_raw IS NOT NULL THEN
          v_pkg_val := CASE WHEN v_pkg_raw IS NOT NULL THEN pf_int(v_pkg_raw) ELSE 0 END;
          v_unt_val := CASE WHEN v_unt_raw IS NOT NULL THEN pf_int(v_unt_raw) ELSE 0 END;

          IF (v_pkg_raw IS NOT NULL AND v_pkg_val IS NULL)
             OR (v_unt_raw IS NOT NULL AND v_unt_val IS NULL)
             OR v_pkg_val < 0
             OR v_unt_val < 0
             OR (v_pkg_val + v_unt_val = 0) THEN
            v_errors := v_errors || jsonb_build_object('row', r.row, 'order_number', v_order_num, 'code', 'invalid_quantity');
            v_order_has_error := true;
          ELSE
            v_final_pkg := v_pkg_val;
            v_final_unt := v_unt_val;
          END IF;

        ELSIF v_qty_raw IS NOT NULL THEN
          v_qty_val := pf_int(v_qty_raw);
          IF v_qty_val IS NULL OR v_qty_val <= 0 THEN
            v_errors := v_errors || jsonb_build_object('row', r.row, 'order_number', v_order_num, 'code', 'invalid_quantity');
            v_order_has_error := true;
          ELSE
            IF v_prod.id IS NOT NULL THEN
              v_final_pkg := v_qty_val / v_prod.units_per_package;
              v_final_unt := v_qty_val % v_prod.units_per_package;
              IF (v_final_pkg + v_final_unt = 0) THEN
                v_errors := v_errors || jsonb_build_object('row', r.row, 'order_number', v_order_num, 'code', 'invalid_quantity');
                v_order_has_error := true;
              END IF;
            END IF;
          END IF;
        ELSE
          v_errors := v_errors || jsonb_build_object('row', r.row, 'order_number', v_order_num, 'code', 'missing_quantity');
          v_order_has_error := true;
        END IF;

        -- Consolidar líneas si no hubo error hasta aquí
        IF NOT v_order_has_error THEN
          v_found_idx := NULL;
          FOR v_line_idx IN 0 .. jsonb_array_length(v_order_lines) - 1
          LOOP
            IF v_order_lines->v_line_idx->>'sku' = v_sku THEN
              v_found_idx := v_line_idx;
              EXIT;
            END IF;
          END LOOP;

          IF v_found_idx IS NOT NULL THEN
            -- Mismo SKU repetido: sumar bultos y unidades, agregar warning
            v_existing_line := v_order_lines->v_found_idx;
            v_merged_pkg := (v_existing_line->>'packages')::int + v_final_pkg;
            v_merged_unt := (v_existing_line->>'units')::int + v_final_unt;

            v_order_lines := jsonb_set(
              v_order_lines,
              ARRAY[v_found_idx::text],
              jsonb_build_object(
                'sku', v_sku,
                'product_id', v_prod.id,
                'location', v_prod.location,
                'packages', v_merged_pkg,
                'units', v_merged_unt
              )
            );

            v_warnings := v_warnings || jsonb_build_object(
              'row', r.row,
              'order_number', v_order_num,
              'code', 'duplicate_sku_merged',
              'sku', v_sku
            );
          ELSE
            v_order_lines := v_order_lines || jsonb_build_object(
              'sku', v_sku,
              'product_id', v_prod.id,
              'location', v_prod.location,
              'packages', v_final_pkg,
              'units', v_final_unt
            );
          END IF;
        END IF;
      END LOOP;

      -- 3. Si no hubo errores, insertar pedido y líneas
      IF NOT v_order_has_error THEN
        BEGIN
          v_cust_id := pf_customer_id(v_cust_name);
          v_status := CASE WHEN p_release THEN 'pending' ELSE 'draft' END;

          INSERT INTO orders (order_number, customer_id, status, import_id, due_date, priority, notes)
          VALUES (v_order_num, v_cust_id, v_status, p_import_id, v_due_date, v_priority, v_notes)
          RETURNING id INTO v_order_id;

          FOR lr IN
            SELECT *
            FROM jsonb_to_recordset(v_order_lines) AS y(
              product_id bigint,
              location text,
              packages int,
              units int
            )
          LOOP
            INSERT INTO order_lines (order_id, product_id, location, package_total, unit_total)
            VALUES (v_order_id, lr.product_id, lr.location, lr.packages, lr.units);
            v_lines_created := v_lines_created + 1;
          END LOOP;

          v_orders_created := v_orders_created + 1;
          v_created_orders := v_created_orders || jsonb_build_object(
            'order_number', v_order_num,
            'order_id', v_order_id,
            'lines', jsonb_array_length(v_order_lines),
            'status', v_status
          );

        EXCEPTION WHEN unique_violation THEN
          GET STACKED DIAGNOSTICS v_constraint = CONSTRAINT_NAME;
          IF v_constraint = 'orders_order_number_key' THEN
            v_errors := v_errors || jsonb_build_object('row', v_first_row, 'order_number', v_order_num, 'code', 'order_exists');
          ELSE
            RAISE;
          END IF;
        END;
      END IF;
    END LOOP;

    -- 4. Patrón PFDRY para dry run
    IF p_dry_run THEN
      RAISE EXCEPTION USING ERRCODE = 'PFDRY';
    END IF;
  EXCEPTION WHEN SQLSTATE 'PFDRY' THEN
    NULL;
  END;

  v_result := jsonb_build_object(
    'dry_run', p_dry_run,
    'orders_created', v_orders_created,
    'lines_created', v_lines_created,
    'orders', v_created_orders,
    'errors', v_errors,
    'warnings', v_warnings
  );

  -- 5. Actualizar resumen en tabla imports si no es dry run
  IF NOT p_dry_run AND p_import_id IS NOT NULL THEN
    UPDATE imports SET summary = v_result WHERE id = p_import_id;
  END IF;

  RETURN v_result;
END;
$$;

-- ==============================================================================
-- 9. api_report_orders
-- ==============================================================================

CREATE OR REPLACE FUNCTION api_report_orders(
  p_from date,
  p_to date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz text;
  v_from_ts timestamptz;
  v_to_ts timestamptz;
  v_result jsonb;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF p_from IS NULL OR p_to IS NULL OR p_from > p_to OR (p_to - p_from > 92) THEN
    RAISE EXCEPTION 'invalid_argument' USING ERRCODE = '22023';
  END IF;

  SELECT timezone INTO v_tz FROM app_settings WHERE id = 1;
  IF v_tz IS NULL THEN
    v_tz := 'America/Argentina/Buenos_Aires';
  END IF;

  v_from_ts := p_from::timestamp AT TIME ZONE v_tz;
  v_to_ts := (p_to + 1)::timestamp AT TIME ZONE v_tz;

  WITH matching_orders AS (
    SELECT
      o.id,
      o.order_number,
      c.name AS customer_name,
      o.status,
      o.priority,
      o.assembled_at,
      p.name AS assembled_by_name,
      o.dispatched_at,
      o.total_package,
      o.total_unit,
      (o.assembled_at AT TIME ZONE v_tz)::date AS report_day
    FROM orders o
    JOIN customers c ON c.id = o.customer_id
    LEFT JOIN profiles p ON p.id = o.assembled_by
    WHERE o.assembled_at >= v_from_ts
      AND o.assembled_at < v_to_ts
      AND o.status <> 'cancelled'
    ORDER BY o.assembled_at ASC
  ),
  order_lines_agg AS (
    SELECT
      ol.order_id,
      jsonb_agg(
        jsonb_build_object(
          'sku', pr.sku,
          'description', pr.description,
          'location', ol.location,
          'package_total', ol.package_total,
          'unit_total', ol.unit_total,
          'package_scanned', ol.package_scanned,
          'unit_scanned', ol.unit_scanned
        )
        ORDER BY ol.location NULLS LAST, pr.sku ASC
      ) AS lines
    FROM order_lines ol
    JOIN products pr ON pr.id = ol.product_id
    WHERE ol.order_id IN (SELECT id FROM matching_orders)
    GROUP BY ol.order_id
  ),
  orders_with_lines AS (
    SELECT
      mo.report_day,
      mo.assembled_at,
      jsonb_build_object(
        'id', mo.id,
        'order_number', mo.order_number,
        'customer', mo.customer_name,
        'status', mo.status,
        'priority', mo.priority,
        'assembled_at', mo.assembled_at,
        'assembled_by_name', mo.assembled_by_name,
        'dispatched_at', mo.dispatched_at,
        'total_package', mo.total_package,
        'total_unit', mo.total_unit,
        'lines', COALESCE(ola.lines, '[]'::jsonb)
      ) AS order_json
    FROM matching_orders mo
    LEFT JOIN order_lines_agg ola ON ola.order_id = mo.id
    ORDER BY mo.assembled_at ASC
  ),
  days_agg AS (
    SELECT
      owl.report_day,
      jsonb_build_object(
        'day', owl.report_day::text,
        'orders', jsonb_agg(owl.order_json ORDER BY owl.assembled_at ASC)
      ) AS day_json
    FROM orders_with_lines owl
    GROUP BY owl.report_day
    ORDER BY owl.report_day ASC
  )
  SELECT COALESCE(jsonb_agg(day_json ORDER BY report_day ASC), '[]'::jsonb)
  INTO v_result
  FROM days_agg;

  RETURN v_result;
END;
$$;

-- ==============================================================================
-- PERMISOS: REVOKE Y GRANT POR FIRMA
-- ==============================================================================

-- Helpers internos
REVOKE EXECUTE ON FUNCTION pf_int(text) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION pf_blank(text) FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION pf_customer_id(text) FROM public, anon, authenticated;

-- RPC públicas a authenticated
REVOKE EXECUTE ON FUNCTION api_scan(bigint, text, text, int, uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION api_scan(bigint, text, text, int, uuid, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION api_find_line_by_code(bigint, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION api_find_line_by_code(bigint, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION api_complete_picking(bigint) FROM public, anon;
GRANT EXECUTE ON FUNCTION api_complete_picking(bigint) TO authenticated;

REVOKE EXECUTE ON FUNCTION api_complete_dispatch(bigint) FROM public, anon;
GRANT EXECUTE ON FUNCTION api_complete_dispatch(bigint) TO authenticated;

REVOKE EXECUTE ON FUNCTION api_set_order_status(bigint, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION api_set_order_status(bigint, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION api_save_order(jsonb) FROM public, anon;
GRANT EXECUTE ON FUNCTION api_save_order(jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION api_import_products(jsonb, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION api_import_products(jsonb, boolean) TO authenticated;

REVOKE EXECUTE ON FUNCTION api_import_orders(jsonb, boolean, boolean, bigint) FROM public, anon;
GRANT EXECUTE ON FUNCTION api_import_orders(jsonb, boolean, boolean, bigint) TO authenticated;

REVOKE EXECUTE ON FUNCTION api_report_orders(date, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION api_report_orders(date, date) TO authenticated;
