import fs from 'node:fs';
import path from 'node:path';
import type { ConfigContext, ExpoConfig } from 'expo/config';

type InstanceConfig = {
  name: string;
  slug: string;
  scheme?: string;
  androidPackage: string;
  primaryColor: string;
  accentColor: string;
  icon: string;
  adaptiveIconForeground: string;
  splashImage: string;
  easProjectId?: string;
};

const ANDROID_PACKAGE_REGEX = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export default ({ config }: ConfigContext): ExpoConfig => {
  const instanceName = process.env.PICKFLOW_INSTANCE;

  // Base configuration reproducing exactly apps/mobile/app.json
  const baseConfig: ExpoConfig = {
    ...config,
    name: 'Pickflow',
    slug: 'pickflow',
    version: '0.1.0',
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'pickflow',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/images/android-adaptive-foreground.png',
        backgroundColor: '#0F4C5C',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: 'com.pickflow.app',
      versionCode: 1,
      permissions: ['android.permission.CAMERA'],
      blockedPermissions: ['android.permission.RECORD_AUDIO'],
    },
    web: {
      output: 'static',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#0F4C5C',
          dark: {
            backgroundColor: '#0A3540',
          },
        },
      ],
      [
        'expo-camera',
        {
          cameraPermission: 'Necesitamos la cámara para escanear códigos de barra',
          recordAudioAndroid: false,
        },
      ],
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      router: {},
    },
  };

  if (!instanceName) {
    return {
      ...baseConfig,
      extra: {
        ...baseConfig.extra,
        branding: {
          appName: 'Pickflow',
          primaryColor: '#0F4C5C',
          accentColor: '#F2A541',
        },
        instance: 'default',
      },
    };
  }

  // Load instance configuration
  const instanceDirAbs = path.resolve(__dirname, '../../instances', instanceName);
  const instanceJsonPath = path.resolve(instanceDirAbs, 'instance.json');

  if (!fs.existsSync(instanceDirAbs)) {
    throw new Error(`PICKFLOW_INSTANCE=${instanceName}: carpeta de instancia no encontrada en ${instanceDirAbs}`);
  }

  if (!fs.existsSync(instanceJsonPath)) {
    throw new Error(`PICKFLOW_INSTANCE=${instanceName}: archivo instance.json no encontrado en ${instanceJsonPath}`);
  }

  let raw: InstanceConfig;
  try {
    const content = fs.readFileSync(instanceJsonPath, 'utf-8');
    raw = JSON.parse(content);
  } catch (err: any) {
    throw new Error(`PICKFLOW_INSTANCE=${instanceName}: error al leer o parsear instance.json (${err.message})`);
  }

  if (!raw.name || typeof raw.name !== 'string' || !raw.name.trim()) {
    throw new Error(`PICKFLOW_INSTANCE=${instanceName}: campo "name" es obligatorio`);
  }

  if (!raw.slug || typeof raw.slug !== 'string' || !raw.slug.trim()) {
    throw new Error(`PICKFLOW_INSTANCE=${instanceName}: campo "slug" es obligatorio`);
  }

  if (!raw.androidPackage || !ANDROID_PACKAGE_REGEX.test(raw.androidPackage)) {
    throw new Error(
      `PICKFLOW_INSTANCE=${instanceName}: campo "androidPackage" inválido (${raw.androidPackage ?? ''})`
    );
  }

  if (!raw.primaryColor || !HEX_COLOR_REGEX.test(raw.primaryColor)) {
    throw new Error(
      `PICKFLOW_INSTANCE=${instanceName}: campo "primaryColor" inválido (${raw.primaryColor ?? ''})`
    );
  }

  if (!raw.accentColor || !HEX_COLOR_REGEX.test(raw.accentColor)) {
    throw new Error(
      `PICKFLOW_INSTANCE=${instanceName}: campo "accentColor" inválido (${raw.accentColor ?? ''})`
    );
  }

  if (!raw.icon || typeof raw.icon !== 'string') {
    throw new Error(`PICKFLOW_INSTANCE=${instanceName}: campo "icon" es obligatorio`);
  }

  if (!raw.adaptiveIconForeground || typeof raw.adaptiveIconForeground !== 'string') {
    throw new Error(`PICKFLOW_INSTANCE=${instanceName}: campo "adaptiveIconForeground" es obligatorio`);
  }

  if (!raw.splashImage || typeof raw.splashImage !== 'string') {
    throw new Error(`PICKFLOW_INSTANCE=${instanceName}: campo "splashImage" es obligatorio`);
  }

  const instanceRelPath = `../../instances/${instanceName}`;
  const iconPath = `${instanceRelPath}/${raw.icon}`;
  const adaptiveForegroundPath = `${instanceRelPath}/${raw.adaptiveIconForeground}`;
  const splashPath = `${instanceRelPath}/${raw.splashImage}`;

  const plugins = (baseConfig.plugins ?? []).map((plugin) => {
    if (Array.isArray(plugin) && plugin[0] === 'expo-splash-screen') {
      const splashTuple: [string, any] = [
        'expo-splash-screen',
        {
          ...(plugin[1] as Record<string, unknown>),
          image: splashPath,
          backgroundColor: raw.primaryColor,
        },
      ];
      return splashTuple;
    }
    return plugin;
  });

  const extra: Record<string, any> = {
    ...baseConfig.extra,
    branding: {
      appName: raw.name,
      primaryColor: raw.primaryColor,
      accentColor: raw.accentColor,
    },
    instance: instanceName,
  };

  if (raw.easProjectId && raw.easProjectId.trim()) {
    extra.eas = {
      projectId: raw.easProjectId.trim(),
    };
  }

  return {
    ...baseConfig,
    name: raw.name,
    slug: raw.slug,
    scheme: raw.scheme ?? raw.slug,
    icon: iconPath,
    android: {
      ...baseConfig.android,
      package: raw.androidPackage,
      adaptiveIcon: {
        ...baseConfig.android?.adaptiveIcon,
        foregroundImage: adaptiveForegroundPath,
        backgroundColor: raw.primaryColor,
      },
    },
    splash: {
      image: splashPath,
      resizeMode: 'contain',
      backgroundColor: raw.primaryColor,
    },
    plugins,
    extra,
  };
};
