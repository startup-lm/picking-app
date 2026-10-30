# 📦 PickingApp - Guía y Reglas para Agentes de IA (AGENTS.md)

Este documento define la arquitectura, convenciones, comandos operativos y estándares de desarrollo para cualquier Agente de IA (Antigravity, Cursor, Claude Code, Copilot, etc.) que opere en este repositorio.

---

## 1. Visión General del Proyecto

**PickingApp** es una suite SaaS monorepo orientada a operaciones de logística y preparación de pedidos en depósitos (WMS / Fulfillment).
Permite gestionar la carga masiva de pedidos por CSV/Excel, el catálogo de productos con códigos de barra de bulto y unidad, la preparación física en depósito mediante terminal móvil con escáner de cámara, y el despacho/remito final.

### Estructura Monorepo:
- **`apps/web`**: Panel de control administrativo web construido con **Next.js 14 (App Router)**, **TypeScript** y **Tailwind CSS**.
- **`apps/mobile`**: Aplicación móvil para operarios de depósito construida con **React Native (0.81)**, **Expo SDK 54**, **Expo Router (v6)**, escáner de códigos de barra (`expo-camera`), respuesta háptica (`expo-haptics`) y persistencia local (`expo-sqlite`).
- **`supabase/`**: Esquema de base de datos relacional PostgreSQL con funciones RPC transaccionales e índices de alto rendimiento para escaneo en tiempo real.

---

## 2. Comandos Operativos y Entorno de Desarrollo

### 2.1. Instalación de Dependencias
> **IMPORTANTE**: Debido a que `apps/web` usa React 18 (Next.js 14) y `apps/mobile` usa React 19 (Expo 54), las dependencias de cada app deben gestionarse de forma aislada:
```bash
# Instalar dependencias en ambas apps:
npm install --prefix apps/web
npm install --prefix apps/mobile

# En la raíz (symlinks de workspaces):
npm install
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

# Linting Web:
npm run lint:web

# Linting Móvil:
npm run lint:mobile

# Linting global:
npm run lint

# Typecheck Móvil:
cd apps/mobile && ./node_modules/.bin/tsc --noEmit
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
  - `/home`: Dashboard principal y accesos directos.
  - `/cargar-pedido`: Carga y validación masiva de archivos CSV/Excel con pedidos.
  - `/cargar-productos`: Carga masiva de catálogo y códigos de barra.
  - `/imprimir-pedido`: Generación e impresión de remitos de preparación.
  - `/cancelar-pedido`: Búsqueda y anulación de pedidos en curso.
  - `/generar-reporte`: Reportes de pedidos y exportación en CSV/Excel.
  - `/api/*`: Endpoints protegidos del servidor que utilizan `supabaseAdmin` para operaciones transaccionales o sin RLS.
- **Estilos y UI**:
  - Tailwind CSS 3.
  - Paleta de colores oficial:
    - Fondo: `#F3F3F3` (`bg-bg`)
    - Tarjeta/Superficie: `#FFFFFF` (`bg-card`)
    - Borde: `#BDBDBD` (`border-border`)
    - Rojo primario: `#C62828` (`bg-red`, `text-red`)
    - Amarillo acento: `#FFD600` (`bg-yellow`, `text-yellow`)
    - Texto principal: `#111827` (`text-text`)
    - Peligro: `#C0392B` (`text-danger`)
    - Éxito: `#2E7D32` (`text-success`)
- **Reglas de Servidor vs Cliente**:
  - Usar `'use client';` en componentes con hooks interactivos (`useState`, `useToast`, formularios).
  - Nunca importar `supabaseAdmin` en archivos con `'use client'`. Solo importar `supabase` (cliente anon).

### 4.2. `apps/mobile` (Expo React Native)
- **Estructura de Navegación (Expo Router)**:
  - `app/index.tsx`: Pantalla de bienvenida con accesos a `PEDIDOS` y `DESPACHOS`.
  - `app/pedidos/index.tsx`: Lista de pedidos pendientes con buscador y refresco.
  - `app/pedidos/[id].tsx`: Pantalla crítica de picking con escáner de códigos de barra, validación de bultos/unidades, ordenamiento por pasillo/ubicación y feedback auditivo/háptico.
  - `app/despachos/index.tsx` y `app/despachos/[id].tsx`: Verificación y entrega de despachos.
- **Hardware y Capacidades Nativas**:
  - **Cámara y Escaneo**: `expo-camera` para captura de códigos de barra en tiempo real. Debe contar siempre con debounce y manejo de permisos.
  - **Respuesta Háptica**: Usar `expo-haptics` (`Haptics.notificationAsync`, `Haptics.impactAsync`) para confirmar escaneos correctos o alertar errores al operario.
  - **Tema y Constantes**: Consumir siempre `constants/theme.ts` para colores y fuentes (`Colors.light`, `Colors.dark`).

### 4.3. `supabase/` (Base de Datos & Modelo de Negocio)
- **Tablas Clave**:
  - `products`: `sku`, `description`, `package_barcode` (código de barra del bulto/caja), `unit_barcode` (código de barra de la unidad individual).
  - `orders`: `client`, `total_package`, `total_unit`, `status` (`pending` | `assembled`), `file_name`, `file_url`.
  - `product_order`: Líneas del pedido con `location` (ubicación en depósito), `package_total`, `unit_total`, `package_scanned`, `unit_scanned`.
  - `dispatch` y `product_dispatch`: Despacho asociado al pedido creado automáticamente vía RPC.
- **Función RPC Transaccional**:
  - `api_create_order_and_dispatch_with_lines`: Crea atómicamente la orden, el despacho asociado y todas sus líneas dentro de una única transacción SQL en PostgreSQL.
- **Concepto Central de Picking**:
  - Cada producto puede escanearse por **Bulto** (`package_barcode`) o por **Unidad** (`unit_barcode`).
  - La interfaz y el hook de escaneo deben reconocer cuál código fue leído e incrementar el contador correspondiente (`package_scanned` o `unit_scanned`), sin permitir superar el total requerido salvo configuración explícita.

---

## 5. Estándares y Directrices para Agentes

1. **No alterar contratos de API ni firmas RPC** sin actualizar en sincronía `apps/web`, `apps/mobile` y `supabase/schema.sql`.
2. **Preservar la separación de entornos**: No usar variables de Expo en Next.js ni variables de Next.js en Expo.
3. **Manejo de Errores Defensivo**: En la app móvil, el operario trabaja en movimiento con guantes y mala conexión. Todo error de escaneo debe emitir toast claro y vibración de error (`Haptics.NotificationFeedbackType.Error`).
4. **Respetar White-Labeling**: La identidad visual, logos y nombres están centralizados en `apps/mobile/app.json`, `apps/mobile/constants/theme.ts` y `apps/web/tailwind.config.js`. No cablear strings de marcas propietarias fijas en componentes reutilizables.
5. **No introducir dependencias sin justificación**: Mantener el bundle liviano y compatible con las versiones fijadas en los `package.json`.
