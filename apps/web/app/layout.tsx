import Footer from '@/components/Footer';
import './globals.css';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import SessionExpiryWatcher from '@/components/auth/SessionExpiryWatcher';
import { APP_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: APP_NAME,
  description: 'Preparación y despacho de pedidos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="flex flex-col min-h-screen bg-bg">
        <SessionExpiryWatcher />
        <Header />
        <main className="flex-1 w-full p-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
