import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { fakeSupabase, fakeSupabaseAdmin } from './helpers/fake-supabase';

const adminUser = { id: 'admin-1', email: 'admin@pickflow.com' };
const adminProfile = { id: 'admin-1', role: 'admin', is_active: true, name: 'Admin Test' };

function makeAdminSupabase(opts: any = {}) {
  return fakeSupabase({
    user: adminUser,
    profile: adminProfile,
    ...opts,
  });
}

let currentClient = makeAdminSupabase();

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: async () => currentClient,
}));

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: fakeSupabaseAdmin,
}));

import { GET as getDashboard } from '@/app/api/dashboard/route';

describe('Dashboard API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentClient = makeAdminSupabase();
  });

  it('returns counts by status and top 10 urgent active orders with progress', async () => {
    const mockOrders = [
      { id: 1, status: 'draft', priority: 'normal', total_package: 1, total_unit: 0 },
      { id: 2, status: 'pending', priority: 'normal', total_package: 2, total_unit: 0 },
      { id: 3, status: 'in_progress', priority: 'normal', total_package: 1, total_unit: 2 },
      { id: 4, status: 'assembled', priority: 'normal', total_package: 3, total_unit: 0 },
      {
        id: 5,
        status: 'pending',
        priority: 'urgent',
        due_date: '2026-11-15',
        created_at: '2026-11-13T09:00:00Z',
        total_package: 2,
        total_unit: 3,
        customer: { name: 'Cliente Urgente' },
        lines: [
          { package_scanned: 1, unit_scanned: 1 },
        ],
      },
    ];

    currentClient = makeAdminSupabase({
      tableData: {
        orders: mockOrders,
        app_settings: [{ id: 1, timezone: 'America/Argentina/Buenos_Aires' }],
      },
    });

    const req = new NextRequest('http://localhost/api/dashboard');
    const res = await getDashboard(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.counts.draft).toBe(1);
    expect(json.counts.pending).toBe(2);
    expect(json.counts.in_progress).toBe(1);
    expect(json.counts.assembled).toBe(1);
    expect(json.counts.dispatched).toBe(0);
    expect(json.counts.cancelled).toBe(0);

    expect(json.urgent).toHaveLength(1);
    expect(json.urgent[0].id).toBe(5);
    expect(json.urgent[0].customer_name).toBe('Cliente Urgente');
    expect(json.urgent[0].progress).toEqual({
      scanned: 2, // 1 pkg + 1 unit
      total: 5,   // 2 pkg + 3 unit
    });
  });
});
