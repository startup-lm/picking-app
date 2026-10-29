type User = {
  id: string;
  name: string | null;
  role: 'admin' | 'operator' | string;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};