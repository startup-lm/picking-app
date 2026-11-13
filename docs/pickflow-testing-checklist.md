# 📋 Checklist de Pruebas — Instancia `pickflow-testing`

Este documento define la lista de verificación funcional y operativa para validar la instancia `pickflow-testing` de extremo a extremo entre el panel web administrativo y la aplicación móvil Android de depósito.

---

## 1. Base de Datos (Opcional, con Docker)

- [ ] `npm run db:local` levanta limpio sin errores en los contenedores ni en la aplicación de migraciones.
- [ ] `npm run db:test` pasa con éxito todas las pruebas (suites pgTAP completas y script de prueba de concurrencia real finaliza con `concurrency: OK`).

---

## 2. Autenticación y Control de Accesos

- [ ] **Login admin en la web**: el usuario administrador inicia sesión correctamente y accede al panel principal `/`.
- [ ] **Restricción de rol operario en la web**: un usuario con rol `operator` intenta ingresar a la web y es redirigido a `/sin-acceso` ("sin acceso").
- [ ] **Usuario desactivado en la app**: un usuario operario marcado como desactivado en la web no puede iniciar sesión en la app móvil.
- [ ] **Invitación de usuarios**: al invitar un nuevo usuario desde `/usuarios`, llega el correo de invitación y el usuario puede definir su contraseña en `/update-password`.
- [ ] **Recuperación de contraseña**: solicitud de restablecimiento desde `/reset` envía el enlace y permite redefinir contraseña.
- [ ] **Expiración de sesión**: la sesión vence automáticamente tras el período de inactividad configurado (30 minutos) o límite de tiempo (8 horas).

---

## 3. Configuración y Ajustes de Marca (Branding)

- [ ] **Modificación de marca en web**: desde `/ajustes`, modificar nombre de la aplicación, colores primario y acento, y subir nuevo archivo de logo.
- [ ] **Impacto visual en la web**: los cambios de nombre, paleta CSS y logo se reflejan de inmediato en la cabecera y componentes web.
- [ ] **Impacto visual en la app móvil**: al reabrir la app móvil, el login y la interfaz toman dinámicamente el nombre, colores y logo configurados vía API pública de branding.

---

## 4. Gestión de Productos y Catálogo

- [ ] **Plantilla de importación**: descargar la plantilla oficial en formato `.xlsx`.
- [ ] **Validación de importación con errores**: importar un archivo con un error a propósito (código de barra repetido) → la vista previa lo muestra y se puede descargar el reporte de errores.
- [ ] **Confirmación de importación**: confirmar la importación válida y comprobar el alta de los productos y sus códigos de barra.
- [ ] **Alta y edición manual**: alta manual de producto desde el modal y edición de datos o códigos existentes.
- [ ] **Desactivación de producto**: desactivar un producto del catálogo y comprobar que no se permita su selección o escaneo.

---

## 5. Gestión y Carga de Pedidos

- [ ] **Creación manual de pedido**: crear uno a mano escaneando con un lector USB en la PC.
- [ ] **Importación masiva con validación**: importar un archivo con varios pedidos (uno con SKU inexistente, una línea con `cantidad`) → vista previa correcta, se crean los válidos.
- [ ] **Liberación de pedido**: cambiar el estado del pedido de borrador a pendiente mediante liberar.
- [ ] **Impresión de remito**: imprimir la hoja de preparación (ordenada por ubicación).

---

## 6. Preparación Física (Picking) en la App Móvil

- [ ] **Visibilidad de pedidos liberados**: el pedido liberado aparece en "Preparar".
- [ ] **Escaneo continuo sin fricción**: escanear 10 bultos seguidos sin tocar la pantalla (háptica + beep + toast verde).
- [ ] **Manejo de códigos inválidos**: un código inválido vibra distinto, suena el doble beep y no frena.
- [ ] **Entrada manual de códigos**: permitir la entrada manual de código de barras desde la pantalla de preparación.
- [ ] **Lector Bluetooth externo**: lector Bluetooth en modo teclado (si hay).
- [ ] **Corrección / resta de escaneo**: restar un escaneo ante una equivocación y actualizar el total escaneado.
- [ ] **Concurrencia entre operarios**: dos operarios escaneando el mismo pedido no pierden escaneos.
- [ ] **Confirmar armado**: completar las cantidades requeridas y confirmar armado, pasando a `assembled`.

---

## 7. Despacho y Control de Salida

- [ ] **Visibilidad en despachos**: el pedido aparece en "Despachar".
- [ ] **Control de despacho activado**: control de salida y confirmación.
- [ ] **Control de despacho desactivado**: con el control de despacho apagado en `/ajustes`, se despacha sin escanear.

---

## 8. Seguimiento, Auditoría y Reportes

- [ ] **Detalle del pedido en la web**: el detalle del pedido en la web muestra avance y quién preparó.
- [ ] **Reporte diario**: el reporte del día lo incluye con sus métricas.
- [ ] **Exportación de datos**: exportar CSV del reporte.

---

## 9. Cancelación de Pedidos

- [ ] **Cancelación de pedido pendiente**: cancelar un pedido pendiente con motivo.
- [ ] **Protección de pedidos despachados**: no se puede cancelar uno despachado.

---

## 10. Resiliencia y Conectividad de Red

- [ ] **Persistencia de sesión sin conexión**: con la señal cortada al abrir la app no se cierra la sesión.
- [ ] **Fallo de escaneo sin conexión**: un escaneo sin red muestra error y revierte.

---

Hecho cuando todas las casillas pasan en `pickflow-testing`.
