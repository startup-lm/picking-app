# Arquitectura del Monorepo y Flujo de Datos

## 1. Topología del Monorepo
El repositorio está organizado como un monorepo con aplicaciones aisladas:
```
pickflow/
├── apps/
│   ├── web/        # Panel de control administrativo (Next.js 14)
│   └── mobile/     # Aplicación de operario en depósito (Expo 54)
├── supabase/       # Migraciones SQL cronológicas, funciones RPC y tests pgTAP
├── .agents/        # Reglas modulares para agentes de IA
│   └── rules/
├── AGENTS.md       # Documento maestro para agentes
├── GEMINI.md       # Reglas específicas Antigravity / Gemini
└── CLAUDE.md       # Guía rápida para Claude Code
```

## 2. Flujo de Datos Operativo de Picking y Despacho
```
[Administrador Web]
       │
       ▼ (Carga pedidos por CSV/XLSX en /pedidos/importar o manual en /pedidos/nuevo)
[/api/orders/import o /api/orders]
       │
       ▼ (Ejecuta RPC atómica: api_import_orders o api_save_order)
[PostgreSQL / Supabase]
       ▲
       │ (Fetch de pedidos 'pending' e 'in_progress' en app/pedidos/index.tsx)
       ▼
[Operario Mobile (Expo)]
       │ (Pantalla app/orden/[id].tsx?stage=picking)
       ├─ Escanea SKU por código de bulto o unidad vía api_find_line_by_code
       ├─ Registra escaneo atómico vía api_scan (incrementa package_scanned / unit_scanned)
       └─ Al completar todas las líneas -> api_complete_picking marca Order como 'assembled'
       │
       ▼
[Control de Despacho (Web / Mobile)]
       │ (app/despachos/index.tsx y app/orden/[id].tsx?stage=dispatch)
       └─ Verificación de bultos/unidades -> api_complete_dispatch marca Order como 'dispatched'
```

## 3. Principio de Aislamiento
- Cada paquete en `apps/` tiene su propio `package.json` y conjunto de dependencias.
- Las dependencias no deben mezclarse entre `web` (React 18) y `mobile` (React 19).
