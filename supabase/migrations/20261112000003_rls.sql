-- 20261112000003_rls.sql
-- Row Level Security policies and permission revokes/grants

-- 1. Enable RLS on all 9 public tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 2. Revokes and Grants
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon, public;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, public;

GRANT EXECUTE ON FUNCTION is_admin(), is_active_user() TO authenticated;
GRANT EXECUTE ON FUNCTION next_order_number() TO authenticated;
GRANT USAGE ON SEQUENCE order_number_seq TO authenticated;
REVOKE EXECUTE ON FUNCTION handle_new_user() FROM authenticated;

-- 3. Policies (all TO authenticated)

-- products
CREATE POLICY products_select ON products
  FOR SELECT TO authenticated
  USING (is_active_user());

CREATE POLICY products_insert ON products
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY products_update ON products
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY products_delete ON products
  FOR DELETE TO authenticated
  USING (is_admin());

-- product_barcodes
CREATE POLICY product_barcodes_select ON product_barcodes
  FOR SELECT TO authenticated
  USING (is_active_user());

CREATE POLICY product_barcodes_insert ON product_barcodes
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY product_barcodes_update ON product_barcodes
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY product_barcodes_delete ON product_barcodes
  FOR DELETE TO authenticated
  USING (is_admin());

-- customers
CREATE POLICY customers_select ON customers
  FOR SELECT TO authenticated
  USING (is_active_user());

CREATE POLICY customers_insert ON customers
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY customers_update ON customers
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY customers_delete ON customers
  FOR DELETE TO authenticated
  USING (is_admin());

-- orders
CREATE POLICY orders_select ON orders
  FOR SELECT TO authenticated
  USING (is_admin() OR (is_active_user() AND status <> 'draft'));

CREATE POLICY orders_insert ON orders
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY orders_update ON orders
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY orders_delete ON orders
  FOR DELETE TO authenticated
  USING (is_admin());

-- order_lines
CREATE POLICY order_lines_select ON order_lines
  FOR SELECT TO authenticated
  USING (is_admin() OR (is_active_user() AND EXISTS (SELECT 1 FROM orders o WHERE o.id = order_id AND o.status <> 'draft')));

CREATE POLICY order_lines_insert ON order_lines
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY order_lines_update ON order_lines
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY order_lines_delete ON order_lines
  FOR DELETE TO authenticated
  USING (is_admin());

-- imports
CREATE POLICY imports_select ON imports
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY imports_insert ON imports
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY imports_update ON imports
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY imports_delete ON imports
  FOR DELETE TO authenticated
  USING (is_admin());

-- scan_events
CREATE POLICY scan_events_select ON scan_events
  FOR SELECT TO authenticated
  USING (is_admin());

CREATE POLICY scan_events_insert ON scan_events
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY scan_events_update ON scan_events
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY scan_events_delete ON scan_events
  FOR DELETE TO authenticated
  USING (is_admin());

-- profiles
CREATE POLICY profiles_select ON profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR is_admin());

CREATE POLICY profiles_insert ON profiles
  FOR INSERT TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY profiles_update ON profiles
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY profiles_delete ON profiles
  FOR DELETE TO authenticated
  USING (is_admin());

-- app_settings
CREATE POLICY app_settings_select ON app_settings
  FOR SELECT TO authenticated
  USING (is_active_user());

CREATE POLICY app_settings_update ON app_settings
  FOR UPDATE TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());
