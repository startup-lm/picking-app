# 📦 Pickflow — Paquete de Base de Datos `supabase/`

Este directorio contiene el esquema relacional, funciones RPC transaccionales y atómicas, políticas de seguridad RLS, configuración de storage, publicación de realtime, datos de prueba (seed) y suites de tests para la base de datos de **Pickflow**.

---

## Runbook: Crear una instancia nueva de Pickflow

### 1. Requisitos Previos
- Cuenta en [Supabase](https://supabase.com).
- [Supabase CLI](https://supabase.com/docs/guides/cli) instalada localmente.
- Node.js versión 24 o superior.

### 2. Creación y Configuración del Proyecto en Supabase
1. Crear un nuevo proyecto desde el panel de control de Supabase (seleccionar región cercana y definir una contraseña segura para la base de datos).
2. **Autenticación (Auth)**:
   - En **Authentication → Providers → Email**: Habilitar el proveedor de correo electrónico y **desactivar "Allow new users to sign up"** (el registro público debe permanecer cerrado; los usuarios son dados de alta por el administrador).
   - En **Authentication → URL Configuration**: Configurar **Site URL** con la URL pública de la aplicación web de Pickflow.

### 3. Aplicación de Migraciones y Esquema con CLI
Vincular el proyecto local con la instancia remota y empujar las migraciones:
```bash
npm run db:setup -- --project-ref <tu-project-ref> [--seed]
```
> El script solicitará de forma interactiva la contraseña de la base de datos a través de la CLI de Supabase. La contraseña no se almacena en ningún archivo del repositorio.

### 4. Creación del Usuario Administrador Inicial
Obtener la `URL` y la clave de rol de servicio (`service_role key`) desde el panel de Supabase (**Project Settings → API**). **Nunca** guardes esta clave en archivos versionados ni la expongas en clientes:
```bash
SUPABASE_URL="https://<tu-project-ref>.supabase.co" \
SUPABASE_SERVICE_ROLE_KEY="<tu-service-role-key>" \
PICKFLOW_USER_PASSWORD="<password-temporal-segura>" \
npm run db:create-admin -- --email admin@tuempresa.com --name "Administrador" --role admin
```
> Si omites `PICKFLOW_USER_PASSWORD`, el usuario recibirá una invitación por correo para establecer su contraseña.

### 5. Configuración de Variables de Entorno en Aplicaciones
Configurar las variables según `AGENTS.md` §3:
- **`apps/web/.env.local`**:
  ```env
  NEXT_PUBLIC_SUPABASE_URL=https://<tu-project-ref>.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
  SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key>
  ```
- **`apps/mobile/.env`**:
  ```env
  EXPO_PUBLIC_SUPABASE_URL=https://<tu-project-ref>.supabase.co
  EXPO_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
  ```

### 6. Alternativa sin CLI (Empaquetado Manual)
Si prefieres inicializar la base de datos directamente desde el **SQL Editor** del panel web de Supabase:
```bash
npm run db:bundle -- --seed
```
Copia el contenido generado en `supabase/dist/setup.sql` y ejecútalo en el SQL Editor del panel de Supabase.

---

## Desarrollo Local y Pruebas

> ⚠️ **IMPORTANTE**: La ejecución local de la base de datos (`npm run db:local`) y la ejecución de tests automatizados (`npm run db:test`) **requieren tener Docker Desktop instalado y corriendo**, así como la **Supabase CLI**. Estos comandos no se ejecutan automáticamente en entornos de desarrollo aislados y quedan bajo responsabilidad del desarrollador/operador.

### Iniciar base local y reiniciar esquema
```bash
npm run db:local
```

### Ejecutar tests pgTAP y prueba de concurrencia real
```bash
npm run db:test
```

### Crear usuarios locales de prueba
```bash
PICKFLOW_USER_PASSWORD="password123" \
SUPABASE_URL="http://127.0.0.1:54321" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key-de-supabase-status>" \
npm run db:create-admin -- --email admin@local.test --role admin --name "Admin Local"

PICKFLOW_USER_PASSWORD="password123" \
SUPABASE_URL="http://127.0.0.1:54321" \
SUPABASE_SERVICE_ROLE_KEY="<service-role-key-de-supabase-status>" \
npm run db:create-admin -- --email operador@local.test --role operator --name "Operador Local"
```

---

## Catálogo de Migraciones

| Archivo | Contenido / Responsabilidad |
|---|---|
| `20261112000001_core.sql` | Esquema base: tablas `products`, `product_barcodes`, `customers`, `orders`, `order_lines`, `imports`, `scan_events`. Secuencia `order_number_seq` y triggers de timestamps y recálculo de totales. |
| `20261112000002_auth.sql` | Esquema de usuarios y configuración: `profiles`, `app_settings`, trigger de creación automática en `auth.users`, y helpers de verificación `is_active_user()` e `is_admin()`. |
| `20261112000003_rls.sql` | Políticas de Row Level Security (RLS) en todas las tablas públicas. Revocación de accesos al rol `anon` y concesión de permisos mínimos al rol `authenticated`. |
| `20261112000004_rpc.sql` | Funciones RPC transaccionales y atómicas para escaneo, finalización de picking/despacho, cambio de estado, carga masiva e informes. |
| `20261112000005_storage.sql` | Creación del bucket privado `imports` en `storage.buckets` con políticas RLS de acceso exclusivo para administradores. |
| `20261112000006_realtime.sql` | Publicación de `orders` y `order_lines` en `supabase_realtime` con identidad de réplica completa (`REPLICA IDENTITY FULL`). |

---

## Funciones RPC (`api_*`)

Todas las funciones RPC son `SECURITY DEFINER`, establecen `search_path = public` y retornan `jsonb`.

| Función | Rol Mínimo | Descripción |
|---|---|---|
| `api_scan(p_order_line_id, p_stage, p_kind, p_delta, p_client_event_id, p_code)` | Operador | Registra escaneo de bulto o unidad con bloqueo serializado `FOR UPDATE` a nivel pedido. Idempotente ante reintentos de red. Actualiza contadores y avanza pedido a `in_progress`. |
| `api_find_line_by_code(p_order_id, p_code)` | Operador | Busca el producto y su línea correspondiente en el pedido mediante código de barra de bulto o unidad. |
| `api_complete_picking(p_order_id)` | Operador | Valida que todas las líneas del pedido hayan completado su escaneo de picking (`package_scanned = package_total`, `unit_scanned = unit_total`) y transiciona el pedido a `assembled`. |
| `api_complete_dispatch(p_order_id)` | Operador | Valida que todas las líneas hayan sido chequeadas (`*_checked = *_total`) si `dispatch_check_enabled` está activo, y transiciona el pedido a `dispatched`. |
| `api_set_order_status(p_order_id, p_status, p_reason)` | Administrador | Cambia el estado de un pedido (`draft`, `pending`, `cancelled`). Requiere motivo obligatorio para cancelación. Idempotente si el estado coincide con el actual. |
| `api_save_order(p_order)` | Administrador | Crea o edita pedidos con validación atómica de líneas, clientes y unicidad de número de pedido. Admite liberación inmediata mediante flag `release`. |
| `api_import_products(p_rows, p_dry_run)` | Administrador | Importación masiva de productos normalizados. En `p_dry_run = true` evalúa validaciones sin persistir cambios usando la excepción interna `PFDRY`. |
| `api_import_orders(p_rows, p_release, p_dry_run, p_import_id)` | Administrador | Importación masiva y agrupación por pedido. Suma automáticamente SKUs repetidos dentro del mismo pedido y valida existencias. Soporta dry run. |
| `api_report_orders(p_from, p_to)` | Administrador | Genera reporte agrupado por día de pedidos armados dentro de un rango de hasta 92 días, ajustado a la zona horaria del sistema. |

---

## Códigos de Error (Contrato de API)

Las funciones RPC lanzan excepciones con `RAISE EXCEPTION '<codigo>' USING ERRCODE = '<errcode>';` (y `DETAIL = '<detalle>'` solo en `invalid_order`):

| Código (mensaje) | ERRCODE | Cuándo se emite |
|---|---|---|
| `forbidden` | `42501` | Sin sesión, usuario inactivo, o usuario sin rol de administrador en funciones reservadas. |
| `not_found` | `P0002` | Pedido o línea inexistente, o intento de acceso de operario a pedidos en estado `draft`. |
| `invalid_argument` | `22023` | Parámetro fuera de dominio (etapa o tipo inválido, `delta = 0`, rango de fechas > 92 días o fecha desde posterior a fecha hasta). |
| `invalid_transition` | `P0001` | Transición de estado no permitida según el ciclo de vida del pedido. |
| `reason_required` | `P0001` | Cancelación de pedido sin motivo especificado. |
| `out_of_range` | `P0001` | Escaneo que dejaría el contador por debajo de 0 o por encima del total requerido. |
| `incomplete` | `P0001` | Intento de completar picking o despacho con líneas pendientes de escaneo/chequeo. |
| `dispatch_check_disabled` | `P0001` | Intento de escaneo de despacho cuando el control se encuentra desactivado en la configuración. |
| `unknown_code` | `P0001` | Código de barras no encontrado en el catálogo de productos. |
| `not_in_order` | `P0001` | El código de barras corresponde a un producto que no forma parte del pedido indicado. |
| `order_locked` | `P0001` | Modificación de un pedido bloqueado (pedidos en curso con escaneos o ya armados/despachados). |
| `invalid_order` | `P0001` | Datos de pedido inválidos en `api_save_order`. El motivo exacto se provee en `DETAIL` (`missing_customer`, `no_lines`, `duplicate_product`, `invalid_quantity`, `inactive_product`, `order_number_taken`). |
