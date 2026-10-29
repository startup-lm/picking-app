# Next + Supabase (solo @supabase/supabase-js)

## Setup
1. `cp .env.example .env.local` y setear:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
2. `npm i`
3. `npm run dev`

## Login
- /login usa `supabase.auth.signInWithPassword`.
- /upload verifica sesión en el **cliente** y redirige a /login si no hay sesión.
- Para mayor seguridad: políticas RLS que **solo** permitan escribir a `role=admin` en `app_metadata`.

## Import
- /upload parsea Excel en el navegador con `xlsx` y hace `upsert` a `products`.
- Ajustá `onConflict: 'sku'` a tu unique key.

## Notas
- Este setup evita helpers/SSR. Si luego querés SSR/edge con cookies en servidor, se puede migrar, pero no es estrictamente necesario para este mini admin.
