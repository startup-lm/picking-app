# Reglas de Base de Datos y Supabase

## 1. Esquema Relacional (`supabase/schema.sql`)

### Tablas Principales
- **`users`**: Operarios y administradores del depósito (`role: 'admin' | 'operator'`).
- **`products`**:
  - `sku` (TEXT UNIQUE NOT NULL): Código alfanumérico único del producto.
  - `description` (TEXT): Nombre descriptivo.
  - `package_barcode` (BIGINT): Código de barras de la caja o bulto master.
  - `unit_barcode` (BIGINT): Código de barras del artículo unitario.
- **`orders`**:
  - `client` (TEXT): Destinatario o cliente.
  - `total_package` (INT): Total de bultos del pedido.
  - `total_unit` (INT): Total de unidades del pedido.
  - `status` ('pending' | 'assembled'): Estado de preparación.
- **`product_order`**:
  - `order_id` (FK -> `orders.id` ON DELETE CASCADE)
  - `product_id` (FK -> `products.id`)
  - `location` (TEXT): Pasillo o estante en depósito (ej: `A1-04`).
  - `package_total` y `unit_total`: Cantidades esperadas.
  - `package_scanned` y `unit_scanned`: Cantidades ya escaneadas.
- **`dispatch`** y **`product_dispatch`**:
  - Despacho asociado al pedido con status `'pending' | 'delivered'`.

## 2. Índices de Alto Rendimiento
Cualquier alteración en tablas debe preservar los índices de escaneo:
- `idx_products_sku`
- `idx_products_package_barcode`
- `idx_products_unit_barcode`
- `idx_product_order_order_id`
- `idx_product_dispatch_dispatch_id`

## 3. Procedimientos Transaccionales (RPC)
- La creación de pedidos y despachos se realiza de forma atómica mediante la función RPC `api_create_order_and_dispatch_with_lines(p_client TEXT, p_lines JSONB)`.
- Toda nueva operación que involucre múltiples tablas en una misma acción operativa debe implementarse como función PostgreSQL `SECURITY DEFINER` o controlarse dentro de una transacción para evitar inconsistencias de inventario o pedidos huérfanos.
