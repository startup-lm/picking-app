# Reglas de Desarrollo: apps/mobile (Expo & React Native)

## 1. Stack Tecnológico
- **Framework**: Expo SDK 54 / React Native 0.81
- **Router**: Expo Router v6 (File-based routing)
- **Lenguaje**: TypeScript 5.9+
- **Librerías Nativas Clave**: `expo-camera`, `expo-haptics`, `expo-audio`, `@react-native-async-storage/async-storage`

## 2. Convenciones de la App Móvil
- **Navegación**:
  - Toda pantalla se ubica bajo `app/` (ej: `app/orden/[id].tsx?stage=picking|dispatch`, `app/pedidos/index.tsx`, `app/despachos/index.tsx`, `app/login.tsx`).
  - Utilizar el hook `useLocalSearchParams` con tipos genéricos estrictos.
  - El encabezado nativo se configura mediante `<Stack.Screen options={{...}} />`.
- **Manejo del Escáner de Códigos de Barra**:
  - El escaneo debe ser ultra reactivo y tolerante al ruido visual del depósito.
  - Implementar bloqueo (debounce o flag `scannedRef = true`) mientras se procesa la validación de un código para evitar lecturas duplicadas en milisegundos.
  - Identificar la línea y tipo de código mediante `api_find_line_by_code`.
  - El incremento del contador (`package_scanned` o `unit_scanned`) lo realiza atómicamente la RPC `api_scan`.
  - Soportar cámara continua, ingreso manual por teclado y lector Bluetooth en modo teclado (HID).
- **Háptica, Sonido y Feedback al Operario**:
  - Centralizado en `lib/feedback.ts` (`expo-haptics` y `expo-audio`) y notificaciones no bloqueantes con `hooks/use-toast.tsx` (`useToast()`).
  - Escaneo exitoso: Beep de confirmación y vibración suave (`Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)`).
  - Escaneo erróneo / Exceso: Doble beep de error y vibración de advertencia (`Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)`).
  - **Sin llamadas a `Alert`**: Prohibido usar `Alert` o modales bloqueantes durante el flujo activo de escaneo.
- **Tema y Consistencia Visual**:
  - Configuración dinámica mediante `app.config.ts` y carpetas `instances/<nombre>/` (en reemplazo de `app.json`).
  - Consumir siempre `hooks/use-palette.ts` (`usePalette()`) para colores dinámicos con soporte de temas claro y oscuro de alto contraste.
  - Para el nombre de marca institucional, consumir `constants/brand.ts` (`APP_NAME`) o `useBranding()`.
  - Asegurar legibilidad con tipografía clara y contrastes altos aptos para pantallas en movimiento bajo luz artificial de depósito.

## 3. Verificación
Antes de finalizar cambios en `apps/mobile`:
```bash
cd apps/mobile && ./node_modules/.bin/tsc --noEmit
npm run lint:mobile
```
