# Arquitectura del Monorepo y Flujo de Datos

## 1. Topología del Monorepo
El repositorio está organizado como un monorepo con aplicaciones aisladas:
```
pickflow/
├── apps/
│   ├── web/        # Panel de control administrativo (Next.js 14)
│   └── mobile/     # Aplicación de operario en depósito (Expo 54)
├── supabase/       # Esquemas SQL, migraciones y funciones RPC
├── .agents/        # Reglas modulares para agentes de IA
│   └── rules/
├── AGENTS.md       # Documento maestro para agentes
├── GEMINI.md       # Reglas específicas Antigravity / Gemini
└── CLAUDE.md       # Guía rápida para Claude Code
```

## 2. Flujo de Datos Operativo de Picking
```
[Administrador Web]
       │
       ▼ (Sube archivo CSV con pedidos)
[/api/orders/process-csv]
       │
       ▼ (Ejecuta RPC atómica: crea Order + Dispatch + Líneas)
[PostgreSQL / Supabase]
       ▲
       │ (Sincronización en tiempo real / Fetch de pedidos 'pending')
       ▼
[Operario Mobile (Expo)]
       │
       ├─ Escanea SKU por código de bulto o unidad (Cámara + Haptics)
       ├─ Incrementa package_scanned / unit_scanned
       └─ Al completar todos los items -> marca Order como 'assembled'
       │
       ▼
[Despacho y Remito Web / Mobile]
       └─ Verificación de bultos y entrega ('delivered')
```

## 3. Principio de Aislamiento
- Cada paquete en `apps/` tiene su propio `package.json` y conjunto de dependencias.
- Las dependencias no deben mezclarse entre `web` (React 18) y `mobile` (React 19).
