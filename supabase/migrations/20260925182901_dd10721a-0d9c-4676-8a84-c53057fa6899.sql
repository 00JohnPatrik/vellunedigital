CREATE TYPE public.template_type AS ENUM ('official','company');
CREATE TYPE public.template_category AS ENUM ('casamento','aniversario','cha_de_bebe','cha_revelacao','15_anos','formatura','festa_infantil','outros');

CREATE TABLE public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 150),
  category public.template_category NOT NULL,
  type public.template_type NOT NULL,
  preview_image text CHECK (preview_image IS NULL OR (length(preview_image) <= 2000 AND preview_image ~* '^https?://')),
  content jsonb NOT NULL DEFAULT '{"version":1,"blocks":[]}'::jsonb CHECK (jsonb_typeof(content) = 'object' AND jsonb_typeof(content->'blocks') = 'array'),
  status public.record_status NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT templates_type_company CHECK ((type = 'official' AND company_id IS NULL) OR (type = 'company' AND company_id IS NOT NULL))
);
CREATE INDEX templates_company_idx ON public.templates(company_id);
CREATE INDEX templates_type_status_idx ON public.templates(type, status);

GRANT SELECT, INSERT, UPDATE ON public.templates TO authenticated;
GRANT ALL ON public.templates TO service_role;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin manages templates" ON public.templates FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());
CREATE POLICY "company_admin reads active official templates" ON public.templates FOR SELECT TO authenticated
  USING (type = 'official' AND status = 'active' AND public.current_company_id() IS NOT NULL);
CREATE POLICY "company_admin reads own templates" ON public.templates FOR SELECT TO authenticated
  USING (type = 'company' AND company_id = public.current_company_id());
CREATE POLICY "company_admin creates own templates" ON public.templates FOR INSERT TO authenticated
  WITH CHECK (type = 'company' AND company_id = public.current_company_id());
CREATE POLICY "company_admin updates own templates" ON public.templates FOR UPDATE TO authenticated
  USING (type = 'company' AND company_id = public.current_company_id())
  WITH CHECK (type = 'company' AND company_id = public.current_company_id());

CREATE OR REPLACE FUNCTION public.templates_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN
      NEW.type := 'company';
      NEW.company_id := public.current_company_id();
    END IF;
  ELSE
    NEW.id := OLD.id;
    NEW.type := OLD.type;
    NEW.company_id := OLD.company_id;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER templates_guard BEFORE INSERT OR UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.templates_guard();
CREATE TRIGGER templates_updated_at BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Independent copy of an official template into the caller's company
CREATE OR REPLACE FUNCTION public.use_official_template(_template_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cid uuid := public.current_company_id(); _new uuid; _t public.templates;
BEGIN
  IF _cid IS NULL THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO _t FROM public.templates WHERE id = _template_id AND type = 'official' AND status = 'active';
  IF NOT FOUND THEN RAISE EXCEPTION 'Modelo oficial não encontrado'; END IF;
  INSERT INTO public.templates(company_id, name, category, type, preview_image, content, status)
  VALUES (_cid, left('Cópia de ' || _t.name, 150), _t.category, 'company', _t.preview_image, _t.content, 'active')
  RETURNING id INTO _new;
  RETURN _new;
END; $$;
REVOKE ALL ON FUNCTION public.use_official_template(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.use_official_template(uuid) TO authenticated;