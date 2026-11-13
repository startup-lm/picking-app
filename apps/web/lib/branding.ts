import { cache } from 'react';
import { createClient } from '@supabase/supabase-js';
import { APP_NAME } from './brand';

const requestCache = typeof cache === 'function' ? cache : <T extends (...args: any[]) => any>(fn: T): T => fn;

export type Branding = {
  appName: string;
  primaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  timezone: string;
};

export const DEFAULT_BRANDING: Branding = {
  appName: APP_NAME,
  primaryColor: '#0F4C5C',
  accentColor: '#F2A541',
  logoUrl: null,
  timezone: 'America/Argentina/Buenos_Aires',
};

export const getBranding = requestCache(async (): Promise<Branding> => {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      return DEFAULT_BRANDING;
    }

    const supabase = createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase.rpc('api_public_branding');
    if (error || !data) {
      return DEFAULT_BRANDING;
    }

    const raw = data as {
      app_name?: string;
      primary_color?: string;
      accent_color?: string;
      logo_path?: string | null;
      timezone?: string;
    };

    let logoUrl: string | null = null;
    if (raw.logo_path) {
      const { data: urlData } = supabase.storage
        .from('branding')
        .getPublicUrl(raw.logo_path);
      logoUrl = urlData?.publicUrl ?? null;
    }

    return {
      appName: raw.app_name || DEFAULT_BRANDING.appName,
      primaryColor: raw.primary_color || DEFAULT_BRANDING.primaryColor,
      accentColor: raw.accent_color || DEFAULT_BRANDING.accentColor,
      logoUrl,
      timezone: raw.timezone || DEFAULT_BRANDING.timezone,
    };
  } catch {
    return DEFAULT_BRANDING;
  }
});
