import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { supabase } from '@/lib/supabase/client';

export type Branding = {
  appName: string;
  primaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  timezone: string;
};

const BRANDING_STORAGE_KEY = 'pickflow.branding';

export function defaultBranding(): Branding {
  const extraBranding = Constants.expoConfig?.extra?.branding;
  return {
    appName: extraBranding?.appName ?? 'Pickflow',
    primaryColor: extraBranding?.primaryColor ?? '#0F4C5C',
    accentColor: extraBranding?.accentColor ?? '#F2A541',
    logoUrl: null,
    timezone: 'America/Argentina/Buenos_Aires',
  };
}

export async function loadBranding(): Promise<Branding> {
  let cached: Branding | null = null;
  try {
    const raw = await AsyncStorage.getItem(BRANDING_STORAGE_KEY);
    if (raw) {
      cached = JSON.parse(raw);
    }
  } catch {
    // Ignore cache read error
  }

  try {
    const { data, error } = await supabase.rpc('api_public_branding');
    if (error || !data) {
      return cached ?? defaultBranding();
    }

    const brandingData = data as {
      app_name?: string;
      primary_color?: string;
      accent_color?: string;
      logo_path?: string | null;
      timezone?: string;
    };

    let logoUrl: string | null = null;
    if (brandingData.logo_path) {
      const { data: urlData } = supabase.storage
        .from('branding')
        .getPublicUrl(brandingData.logo_path);
      logoUrl = urlData?.publicUrl ?? null;
    }

    const fallback = defaultBranding();
    const branding: Branding = {
      appName: brandingData.app_name || fallback.appName,
      primaryColor: brandingData.primary_color || fallback.primaryColor,
      accentColor: brandingData.accent_color || fallback.accentColor,
      logoUrl,
      timezone: brandingData.timezone || fallback.timezone,
    };

    try {
      await AsyncStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(branding));
    } catch {
      // Ignore cache write error
    }

    return branding;
  } catch {
    return cached ?? defaultBranding();
  }
}
