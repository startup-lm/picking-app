# Changelog

Todos los cambios notables realizados en este proyecto están documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [Unreleased]

---

## [1.0.9] - 2026-10-30

### Added
- **Suite Monorepo Unificada**:
  - Estructura npm workspaces con aislamiento de dependencias entre Web (Next.js 14, React 18) y Mobile (Expo 54, React Native 0.81, React 19).
  - Scripts globales para desarrollo, linting y compilación (`npm run dev:web`, `npm run dev:mobile`, `npm run lint`, `npm run build:web`).
  - Script automatizado de versionado unificado y generación de release notes (`scripts/release.mjs`).
- **Panel Web Administrativo (`apps/web`)**:
  - Carga y procesamiento masivo de pedidos mediante archivos `.csv` y `.xlsx` (`/cargar-pedido`).
  - Carga masiva de catálogo de productos con asignación de códigos de barra (`/cargar-productos`).
  - Generación de remitos e impresión de hojas de ruta de picking (`/imprimir-pedido`).
  - Búsqueda y anulación transaccional de pedidos en curso (`/cancelar-pedido`).
  - Reportes de preparación por rango de fechas con exportación directa en formato CSV (`/generar-reporte`).
  - Autenticación y control de acceso vía Supabase SSR.
  - Paleta de diseño industrial de alto contraste (`#C62828`, `#FFD600`, `#F3F3F3`, `#111827`).
- **App Móvil de Operario (`apps/mobile`)**:
  - Escaneo de códigos de barra en tiempo real mediante cámara nativa (`expo-camera`) con debouncing anti-duplicados.
  - Reconocimiento dual por SKU: código de bulto/caja (`package_barcode`) y código de unidad individual (`unit_barcode`).
  - Incremento atómico de contadores de preparación física (`package_scanned` y `unit_scanned`).
  - Feedback háptico diferenciado con `expo-haptics` (vibración de éxito vs error).
  - Ordenamiento por pasillo/ubicación (`location`) para optimizar el recorrido físico del operario en depósito.
  - Persistencia local y soporte de conectividad deficiente mediante SQLite (`expo-sqlite`).
  - Módulo de verificación de despachos (`/despachos`) para control de entrega final.
- **Backend y Persistencia (`supabase/`)**:
  - Esquema relacional PostgreSQL con tablas `users`, `products`, `orders`, `product_order`, `dispatch` y `product_dispatch`.
  - Función RPC atómica `api_create_order_and_dispatch_with_lines` para garantizar consistencia transaccional.
  - Índices B-Tree de alta velocidad para escaneo instantáneo por SKU y código de barras.
- **Configuración para Agentes de IA**:
  - Guías maestras de contexto: `AGENTS.md`, `GEMINI.md`, `CLAUDE.md`.
  - Reglas modulares bajo `.agents/rules/` (`architecture.md`, `web.md`, `mobile.md`, `database.md`).
  - Templates de variables de entorno `.env.example` en web y mobile.
