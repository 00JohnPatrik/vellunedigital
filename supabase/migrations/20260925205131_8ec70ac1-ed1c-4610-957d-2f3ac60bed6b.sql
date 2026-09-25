ALTER TABLE public.customers ADD COLUMN deleted_at timestamptz, ADD COLUMN deleted_by uuid REFERENCES public.users(id);
ALTER TABLE public.templates ADD COLUMN deleted_at timestamptz, ADD COLUMN deleted_by uuid REFERENCES public.users(id);
ALTER TABLE public.invitations ADD COLUMN deleted_at timestamptz, ADD COLUMN deleted_by uuid REFERENCES public.users(id);

CREATE OR REPLACE FUNCTION public.soft_delete_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NEW.deleted_at IS DISTINCT FROM OLD.deleted_at OR NEW.deleted_by IS DISTINCT FROM OLD.deleted_by THEN
    IF auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN
      RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
    END IF;
    IF NEW.deleted_at IS NOT NULL AND OLD.deleted_at IS NULL THEN
      NEW.deleted_at := now();
      NEW.deleted_by := (SELECT id FROM public.users WHERE auth_user_id = auth.uid());
    ELSIF NEW.deleted_at IS NULL THEN
      NEW.deleted_by := NULL;
    ELSE
      NEW.deleted_at := OLD.deleted_at; NEW.deleted_by := OLD.deleted_by;
    END IF;
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.soft_delete_guard() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER soft_delete_guard BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.soft_delete_guard();
CREATE TRIGGER soft_delete_guard BEFORE UPDATE ON public.templates FOR EACH ROW EXECUTE FUNCTION public.soft_delete_guard();

CREATE OR REPLACE FUNCTION public.invitations_guard()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
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
    IF _cust_company IS DISTINCT FROM NEW.company_id THEN RAISE EXCEPTION 'Cliente não permitido' USING ERRCODE = '23514'; END IF;
    NEW.status := 'draft';
    NEW.published_at := NULL;
    NEW.deleted_at := NULL; NEW.deleted_by := NULL;
    IF NEW.template_id IS NOT NULL THEN
      SELECT * INTO _t FROM public.templates WHERE id = NEW.template_id AND status = 'active' AND deleted_at IS NULL
        AND (type = 'official' OR company_id = NEW.company_id);
      IF NOT FOUND THEN RAISE EXCEPTION 'Modelo não permitido' USING ERRCODE = '23514'; END IF;
      NEW.content := _t.content;
    ELSIF NEW.content IS NULL THEN
      NEW.content := '{"version":1,"blocks":[]}'::jsonb;
    END IF;
    _base := lower(translate(NEW.name, 'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ', 'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn'));
    _base := trim(both '-' from regexp_replace(_base, '[^a-z0-9]+', '-', 'g'));
    _base := trim(both '-' from left(_base, 60));
    IF _base = '' THEN _base := 'convite'; END IF;
    LOOP
      _slug := _base || '-' || substr(md5(gen_random_uuid()::text), 1, 6);
      EXIT WHEN NOT EXISTS (SELECT 1 FROM public.invitations WHERE slug = _slug);
    END LOOP;
    NEW.slug := _slug;
  ELSE
    NEW.id := OLD.id; NEW.company_id := OLD.company_id; NEW.slug := OLD.slug;
    NEW.template_id := OLD.template_id; NEW.created_at := OLD.created_at;
    NEW.deleted_at := OLD.deleted_at; NEW.deleted_by := OLD.deleted_by;
    IF NEW.customer_id <> OLD.customer_id THEN
      SELECT company_id INTO _cust_company FROM public.customers WHERE id = NEW.customer_id;
      IF _cust_company IS DISTINCT FROM NEW.company_id THEN RAISE EXCEPTION 'Cliente não permitido' USING ERRCODE = '23514'; END IF;
    END IF;
    -- Logical delete / restore: super admin only.
    IF OLD.status <> 'deleted' AND NEW.status = 'deleted' THEN
      IF auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501'; END IF;
      NEW.deleted_at := now();
      NEW.deleted_by := (SELECT id FROM public.users WHERE auth_user_id = auth.uid());
      NEW.published_at := OLD.published_at;
      RETURN NEW;
    END IF;
    IF OLD.status = 'deleted' THEN
      IF NEW.status = 'deleted' THEN RAISE EXCEPTION 'Convite excluído' USING ERRCODE = '23514'; END IF;
      IF auth.uid() IS NOT NULL AND NOT public.is_super_admin() THEN RAISE EXCEPTION 'Convite excluído' USING ERRCODE = '23514'; END IF;
      NEW.status := 'draft'; NEW.published_at := NULL; NEW.deleted_at := NULL; NEW.deleted_by := NULL;
      RETURN NEW;
    END IF;
    IF NEW.status IN ('published','closed') THEN
      IF coalesce(trim(NEW.name),'') = '' OR NEW.event_date IS NULL OR NEW.event_time IS NULL
         OR jsonb_array_length(coalesce(NEW.content->'blocks','[]'::jsonb)) = 0 THEN
        RAISE EXCEPTION 'Publicação incompleta' USING ERRCODE = '23514';
      END IF;
      IF OLD.status NOT IN ('published','closed') OR NEW.published_at IS NULL THEN
        NEW.published_at := coalesce(OLD.published_at, now());
        IF OLD.status = 'draft' THEN NEW.published_at := now(); END IF;
      END IF;
    ELSIF NEW.status = 'draft' THEN
      NEW.published_at := NULL;
    ELSE
      NEW.published_at := OLD.published_at;
    END IF;
  END IF;
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.use_official_template(_template_id uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _cid uuid := public.current_company_id(); _new uuid; _t public.templates;
BEGIN
  IF _cid IS NULL THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO _t FROM public.templates WHERE id = _template_id AND type = 'official' AND status = 'active' AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Modelo oficial não encontrado'; END IF;
  INSERT INTO public.templates(company_id, name, category, type, preview_image, content, status)
  VALUES (_cid, left('Cópia de ' || _t.name, 150), _t.category, 'company', _t.preview_image, _t.content, 'active')
  RETURNING id INTO _new;
  RETURN _new;
END; $function$;

DROP POLICY "company_admin reads own customers" ON public.customers;
CREATE POLICY "company_admin reads own customers" ON public.customers FOR SELECT TO authenticated
  USING (company_id = current_company_id() AND deleted_at IS NULL);
DROP POLICY "company_admin updates own customers" ON public.customers;
CREATE POLICY "company_admin updates own customers" ON public.customers FOR UPDATE TO authenticated
  USING (company_id = current_company_id() AND deleted_at IS NULL) WITH CHECK (company_id = current_company_id() AND deleted_at IS NULL);
DROP POLICY "company_admin reads active official templates" ON public.templates;
CREATE POLICY "company_admin reads active official templates" ON public.templates FOR SELECT TO authenticated
  USING (type = 'official' AND status = 'active' AND deleted_at IS NULL AND current_company_id() IS NOT NULL);
DROP POLICY "company_admin reads own templates" ON public.templates;
CREATE POLICY "company_admin reads own templates" ON public.templates FOR SELECT TO authenticated
  USING (type = 'company' AND company_id = current_company_id() AND deleted_at IS NULL);
DROP POLICY "company_admin updates own templates" ON public.templates;
CREATE POLICY "company_admin updates own templates" ON public.templates FOR UPDATE TO authenticated
  USING (type = 'company' AND company_id = current_company_id() AND deleted_at IS NULL)
  WITH CHECK (type = 'company' AND company_id = current_company_id() AND deleted_at IS NULL);