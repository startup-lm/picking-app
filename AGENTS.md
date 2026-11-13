# 📦 Pickflow - Guía y Reglas para Agentes de IA (AGENTS.md)

Este documento define la arquitectura, convenciones, comandos operativos y estándares de desarrollo para cualquier Agente de IA (Antigravity, Cursor, Claude Code, Copilot, etc.) que opere en este repositorio.

---

## 1. Visión General del Proyecto

**Pickflow** es una suite SaaS monorepo orientada a operaciones de logística y preparación de pedidos en depósitos (WMS / Fulfillment).
Permite gestionar la carga masiva de pedidos por CSV/Excel, el catálogo de productos con códigos de barra de bulto y unidad, la preparación física en depósito mediante terminal móvil con escáner de cámara, y el despacho/remito final.

### Estructura Monorepo:
- **`apps/web`**: Panel de control administrativo web construido con **Next.js 14 (App Router)**, **TypeScript** y **Tailwind CSS**.
- **`apps/mobile`**: Aplicación móvil para operarios de depósito construida con **React Native (0.81)**, **Expo SDK 54**, **Expo Router (v6)**, escáner de códigos de barra (`expo-camera`), respuesta háptica (`expo-haptics`) y audio (`expo-audio`).
- **`supabase/`**: Esquema de base de datos relacional PostgreSQL con funciones RPC transaccionales e índices de alto rendimiento para escaneo en tiempo real.

---

## 2. Comandos Operativos y Entorno de Desarrollo

### 2.1. Instalación de Dependencias
> **IMPORTANTE**: Debido a que `apps/web` usa React 18 (Next.js 14) y `apps/mobile` usa React 19 (Expo 54), las dependencias de cada app deben gestionarse de forma aislada:
```bash
# Instalar dependencias en ambas apps:
npm ci --prefix apps/web
npm ci --prefix apps/mobile
```

### 2.2. Ejecución Local
```bash
# Panel Web (puerto 3000):
npm run dev:web
# o bien: cd apps/web && npm run dev

# App Móvil (Expo Metro bundler):
npm run dev:mobile
# o bien: cd apps/mobile && npm start
```

### 2.3. Verificación de Tipos y Compilación
```bash
# Compilar y validar tipos Web:
npm run build:web

# Tests Web (Vitest):
npm run test:web

# Linting Web:
npm run lint:web

# Linting Móvil:
npm run lint:mobile

# Linting global:
npm run lint

# Typecheck Móvil:
cd apps/mobile && ./node_modules/.bin/tsc --noEmit
```

### Base de datos (requieren Supabase CLI y Docker; los corre el usuario):
```bash
npm run db:local
npm run db:test
npm run db:types
npm run db:bundle -- --seed
npm run db:setup -- --project-ref <ref>
npm run db:create-admin -- --email <email>
```

---

## 3. Variables de Entorno

### `apps/web/.env.local`
```env
NEXT_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<tu-service-role-key>
```
- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` son accesibles en el navegador (cliente).
- `SUPABASE_SERVICE_ROLE_KEY` **NUNCA** debe exponerse al frontend. Solo se utiliza en server components o API routes (`apps/web/lib/supabase/admin.ts`).

### `apps/mobile/.env`
```env
EXPO_PUBLIC_SUPABASE_URL=https://<tu-proyecto>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
```
- Variables con prefijo `EXPO_PUBLIC_` son inyectadas en tiempo de compilación por Expo.

---

## 4. Arquitectura y Reglas por Módulo

### 4.1. `apps/web` (Next.js 14 App Router)
- **Rutas y Páginas**:
  - `/`: Panel del día (dashboard de operaciones y accesos directos).
  - `/pedidos`: Listado de pedidos, con subrutas:
    - `/pedidos/nuevo`: Creación manual de pedidos.
    - `/pedidos/importar`: Importación masiva con validación previa.
    - `/pedidos/[id]`: Detalle del pedido, avance, auditoría e impresión de remito de preparación.
    - `/pedidos/[id]/editar`: Edición de líneas y datos de pedidos borradores o pendientes.
  - `/productos`: Catálogo maestro de productos y códigos de barra (+ `/productos/importar` para carga masiva).
  - `/clientes`: Directorio de clientes y destinatarios.
  - `/reportes`: Reportes de pedidos y exportación en CSV.
  - `/usuarios`: Gestión e invitación de operadores y administradores.
  - `/ajustes`: Configuración general del sistema, control de despacho y personalización de marca (branding).
  - **Rutas públicas**: `/login`, `/reset` (recuperación de contraseña), `/update-password` (establecimiento de contraseña tras invitación o reset) y `/sin-acceso` (aviso para operarios sin permisos en web).
  - `/api/*`: Route handlers que empiezan con `requireUser('admin')` (`lib/auth/require-user.ts`) y actúan como el usuario logueado (sesión por cookies con `@supabase/ssr`, `middleware.ts`); `supabaseAdmin` solo en `app/api/users/route.ts` (invitación).
  - **Acceso exclusivo**: La web es solo para administradores activos.
  - **Importación**: `lib/import/*` (CSV/XLSX con SheetJS, encabezados tolerantes) + dry run de las RPC.
- **Estilos y UI**:
  - Tailwind CSS 3.
  - Paleta de colores oficial (`primary`, `accent` y `accentSoft` son variables CSS definidas por la marca de la instancia; valores por defecto los de la lista):
    - Fondo: `#F3F4F6` (`bg-bg`)
    - Tarjeta/Superficie: `#FFFFFF` (`bg-card`)
    - Borde: `#BDBDBD` (`border-border`)
    - Muted: `#9CA3AF` (`text-muted`)
    - Primario: `#0F4C5C` (`bg-primary`, `text-primary`)
    - Acento: `#F2A541` (`bg-accent`, `text-accent`)
    - Acento suave: `#FCE7C8` (`bg-accentSoft`)
    - Texto principal: `#111827` (`text-text`)
    - Peligro: `#C0392B` (`bg-danger`, `text-danger`, `border-danger`)
    - Éxito: `#2E7D32` (`bg-success`, `text-success`)
    - Input: `#FFFFFF` (`bg-bgInput`)
- **Reglas de Servidor vs Cliente**:
  - Usar `'use client';` en componentes con hooks interactivos (`useState`, `useToast`, formularios).
  - Nunca importar `supabaseAdmin` en archivos con `'use client'`. Solo importar `supabase` (cliente anon).

### 4.2. `apps/mobile` (Expo React Native)
- **Estructura de Navegación (Expo Router)**:
  - `app/login.tsx`: Login de operarios; guard en `app/_layout.tsx`, operario inactivo o sesión vencida vuelven al login.
  - `app/index.tsx`: Inicio con accesos a PREPARAR / DESPACHAR y cerrar sesión.
  - `app/pedidos/index.tsx`: Lista "Preparar" (pedidos en `pending` / `in_progress`).
  - `app/despachos/index.tsx`: Lista "Despachar" (pedidos en `assembled`).
  - `app/orden/[id].tsx?stage=picking|dispatch`: Detalle único de escaneo vía `api_find_line_by_code` + `api_scan`, cámara continua, entrada manual y lector Bluetooth en modo teclado, tarjeta "SIGUIENTE", confirmar vía `api_complete_*`.
- **Feedback al Operario**:
  - `lib/feedback.ts` (háptica con `expo-haptics` + sonido con `expo-audio`) y `hooks/use-toast.tsx` (toast de color).
  - Sin `Alert` en el flujo de escaneo.
- **Hardware y Capacidades Nativas**:
  - **Cámara y Escaneo**: `expo-camera` para captura de códigos de barra en tiempo real. Debe contar siempre con debounce y manejo de permisos.
  - **Respuesta Háptica**: Usar `expo-haptics` (`Haptics.notificationAsync`, `Haptics.impactAsync`) para confirmar escaneos correctos o alertar errores al operario.
  - **Configuración e Instancias**: Configuración dinámica mediante `app.config.ts` y carpetas `instances/<nombre>/` (en reemplazo de `app.json`). Si `PICKFLOW_INSTANCE` no está definida, compila la versión base de Pickflow.
  - **Tema y Marca**: La marca se inicializa en build time desde `extra.branding` y se actualiza en runtime vía `api_public_branding()`. Consumir siempre `hooks/use-palette.ts` (`usePalette()`) para colores dinámicos con soporte de temas claro y oscuro de alto contraste. Para el nombre de marca usar `constants/brand.ts` (`APP_NAME`) o `useBranding()`.

### 4.3. `supabase/` (Base de Datos & Modelo de Negocio)
- **Esquema**: Definido en `supabase/migrations/` (migraciones de Supabase CLI, en orden).
- **Tablas Clave**:
  - `products`: Códigos como texto, `units_per_package`, `location`, `is_active`.
  - `product_barcodes`: Unicidad global de códigos de barra (`package` o `unit`).
  - `customers`: Directorio de clientes y destinatarios.
  - `orders`: `order_number`, estados `draft → pending → in_progress → assembled → dispatched` / `cancelled`.
  - `order_lines`: `*_scanned` para picking y `*_checked` para el control de despacho.
  - `imports`: Registro de archivos de importación.
  - `scan_events`: Idempotencia por `client_event_id`.
  - `profiles`: Rol `admin` / `operator`, `is_active`.
  - `app_settings`: Configuración general y marca.
- **Seguridad RLS y Funciones RPC**:
  - RLS en todas las tablas: el operador no escribe directo; todo por RPC `SECURITY DEFINER`.
  - RPC: `api_scan`, `api_find_line_by_code`, `api_complete_picking`, `api_complete_dispatch`, `api_set_order_status`, `api_save_order`, `api_import_products`, `api_import_orders`, `api_report_orders`, `api_public_branding`.
  - Contrato de errores: tabla en `supabase/README.md`.
- **Concepto Central de Picking**:
  - Cada producto puede escanearse por **Bulto** (`package_barcode`) o por **Unidad** (`unit_barcode`).
  - La interfaz y el hook de escaneo deben reconocer cuál código fue leído; el contador lo incrementa la RPC `api_scan` de forma atómica, sin superar el total.

---

## 5. Estándares y Directrices para Agentes

1. **No alterar contratos de API ni firmas RPC** sin actualizar en sincronía `apps/web`, `apps/mobile`, `supabase/migrations/` y `types/supabase.ts` de ambas apps (idénticos).
2. **Preservar la separación de entornos**: No usar variables de Expo en Next.js ni variables de Next.js en Expo.
3. **Manejo de Errores Defensivo**: En la app móvil, el operario trabaja en movimiento con guantes y mala conexión. Todo error de escaneo debe emitir toast claro y vibración de error (`Haptics.NotificationFeedbackType.Error`).
4. **Respetar White-Labeling**: La identidad visual, logos y nombres se configuran dinámicamente mediante `apps/mobile/app.config.ts` y `instances/` (en lugar de `app.json`), con soporte de marca en runtime vía la RPC pública `api_public_branding()` y los hooks `usePalette()` en mobile y variables CSS en web (`tailwind.config.js`, `apps/web/lib/branding.ts`, `apps/mobile/constants/brand.ts`). No cablear strings de marcas propietarias fijas en componentes reutilizables.
5. **No introducir dependencias sin justificación**: Mantener el bundle liviano y compatible con las versiones fijadas en los `package.json`.
6. **Validación obligatoria de cambios**: al modificar `apps/web`, correr `npm run build:web` o `npm run lint:web`; al modificar `apps/mobile`, correr `./node_modules/.bin/tsc --noEmit` dentro de `apps/mobile` o `npm run lint:mobile`. Informar el resultado real.
7. **Comandos aislados por app**: usar siempre `--prefix apps/web` o `--prefix apps/mobile` (React 18 vs React 19), nunca instalar dependencias de una app desde la raíz.
8. **Consultar el esquema**: antes de tareas mayores que toquen datos, revisar `supabase/migrations/` y `supabase/README.md`.
9. **Mobile en depósito**: priorizar alto contraste y bajo consumo de batería en `constants/theme.ts` y en las pantallas de picking.
10. **Cambios de esquema**: Cambios de esquema = **nueva** migración con timestamp; nunca editar una migración ya aplicada. Validar los `.sql` y agregar tests pgTAP en `supabase/tests/`.
