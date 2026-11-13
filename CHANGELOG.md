# Changelog

Todos los cambios notables realizados en este proyecto están documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/) y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [Unreleased]

### Added
- Base de datos y backend: esquema relacional en PostgreSQL con funciones RPC transaccionales atómicas, políticas RLS, storage, realtime y tests automatizados con pgTAP.
- Adaptación de clientes al nuevo modelo: integración de aplicaciones web y mobile a la nueva estructura relacional, repositorios de escaneo y flujo de login.
- Autenticación y roles en panel web: integración con Supabase Auth, middleware de control de accesos, gestión de usuarios, reseteo de contraseñas y configuración del sistema.
- Experiencia de escaneo en app móvil: escaneo continuo con debounce, navegación guiada por ubicación de depósito, respuesta auditiva y háptica, y soporte para lector Bluetooth.
- Gestión comercial y catálogo en panel web: administración de productos, clientes, carga masiva desde CSV/Excel con validación previa en SheetJS y flujo completo de pedidos.
- Soporte multi-instancia y white-labeling: configuración dinámica de marca en web y mobile con `app.config.ts`, variables CSS, API de branding y generación de íconos.
- Preparación para entorno de pruebas: configuración de despliegue en Netlify (`netlify.toml`), perfil de compilación `testing` en EAS, runbook de Supabase y checklist de validación operativa.

### Changed
- Actualización del panel web a Next.js 16 y React 19: `middleware` pasa a `proxy`, APIs de request asincrónicas (`cookies()`, `params`) y ESLint 9 con configuración flat.

## [0.1.0] - 2026-11-12

### Added
- Primera versión de Pickflow a partir de la base de picking existente: rebranding, paleta y tema oscuro, limpieza del template, CI reproducible.
