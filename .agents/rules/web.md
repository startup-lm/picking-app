# Reglas de Desarrollo: apps/web (Next.js 14)

## 1. Stack Tecnológico
- **Framework**: Next.js 14.2 (App Router)
- **Lenguaje**: TypeScript 5.4+
- **Estilos**: Tailwind CSS 3.4
- **Librerías Clave**: `@supabase/supabase-js`, `@supabase/ssr`, `xlsx` (SheetJS)

## 2. Convenciones de Código
- **Identidad de Marca**: Importar `APP_NAME` desde `@/lib/brand` o consumir branding dinámico y variables CSS en lugar de cablear strings fijos.
- **Componentes de Cliente**: Si un componente usa hooks de React (`useState`, `useEffect`, `useRef`), eventos del DOM (`onClick`, `onChange`), o hooks interactivos, debe incluir la directiva `'use client';` en la primera línea. Nunca importar `supabaseAdmin` en componentes de cliente (solo el cliente anónimo `supabase`).
- **Rutas API (`app/api/*`)**:
  - Se ejecutan en entorno Node.js / servidor.
  - Route handlers protegidos que inician con `requireUser('admin')` (`@/lib/auth/require-user.ts`) y actúan en nombre del usuario logueado (sesión por cookies con `@supabase/ssr` y `middleware.ts`).
  - El cliente con rol de servicio `supabaseAdmin` (`@/lib/supabase/admin`) se reserva exclusivamente para `app/api/users/route.ts` (invitaciones administrativas vía Supabase Auth Admin).
  - Validar siempre los payloads de entrada antes de invocar las funciones RPC o interactuar con storage.
- **Importación de Archivos (CSV / XLSX)**:
  - Implementada en `lib/import/*` con soporte para formatos CSV y Excel (`.xlsx`).
  - Lectura tolerante a encabezados equivalentes y validación de datos en modo dry run antes de confirmar la persistencia.

## 3. Guía de Estilos y Tokens de Diseño
Usar las clases de Tailwind configuradas en `tailwind.config.js` (los colores `primary`, `accent` y `accentSoft` son variables CSS inyectadas dinámicamente por la marca de la instancia):
- Contenedores / Fondos: `bg-bg`, `bg-card`
- Bordes: `border-border`
- Acciones Primarias: `bg-primary text-white`
- Botones de Acento: `bg-accent text-text`
- Resaltados / Estados: `text-accent`, `text-success`, `text-danger`, `bg-danger`

## 4. Verificación
Antes de dar por finalizada cualquier modificación en `apps/web`:
```bash
npm run build:web
npm run test:web
npm run lint:web
```
Todos los comandos deben finalizar con código 0 y sin warnings críticos.
