import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { BrandingProvider } from '@/components/BrandingProvider';
import { getBranding } from '@/lib/branding';
import { mixWithWhite } from '@/lib/color';

export async function generateMetadata(): Promise<Metadata> {
  const branding = await getBranding();
  return {
    title: branding.appName,
    description: 'Preparación y despacho de pedidos',
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const branding = await getBranding();
  const accentSoft = mixWithWhite(branding.accentColor, 0.25);

  const styleVariables = {
    '--color-primary': branding.primaryColor,
    '--color-accent': branding.accentColor,
    '--color-accent-soft': accentSoft,
  } as React.CSSProperties;

  return (
    <html lang="es" style={styleVariables}>
      <body className="flex flex-col min-h-screen bg-bg">
        <BrandingProvider
          value={{
            appName: branding.appName,
            logoUrl: branding.logoUrl,
            timezone: branding.timezone,
          }}
        >
          <Header />
          <main className="flex-1 w-full p-6">{children}</main>
          <Footer />
        </BrandingProvider>
      </body>
    </html>
  );
}
