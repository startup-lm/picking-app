-- 20261112000002_auth.sql
-- Auth schema: profiles, app_settings, user triggers, and security definer helpers

-- profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator')),
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER profiles_set_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- Trigger on auth.users for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, ''),
    'operator',
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION handle_new_user();

-- app_settings
CREATE TABLE app_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  app_name TEXT NOT NULL DEFAULT 'Pickflow',
  logo_path TEXT NULL,
  primary_color TEXT NOT NULL DEFAULT '#0F4C5C' CHECK (primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  accent_color TEXT NOT NULL DEFAULT '#F2A541' CHECK (accent_color ~ '^#[0-9A-Fa-f]{6}$'),
  timezone TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  dispatch_check_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER app_settings_set_updated_at
BEFORE UPDATE ON app_settings
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

INSERT INTO app_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- Security Definer Helpers
CREATE OR REPLACE FUNCTION is_active_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_active
  );
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_active AND role = 'admin'
  );
$$;
