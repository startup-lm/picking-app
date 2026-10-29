# 📦 PickingApp - Smart Warehouse Picking & Inventory Suite

Plataforma integral de gestión de preparación de pedidos (WMS / Fulfillment) compuesta por:
- **`apps/mobile`**: Aplicación móvil para operarios de depósito (React Native + Expo) con escaneo de código de barras por cámara, háptica y validación de bultos/unidades.
- **`apps/web`**: Panel de control administrativo (Next.js 14 + Tailwind CSS) para carga de pedidos, catálogo de productos, impresión de remitos/etiquetas y reportes.
- **`supabase/`**: Esquema de base de datos relacional y funciones RPC para sincronización en tiempo real.

---

## 🚀 Inicio Rápido para Desarrollo y Demos

### 1. Requisitos
- Node.js 18+
- npm o pnpm
- Cuenta de Supabase (o instancia local)

### 2. Configurar la Base de Datos
1. Crea un nuevo proyecto en [Supabase](https://supabase.com).
2. Ve al **SQL Editor** y ejecuta el contenido de `supabase/schema.sql`.
3. Para cargar datos ficticios de demostración, ejecuta `supabase/seed.sql`.
4. En **Storage**, crea un bucket público llamado `orders`.

### 3. Configuración de Variables de Entorno

#### En `apps/web/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key
```

#### En `apps/mobile/.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

### 4. Ejecución

Desde la raíz del monorepo:

```bash
# Instalar dependencias
npm install --prefix apps/web
npm install --prefix apps/mobile

# Iniciar el panel administrativo Web (puerto 3000)
npm run dev:web

# Iniciar la app móvil con Expo
npm run dev:mobile
```

---

## 🎨 Personalización de Marca (White-Label)

Cuando se defina el nombre final entre los socios:
- **Nombre e Iconos de la App Móvil:** Editar `apps/mobile/app.json`.
- **Paleta de Colores Web:** Editar `apps/web/tailwind.config.js`.
- **Tema Móvil:** Editar `apps/mobile/constants/theme.ts`.
- **Header y Logos:** Editar `apps/web/components/Header.tsx` y `apps/mobile/app/_layout.tsx`.

---

## 📄 Licencia y Propiedad
Código propiedad del equipo fundador de PickingApp.
