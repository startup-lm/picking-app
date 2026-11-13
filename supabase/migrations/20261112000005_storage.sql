-- 20261112000005_storage.sql
-- Storage bucket for imports and admin-only RLS policies

INSERT INTO storage.buckets (id, name, public) VALUES ('imports', 'imports', false) ON CONFLICT (id) DO NOTHING;

CREATE POLICY storage_imports_select ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'imports' AND public.is_admin());

CREATE POLICY storage_imports_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'imports' AND public.is_admin());

CREATE POLICY storage_imports_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'imports' AND public.is_admin())
  WITH CHECK (bucket_id = 'imports' AND public.is_admin());

CREATE POLICY storage_imports_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'imports' AND public.is_admin());
