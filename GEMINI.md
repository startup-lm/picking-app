# Antigravity & Gemini Agent Instructions (GEMINI.md)

Este repositorio corresponde al monorepo **PickingApp** (Smart Warehouse Picking & Inventory Suite).

## Reglas Principales de Operación
1. **Consulta de Referencia**: Antes de comenzar cualquier tarea mayor, revisá [AGENTS.md](file:///Users/mauriciooubina/Desktop/Workspace/picking-app/AGENTS.md) para detalles completos de arquitectura y [supabase/schema.sql](file:///Users/mauriciooubina/Desktop/Workspace/picking-app/supabase/schema.sql) para el esquema de datos.
2. **Aislamiento de Entornos**:
   - `apps/web` es Next.js 14 (React 18).
   - `apps/mobile` es Expo SDK 54 / React Native (React 19).
   - Ejecutá siempre comandos usando `--prefix apps/web` o `--prefix apps/mobile` para evitar conflictos en dependencias.
3. **Validación de Cambios**:
   - Al modificar `apps/web`, validá siempre ejecutando `npm run build:web` o `npm run lint:web`.
   - Al modificar `apps/mobile`, ejecutá `./node_modules/.bin/tsc --noEmit` en `apps/mobile` o `npm run lint:mobile`.
4. **Seguridad y Secretos**:
   - Nunca expongas `SUPABASE_SERVICE_ROLE_KEY` en código del cliente (`'use client'`, o dentro de `apps/mobile`).
   - Mantené los archivos `.env` y `.env.local` fuera del control de versiones.
5. **Estándares de UI / UX**:
   - En la Web, respetá los tokens de Tailwind configurados en `tailwind.config.js`.
   - En Mobile, utilizá `constants/theme.ts` para colores y tipografía, asegurando soporte para uso intensivo de batería y alto contraste en depósitos.
