import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/supabase';

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};

const PUBLIC_ROUTES = ['/login', '/reset', '/update-password', '/sin-acceso'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Rutas /api/*: no redirigir (devolver la respuesta tal cual; cada handler responde 401/403)
  if (pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }

  const isPublic = PUBLIC_ROUTES.includes(pathname);

  const createRedirectResponse = (toUrl: URL) => {
    const redirectRes = NextResponse.redirect(toUrl);
    response.cookies.getAll().forEach(c => redirectRes.cookies.set(c));
    redirectRes.headers.set('Cache-Control', 'private, no-store');
    return redirectRes;
  };

  if (!user) {
    if (!isPublic) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/login';
      redirectUrl.search = '';
      redirectUrl.searchParams.set('redirectedFrom', pathname);
      return createRedirectResponse(redirectUrl);
    }
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  const isAdminActive = Boolean(profile && profile.is_active && profile.role === 'admin');

  if (!isAdminActive) {
    if (!isPublic) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = '/sin-acceso';
      redirectUrl.search = '';
      return createRedirectResponse(redirectUrl);
    }
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }

  if (pathname === '/login') {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/home';
    redirectUrl.search = '';
    return createRedirectResponse(redirectUrl);
  }

  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
