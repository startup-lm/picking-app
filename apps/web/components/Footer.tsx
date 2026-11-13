import { APP_NAME } from '@/lib/brand';

export default function Footer() {
  return (
    <footer className="mt-auto py-8 px-4">
      <div className="text-center text-xs">
        © {new Date().getFullYear()} {APP_NAME}. Todos los derechos reservados.
      </div>
    </footer>
  );
}
