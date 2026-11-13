import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBranding, DEFAULT_BRANDING } from '@/lib/branding';

const mockRpc = vi.fn();
const mockGetPublicUrl = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    rpc: mockRpc,
    storage: {
      from: () => ({
        getPublicUrl: mockGetPublicUrl,
      }),
    },
  }),
}));

describe('getBranding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
  });

  it('returns branding data from api_public_branding RPC', async () => {
    mockRpc.mockResolvedValueOnce({
      data: {
        app_name: 'Custom WMS',
        primary_color: '#123456',
        accent_color: '#654321',
        logo_path: 'logo/test.png',
        timezone: 'America/Argentina/Cordoba',
      },
      error: null,
    });
    mockGetPublicUrl.mockReturnValueOnce({
      data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/branding/logo/test.png' },
    });

    const res = await getBranding();
    expect(res).toEqual({
      appName: 'Custom WMS',
      primaryColor: '#123456',
      accentColor: '#654321',
      logoUrl: 'https://example.supabase.co/storage/v1/object/public/branding/logo/test.png',
      timezone: 'America/Argentina/Cordoba',
    });
  });

  it('falls back to DEFAULT_BRANDING if the RPC returns an error', async () => {
    mockRpc.mockResolvedValueOnce({
      data: null,
      error: new Error('Database connection failed'),
    });

    const res = await getBranding();
    expect(res).toEqual(DEFAULT_BRANDING);
  });

  it('falls back to DEFAULT_BRANDING if the RPC throws an exception', async () => {
    mockRpc.mockRejectedValueOnce(new Error('Network error'));

    const res = await getBranding();
    expect(res).toEqual(DEFAULT_BRANDING);
  });
});
