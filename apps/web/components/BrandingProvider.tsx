'use client';

import React, { createContext, useContext } from 'react';
import { APP_NAME } from '@/lib/brand';

export type ClientBranding = {
  appName: string;
  logoUrl: string | null;
  timezone: string;
};

const DEFAULT_CLIENT_BRANDING: ClientBranding = {
  appName: APP_NAME,
  logoUrl: null,
  timezone: 'America/Argentina/Buenos_Aires',
};

const BrandingContext = createContext<ClientBranding>(DEFAULT_CLIENT_BRANDING);

export function BrandingProvider({
  value,
  children,
}: {
  value: ClientBranding;
  children: React.ReactNode;
}) {
  return (
    <BrandingContext.Provider value={value}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding(): ClientBranding {
  return useContext(BrandingContext);
}
