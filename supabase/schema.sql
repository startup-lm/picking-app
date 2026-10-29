-- ==============================================================================
-- PICKING APP - ESQUEMA SUPABASE WMS / FULFILLMENT
-- ==============================================================================

-- 1. Tabla de Usuarios / Operarios
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Catálogo de Productos
CREATE TABLE IF NOT EXISTS products (
  id BIGSERIAL PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  package_barcode BIGINT,
  unit_barcode BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de Pedidos (Orders)
CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  client TEXT NOT NULL,
  total_package INT NOT NULL DEFAULT 0,
  total_unit INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'assembled')),
  file_name TEXT,
  file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Líneas de Pedido (Product Order)
CREATE TABLE IF NOT EXISTS product_order (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  location TEXT DEFAULT '',
  package_total INT NOT NULL DEFAULT 0,
  unit_total INT NOT NULL DEFAULT 0,
  package_scanned INT NOT NULL DEFAULT 0,
  unit_scanned INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de Despachos (Dispatch)
CREATE TABLE IF NOT EXISTS dispatch (
  id BIGSERIAL PRIMARY KEY,
  client TEXT NOT NULL,
  total_package INT NOT NULL DEFAULT 0,
  total_unit INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered')),
  order_id BIGINT REFERENCES orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Líneas de Despacho (Product Dispatch)
CREATE TABLE IF NOT EXISTS product_dispatch (
  id BIGSERIAL PRIMARY KEY,
  dispatch_id BIGINT NOT NULL REFERENCES dispatch(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  location TEXT DEFAULT '',
  package_total INT NOT NULL DEFAULT 0,
  unit_total INT NOT NULL DEFAULT 0,
  package_scanned INT NOT NULL DEFAULT 0,
  unit_scanned INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices recomendados para alto rendimiento en escaneo
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_package_barcode ON products(package_barcode);
CREATE INDEX IF NOT EXISTS idx_products_unit_barcode ON products(unit_barcode);
CREATE INDEX IF NOT EXISTS idx_product_order_order_id ON product_order(order_id);
CREATE INDEX IF NOT EXISTS idx_product_dispatch_dispatch_id ON product_dispatch(dispatch_id);

-- 7. Función RPC Transaccional: api_create_order_and_dispatch_with_lines
CREATE OR REPLACE FUNCTION api_create_order_and_dispatch_with_lines(
  p_client TEXT,
  p_lines JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_id BIGINT;
  v_dispatch_id BIGINT;
  v_total_package INT := 0;
  v_total_unit INT := 0;
  line_item JSONB;
BEGIN
  -- Calcular totales sumando las líneas
  SELECT 
    COALESCE(SUM((elem->>'package_total')::INT), 0),
    COALESCE(SUM((elem->>'unit_total')::INT), 0)
  INTO v_total_package, v_total_unit
  FROM jsonb_array_elements(p_lines) AS elem;

  -- 1) Crear Order
  INSERT INTO orders (client, total_package, total_unit, status)
  VALUES (p_client, v_total_package, v_total_unit, 'pending')
  RETURNING id INTO v_order_id;

  -- 2) Crear Dispatch asociado
  INSERT INTO dispatch (client, total_package, total_unit, status, order_id)
  VALUES (p_client, v_total_package, v_total_unit, 'pending', v_order_id)
  RETURNING id INTO v_dispatch_id;

  -- 3) Insertar líneas en product_order y product_dispatch
  FOR line_item IN SELECT * FROM jsonb_array_elements(p_lines)
  LOOP
    INSERT INTO product_order (
      order_id, 
      product_id, 
      location, 
      package_total, 
      unit_total, 
      package_scanned, 
      unit_scanned
    )
    VALUES (
      v_order_id,
      (line_item->>'product_id')::BIGINT,
      COALESCE(line_item->>'location', ''),
      COALESCE((line_item->>'package_total')::INT, 0),
      COALESCE((line_item->>'unit_total')::INT, 0),
      0,
      0
    );

    INSERT INTO product_dispatch (
      dispatch_id, 
      product_id, 
      location, 
      package_total, 
      unit_total, 
      package_scanned, 
      unit_scanned
    )
    VALUES (
      v_dispatch_id,
      (line_item->>'product_id')::BIGINT,
      COALESCE(line_item->>'location', ''),
      COALESCE((line_item->>'package_total')::INT, 0),
      COALESCE((line_item->>'unit_total')::INT, 0),
      0,
      0
    );
  END LOOP;

  -- 4) Retornar identificadores y totales
  RETURN jsonb_build_object(
    'order_id', v_order_id,
    'dispatch_id', v_dispatch_id,
    'total_package', v_total_package,
    'total_unit', v_total_unit
  );
END;
$$;
