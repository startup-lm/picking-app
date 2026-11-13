# 📦 Pickflow

WMS liviano de preparación y despacho de pedidos para pymes, compuesto por un panel de administración web y una app Android con escaneo por cámara.

---

## Estructura del Monorepo

- **`apps/web`**: Panel de control administrativo web construido con Next.js 14 (App Router), TypeScript y Tailwind CSS.
- **`apps/mobile`**: Aplicación móvil para operarios de depósito construida con React Native (0.81), Expo SDK 54, Expo Router (v6) y escaneo de códigos de barra (`expo-camera`).
- **`supabase/`**: Esquema de base de datos relacional PostgreSQL con funciones RPC transaccionales para operaciones de pedidos y despachos.

---

## Requisitos

- **Node.js**: 24.x
- **npm**: 10.x o superior

---

## Instalación

Debido a que `apps/web` utiliza React 18 y `apps/mobile` utiliza React 19, las dependencias de cada aplicación deben gestionarse de forma aislada:

```bash
npm ci --prefix apps/web
npm ci --prefix apps/mobile
```

---

## Comandos Operativos

### Ejecución Local

```bash
# Panel Web (puerto 3000):
npm run dev:web

# App Móvil (Expo Metro bundler):
npm run dev:mobile
```

### Verificación de Tipos y Compilación

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

### Generación de Íconos Placeholder

```bash
npm run icons:placeholder
```

---

## Variables de Entorno

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

## Estado Actual

### Funcionalidades implementadas (hoy operativas):
- Carga masiva de catálogo de productos vía archivos CSV.
- Carga masiva de pedidos de clientes vía archivos CSV.
- Visualización y filtrado de pedidos y despachos en mobile (por estado, pasillo y ordenamiento).
- Preparación (picking) física en depósito mediante escaneo de cámara con reconocimiento de bulto y unidad.
- Despacho y entrega de pedidos mediante escaneo de verificación.
- Generación y exportación de reportes de pedidos en CSV.

### En desarrollo / hoja de ruta:
- Autenticación y login en la aplicación móvil.
- Políticas de Row Level Security (RLS) granulares en base de datos.
- Versionado formal de base de datos con migraciones de Supabase CLI.
- Soporte para importación de archivos Excel (`.xlsx`).
- Modo de contingencia offline con sincronización diferida en mobile.

---

## Licencia

Propietaria — `UNLICENSED`. Todos los derechos reservados.
