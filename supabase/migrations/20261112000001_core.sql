-- 20261112000001_core.sql
-- Core schema for Pickflow: products, product_barcodes, customers, orders, order_lines, scan_events, imports

-- Helper trigger function to update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- products
CREATE TABLE products (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  sku TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  unit_barcode TEXT NULL,
  package_barcode TEXT NULL,
  units_per_package INT NOT NULL DEFAULT 1,
  location TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT products_sku_check CHECK (sku = btrim(sku) AND sku <> ''),
  CONSTRAINT products_description_check CHECK (btrim(description) <> ''),
  CONSTRAINT products_unit_barcode_check CHECK (unit_barcode IS NULL OR (unit_barcode = btrim(unit_barcode) AND unit_barcode <> '')),
  CONSTRAINT products_package_barcode_check CHECK (package_barcode IS NULL OR (package_barcode = btrim(package_barcode) AND package_barcode <> '')),
  CONSTRAINT products_units_per_package_check CHECK (units_per_package > 0),
  CONSTRAINT products_has_barcode_check CHECK (unit_barcode IS NOT NULL OR package_barcode IS NOT NULL),
  CONSTRAINT products_barcodes_distinct_check CHECK (unit_barcode IS DISTINCT FROM package_barcode)
);

CREATE INDEX products_description_idx ON products (lower(description));

CREATE TRIGGER products_set_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- product_barcodes
CREATE TABLE product_barcodes (
  code TEXT PRIMARY KEY,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('unit', 'package'))
);

CREATE INDEX product_barcodes_product_id_idx ON product_barcodes (product_id);

CREATE OR REPLACE FUNCTION sync_product_barcodes()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM product_barcodes WHERE product_id = NEW.id;
  IF NEW.unit_barcode IS NOT NULL THEN
    INSERT INTO product_barcodes (code, product_id, kind) VALUES (NEW.unit_barcode, NEW.id, 'unit');
  END IF;
  IF NEW.package_barcode IS NOT NULL THEN
    INSERT INTO product_barcodes (code, product_id, kind) VALUES (NEW.package_barcode, NEW.id, 'package');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER products_sync_barcodes
AFTER INSERT OR UPDATE OF unit_barcode, package_barcode ON products
FOR EACH ROW
EXECUTE FUNCTION sync_product_barcodes();

-- customers
CREATE TABLE customers (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NULL UNIQUE,
  address TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT customers_name_check CHECK (btrim(name) <> '')
);

CREATE UNIQUE INDEX customers_lower_name_idx ON customers (lower(btrim(name)));

CREATE TRIGGER customers_set_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Order sequence & generator
CREATE SEQUENCE order_number_seq;

CREATE OR REPLACE FUNCTION next_order_number()
RETURNS text
LANGUAGE sql
VOLATILE
AS $$
  SELECT 'PF-' || lpad(nextval('order_number_seq')::text, 6, '0');
$$;

-- imports
CREATE TABLE imports (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('products', 'orders')),
  file_path TEXT NULL,
  file_name TEXT NULL,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- orders
CREATE TABLE orders (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE DEFAULT next_order_number(),
  customer_id BIGINT NOT NULL REFERENCES customers(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'in_progress', 'assembled', 'dispatched', 'cancelled')),
  due_date DATE NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),
  notes TEXT NULL,
  total_package INT NOT NULL DEFAULT 0,
  total_unit INT NOT NULL DEFAULT 0,
  import_id BIGINT NULL REFERENCES imports(id) ON DELETE SET NULL,
  started_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  assembled_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  dispatched_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  cancelled_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NULL,
  assembled_at TIMESTAMPTZ NULL,
  dispatched_at TIMESTAMPTZ NULL,
  cancelled_at TIMESTAMPTZ NULL,
  cancel_reason TEXT NULL,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT orders_order_number_check CHECK (btrim(order_number) <> '')
);

CREATE INDEX orders_status_due_idx ON orders (status, due_date);
CREATE INDEX orders_customer_idx ON orders (customer_id);
CREATE INDEX orders_assembled_at_idx ON orders (assembled_at);

CREATE TRIGGER orders_set_updated_at
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- order_lines
CREATE TABLE order_lines (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  location TEXT NULL,
  package_total INT NOT NULL DEFAULT 0,
  unit_total INT NOT NULL DEFAULT 0,
  package_scanned INT NOT NULL DEFAULT 0,
  unit_scanned INT NOT NULL DEFAULT 0,
  package_checked INT NOT NULL DEFAULT 0,
  unit_checked INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT order_lines_package_total_check CHECK (package_total >= 0),
  CONSTRAINT order_lines_unit_total_check CHECK (unit_total >= 0),
  CONSTRAINT order_lines_totals_positive_check CHECK (package_total + unit_total > 0),
  CONSTRAINT order_lines_package_scanned_check CHECK (package_scanned BETWEEN 0 AND package_total),
  CONSTRAINT order_lines_unit_scanned_check CHECK (unit_scanned BETWEEN 0 AND unit_total),
  CONSTRAINT order_lines_package_checked_check CHECK (package_checked BETWEEN 0 AND package_total),
  CONSTRAINT order_lines_unit_checked_check CHECK (unit_checked BETWEEN 0 AND unit_total),
  CONSTRAINT order_lines_order_product_unique UNIQUE (order_id, product_id)
);

CREATE INDEX order_lines_product_id_idx ON order_lines (product_id);

CREATE TRIGGER order_lines_set_updated_at
BEFORE UPDATE ON order_lines
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- recalc_order_totals
CREATE OR REPLACE FUNCTION recalc_order_totals()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_order_id BIGINT;
BEGIN
  v_order_id := COALESCE(NEW.order_id, OLD.order_id);
  UPDATE orders
  SET
    total_package = (SELECT COALESCE(SUM(package_total), 0) FROM order_lines WHERE order_id = v_order_id),
    total_unit = (SELECT COALESCE(SUM(unit_total), 0) FROM order_lines WHERE order_id = v_order_id)
  WHERE id = v_order_id;
  RETURN NULL;
END;
$$;

CREATE TRIGGER order_lines_totals
AFTER INSERT OR DELETE OR UPDATE OF package_total, unit_total ON order_lines
FOR EACH ROW
EXECUTE FUNCTION recalc_order_totals();

-- scan_events
CREATE TABLE scan_events (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  client_event_id UUID NOT NULL UNIQUE,
  order_line_id BIGINT NOT NULL REFERENCES order_lines(id) ON DELETE CASCADE,
  stage TEXT NOT NULL CHECK (stage IN ('picking', 'dispatch')),
  kind TEXT NOT NULL CHECK (kind IN ('unit', 'package')),
  delta INT NOT NULL CHECK (delta <> 0),
  code TEXT NULL,
  user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX scan_events_order_line_id_idx ON scan_events (order_line_id);
