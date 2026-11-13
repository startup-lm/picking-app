-- 20261113000008_branding.sql
-- Public branding RPC and storage bucket with admin policies

CREATE OR REPLACE FUNCTION api_public_branding()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('app_name', app_name, 'primary_color', primary_color, 'accent_color', accent_color, 'logo_path', logo_path, 'timezone', timezone)
  FROM app_settings WHERE id = 1;
$$;
REVOKE EXECUTE ON FUNCTION api_public_branding() FROM public;
GRANT EXECUTE ON FUNCTION api_public_branding() TO anon, authenticated;

INSERT INTO storage.buckets (id, name, public) VALUES ('branding', 'branding', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY storage_branding_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'branding' AND public.is_admin());
CREATE POLICY storage_branding_update ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'branding' AND public.is_admin()) WITH CHECK (bucket_id = 'branding' AND public.is_admin());
CREATE POLICY storage_branding_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'branding' AND public.is_admin());
