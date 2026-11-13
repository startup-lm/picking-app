-- supabase/tests/rpc.test.sql
-- Test suite for Pickflow RPC functions (api_*)

BEGIN;
CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(61);

-- Usuarios de prueba
INSERT INTO auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin@test.local',    '{"provider":"email","providers":["email"]}', '{"name":"Admin Test"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'op@test.local',       '{"provider":"email","providers":["email"]}', '{"name":"Operador Test"}', now(), now()),
  ('00000000-0000-0000-0000-0000000000a3', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'inactive@test.local', '{"provider":"email","providers":["email"]}', '{}', now(), now());

UPDATE profiles SET role = 'admin', is_active = true WHERE id = '00000000-0000-0000-0000-0000000000a1';
UPDATE profiles SET is_active = true WHERE id = '00000000-0000-0000-0000-0000000000a2';

-- Datos de prueba para Caso 1 a 10:
-- Pedido T-1 en pending con dos líneas: L1 (P1 con bulto P y unidad U) y L2 (P2 con unidad)
INSERT INTO products (sku, description, package_barcode, unit_barcode, units_per_package, location)
VALUES
  ('TEST-P1', 'Producto Test 1', '17799999990001', '0779999990001', 10, 'A-01-1'),
  ('TEST-P2', 'Producto Test 2', NULL,             '0779999990002',  1, 'A-01-2');

INSERT INTO orders (order_number, customer_id, status)
VALUES ('T-1', 1, 'pending');

INSERT INTO order_lines (order_id, product_id, location, package_total, unit_total)
VALUES
  ((SELECT id FROM orders WHERE order_number = 'T-1'), (SELECT id FROM products WHERE sku = 'TEST-P1'), 'A-01-1', 3, 2),
  ((SELECT id FROM orders WHERE order_number = 'T-1'), (SELECT id FROM products WHERE sku = 'TEST-P2'), 'A-01-2', 0, 1);

-- Variables auxiliares en sesión
DO $$
BEGIN
  PERFORM set_config('test.t1_id', (SELECT id::text FROM orders WHERE order_number = 'T-1'), true);
  PERFORM set_config('test.l1_id', (SELECT ol.id::text FROM order_lines ol JOIN products p ON p.id = ol.product_id WHERE p.sku = 'TEST-P1'), true);
  PERFORM set_config('test.l2_id', (SELECT ol.id::text FROM order_lines ol JOIN products p ON p.id = ol.product_id WHERE p.sku = 'TEST-P2'), true);
  PERFORM set_config('test.e1', gen_random_uuid()::text, true);
  PERFORM set_config('test.e2', gen_random_uuid()::text, true);
  PERFORM set_config('test.e3', gen_random_uuid()::text, true);
  PERFORM set_config('test.e4', gen_random_uuid()::text, true);
END $$;

-- 1. api_find_line_by_code
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);

SELECT is(
  (api_find_line_by_code(current_setting('test.t1_id')::bigint, '17799999990001')->>'kind'),
  'package',
  'api_find_line_by_code returns package kind'
);
SELECT is(
  (api_find_line_by_code(current_setting('test.t1_id')::bigint, '0779999990001')->>'kind'),
  'unit',
  'api_find_line_by_code returns unit kind'
);
SELECT is(
  (api_find_line_by_code(current_setting('test.t1_id')::bigint, '  17799999990001  ')->>'kind'),
  'package',
  'api_find_line_by_code trims input barcode'
);
SELECT throws_ok(
  format('SELECT api_find_line_by_code(%s, ''9999999999999'')', current_setting('test.t1_id')),
  'P0001',
  'unknown_code',
  'api_find_line_by_code unknown code raises unknown_code'
);
SELECT throws_ok(
  format('SELECT api_find_line_by_code(%s, ''7791234567089'')', current_setting('test.t1_id')),
  'P0001',
  'not_in_order',
  'api_find_line_by_code barcode not in order raises not_in_order'
);

-- 2. Ceros a la izquierda
SELECT is(
  (api_find_line_by_code((SELECT id FROM orders WHERE order_number = 'PF-000001'), '0001234567890')->'product'->>'sku'),
  'PF-001',
  'Barcode with leading zeros found with exact string'
);

-- 3. api_scan con e1
SELECT is(
  (api_scan(current_setting('test.l1_id')::bigint, 'picking', 'package', 1, current_setting('test.e1')::uuid)->>'status'),
  'ok',
  'api_scan returns ok'
);
SELECT is(
  (SELECT package_scanned FROM order_lines WHERE id = current_setting('test.l1_id')::bigint),
  1,
  'order_lines.package_scanned incremented to 1'
);
SELECT is(
  (SELECT status FROM orders WHERE id = current_setting('test.t1_id')::bigint),
  'in_progress',
  'Order transitioned to in_progress'
);

-- 4. Reintento con e1 -> duplicate
SELECT is(
  (api_scan(current_setting('test.l1_id')::bigint, 'picking', 'package', 1, current_setting('test.e1')::uuid)->>'status'),
  'duplicate',
  'Repeat scan with same client_event_id returns duplicate'
);
SELECT is(
  (SELECT package_scanned FROM order_lines WHERE id = current_setting('test.l1_id')::bigint),
  1,
  'package_scanned remains 1 on duplicate'
);
SELECT is(
  (SELECT count(*)::int FROM scan_events WHERE client_event_id = current_setting('test.e1')::uuid),
  1,
  'scan_events has exactly 1 entry for e1'
);

-- 5. Dos escaneos más (e2, e3) suman 3; cuarto escaneo (e4) -> out_of_range
SELECT api_scan(current_setting('test.l1_id')::bigint, 'picking', 'package', 1, current_setting('test.e2')::uuid);
SELECT api_scan(current_setting('test.l1_id')::bigint, 'picking', 'package', 1, current_setting('test.e3')::uuid);

SELECT is(
  (SELECT package_scanned FROM order_lines WHERE id = current_setting('test.l1_id')::bigint),
  3,
  'package_scanned reaches package_total = 3'
);
SELECT throws_ok(
  format('SELECT api_scan(%s, ''picking'', ''package'', 1, ''%s''::uuid)', current_setting('test.l1_id'), current_setting('test.e4')),
  'P0001',
  'out_of_range',
  'Scanning beyond total raises out_of_range'
);
SELECT is(
  (SELECT count(*)::int FROM scan_events WHERE client_event_id = current_setting('test.e4')::uuid),
  0,
  'No scan_event recorded for aborted scan'
);

-- 6. delta = -1 baja a 2; delta = 0 o stage inválido -> invalid_argument
SELECT api_scan(current_setting('test.l1_id')::bigint, 'picking', 'package', -1, gen_random_uuid());
SELECT is(
  (SELECT package_scanned FROM order_lines WHERE id = current_setting('test.l1_id')::bigint),
  2,
  'delta = -1 decrements package_scanned to 2'
);
SELECT throws_ok(
  format('SELECT api_scan(%s, ''picking'', ''package'', 0, gen_random_uuid())', current_setting('test.l1_id')),
  '22023',
  'invalid_argument',
  'delta = 0 raises invalid_argument'
);
SELECT throws_ok(
  format('SELECT api_scan(%s, ''invalid_stage'', ''package'', 1, gen_random_uuid())', current_setting('test.l1_id')),
  '22023',
  'invalid_argument',
  'invalid stage raises invalid_argument'
);

-- 7. api_complete_picking con faltantes -> incomplete
SELECT throws_ok(
  format('SELECT api_complete_picking(%s)', current_setting('test.t1_id')),
  'P0001',
  'incomplete',
  'api_complete_picking with incomplete lines raises incomplete'
);
SELECT is(
  (SELECT status FROM orders WHERE id = current_setting('test.t1_id')::bigint),
  'in_progress',
  'Order remains in_progress when complete_picking fails'
);

-- 8. Completar picking
-- Completar L1: falta 1 package y 2 units; L2: falta 1 unit
SELECT api_scan(current_setting('test.l1_id')::bigint, 'picking', 'package', 1, gen_random_uuid());
SELECT api_scan(current_setting('test.l1_id')::bigint, 'picking', 'unit', 2, gen_random_uuid());
SELECT api_scan(current_setting('test.l2_id')::bigint, 'picking', 'unit', 1, gen_random_uuid());

SELECT is(
  (api_complete_picking(current_setting('test.t1_id')::bigint)->>'status'),
  'assembled',
  'api_complete_picking transitions order to assembled'
);
SELECT throws_ok(
  format('SELECT api_complete_picking(%s)', current_setting('test.t1_id')),
  'P0001',
  'invalid_transition',
  'Calling complete_picking again raises invalid_transition'
);
-- Reintentar escaneo de picking duplicado en orden ya assembled devuelve duplicate
SELECT is(
  (api_scan(current_setting('test.l1_id')::bigint, 'picking', 'package', 1, current_setting('test.e1')::uuid)->>'status'),
  'duplicate',
  'Re-scan with duplicate event id on assembled order returns duplicate'
);

-- Pedido pending sin líneas
RESET role;
INSERT INTO orders (order_number, customer_id, status) VALUES ('EMPTY-PENDING', 1, 'pending');
DO $$ BEGIN PERFORM set_config('test.empty_order_id', (SELECT id::text FROM orders WHERE order_number = 'EMPTY-PENDING'), true); END $$;

SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);
SELECT throws_ok(
  format('SELECT api_complete_picking(%s)', current_setting('test.empty_order_id')),
  'P0001',
  'invalid_transition',
  'api_complete_picking on order without lines raises invalid_transition'
);

-- 9. api_scan picking con nuevo event id sobre assembled -> invalid_transition
SELECT throws_ok(
  format('SELECT api_scan(%s, ''picking'', ''package'', 1, gen_random_uuid())', current_setting('test.l1_id')),
  'P0001',
  'invalid_transition',
  'Picking scan on assembled order raises invalid_transition'
);

-- 10. Despacho
SELECT throws_ok(
  format('SELECT api_complete_dispatch(%s)', current_setting('test.t1_id')),
  'P0001',
  'incomplete',
  'complete_dispatch unchecked raises incomplete'
);
-- Escanear despacho completo: L1 (3 bultos, 2 unidades), L2 (1 unidad)
SELECT api_scan(current_setting('test.l1_id')::bigint, 'dispatch', 'package', 3, gen_random_uuid());
SELECT api_scan(current_setting('test.l1_id')::bigint, 'dispatch', 'unit', 2, gen_random_uuid());
SELECT api_scan(current_setting('test.l2_id')::bigint, 'dispatch', 'unit', 1, gen_random_uuid());

SELECT is(
  (api_complete_dispatch(current_setting('test.t1_id')::bigint)->>'status'),
  'dispatched',
  'complete_dispatch transitions order to dispatched'
);

-- 11. dispatch_check_enabled = false
RESET role;
UPDATE app_settings SET dispatch_check_enabled = false WHERE id = 1;

INSERT INTO orders (order_number, customer_id, status) VALUES ('DISPATCH-TEST', 1, 'assembled');
INSERT INTO order_lines (order_id, product_id, location, package_total, unit_total, package_scanned, unit_scanned)
VALUES ((SELECT id FROM orders WHERE order_number = 'DISPATCH-TEST'), (SELECT id FROM products WHERE sku = 'TEST-P1'), 'A-01-1', 1, 0, 1, 0);

DO $$ BEGIN PERFORM set_config('test.disp_id', (SELECT id::text FROM orders WHERE order_number = 'DISPATCH-TEST'), true); END $$;

SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);

SELECT throws_ok(
  format('SELECT api_scan((SELECT id FROM order_lines WHERE order_id = %s), ''dispatch'', ''package'', 1, gen_random_uuid())', current_setting('test.disp_id')),
  'P0001',
  'dispatch_check_disabled',
  'Dispatch scan with dispatch_check_enabled = false raises dispatch_check_disabled'
);
SELECT is(
  (api_complete_dispatch(current_setting('test.disp_id')::bigint)->>'status'),
  'dispatched',
  'complete_dispatch succeeds without checks when dispatch_check_enabled = false'
);

RESET role;
UPDATE app_settings SET dispatch_check_enabled = true WHERE id = 1;

-- 12. api_set_order_status
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

SELECT throws_ok(
  format('SELECT api_set_order_status(%s, ''cancelled'', ''motivo'')', current_setting('test.t1_id')),
  'P0001',
  'invalid_transition',
  'Cancelling a dispatched order raises invalid_transition'
);

RESET role;
INSERT INTO orders (order_number, customer_id, status) VALUES ('STATUS-TEST', 1, 'pending');
INSERT INTO order_lines (order_id, product_id, location, package_total, unit_total)
VALUES ((SELECT id FROM orders WHERE order_number = 'STATUS-TEST'), (SELECT id FROM products WHERE sku = 'TEST-P1'), 'A-01-1', 1, 0);
DO $$ BEGIN PERFORM set_config('test.status_id', (SELECT id::text FROM orders WHERE order_number = 'STATUS-TEST'), true); END $$;

SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

SELECT throws_ok(
  format('SELECT api_set_order_status(%s, ''cancelled'', NULL)', current_setting('test.status_id')),
  'P0001',
  'reason_required',
  'Cancelling without reason raises reason_required'
);
SELECT is(
  (api_set_order_status(current_setting('test.status_id')::bigint, 'cancelled', 'Cliente canceló por error')->>'status'),
  'cancelled',
  'Cancelling with reason succeeds'
);

-- draft -> pending y pending -> draft
RESET role;
INSERT INTO orders (order_number, customer_id, status) VALUES ('TRANS-TEST', 1, 'draft');
INSERT INTO order_lines (order_id, product_id, location, package_total, unit_total)
VALUES ((SELECT id FROM orders WHERE order_number = 'TRANS-TEST'), (SELECT id FROM products WHERE sku = 'TEST-P1'), 'A-01-1', 1, 0);
DO $$ BEGIN PERFORM set_config('test.trans_id', (SELECT id::text FROM orders WHERE order_number = 'TRANS-TEST'), true); END $$;

SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

SELECT is(
  (api_set_order_status(current_setting('test.trans_id')::bigint, 'pending')->>'status'),
  'pending',
  'draft -> pending succeeds'
);
SELECT is(
  (api_set_order_status(current_setting('test.trans_id')::bigint, 'draft')->>'status'),
  'draft',
  'pending -> draft succeeds when no scans'
);

-- in_progress -> draft raises invalid_transition
RESET role;
UPDATE orders SET status = 'in_progress' WHERE id = current_setting('test.trans_id')::bigint;

SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
SELECT throws_ok(
  format('SELECT api_set_order_status(%s, ''draft'')', current_setting('test.trans_id')),
  'P0001',
  'invalid_transition',
  'in_progress -> draft raises invalid_transition'
);

-- 13. Operador sobre un borrador: api_find_line_by_code y api_complete_picking -> not_found
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);

SELECT throws_ok(
  format('SELECT api_find_line_by_code(%s, ''17799999990001'')', (SELECT id FROM orders WHERE order_number = 'PF-000001')),
  'P0002',
  'not_found',
  'Operator cannot find line in draft order'
);
SELECT throws_ok(
  format('SELECT api_complete_picking(%s)', (SELECT id FROM orders WHERE order_number = 'PF-000001')),
  'P0002',
  'not_found',
  'Operator cannot complete picking on draft order'
);

-- 14. api_save_order
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);

-- Alta sin número -> genera PF-00000X y status = 'draft'
SELECT matches(
  (api_save_order(jsonb_build_object(
    'customer_name', 'Cliente Nuevo Test',
    'lines', jsonb_build_array(jsonb_build_object('product_id', 1, 'package_total', 2, 'unit_total', 1))
  ))->>'order_number'),
  '^PF-\d{6}$',
  'api_save_order generates order_number matching pattern'
);

-- Con release = true -> status = 'pending'
SELECT is(
  (api_save_order(jsonb_build_object(
    'customer_name', 'Cliente Nuevo Test',
    'release', true,
    'lines', jsonb_build_array(jsonb_build_object('product_id', 1, 'package_total', 1, 'unit_total', 0))
  ))->>'status'),
  'pending',
  'api_save_order with release = true creates pending order'
);

-- Cliente por nombre creado una sola vez
SELECT is(
  (SELECT count(*)::int FROM customers WHERE name = 'Cliente Nuevo Test'),
  1,
  'Customer created only once across multiple orders'
);

-- Producto repetido -> invalid_order (duplicate_product)
SELECT throws_ok(
  $$ SELECT api_save_order(jsonb_build_object(
       'customer_id', 1,
       'lines', jsonb_build_array(
         jsonb_build_object('product_id', 1, 'package_total', 1, 'unit_total', 0),
         jsonb_build_object('product_id', 1, 'package_total', 0, 'unit_total', 2)
       )
     )) $$,
  'P0001',
  'invalid_order',
  'Duplicate product in lines raises invalid_order'
);

-- Editar in_progress -> order_locked
SELECT throws_ok(
  format('SELECT api_save_order(jsonb_build_object(''id'', %s, ''customer_id'', 1, ''lines'', jsonb_build_array(jsonb_build_object(''product_id'', 1, ''package_total'', 1, ''unit_total'', 0))))',
         (SELECT id FROM orders WHERE order_number = 'PF-000004')),
  'P0001',
  'order_locked',
  'Editing in_progress order raises order_locked'
);

-- Línea copia location del producto
SELECT is(
  (SELECT location FROM order_lines WHERE order_id = (SELECT max(id) FROM orders) LIMIT 1),
  (SELECT location FROM products WHERE id = 1),
  'Saved order line copies products.location'
);

-- Totales del pedido = suma de líneas
SELECT is(
  (SELECT total_package FROM orders WHERE id = (SELECT max(id) FROM orders)),
  1,
  'Order total_package updated automatically by trigger'
);

-- 15. api_import_products
-- Dry run con 1 nuevo, 1 actualización (celda de location vacía que no pisa) y 1 error (barcode_in_use)
SELECT is(
  (api_import_products(jsonb_build_array(
    jsonb_build_object('row', 1, 'sku', 'IMPORT-NEW-1', 'description', 'Nuevo', 'unit_barcode', '7799999000011'),
    jsonb_build_object('row', 2, 'sku', 'PF-001', 'description', 'Cinta editada', 'location', ''),
    jsonb_build_object('row', 3, 'sku', 'IMPORT-ERR-1', 'description', 'Error', 'unit_barcode', '0123456789012')
  ), true)->>'created'),
  '1',
  'Dry run import products reports 1 created'
);
SELECT is(
  (SELECT count(*)::int FROM products WHERE sku = 'IMPORT-NEW-1'),
  0,
  'Dry run does not mutate products table'
);

-- Sin dry run -> aplicada
SELECT is(
  (api_import_products(jsonb_build_array(
    jsonb_build_object('row', 1, 'sku', 'IMPORT-NEW-1', 'description', 'Nuevo', 'unit_barcode', '7799999000011'),
    jsonb_build_object('row', 2, 'sku', 'PF-001', 'description', 'Cinta editada', 'location', '')
  ), false)->>'created'),
  '1',
  'Live import products creates 1 product'
);
SELECT is(
  (SELECT location FROM products WHERE sku = 'PF-001'),
  'A-01-1',
  'Empty location cell does not overwrite existing location'
);

-- SKU duplicado en el archivo
SELECT is(
  (api_import_products(jsonb_build_array(
    jsonb_build_object('row', 1, 'sku', 'DUP-SKU', 'description', 'D1', 'unit_barcode', '7799999000028'),
    jsonb_build_object('row', 2, 'sku', 'DUP-SKU', 'description', 'D2', 'unit_barcode', '7799999000035')
  ), true)->'errors'->0->>'code'),
  'duplicate_sku_in_file',
  'Duplicate SKU in file emits duplicate_sku_in_file'
);

-- units_per_package inválido
SELECT is(
  (api_import_products(jsonb_build_array(
    jsonb_build_object('row', 1, 'sku', 'INVALID-UPP', 'description', 'U1', 'units_per_package', 'abc', 'unit_barcode', '7799999000042')
  ), true)->'errors'->0->>'code'),
  'invalid_units_per_package',
  'Invalid units_per_package emits invalid_units_per_package'
);

-- 16. api_import_orders
-- Filas de 3 pedidos: A-1 válido, A-2 con SKU inexistente, A-3 válido con SKU repetido sumado
DO $$
BEGIN
  PERFORM set_config('test.import_rows', jsonb_build_array(
    jsonb_build_object('row', 1, 'order_number', 'ORD-A-1', 'customer', 'Cliente A', 'sku', 'PF-002', 'quantity', '29'),
    jsonb_build_object('row', 2, 'order_number', 'ORD-A-1', 'customer', 'Cliente A', 'sku', 'PF-003', 'packages', '1', 'units', '2'),
    jsonb_build_object('row', 3, 'order_number', 'ORD-A-2', 'customer', 'Cliente B', 'sku', 'SKU-NO-EXISTE', 'packages', '1'),
    jsonb_build_object('row', 4, 'order_number', 'ORD-A-3', 'customer', 'Cliente C', 'sku', 'PF-004', 'packages', '1', 'units', '2'),
    jsonb_build_object('row', 5, 'order_number', 'ORD-A-3', 'customer', 'Cliente C', 'sku', 'PF-004', 'packages', '2', 'units', '3')
  )::text, true);
END $$;

-- Dry run -> orders_created = 2, 1 error unknown_sku de A-2, 1 aviso, y no se creó nada
SELECT is(
  (api_import_orders(current_setting('test.import_rows')::jsonb, false, true)->>'orders_created'),
  '2',
  'Dry run import orders reports 2 orders created'
);
SELECT is(
  (SELECT count(*)::int FROM orders WHERE order_number IN ('ORD-A-1', 'ORD-A-3')),
  0,
  'Dry run import orders does not create rows'
);

-- Sin dry run -> creados ORD-A-1 y ORD-A-3, ORD-A-2 no existe
SELECT api_import_orders(current_setting('test.import_rows')::jsonb, false, false);
SELECT is(
  (SELECT count(*)::int FROM orders WHERE order_number IN ('ORD-A-1', 'ORD-A-3')),
  2,
  'Live import orders creates valid orders'
);
SELECT is(
  (SELECT count(*)::int FROM orders WHERE order_number = 'ORD-A-2'),
  0,
  'Invalid order ORD-A-2 not created'
);

-- Reintento -> order_exists
SELECT is(
  (api_import_orders(jsonb_build_array(
    jsonb_build_object('row', 1, 'order_number', 'ORD-A-1', 'customer', 'Cliente A', 'sku', 'PF-002', 'quantity', '10')
  ), false, true)->'errors'->0->>'code'),
  'order_exists',
  'Re-importing existing order number emits order_exists'
);

-- Con p_release = true -> status = 'pending'
SELECT is(
  (api_import_orders(jsonb_build_array(
    jsonb_build_object('row', 1, 'order_number', 'ORD-RELEASED', 'customer', 'Cliente A', 'sku', 'PF-002', 'packages', '1')
  ), true, false)->'orders'->0->>'status'),
  'pending',
  'Import with p_release = true sets status to pending'
);

-- 17. api_report_orders
-- Pedido armado hoy aparece en el día de hoy
SELECT is(
  (api_report_orders(current_date, current_date)->0->>'day'),
  current_date::text,
  'Order assembled today appears in today report'
);

-- Rango de fechas > 92 días -> invalid_argument
SELECT throws_ok(
  'SELECT api_report_orders(current_date - 93, current_date)',
  '22023',
  'invalid_argument',
  'Date range > 92 days raises invalid_argument'
);

-- Operador -> forbidden
SET LOCAL role authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a2","role":"authenticated"}', true);

SELECT throws_ok(
  'SELECT api_report_orders(current_date, current_date)',
  '42501',
  'forbidden',
  'Operator calling api_report_orders raises forbidden'
);

SELECT * FROM finish();
ROLLBACK;
