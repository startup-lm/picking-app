# Reglas de Desarrollo: apps/web (Next.js 14)

## 1. Stack Tecnológico
- **Framework**: Next.js 14.2 (App Router)
- **Lenguaje**: TypeScript 5.4+
- **Estilos**: Tailwind CSS 3.4
- **Librerías Clave**: `@supabase/supabase-js`, `csv-parse`

## 2. Convenciones de Código
- **Identidad de Marca**: Importar `APP_NAME` desde `@/lib/brand` en lugar de cablear strings fijos.
- **Componentes de Cliente**: Si un componente usa hooks de React (`useState`, `useEffect`, `useRef`), eventos del DOM (`onClick`, `onChange`), o hooks de navegación de Next.js (`useRouter`), debe incluir la directiva `'use client';` en la primera línea.
- **Rutas API (`app/api/*`)**:
  - Se ejecutan en entorno Node.js / servidor.
  - Usar `supabaseAdmin` importado desde `@/lib/supabase/admin` para eludir RLS en operaciones administrativas autorizadas o llamadas RPC.
  - Validar siempre los payloads de entrada antes de escribir a la base de datos o storage.
- **Manejo de Archivos CSV**:
  - Toda función de parsing debe validar encoding UTF-8 / Latin1 y tolerar delimitadores de coma o punto y coma.
  - El helper `validateCsvFile` (`@/lib/validators/file`) debe usarse para validar extensiones y límites de tamaño.

## 3. Guía de Estilos y Tokens de Diseño
Usar las clases de Tailwind configuradas en `tailwind.config.js`:
- Contenedores / Fondos: `bg-bg`, `bg-card`
- Bordes: `border-border`
- Acciones Primarias: `bg-primary text-white`
- Botones de Acento: `bg-accent text-text`
- Resaltados / Estados: `text-accent`, `text-success`, `text-danger`, `bg-danger`

## 4. Verificación
Antes de dar por finalizada cualquier modificación en `apps/web`:
```bash
npm run build:web
npm run lint:web
```
Ambos comandos deben finalizar con código 0 y sin warnings críticos.
