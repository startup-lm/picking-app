# Reglas de Base de Datos y Supabase

## 1. Esquema y Migraciones (`supabase/migrations/`)

El esquema de base de datos se versiona formalmente mediante migraciones cronológicas administradas por Supabase CLI en `supabase/migrations/`:
- `20261112000001_core.sql`: Tablas centrales (`products`, `product_barcodes`, `customers`, `orders`, `order_lines`, `imports`, `scan_events`), secuencias y triggers de timestamps y recálculo.
- `20261112000002_auth.sql`: Tablas `profiles` y `app_settings`, triggers en `auth.users` y funciones de autorización (`is_active_user()`, `is_admin()`).
- `20261112000003_rls.sql`: Políticas Row Level Security en todas las tablas públicas.
- `20261112000004_rpc.sql`: Funciones RPC atómicas y transaccionales para escaneo, transición de estados, importación e informes.
- `20261112000005_storage.sql`: Bucket privado `imports` con RLS restrictivo.
- `20261112000006_realtime.sql`: Publicación de `orders` y `order_lines` en realtime con réplica completa.
- `20261113000007_profiles_email.sql`: Sincronización de email en `profiles`.
- `20261113000008_branding.sql`: Función RPC pública `api_public_branding()` y bucket público `branding`.

### Tablas Principales
- **`profiles`**: Perfiles de usuario vinculados a `auth.users` (`role: 'admin' | 'operator'`, `name`, `email`, `is_active`).
- **`app_settings`**: Configuración general del sistema y personalización de marca (`dispatch_check_enabled`, `app_name`, paleta de colores, logos).
- **`products`**: Maestro de artículos con `sku`, `description`, `units_per_package`, `location` (pasillo/estante) e `is_active`. Códigos como texto.
- **`product_barcodes`**: Códigos de barra como texto (`package` o `unit`) asociados a un producto, con unicidad global garantizada por índice único.
- **`customers`**: Clientes y destinatarios de pedidos.
- **`orders`**: Pedidos con `order_number`, `customer_id`, totales de bultos/unidades y ciclo de vida de estados: `draft → pending → in_progress → assembled → dispatched` (o `cancelled` con motivo obligatorio).
- **`order_lines`**: Líneas del pedido con `package_scanned` y `unit_scanned` para picking, y `package_checked` y `unit_checked` para control de despacho.
- **`imports`**: Auditoría de lotes de importación masiva CSV/XLSX.
- **`scan_events`**: Trazabilidad de cada evento de escaneo e idempotencia garantizada por `client_event_id`.

## 2. Seguridad RLS y Permisos

- Row Level Security (RLS) activo y estricto en todas las tablas públicas.
- Los clientes autenticados como `operator` tienen acceso de sólo lectura sobre tablas requeridas y **no escriben directamente** sobre `orders` ni `order_lines`.
- Todas las operaciones de mutación o transición de pedidos se ejecutan exclusivamente a través de funciones RPC `SECURITY DEFINER` con `search_path = public`.

## 3. Funciones RPC Transaccionales (`api_*`)

Todas las funciones RPC retornan `jsonb` y encapsulan validaciones atómicas y bloqueos serializados (`FOR UPDATE`):
- `api_scan(p_order_line_id, p_stage, p_kind, p_delta, p_client_event_id, p_code)`: Registro idempotente de escaneo; incrementa contadores de forma atómica sin exceder el total.
- `api_find_line_by_code(p_order_id, p_code)`: Búsqueda del producto y su línea en el pedido por código de bulto o unidad.
- `api_complete_picking(p_order_id)`: Valida escaneo completo de líneas y transiciona el pedido a `assembled`.
- `api_complete_dispatch(p_order_id)`: Valida verificación de despacho y transiciona el pedido a `dispatched`.
- `api_set_order_status(p_order_id, p_status, p_reason)`: Cambios de estado administrativos (`draft`, `pending`, `cancelled` con motivo obligatorio).
- `api_save_order(p_order)`: Creación o edición atómica de pedidos y líneas con opción de liberación inmediata.
- `api_import_products(p_rows, p_dry_run)`: Carga masiva de catálogo con soporte de simulación (dry run).
- `api_import_orders(p_rows, p_release, p_dry_run, p_import_id)`: Carga masiva de pedidos con agrupación por pedido y simulación.
- `api_report_orders(p_from, p_to)`: Reporte consolidado de pedidos armados por rango de fechas.
- `api_public_branding()`: Configuración pública de marca para pantalla de login y clientes móviles sin sesión previa.

### Contrato de Errores
Las RPC lanzan excepciones capturables con códigos estandarizados (`forbidden`, `not_found`, `invalid_argument`, `invalid_transition`, `reason_required`, `out_of_range`, `incomplete`, `unknown_code`, `not_in_order`, `order_locked`, `invalid_order`). Consultar detalles en `supabase/README.md`.

## 4. Estándares y Comandos Operativos

- **Regla de Nuevas Migraciones**: Cualquier cambio de esquema requiere una **nueva** migración con timestamp en `supabase/migrations/`; nunca se edita una migración ya aplicada.
- **Sincronización de Tipos**: Al modificar el esquema o funciones RPC, regenerar tipos y mantener en sincronía `apps/web/types/supabase.ts` y `apps/mobile/types/supabase.ts` (idénticos).
- **Tests Automatizados**: Todo cambio de base de datos debe acompañarse de tests pgTAP en `supabase/tests/` y validación de concurrencia.
- **Comandos de Base de Datos** (requieren Supabase CLI y Docker; ejecutados por el usuario):
  ```bash
  npm run db:local                     # Levantar entorno local con Docker
  npm run db:test                      # Ejecutar suites pgTAP y prueba de concurrencia
  npm run db:types                     # Generar tipos TypeScript
  npm run db:bundle -- --seed          # Empaquetar script SQL autocontenido
  npm run db:setup -- --project-ref <ref>  # Aplicar migraciones en proyecto remoto
  npm run db:create-admin -- --email <email> # Crear usuario administrador inicial
  ```
