import Footer from '@/components/Footer';
import './globals.css';
import type { Metadata } from 'next';
import Header from '@/components/Header';
import SessionExpiryWatcher from '@/components/auth/SessionExpiryWatcher';

export const metadata: Metadata = {
  title: 'Admin LEGO',
  description: 'Mini admin con login, carga y cancelacion de pedidos. Generacion de reportes.',
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
