# 📦 PickingApp v1.0.9 - Inaugural Release Notes (2026-10-30)

¡Primera versión unificada de la suite PickingApp! Esta versión integra el panel administrativo Web, la aplicación móvil de depósito y la base de datos relacional Supabase en un único monorepo preparado para despliegue industrial.

---

## 🚀 Principales Módulos y Funcionalidades

### 1. Panel de Control Web (`apps/web` - Next.js 14 & Tailwind CSS)
- **Carga de Pedidos**: Carga masiva de archivos `.csv` y `.xlsx` con validación de columnas y cantidades.
- **Catálogo de Productos**: Módulo de alta de productos con doble código de barras (bulto y unidad).
- **Impresión de Picking**: Generación automática de remitos de preparación optimizados para imprimir en hojas de depósito.
- **Gestión de Estados**: Cancelación y seguimiento de pedidos en tiempo real.
- **Reportes**: Generación y descarga en CSV de métricas operativas por rango de fechas.

### 2. Aplicación Móvil de Depósito (`apps/mobile` - Expo SDK 54 & React Native)
- **Escaneo por Cámara en Tiempo Real**: Lector de códigos de barra integrado con debouncing inteligente anti-doble lectura.
- **Lógica Dual Bulto / Unidad**: Reconocimiento automático de si se escaneó un bulto (`package_barcode`) o una unidad suelta (`unit_barcode`).
- **Respuesta Háptica y Sonora**: Notificaciones sensoriales inmediatas con `expo-haptics` que guían al operario en movimiento sin necesidad de mirar la pantalla constantemente.
- **Ruta Optimizada**: Filtro y ordenamiento por pasillo y estante (`location`) para reducir tiempos de caminata en depósito.
- **Verificación de Despachos**: Control y confirmación de salida de mercadería hacia los transportistas.

### 3. Backend Transaccional (`supabase/` - PostgreSQL & RPC)
- **Función RPC Atómica**: `api_create_order_and_dispatch_with_lines` para garantizar consistencia ACID entre pedidos, líneas y despachos.
- **Índices de Alto Desempeño**: Optimizaciones en B-Tree para consultas de escaneo sub-milisegundo.

### 4. Guías para Agentes de IA
- Documentos maestros: `AGENTS.md`, `GEMINI.md`, `CLAUDE.md`.
- Reglas modulares en `.agents/rules/`.
- Sistema unificado de release y changelog (`scripts/release.mjs`).

---
*Para reportar incidencias o solicitar nuevas características, crear un issue en el repositorio de GitHub.*
