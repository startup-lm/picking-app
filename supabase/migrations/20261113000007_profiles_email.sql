-- 20261113000007_profiles_email.sql
-- Add email to profiles for admin listing without service role

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT NULL;

-- Backfill email from auth.users for existing profiles
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id;

-- Update trigger function to record email on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, role, is_active, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, ''),
    'operator',
    false,
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
