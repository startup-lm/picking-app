# Reglas de Desarrollo: apps/mobile (Expo & React Native)

## 1. Stack Tecnológico
- **Framework**: Expo SDK 54 / React Native 0.81
- **Router**: Expo Router v6 (File-based routing)
- **Lenguaje**: TypeScript 5.9+
- **Librerías Nativas Clave**: `expo-camera`, `expo-haptics`, `expo-sqlite`, `@react-native-async-storage/async-storage`

## 2. Convenciones de la App Móvil
- **Navegación**:
  - Toda pantalla se ubica bajo `app/` (ej: `app/pedidos/[id].tsx`).
  - Utilizar el hook `useLocalSearchParams` con tipos genéricos estrictos.
  - El encabezado nativo se configura mediante `<Stack.Screen options={{...}} />`.
- **Manejo del Escáner de Códigos de Barra**:
  - El escaneo debe ser ultra reactivo y tolerante al ruido visual del depósito.
  - Implementar bloqueo (debounce o flag `scannedRef = true`) mientras se procesa la validación de un código para evitar lecturas duplicadas en milisegundos.
  - Diferenciar claramente si el código escaneado coincide con:
    1. `package_barcode`: Incrementa `package_scanned` en la línea correspondiente.
    2. `unit_barcode`: Incrementa `unit_scanned` en la línea correspondiente.
  - En caso de código no reconocido en el pedido, emitir feedback auditivo o vibración de error inmediata.
- **Háptica y Feedback al Operario**:
  - Escaneo exitoso: `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)` o `Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)`.
  - Escaneo erróneo / Exceso de cantidad: `Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)`.
- **Tema y Consistencia Visual**:
  - Consumir siempre `constants/theme.ts`.
  - Asegurar legibilidad con tipografía clara y contrastes altos aptos para pantallas en movimiento bajo luz artificial de depósito.

## 3. Verificación
Antes de finalizar cambios en `apps/mobile`:
```bash
cd apps/mobile && ./node_modules/.bin/tsc --noEmit
npm run lint:mobile
```
