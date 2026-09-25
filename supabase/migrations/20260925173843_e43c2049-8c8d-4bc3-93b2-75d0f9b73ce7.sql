CREATE TYPE public.app_role AS ENUM ('super_admin','company_admin');
CREATE TYPE public.record_status AS ENUM ('active','inactive');
CREATE TYPE public.ui_theme AS ENUM ('light','dark');

CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  type text,
  status public.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE,
  company_id uuid REFERENCES public.companies(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  email text NOT NULL UNIQUE CHECK (email = lower(email)),
  phone text UNIQUE,
  role public.app_role NOT NULL,
  status public.record_status NOT NULL DEFAULT 'active',
  theme public.ui_theme,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_admin_needs_company CHECK (role <> 'company_admin' OR company_id IS NOT NULL)
);
CREATE INDEX users_company_id_idx ON public.users(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helpers (security definer avoids RLS recursion). Only active users count.
CREATE OR REPLACE FUNCTION public.is_super_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role = 'super_admin' AND status = 'active')
$$;
CREATE OR REPLACE FUNCTION public.current_company_id() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT u.company_id FROM public.users u JOIN public.companies c ON c.id = u.company_id
  WHERE u.auth_user_id = auth.uid() AND u.role = 'company_admin' AND u.status = 'active' AND c.status = 'active'
$$;

-- Companies
CREATE POLICY "super_admin manages companies" ON public.companies FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "company_admin reads own company" ON public.companies FOR SELECT TO authenticated
  USING (id = public.current_company_id());

-- Users
CREATE POLICY "super_admin manages users" ON public.users FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "user reads own row" ON public.users FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());
CREATE POLICY "company_admin reads same company users" ON public.users FOR SELECT TO authenticated
  USING (company_id IS NOT NULL AND company_id = public.current_company_id());
CREATE POLICY "user updates own row" ON public.users FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());

-- Non-super-admins may only change name/phone/theme on their own row.
CREATE OR REPLACE FUNCTION public.guard_user_self_update() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_super_admin() THEN RETURN NEW; END IF;
  IF NEW.role <> OLD.role OR NEW.status <> OLD.status OR NEW.company_id IS DISTINCT FROM OLD.company_id
     OR NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id OR NEW.email <> OLD.email THEN
    RAISE EXCEPTION 'Not allowed to change protected fields';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER users_guard_self_update BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.guard_user_self_update();

-- Initial super admin (activated via /first-access)
INSERT INTO public.users (name, email, role, status) VALUES ('Super Admin', 'jhow762jhow@gmail.com', 'super_admin', 'active');