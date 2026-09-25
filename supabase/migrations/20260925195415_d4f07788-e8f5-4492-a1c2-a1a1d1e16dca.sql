CREATE TYPE public.rsvp_status AS ENUM ('confirmed','declined');

CREATE OR REPLACE FUNCTION public.invitation_company(_invitation_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.invitations WHERE id = _invitation_id
$$;

CREATE TABLE public.rsvp_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL UNIQUE REFERENCES public.invitations(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  deadline timestamptz,
  max_people integer CHECK (max_people IS NULL OR (max_people >= 1 AND max_people <= 1000)),
  allow_phone boolean NOT NULL DEFAULT false,
  allow_email boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.rsvp_configs TO authenticated;
GRANT ALL ON public.rsvp_configs TO service_role;
ALTER TABLE public.rsvp_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_admin reads own rsvp configs" ON public.rsvp_configs FOR SELECT TO authenticated
  USING (public.invitation_company(invitation_id) = public.current_company_id());
CREATE POLICY "company_admin creates own rsvp configs" ON public.rsvp_configs FOR INSERT TO authenticated
  WITH CHECK (public.invitation_company(invitation_id) = public.current_company_id());
CREATE POLICY "company_admin updates own rsvp configs" ON public.rsvp_configs FOR UPDATE TO authenticated
  USING (public.invitation_company(invitation_id) = public.current_company_id())
  WITH CHECK (public.invitation_company(invitation_id) = public.current_company_id());
CREATE POLICY "super_admin manages rsvp configs" ON public.rsvp_configs FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

CREATE TABLE public.rsvp_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  phone text CHECK (phone IS NULL OR length(phone) <= 30),
  email text CHECK (email IS NULL OR length(email) <= 200),
  people_count integer NOT NULL DEFAULT 1 CHECK (people_count >= 0 AND people_count <= 1000),
  status public.rsvp_status NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rsvp_responses_invitation_idx ON public.rsvp_responses(invitation_id);
GRANT SELECT ON public.rsvp_responses TO authenticated;
GRANT ALL ON public.rsvp_responses TO service_role;
ALTER TABLE public.rsvp_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_admin reads own rsvp responses" ON public.rsvp_responses FOR SELECT TO authenticated
  USING (public.invitation_company(invitation_id) = public.current_company_id());
CREATE POLICY "super_admin reads rsvp responses" ON public.rsvp_responses FOR SELECT TO authenticated
  USING (public.is_super_admin());

CREATE OR REPLACE FUNCTION public.rsvp_configs_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.id := OLD.id; NEW.invitation_id := OLD.invitation_id; NEW.created_at := OLD.created_at;
  RETURN NEW;
END; $$;
CREATE TRIGGER rsvp_configs_guard BEFORE UPDATE ON public.rsvp_configs FOR EACH ROW EXECUTE FUNCTION public.rsvp_configs_guard();
CREATE TRIGGER rsvp_configs_updated_at BEFORE UPDATE ON public.rsvp_configs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER rsvp_responses_updated_at BEFORE UPDATE ON public.rsvp_responses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Public RSVP state (safe fields only)
CREATE OR REPLACE FUNCTION public.rsvp_public_state(_inv public.invitations)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.rsvp_configs;
BEGIN
  SELECT * INTO c FROM public.rsvp_configs WHERE invitation_id = _inv.id;
  IF NOT FOUND OR NOT c.enabled THEN RETURN jsonb_build_object('enabled', false); END IF;
  RETURN jsonb_build_object('enabled', true,
    'open', _inv.status = 'published' AND (c.deadline IS NULL OR now() <= c.deadline),
    'deadline', c.deadline, 'max_people', c.max_people, 'allow_phone', c.allow_phone, 'allow_email', c.allow_email);
END; $$;

CREATE OR REPLACE FUNCTION public.get_public_invitation(_slug text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE i public.invitations;
BEGIN
  IF _slug IS NULL OR length(_slug) > 120 THEN RETURN jsonb_build_object('state','not_found'); END IF;
  SELECT * INTO i FROM public.invitations WHERE slug = _slug;
  IF NOT FOUND THEN RETURN jsonb_build_object('state','not_found'); END IF;
  IF i.status NOT IN ('published','closed') THEN RETURN jsonb_build_object('state','unavailable'); END IF;
  RETURN jsonb_build_object('state','ok','invitation', jsonb_build_object(
    'slug', i.slug, 'name', i.name, 'status', i.status, 'event_date', i.event_date, 'event_time', i.event_time,
    'venue_name', i.venue_name, 'address', i.address, 'city', i.city, 'state', i.state, 'message', i.message,
    'content', i.content, 'rsvp', public.rsvp_public_state(i)));
END; $function$;

CREATE OR REPLACE FUNCTION public.submit_rsvp(_slug text, _status text, _name text, _people integer, _phone text, _email text, _update boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE i public.invitations; c public.rsvp_configs; _ph text; _em text; _existing uuid; _n text;
BEGIN
  SELECT * INTO i FROM public.invitations WHERE slug = _slug;
  IF NOT FOUND OR i.status NOT IN ('published','closed') THEN RETURN jsonb_build_object('state','unavailable'); END IF;
  SELECT * INTO c FROM public.rsvp_configs WHERE invitation_id = i.id;
  IF NOT FOUND OR NOT c.enabled THEN RETURN jsonb_build_object('state','unavailable'); END IF;
  IF i.status = 'closed' OR (c.deadline IS NOT NULL AND now() > c.deadline) THEN RETURN jsonb_build_object('state','closed'); END IF;
  _n := trim(coalesce(_name,''));
  IF _n = '' OR length(_n) > 120 THEN RETURN jsonb_build_object('state','invalid','field','name'); END IF;
  IF _status NOT IN ('confirmed','declined') THEN RETURN jsonb_build_object('state','invalid','field','status'); END IF;
  IF _status = 'confirmed' THEN
    IF _people IS NULL OR _people < 1 OR (c.max_people IS NOT NULL AND _people > c.max_people) OR _people > 1000 THEN
      RETURN jsonb_build_object('state','invalid','field','people'); END IF;
  ELSE _people := 0; END IF;
  _ph := CASE WHEN c.allow_phone THEN nullif(regexp_replace(coalesce(_phone,''), '\D', '', 'g'), '') END;
  _em := CASE WHEN c.allow_email THEN nullif(lower(trim(coalesce(_email,''))), '') END;
  IF _ph IS NOT NULL AND (length(_ph) < 8 OR length(_ph) > 15) THEN RETURN jsonb_build_object('state','invalid','field','phone'); END IF;
  IF _em IS NOT NULL AND (_em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(_em) > 200) THEN RETURN jsonb_build_object('state','invalid','field','email'); END IF;
  IF _ph IS NOT NULL OR _em IS NOT NULL THEN
    SELECT id INTO _existing FROM public.rsvp_responses WHERE invitation_id = i.id
      AND ((_ph IS NOT NULL AND phone = _ph) OR (_em IS NOT NULL AND email = _em))
      ORDER BY updated_at DESC LIMIT 1;
  END IF;
  IF _existing IS NOT NULL THEN
    IF NOT coalesce(_update, false) THEN RETURN jsonb_build_object('state','duplicate'); END IF;
    UPDATE public.rsvp_responses SET name = _n, status = _status::public.rsvp_status, people_count = _people,
      phone = coalesce(_ph, phone), email = coalesce(_em, email) WHERE id = _existing;
  ELSE
    INSERT INTO public.rsvp_responses(invitation_id, name, phone, email, people_count, status)
    VALUES (i.id, _n, _ph, _em, _people, _status::public.rsvp_status);
  END IF;
  RETURN jsonb_build_object('state','ok','status',_status,'name',_n,'people',_people,'updated',_existing IS NOT NULL);
END; $$;

REVOKE EXECUTE ON FUNCTION public.submit_rsvp(text,text,text,integer,text,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_rsvp(text,text,text,integer,text,text,boolean) TO service_role;
REVOKE EXECUTE ON FUNCTION public.rsvp_public_state(public.invitations) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.get_public_invitation(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_invitation(text) TO service_role;
REVOKE EXECUTE ON FUNCTION public.rsvp_configs_guard() FROM PUBLIC, anon, authenticated;