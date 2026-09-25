CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 150),
  phone text CHECK (phone IS NULL OR phone ~ '^[0-9]{8,13}$'),
  email text CHECK (email IS NULL OR (char_length(email) <= 255 AND email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')),
  observation text CHECK (observation IS NULL OR char_length(observation) <= 2000),
  status public.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX customers_company_idx ON public.customers(company_id);
CREATE INDEX customers_company_email_idx ON public.customers(company_id, email);
CREATE INDEX customers_company_phone_idx ON public.customers(company_id, phone);

GRANT SELECT, INSERT, UPDATE ON public.customers TO authenticated;
GRANT ALL ON public.customers TO service_role;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_admin reads own customers" ON public.customers FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY "company_admin creates own customers" ON public.customers FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "company_admin updates own customers" ON public.customers FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "super_admin manages customers" ON public.customers FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- company_id is set by the system for company admins and can never change.
CREATE OR REPLACE FUNCTION public.customers_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NOT public.is_super_admin() AND auth.uid() IS NOT NULL THEN
      NEW.company_id := public.current_company_id();
    END IF;
  ELSE
    NEW.id := OLD.id;
    NEW.company_id := OLD.company_id;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.customers_guard() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER customers_guard BEFORE INSERT OR UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.customers_guard();
CREATE TRIGGER customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();