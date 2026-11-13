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
  tableData?: Record<string, any>;
  tableError?: Record<string, any>;
};

export function fakeSupabase(options: FakeSupabaseOptions = {}) {
  const { user = null, profile = null } = options;

  function createQueryBuilder(table: string) {
    let currentData: any = null;
    let currentError: any = options.tableError?.[table] ?? null;

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
    } else if (options.tableData?.[table] !== undefined) {
      currentData = options.tableData[table];
    }

    const builder: any = {
      select: vi.fn(() => builder),
      insert: vi.fn((val: any) => {
        if (!currentError && val) {
          const existingId = currentData?.id ?? 1;
          currentData = Array.isArray(val) ? val : { id: existingId, ...val };
        }
        return builder;
      }),
      update: vi.fn((val: any) => {
        if (!currentError && val && currentData !== null) {
          currentData = { ...currentData, ...val };
        }
        return builder;
      }),
      delete: vi.fn(() => builder),
      eq: vi.fn(() => builder),
      neq: vi.fn(() => builder),
      in: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      range: vi.fn(() => builder),
      or: vi.fn(() => builder),
      ilike: vi.fn(() => builder),
      maybeSingle: vi.fn(async () => ({
        data: currentError ? null : currentData,
        error: currentError,
      })),
      single: vi.fn(async () => ({
        data: currentError ? null : currentData,
        error: currentError,
      })),
      then(onfulfilled?: (val: any) => any, onrejected?: (val: any) => any) {
        return Promise.resolve({
          data: currentError
            ? null
            : Array.isArray(currentData)
            ? currentData
            : currentData
            ? [currentData]
            : [],
          error: currentError,
        }).then(onfulfilled, onrejected);
      },
    };

    return builder;
  }

  const client: any = {
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

  return client;
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
