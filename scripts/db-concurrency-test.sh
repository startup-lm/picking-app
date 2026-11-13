#!/usr/bin/env bash
# scripts/db-concurrency-test.sh
# Test real concurrency against local PostgreSQL / Supabase instance using parallel psql processes

set -euo pipefail

DB_URL="${DB_URL:-postgresql://postgres:postgres@127.0.0.1:54322/postgres}"
OPERATOR_UID="00000000-0000-0000-0000-0000000000c1"
FIXED_EVENT_ID="00000000-0000-0000-0000-0000000000e2"

cleanup() {
  psql "$DB_URL" -v ON_ERROR_STOP=1 >/dev/null 2>&1 <<SQL || true
DELETE FROM orders WHERE order_number IN ('CONC-1', 'CONC-2');
DELETE FROM products WHERE sku IN ('CONC-1', 'CONC-2');
DELETE FROM auth.users WHERE id = '$OPERATOR_UID';
SQL
}

trap cleanup EXIT

# 1. Limpieza de datos de corridas anteriores y setup inicial como superusuario
cleanup

psql "$DB_URL" -v ON_ERROR_STOP=1 >/dev/null <<SQL
-- Crear usuario operador activo
INSERT INTO auth.users (id, instance_id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
VALUES ('$OPERATOR_UID', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'conc@test.local', '{"provider":"email","providers":["email"]}', '{"name":"Concurrency Test"}', now(), now())
ON CONFLICT (id) DO NOTHING;

UPDATE profiles SET is_active = true, role = 'operator', name = 'Concurrency Test' WHERE id = '$OPERATOR_UID';

-- Crear productos de concurrencia
INSERT INTO products (sku, description, unit_barcode, units_per_package, location)
VALUES
  ('CONC-1', 'Producto Concurrente 1', 'CONC-U1', 1, 'C-01-1'),
  ('CONC-2', 'Producto Concurrente 2', 'CONC-U2', 1, 'C-01-2');

-- Crear pedido CONC-1 en pending con 1 línea unit_total = 15
INSERT INTO orders (order_number, customer_id, status)
VALUES ('CONC-1', 1, 'pending');

INSERT INTO order_lines (order_id, product_id, location, package_total, unit_total)
VALUES (
  (SELECT id FROM orders WHERE order_number = 'CONC-1'),
  (SELECT id FROM products WHERE sku = 'CONC-1'),
  'C-01-1',
  0,
  15
);

-- Crear pedido CONC-2 en pending con 1 línea unit_total = 10
INSERT INTO orders (order_number, customer_id, status)
VALUES ('CONC-2', 1, 'pending');

INSERT INTO order_lines (order_id, product_id, location, package_total, unit_total)
VALUES (
  (SELECT id FROM orders WHERE order_number = 'CONC-2'),
  (SELECT id FROM products WHERE sku = 'CONC-2'),
  'C-01-2',
  0,
  10
);
SQL

# Obtener IDs de las líneas creadas
LINE_1_ID=$(psql "$DB_URL" -t -A -c "SELECT id FROM order_lines WHERE order_id = (SELECT id FROM orders WHERE order_number = 'CONC-1') LIMIT 1;")
LINE_2_ID=$(psql "$DB_URL" -t -A -c "SELECT id FROM order_lines WHERE order_id = (SELECT id FROM orders WHERE order_number = 'CONC-2') LIMIT 1;")

# 2. Lanzar 20 procesos psql concurrentes sobre la línea de CONC-1 (total 15)
# Cada uno intenta sumar 1 unidad con un client_event_id aleatorio
for i in $(seq 1 20); do
  psql "$DB_URL" -v ON_ERROR_STOP=1 >/dev/null 2>&1 -c "
    SET role authenticated;
    SELECT set_config('request.jwt.claims', '{\"sub\":\"$OPERATOR_UID\",\"role\":\"authenticated\"}', false);
    SELECT api_scan($LINE_1_ID, 'picking', 'unit', 1, gen_random_uuid());
  " || true &
done

wait || true

# 3. Lanzar 5 procesos psql concurrentes con el MISMO client_event_id fijo sobre la línea de CONC-2 (idempotencia)
for i in $(seq 1 5); do
  psql "$DB_URL" -v ON_ERROR_STOP=1 >/dev/null 2>&1 -c "
    SET role authenticated;
    SELECT set_config('request.jwt.claims', '{\"sub\":\"$OPERATOR_UID\",\"role\":\"authenticated\"}', false);
    SELECT api_scan($LINE_2_ID, 'picking', 'unit', 1, '$FIXED_EVENT_ID'::uuid);
  " || true &
done

wait || true

# 4. Verificación de resultados
CONC_1_SCANNED=$(psql "$DB_URL" -t -A -c "SELECT unit_scanned FROM order_lines WHERE id = $LINE_1_ID;")
CONC_1_EVENTS=$(psql "$DB_URL" -t -A -c "SELECT count(*) FROM scan_events WHERE order_line_id = $LINE_1_ID;")

CONC_2_SCANNED=$(psql "$DB_URL" -t -A -c "SELECT unit_scanned FROM order_lines WHERE id = $LINE_2_ID;")
CONC_2_EVENTS=$(psql "$DB_URL" -t -A -c "SELECT count(*) FROM scan_events WHERE client_event_id = '$FIXED_EVENT_ID'::uuid;")

SUCCESS=true

if [ "$CONC_1_SCANNED" != "15" ] || [ "$CONC_1_EVENTS" != "15" ]; then
  echo "Error en CONC-1: esperado scanned=15 events=15, obtenido scanned=$CONC_1_SCANNED events=$CONC_1_EVENTS" >&2
  SUCCESS=false
fi

if [ "$CONC_2_SCANNED" != "1" ] || [ "$CONC_2_EVENTS" != "1" ]; then
  echo "Error en CONC-2: esperado scanned=1 events=1, obtenido scanned=$CONC_2_SCANNED events=$CONC_2_EVENTS" >&2
  SUCCESS=false
fi

if [ "$SUCCESS" = true ]; then
  echo "concurrency: OK"
  exit 0
else
  exit 1
fi
