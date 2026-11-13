-- ==============================================================================
-- PICKFLOW - SEED DATA (Fase 1)
-- Neutral sample data without user accounts or real brand names.
-- Runs as superuser without RLS.
-- ==============================================================================

-- 1. Catálogo de productos (15 productos genéricos de ferretería y limpieza)
INSERT INTO products (sku, description, unit_barcode, package_barcode, units_per_package, location, is_active) VALUES
('PF-001', 'Cinta aisladora negra 20m',              '0001234567890', '17791234567011',  6, 'A-01-1', true),
('PF-002', 'Destornillador phillips 6x100',          '0123456789012', '17791234567028', 12, 'A-01-2', true),
('PF-003', 'Tornillos autoperforantes 8x1',          '0779123456789', '17791234567035', 24, 'A-02-1', true),
('PF-004', 'Tarugos plásticos 8mm',                  '7791234567041', '17791234567042', 10, 'A-02-2', true),
('PF-005', 'Martillo carpintero con uña',             '7791234567058', '17791234567059', 12, 'B-01-1', true),
('PF-006', 'Pinza universal aislada 8 pulgadas',     '7791234567065', '17791234567066',  6, 'B-01-2', true),
('PF-007', 'Llave francesa ajustable 10 pulgadas',   '7791234567072', '17791234567073', 12, 'B-02-1', true),
('PF-008', 'Escoba plástica reforzada sin cabo',     '7791234567089', '17791234567080', 20, 'B-02-2', true),
('PF-009', 'Balde de albañil reforzado 10L',         '7791234567096', '17791234567097', 10, 'C-01-1', true),
('PF-010', 'Trapo de piso cosido blanco',            '7791234567102', '17791234567103', 12, 'C-01-2', true),
('PF-011', 'Limpiador desengrasante multiuso 5L',     '7791234567119', '17791234567110',  6, 'C-02-1', true),
('PF-012', 'Guantes de látex reforzados talle G',     '7791234567126', NULL,             12, 'C-02-2', true),
('PF-013', 'Esponja multiuso doble cara',            NULL,            '17791234567134', 24, 'D-01-1', true),
('PF-014', 'Detergente concentrado neutro 1L',       '7791234567140', NULL,             12, 'D-01-2', true),
('PF-015', 'Clavos punta parís 2 pulgadas',          '7791234567157', NULL,             10, 'D-02-1', false);

-- 2. Clientes neutros
INSERT INTO customers (name, code, address) VALUES
('Distribuidora Norte', 'C-001', 'Av. Libertador 1234, CABA'),
('Almacén Central',     'C-002', 'Calle San Martín 567, Córdoba'),
('Ferretería del Sur',  'C-003', 'Av. Colón 890, Bahía Blanca'),
('Mayorista Oeste',     'C-004', 'Ruta 7 Km 25, Mendoza'),
('Kiosco San Martín',   'C-005', 'Belgrano 345, Rosario');

-- 3. Pedidos (uno por cada estado: draft, pending, pending urgente, in_progress, assembled, dispatched)
INSERT INTO orders (order_number, customer_id, status, priority, due_date, notes, started_at, assembled_at, dispatched_at)
VALUES
('PF-000001', (SELECT id FROM customers WHERE code = 'C-001'), 'draft',       'normal', CURRENT_DATE + 5, NULL,                         NULL,                                NULL,                                NULL),
('PF-000002', (SELECT id FROM customers WHERE code = 'C-002'), 'pending',     'normal', CURRENT_DATE + 3, NULL,                         NULL,                                NULL,                                NULL),
('PF-000003', (SELECT id FROM customers WHERE code = 'C-003'), 'pending',     'urgent', CURRENT_DATE + 1, 'Entrega prioritaria en obra', NULL,                                NULL,                                NULL),
('PF-000004', (SELECT id FROM customers WHERE code = 'C-004'), 'in_progress', 'normal', CURRENT_DATE,     NULL,                         now() - interval '1 hour',           NULL,                                NULL),
('PF-000005', (SELECT id FROM customers WHERE code = 'C-005'), 'assembled',   'normal', CURRENT_DATE,     NULL,                         now() - interval '2 hours',          now(),                               NULL),
('PF-000006', (SELECT id FROM customers WHERE code = 'C-001'), 'dispatched',  'normal', CURRENT_DATE - 1, NULL,                         now() - interval '26 hours',         now() - interval '24 hours',         now() - interval '24 hours');

-- 4. Líneas de pedidos (asociadas a productos activos con sus respectivas ubicaciones)
INSERT INTO order_lines (order_id, product_id, location, package_total, unit_total, package_scanned, unit_scanned, package_checked, unit_checked)
SELECT o.id, p.id, p.location, 2, 5, 0, 0, 0, 0 FROM orders o, products p WHERE o.order_number = 'PF-000001' AND p.sku = 'PF-001'
UNION ALL
SELECT o.id, p.id, p.location, 1, 10, 0, 0, 0, 0 FROM orders o, products p WHERE o.order_number = 'PF-000001' AND p.sku = 'PF-002'

UNION ALL
SELECT o.id, p.id, p.location, 3, 0, 0, 0, 0, 0 FROM orders o, products p WHERE o.order_number = 'PF-000002' AND p.sku = 'PF-003'
UNION ALL
SELECT o.id, p.id, p.location, 0, 12, 0, 0, 0, 0 FROM orders o, products p WHERE o.order_number = 'PF-000002' AND p.sku = 'PF-004'
UNION ALL
SELECT o.id, p.id, p.location, 1, 4, 0, 0, 0, 0 FROM orders o, products p WHERE o.order_number = 'PF-000002' AND p.sku = 'PF-005'

UNION ALL
SELECT o.id, p.id, p.location, 2, 6, 0, 0, 0, 0 FROM orders o, products p WHERE o.order_number = 'PF-000003' AND p.sku = 'PF-006'
UNION ALL
SELECT o.id, p.id, p.location, 1, 2, 0, 0, 0, 0 FROM orders o, products p WHERE o.order_number = 'PF-000003' AND p.sku = 'PF-007'

UNION ALL
SELECT o.id, p.id, p.location, 2, 5, 1, 3, 0, 0 FROM orders o, products p WHERE o.order_number = 'PF-000004' AND p.sku = 'PF-008'
UNION ALL
SELECT o.id, p.id, p.location, 1, 0, 1, 0, 0, 0 FROM orders o, products p WHERE o.order_number = 'PF-000004' AND p.sku = 'PF-009'
UNION ALL
SELECT o.id, p.id, p.location, 2, 4, 0, 0, 0, 0 FROM orders o, products p WHERE o.order_number = 'PF-000004' AND p.sku = 'PF-010'

UNION ALL
SELECT o.id, p.id, p.location, 2, 6, 2, 6, 0, 0 FROM orders o, products p WHERE o.order_number = 'PF-000005' AND p.sku = 'PF-011'
UNION ALL
SELECT o.id, p.id, p.location, 1, 4, 1, 4, 0, 0 FROM orders o, products p WHERE o.order_number = 'PF-000005' AND p.sku = 'PF-012'
UNION ALL
SELECT o.id, p.id, p.location, 3, 0, 3, 0, 0, 0 FROM orders o, products p WHERE o.order_number = 'PF-000005' AND p.sku = 'PF-013'

UNION ALL
SELECT o.id, p.id, p.location, 1, 2, 1, 2, 1, 2 FROM orders o, products p WHERE o.order_number = 'PF-000006' AND p.sku = 'PF-001'
UNION ALL
SELECT o.id, p.id, p.location, 0, 5, 0, 5, 0, 5 FROM orders o, products p WHERE o.order_number = 'PF-000006' AND p.sku = 'PF-014';

-- Ajustar la secuencia de numeración de pedidos
SELECT setval('order_number_seq', 6);
