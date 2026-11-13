import { vi } from 'vitest';

export type FakeSupabaseOptions = {
  user?: { id: string; email?: string | null } | null;
  profile?: {
    id?: string;
    role: 'admin' | 'operator';
    is_active: boolean;
    name: string;
    email?: string | null;
  } | null;
};

export function fakeSupabase(options: FakeSupabaseOptions = {}) {
  const { user = null, profile = null } = options;

  function createQueryBuilder(table: string) {
    let currentData: any = null;
    if (table === 'profiles') {
      currentData = profile;
    } else if (table === 'app_settings') {
      currentData = {
        id: 1,
        app_name: 'Pickflow',
        primary_color: '#0F4C5C',
        accent_color: '#F2A541',
        timezone: 'America/Argentina/Buenos_Aires',
        dispatch_check_enabled: true,
      };
    } else if (table === 'imports') {
      currentData = {
        id: 42,
        kind: 'orders',
        file_name: 'orders-multi.csv',
        summary: {},
      };
    }

    const builder: any = {
      select: vi.fn(() => builder),
      insert: vi.fn(() => builder),
      update: vi.fn(() => builder),
      delete: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      neq: vi.fn(() => builder),
      in: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      maybeSingle: vi.fn(async () => ({ data: currentData, error: null })),
      single: vi.fn(async () => ({ data: currentData, error: null })),
      then(onfulfilled?: (val: any) => any, onrejected?: (val: any) => any) {
        return Promise.resolve({
          data: Array.isArray(currentData) ? currentData : currentData ? [currentData] : [],
          error: null,
        }).then(onfulfilled, onrejected);
      },
    };

    return builder;
  }

  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: user ?? null } })),
      signOut: vi.fn(async () => ({ error: null })),
    },
    from: vi.fn((table: string) => createQueryBuilder(table)),
    rpc: vi.fn(async () => ({ data: null, error: null })),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ data: { path: 'dummy' }, error: null })),
      })),
    },
  };
}

export const fakeSupabaseAdmin = {
  auth: {
    admin: {
      inviteUserByEmail: vi.fn(async (email: string) => ({
        data: { user: { id: 'invited-user-id', email } },
        error: null,
      })),
    },
  },
};
