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
    IF _cust_company IS DISTINCT FROM NEW.company_id THEN RAISE EXCEPTION 'Cliente não permitido' USING ERRCODE = '23514'; END IF;
    NEW.status := 'draft';
    NEW.published_at := NULL;
    IF NEW.template_id IS NOT NULL THEN
      SELECT * INTO _t FROM public.templates WHERE id = NEW.template_id AND status = 'active'
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
    IF NEW.customer_id <> OLD.customer_id THEN
      SELECT company_id INTO _cust_company FROM public.customers WHERE id = NEW.customer_id;
      IF _cust_company IS DISTINCT FROM NEW.company_id THEN RAISE EXCEPTION 'Cliente não permitido' USING ERRCODE = '23514'; END IF;
    END IF;
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.invitations_guard() FROM PUBLIC, anon, authenticated;