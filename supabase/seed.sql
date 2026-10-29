-- ==============================================================================
-- PICKING APP - DATOS FICTICIOS PARA DEMOSTRACIONES COMERCIALES Y PRUEBAS
-- ==============================================================================

-- 1. Catálogo ficticio (Gama de Tecnología / Electrónica y Accesorios)
INSERT INTO products (sku, description, package_barcode, unit_barcode) VALUES
('TEC-AUR-001', 'Auriculares Inalámbricos Bluetooth Pro ANC', 7791234000018, 7791234000025),
('TEC-SMW-002', 'Smartwatch Deportivo OLED Resistente al Agua', 7791234000032, 7791234000049),
('TEC-CAR-003', 'Cargador Rápido 65W GaN Dual USB-C', 7791234000056, 7791234000063),
('TEC-MOU-004', 'Mouse Inalámbrico Ergonómico Recargable', 7791234000070, 7791234000087),
('TEC-TEC-005', 'Teclado Mecánico RGB Switch Red Compacto', 7791234000094, 7791234000100),
('TEC-CAB-006', 'Cable Reforzado Tipo C a Lightning 2m', 7791234000117, 7791234000124),
('TEC-SOP-007', 'Soporte de Aluminio Regulable para Notebook', 7791234000131, 7791234000148)
ON CONFLICT (sku) DO NOTHING;

-- 2. Pedido Demo 1: "Pendiente" (Para mostrar en vivo cómo el operario escanea en la app móvil)
INSERT INTO orders (id, client, total_package, total_unit, status)
VALUES (101, 'Tienda Digital Córdoba (Demo)', 4, 15, 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO dispatch (id, client, total_package, total_unit, status, order_id)
VALUES (201, 'Tienda Digital Córdoba (Demo)', 4, 15, 'pending', 101)
ON CONFLICT (id) DO NOTHING;

INSERT INTO product_order (order_id, product_id, location, package_total, unit_total, package_scanned, unit_scanned)
SELECT 101, id, 'PASILLO A - ESTANTE 01', 2, 5, 0, 0 FROM products WHERE sku = 'TEC-AUR-001'
UNION ALL
SELECT 101, id, 'PASILLO A - ESTANTE 03', 2, 10, 0, 0 FROM products WHERE sku = 'TEC-CAR-003';

INSERT INTO product_dispatch (dispatch_id, product_id, location, package_total, unit_total, package_scanned, unit_scanned)
SELECT 201, id, 'PASILLO A - ESTANTE 01', 2, 5, 0, 0 FROM products WHERE sku = 'TEC-AUR-001'
UNION ALL
SELECT 201, id, 'PASILLO A - ESTANTE 03', 2, 10, 0, 0 FROM products WHERE sku = 'TEC-CAR-003';

-- 3. Pedido Demo 2: "Armado / Listo para Despacho" (Para mostrar cómo se imprimen etiquetas y remitos)
INSERT INTO orders (id, client, total_package, total_unit, status)
VALUES (102, 'Distribuidora Litoral Rosario', 6, 8, 'assembled')
ON CONFLICT (id) DO NOTHING;

INSERT INTO dispatch (id, client, total_package, total_unit, status, order_id)
VALUES (202, 'Distribuidora Litoral Rosario', 6, 8, 'pending', 102)
ON CONFLICT (id) DO NOTHING;

INSERT INTO product_order (order_id, product_id, location, package_total, unit_total, package_scanned, unit_scanned)
SELECT 102, id, 'PASILLO B - ESTANTE 02', 3, 4, 3, 4 FROM products WHERE sku = 'TEC-SMW-002'
UNION ALL
SELECT 102, id, 'PASILLO B - ESTANTE 04', 3, 4, 3, 4 FROM products WHERE sku = 'TEC-MOU-004';

INSERT INTO product_dispatch (dispatch_id, product_id, location, package_total, unit_total, package_scanned, unit_scanned)
SELECT 202, id, 'PASILLO B - ESTANTE 02', 3, 4, 0, 0 FROM products WHERE sku = 'TEC-SMW-002'
UNION ALL
SELECT 202, id, 'PASILLO B - ESTANTE 04', 3, 4, 0, 0 FROM products WHERE sku = 'TEC-MOU-004';
