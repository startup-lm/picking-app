import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

let mockUser: any = null;
let mockProfile: any = null;

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: {
      getUser: vi.fn(async () => ({ data: { user: mockUser } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: mockProfile, error: null })),
        })),
      })),
    })),
  }),
}));

import { middleware } from '@/middleware';

describe('Auth Middleware', () => {
  beforeEach(() => {
    mockUser = null;
    mockProfile = null;
  });

  describe('Unauthenticated user (sin sesión)', () => {
    it('redirects GET /home to /login?redirectedFrom=%2Fhome', async () => {
      mockUser = null;
      mockProfile = null;

      const req = new NextRequest('http://localhost/home');
      const res = await middleware(req);

      expect([307, 308]).toContain(res.status);
      expect(res.headers.get('location')).toBe('http://localhost/login?redirectedFrom=%2Fhome');
      expect(res.headers.get('cache-control')).toBe('private, no-store');
    });

    it('does not redirect GET /login', async () => {
      mockUser = null;
      mockProfile = null;

      const req = new NextRequest('http://localhost/login');
      const res = await middleware(req);

      expect([307, 308]).not.toContain(res.status);
      expect(res.headers.get('cache-control')).toBe('private, no-store');
    });

    it('does not redirect GET /api/orders/all', async () => {
      mockUser = null;
      mockProfile = null;

      const req = new NextRequest('http://localhost/api/orders/all');
      const res = await middleware(req);

      expect([307, 308]).not.toContain(res.status);
      expect(res.headers.get('cache-control')).toBe('private, no-store');
    });
  });

  describe('Active Operator (operador activo)', () => {
    it('redirects GET /home to /sin-acceso', async () => {
      mockUser = { id: 'op-1', email: 'op@example.com' };
      mockProfile = { role: 'operator', is_active: true };

      const req = new NextRequest('http://localhost/home');
      const res = await middleware(req);

      expect([307, 308]).toContain(res.status);
      expect(res.headers.get('location')).toBe('http://localhost/sin-acceso');
      expect(res.headers.get('cache-control')).toBe('private, no-store');
    });
  });

  describe('Active Admin (admin activo)', () => {
    it('does not redirect GET /home', async () => {
      mockUser = { id: 'admin-1', email: 'admin@example.com' };
      mockProfile = { role: 'admin', is_active: true };

      const req = new NextRequest('http://localhost/home');
      const res = await middleware(req);

      expect([307, 308]).not.toContain(res.status);
      expect(res.headers.get('cache-control')).toBe('private, no-store');
    });

    it('redirects GET /login to /home', async () => {
      mockUser = { id: 'admin-1', email: 'admin@example.com' };
      mockProfile = { role: 'admin', is_active: true };

      const req = new NextRequest('http://localhost/login');
      const res = await middleware(req);

      expect([307, 308]).toContain(res.status);
      expect(res.headers.get('location')).toBe('http://localhost/home');
      expect(res.headers.get('cache-control')).toBe('private, no-store');
    });
  });
});
