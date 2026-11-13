-- supabase/tests/rls.test.sql
-- Test suite for Row Level Security (RLS) policies and permissions

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(32);

-- Crear usuarios de prueba según la especificación
INSERT INTO auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.local',    '{"provider":"email","providers":["email"]}', '{"name":"Admin Test"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'op@test.local',       '{"provider":"email","providers":["email"]}', '{"name":"Operador Test"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'inactive@test.local', '{"provider":"email","providers":["email"]}', '{}', now(), now());

UPDATE profiles SET role = 'admin', is_active = true WHERE id = '00000000-0000-0000-0000-0000000000a1';
UPDATE profiles SET is_active = true WHERE id = '00000000-0000-0000-0000-0000000000a2';

-- 1. Rol anon: SELECT en cada una de las 9 tablas públicas lanza 42501
SET LOCAL role anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT throws_ok($$ SELECT * FROM products $$, '42501', NULL, 'anon SELECT products raises 42501');
SELECT throws_ok($$ SELECT * FROM product_barcodes $$, '42501', NULL, 'anon SELECT product_barcodes raises 42501');
SELECT throws_ok($$ SELECT * FROM customers $$, '42501', NULL, 'anon SELECT customers raises 42501');
SELECT throws_ok($$ SELECT * FROM orders $$, '42501', NULL, 'anon SELECT orders raises 42501');
SELECT throws_ok($$ SELECT * FROM order_lines $$, '42501', NULL, 'anon SELECT order_lines raises 42501');
SELECT throws_ok($$ SELECT * FROM imports $$, '42501', NULL, 'anon SELECT imports raises 42501');
SELECT throws_ok($$ SELECT * FROM scan_events $$, '42501', NULL, 'anon SELECT scan_events raises 42501');
SELECT throws_ok($$ SELECT * FROM profiles $$, '42501', NULL, 'anon SELECT profiles raises 42501');
SELECT throws_ok($$ SELECT * FROM app_settings $$, '42501', NULL, 'anon SELECT app_settings raises 42501');

-- 2. Rol anon: ejecución de RPCs lanza 42501
SELECT throws_ok($$ SELECT api_scan(1, 'picking', 'unit', 1, gen_random_uuid()) $$, '42501', NULL, 'anon api_scan raises 42501');
SELECT throws_ok($$ SELECT api_import_orders('[]'::jsonb) $$, '42501', NULL, 'anon api_import_orders raises 42501');
SELECT throws_ok($$ SELECT api_report_orders(current_date, current_date) $$, '42501', NULL, 'anon api_report_orders raises 42501');

-- 3. Operador activo: no ve pedidos en borrador
RESET role;
SELECT is((SELECT count(*) FROM orders WHERE status = 'draft')::int > 0, true, 'Superuser verifies draft orders exist in seed');

SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
SELECT is((SELECT count(*) FROM orders WHERE status = 'draft')::int, 0, 'Active operator sees 0 draft orders');

-- 4. Operador activo: ve productos, clientes y app_settings
SELECT is((SELECT count(*) FROM products)::int > 0, true, 'Active operator sees products');
SELECT is((SELECT count(*) FROM customers)::int > 0, true, 'Active operator sees customers');
SELECT is((SELECT count(*) FROM app_settings)::int > 0, true, 'Active operator sees app_settings');

-- 5. Operador activo: mutaciones directas son bloqueadas o afectan 0 filas
-- Preparar IDs de pedido pending y línea asociada como superusuario
RESET role;
DO $$
BEGIN
  PERFORM set_config('test.pending_order_id', (SELECT id::text FROM orders WHERE order_number = 'PF-000002'), true);
  PERFORM set_config('test.pending_line_id', (SELECT id::text FROM order_lines WHERE order_id = (SELECT id FROM orders WHERE order_number = 'PF-000002') LIMIT 1), true);
END $$;

SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);

SELECT throws_ok(
  $$ INSERT INTO products (sku, description, unit_barcode) VALUES ('FORBIDDEN-SKU', 'Test', '7799999999999') $$,
  '42501',
  NULL,
  'Active operator INSERT into products raises 42501'
);

-- Actualizaciones directas afectan 0 filas bajo RLS
UPDATE orders SET status = 'cancelled' WHERE id = current_setting('test.pending_order_id')::bigint;
UPDATE order_lines SET package_scanned = package_scanned + 1 WHERE id = current_setting('test.pending_line_id')::bigint;
DELETE FROM orders WHERE id = current_setting('test.pending_order_id')::bigint;

RESET role;
SELECT is((SELECT count(*) FROM products WHERE sku = 'FORBIDDEN-SKU')::int, 0, 'Superuser verifies products untouched by operator');
SELECT is((SELECT status FROM orders WHERE id = current_setting('test.pending_order_id')::bigint), 'pending', 'Superuser verifies order status untouched by operator');
SELECT is((SELECT package_scanned FROM order_lines WHERE id = current_setting('test.pending_line_id')::bigint), 0, 'Superuser verifies order line package_scanned untouched by operator');
SELECT is((SELECT count(*) FROM orders WHERE id = current_setting('test.pending_order_id')::bigint)::int, 1, 'Superuser verifies order not deleted by operator');

-- 6. Operador activo: api_set_order_status falla con forbidden
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
SELECT throws_ok(
  format('SELECT api_set_order_status(%s, ''cancelled'', ''motivo prueba'')', current_setting('test.pending_order_id')),
  '42501',
  'forbidden',
  'Active operator calling api_set_order_status raises forbidden'
);

-- 7. Operador inactivo (...a3): productos = 0, scan = forbidden, perfil propio = 1
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a3","role":"authenticated"}', true);
SELECT is((SELECT count(*) FROM products)::int, 0, 'Inactive operator sees 0 products');
SELECT throws_ok(
  $$ SELECT api_scan(1, 'picking', 'unit', 1, gen_random_uuid()) $$,
  '42501',
  'forbidden',
  'Inactive operator calling api_scan raises forbidden'
);
SELECT is((SELECT count(*) FROM profiles WHERE id = auth.uid())::int, 1, 'Inactive operator sees only their own profile');

-- 8. Visibilidad de perfiles: operador ve 1 (el suyo), admin ve >= 3
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
SELECT is((SELECT count(*) FROM profiles)::int, 1, 'Operator sees only 1 profile');

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
SELECT is((SELECT count(*) FROM profiles)::int >= 3, true, 'Admin sees all profiles');

-- 9. Operador ve 0 imports y 0 scan_events aunque existan filas
RESET role;
INSERT INTO imports (kind, file_name) VALUES ('products', 'sample.csv');
INSERT INTO scan_events (client_event_id, order_line_id, stage, kind, delta)
VALUES (gen_random_uuid(), (SELECT id FROM order_lines LIMIT 1), 'picking', 'unit', 1);

SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
SELECT is((SELECT count(*) FROM imports)::int, 0, 'Operator sees 0 imports');
SELECT is((SELECT count(*) FROM scan_events)::int, 0, 'Operator sees 0 scan_events');

-- 10. Admin puede modificar app_settings, operador no
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
UPDATE app_settings SET app_name = 'Pickflow Admin' WHERE id = 1;

SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
UPDATE app_settings SET app_name = 'Pickflow Operador' WHERE id = 1;

RESET role;
SELECT is((SELECT app_name FROM app_settings WHERE id = 1), 'Pickflow Admin', 'app_settings updated by admin and unaffected by operator');

-- 11. storage.buckets 'imports' tiene public = false
SELECT is((SELECT public FROM storage.buckets WHERE id = 'imports'), false, 'Bucket imports has public = false');

SELECT * FROM finish();
ROLLBACK;
