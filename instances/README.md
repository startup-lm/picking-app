# Configuración de Instancias (White-Labeling Mobile)

Pickflow permite generar builds móviles personalizados para diferentes depósitos o clientes a partir de la misma base de código.

## Estructura de una instancia

Cada instancia vive en una subcarpeta de `instances/<nombre>/` y contiene:

- `instance.json`: metadatos y configuración de marca.
- `icon.png`: ícono principal cuadrado (1024x1024 px).
- `adaptive-foreground.png`: primer plano para adaptive icon de Android (432x432 px).
- `splash.png`: imagen para la pantalla de carga / splash (1024x1024 px).

### Esquema de `instance.json`

```json
{
  "name": "Pickflow Ejemplo",
  "slug": "pickflow-example",
  "scheme": "pickflow-example",
  "androidPackage": "com.pickflow.example",
  "primaryColor": "#0F4C5C",
  "accentColor": "#F2A541",
  "icon": "icon.png",
  "adaptiveIconForeground": "adaptive-foreground.png",
  "splashImage": "splash.png",
  "easProjectId": ""
}
```

- **`name`**: Nombre de la aplicación visible en el sistema operativo.
- **`slug`**: Identificador URL-safe para Expo.
- **`scheme`**: Esquema URI de deep linking (ej. `pickflow-example`).
- **`androidPackage`**: Application ID único en Android (ej. `com.empresa.picking`). Debe coincidir con `^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$`.
- **`primaryColor`**: Color primario institucional en hexadecimal (`#RRGGBB`).
- **`accentColor`**: Color de acento institucional en hexadecimal (`#RRGGBB`).
- **`icon`**: Nombre del archivo del ícono (relativo a la carpeta de la instancia).
- **`adaptiveIconForeground`**: Nombre del archivo del primer plano adaptativo.
- **`splashImage`**: Nombre del archivo de splash.
- **`easProjectId`**: ID de proyecto en Expo Application Services (opcional, dejar `""` si no se usa EAS).

## ⚠️ Regla de Seguridad: Sin claves en `instances/`

**NUNCA guardes claves secretas, tokens ni URLs sensibles en `instances/`**.
Las variables de entorno como `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY` se configuran como variables de entorno en los perfiles de compilación de EAS (`eas.json` / EAS Secrets) o en `.env` local. La carpeta `instances/` solo almacena assets gráficos y metadatos públicos de presentación.

## Pasos para crear una nueva instancia

1. **Copiar la plantilla de ejemplo:**
   ```bash
   cp -r instances/example instances/<nombre-instancia>
   ```

2. **Editar `instances/<nombre-instancia>/instance.json`:**
   Ajustar `name`, `slug`, `scheme`, `androidPackage`, `primaryColor` y `accentColor`.

3. **Generar los íconos de marcador de posición:**
   Podés generar los assets automáticamente usando el script de íconos:
   ```bash
   npm run icons:instance -- --out instances/<nombre-instancia> --primary "#COLOR_PRIMARIO" --accent "#COLOR_ACENTO"
   ```
   *(O reemplazar `icon.png`, `adaptive-foreground.png` y `splash.png` con tus diseños finales).*

4. **Compilar con la instancia seleccionada:**
   Definí la variable de entorno `PICKFLOW_INSTANCE` antes de ejecutar Expo o EAS:
   ```bash
   PICKFLOW_INSTANCE=<nombre-instancia> eas build --platform android --profile production
   ```
   Si `PICKFLOW_INSTANCE` no está definida, la app compilará con la configuración estándar de Pickflow.
