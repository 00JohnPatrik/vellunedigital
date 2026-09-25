CREATE TYPE public.invitation_status AS ENUM ('draft','published','closed','deleted');

CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  template_id uuid REFERENCES public.templates(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 150),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 80),
  status public.invitation_status NOT NULL DEFAULT 'draft',
  event_date date NOT NULL,
  event_time time NOT NULL,
  venue_name text CHECK (venue_name IS NULL OR char_length(venue_name) <= 150),
  address text CHECK (address IS NULL OR char_length(address) <= 255),
  city text CHECK (city IS NULL OR char_length(city) <= 100),
  state text CHECK (state IS NULL OR state ~ '^[A-Z]{2}$'),
  message text CHECK (message IS NULL OR char_length(message) <= 2000),
  content jsonb NOT NULL DEFAULT '{"version":1,"blocks":[]}'::jsonb,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invitations_company_idx ON public.invitations(company_id, status);
CREATE INDEX invitations_customer_idx ON public.invitations(customer_id);
CREATE INDEX invitations_template_idx ON public.invitations(template_id);

GRANT SELECT, INSERT, UPDATE ON public.invitations TO authenticated;
GRANT ALL ON public.invitations TO service_role;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_admin reads own invitations" ON public.invitations FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());
CREATE POLICY "company_admin creates own invitations" ON public.invitations FOR INSERT TO authenticated
  WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "company_admin updates own invitations" ON public.invitations FOR UPDATE TO authenticated
  USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());
CREATE POLICY "super_admin manages invitations" ON public.invitations FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE OR REPLACE FUNCTION public.invitations_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cust_company uuid; _t public.templates; _base text; _slug text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT company_id INTO _cust_company FROM public.customers WHERE id = NEW.customer_id;
    IF _cust_company IS NULL THEN RAISE EXCEPTION 'Cliente não encontrado' USING ERRCODE = '23514'; END IF;
    IF auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN
      NEW.company_id := public.current_company_id();
    ELSE
      NEW.company_id := _cust_company;
    END IF;
    NEW.status := 'draft';
    NEW.published_at := NULL;
    -- Content always copied from the template inside the DB (independent jsonb value).
    IF NEW.template_id IS NOT NULL THEN
      SELECT * INTO _t FROM public.templates WHERE id = NEW.template_id AND status = 'active'
        AND (type = 'official' OR company_id = NEW.company_id);
      IF NOT FOUND THEN RAISE EXCEPTION 'Modelo não permitido' USING ERRCODE = '23514'; END IF;
      NEW.content := _t.content;
    ELSIF NEW.content IS NULL THEN
      NEW.content := '{"version":1,"blocks":[]}'::jsonb;
    END IF;
    -- Stable, unique slug: name-based prefix + random suffix.
    _base := lower(translate(NEW.name, 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn'));
    _base := trim(both '-' from regexp_replace(_base, '[^a-z0-9]+', '-', 'g'));
    _base := left(trim(both '-' from left(_base, 60)), 60);
    IF _base = '' THEN _base := 'convite'; END IF;
    LOOP
      _slug := _base || '-' || substr(md5(gen_random_uuid()::text), 1, 6);
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.invitations WHERE slug = _slug);
    END LOOP;
    NEW.slug := _slug;
  ELSE
    NEW.id := OLD.id; NEW.company_id := OLD.company_id; NEW.slug := OLD.slug;
    NEW.template_id := OLD.template_id; NEW.created_at := OLD.created_at;
    IF NEW.customer_id <> OLD.customer_id THEN
      SELECT company_id INTO _cust_company FROM public.customers WHERE id = NEW.customer_id;
      IF _cust_company IS DISTINCT FROM NEW.company_id THEN RAISE EXCEPTION 'Cliente não permitido' USING ERRCODE = '23514'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.invitations_guard() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER invitations_guard BEFORE INSERT OR UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.invitations_guard();
CREATE TRIGGER invitations_updated_at BEFORE UPDATE ON public.invitations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();