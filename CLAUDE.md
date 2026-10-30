# Claude Code Instructions (CLAUDE.md)

PickingApp - Smart Warehouse Picking & Inventory Suite (Monorepo Web + Mobile + Supabase).

## Quick Commands
- **Install All**: `npm install --prefix apps/web && npm install --prefix apps/mobile && npm install`
- **Dev Web**: `npm run dev:web` (Next.js 14 on port 3000)
- **Dev Mobile**: `npm run dev:mobile` (Expo SDK 54 Metro bundler)
- **Build Web**: `npm run build:web`
- **Lint**: `npm run lint` (runs `lint:web` and `lint:mobile`)
- **Typecheck Mobile**: `cd apps/mobile && ./node_modules/.bin/tsc --noEmit`

## Architecture Highlights
- `apps/web`: Next.js 14 App Router, Tailwind CSS, Supabase SSR/Admin clients.
- `apps/mobile`: React Native 0.81, Expo SDK 54, Expo Router v6, Camera barcode scanning (`expo-camera`), Haptics (`expo-haptics`), SQLite caching.
- `supabase`: PostgreSQL schema, RPC transactional functions (`api_create_order_and_dispatch_with_lines`), barcode indices.

## Crucial Domain & Safety Rules
- Two barcode types per SKU: `package_barcode` (bulto/caja) and `unit_barcode` (unidad suelta).
- Never import `supabaseAdmin` in client components or in `apps/mobile`.
- See `AGENTS.md` for in-depth architecture and guidelines.
