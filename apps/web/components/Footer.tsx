'use client';

import { useBranding } from '@/components/BrandingProvider';

export default function Footer() {
  const { appName } = useBranding();
  return (
    <footer className="mt-auto py-8 px-4">
      <div className="text-center text-xs">
        © {new Date().getFullYear()} {appName}. Todos los derechos reservados.
      </div>
    </footer>
  );
}
