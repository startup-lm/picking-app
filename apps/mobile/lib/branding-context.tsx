import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type Branding, defaultBranding, loadBranding } from './branding';

const BrandingContext = createContext<Branding>(defaultBranding());

export function BrandingProvider({ children }: { children: React.ReactNode }) {
  const [branding, setBranding] = useState<Branding>(defaultBranding());

  useEffect(() => {
    let mounted = true;

    // Fast-path: read cache if available
    AsyncStorage.getItem('pickflow.branding')
      .then((raw) => {
        if (!mounted || !raw) return;
        try {
          const cached = JSON.parse(raw);
          if (cached && typeof cached === 'object') {
            setBranding((prev) => ({ ...prev, ...cached }));
          }
        } catch {
          // Ignore
        }
      })
      .catch(() => {});

    // Network-path: load fresh branding
    loadBranding()
      .then((fresh) => {
        if (mounted) {
          setBranding(fresh);
        }
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): Branding {
  return useContext(BrandingContext);
}
