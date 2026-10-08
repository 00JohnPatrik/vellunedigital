-- Vellune Digital — Fase 3: automações de ciclo de vida e portal do cliente
BEGIN;

CREATE TABLE IF NOT EXISTS public.invitation_automation_settings (
  invitation_id uuid PRIMARY KEY REFERENCES public.invitations(id) ON DELETE CASCADE,
  auto_close_enabled boolean NOT NULL DEFAULT true,
  auto_close_after_hours smallint NOT NULL DEFAULT 12
    CHECK (auto_close_after_hours IN (6, 12, 24)),
  client_portal_enabled boolean NOT NULL DEFAULT true,
  client_portal_hours_after_event smallint NOT NULL DEFAULT 24
    CHECK (client_portal_hours_after_event IN (6, 12, 24, 48)),
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo'
    CHECK (length(trim(timezone)) BETWEEN 1 AND 80),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL PRIVILEGES ON TABLE public.invitation_automation_settings FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE ON TABLE public.invitation_automation_settings TO authenticated;
GRANT ALL ON TABLE public.invitation_automation_settings TO service_role;

ALTER TABLE public.invitation_automation_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invitation_automation_company_admin_select" ON public.invitation_automation_settings;
CREATE POLICY "invitation_automation_company_admin_select"
  ON public.invitation_automation_settings
  FOR SELECT TO authenticated
  USING (public.invitation_company(invitation_id) = public.current_company_id());

DROP POLICY IF EXISTS "invitation_automation_company_admin_insert" ON public.invitation_automation_settings;
CREATE POLICY "invitation_automation_company_admin_insert"
  ON public.invitation_automation_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.invitation_company(invitation_id) = public.current_company_id());

DROP POLICY IF EXISTS "invitation_automation_company_admin_update" ON public.invitation_automation_settings;
CREATE POLICY "invitation_automation_company_admin_update"
  ON public.invitation_automation_settings
  FOR UPDATE TO authenticated
  USING (public.invitation_company(invitation_id) = public.current_company_id())
  WITH CHECK (public.invitation_company(invitation_id) = public.current_company_id());

DROP POLICY IF EXISTS "invitation_automation_super_admin_all" ON public.invitation_automation_settings;
CREATE POLICY "invitation_automation_super_admin_all"
  ON public.invitation_automation_settings
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

DROP TRIGGER IF EXISTS invitation_automation_updated_at ON public.invitation_automation_settings;
CREATE TRIGGER invitation_automation_updated_at
  BEFORE UPDATE ON public.invitation_automation_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.invitation_automation_state(_invitation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  i public.invitations;
  a public.invitation_automation_settings;
  event_at timestamptz;
  auto_close_at timestamptz;
  portal_expires_at timestamptz;
BEGIN
  SELECT * INTO i
  FROM public.invitations
  WHERE id = _invitation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('state', 'not_found');
  END IF;

  SELECT * INTO a
  FROM public.invitation_automation_settings
  WHERE invitation_id = _invitation_id;

  IF NOT FOUND THEN
    a.auto_close_enabled := true;
    a.auto_close_after_hours := 12;
    a.client_portal_enabled := true;
    a.client_portal_hours_after_event := 24;
    a.timezone := 'America/Sao_Paulo';
  END IF;

  event_at := make_timestamptz(
    extract(year from i.event_date)::int,
    extract(month from i.event_date)::int,
    extract(day from i.event_date)::int,
    extract(hour from i.event_time)::int,
    extract(minute from i.event_time)::int,
    extract(second from i.event_time),
    a.timezone
  );

  auto_close_at := event_at + make_interval(hours => a.auto_close_after_hours);
  portal_expires_at := event_at + make_interval(hours => a.client_portal_hours_after_event);

  RETURN jsonb_build_object(
    'state', 'ok',
    'status', i.status,
    'event_at', event_at,
    'auto_close_enabled', a.auto_close_enabled,
    'auto_close_after_hours', a.auto_close_after_hours,
    'auto_close_at', auto_close_at,
    'auto_close_due', a.auto_close_enabled AND now() >= auto_close_at,
    'client_portal_enabled', a.client_portal_enabled,
    'client_portal_hours_after_event', a.client_portal_hours_after_event,
    'portal_expires_at', portal_expires_at,
    'portal_open', a.client_portal_enabled
      AND i.status IN ('published','closed')
      AND now() < portal_expires_at,
    'timezone', a.timezone
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.apply_invitation_automation(_invitation_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  state jsonb;
BEGIN
  state := public.invitation_automation_state(_invitation_id);

  IF state->>'state' = 'ok'
     AND state->>'status' = 'published'
     AND coalesce((state->>'auto_close_due')::boolean, false) THEN
    UPDATE public.invitations
       SET status = 'closed'
     WHERE id = _invitation_id
       AND status = 'published';
  END IF;

  RETURN public.invitation_automation_state(_invitation_id);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.invitation_automation_state(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invitation_automation_state(uuid) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.apply_invitation_automation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_invitation_automation(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_public_invitation(_slug text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  i public.invitations;
  invitation_id uuid;
BEGIN
  IF _slug IS NULL OR length(_slug) > 120 THEN
    RETURN jsonb_build_object('state','not_found');
  END IF;

  SELECT id INTO invitation_id
  FROM public.invitations
  WHERE slug = _slug;

  IF invitation_id IS NULL THEN
    RETURN jsonb_build_object('state','not_found');
  END IF;

  PERFORM public.apply_invitation_automation(invitation_id);

  SELECT * INTO i
  FROM public.invitations
  WHERE id = invitation_id;

  IF i.status NOT IN ('published','closed') THEN
    RETURN jsonb_build_object('state','unavailable');
  END IF;

  RETURN jsonb_build_object(
    'state','ok',
    'invitation', jsonb_build_object(
      'slug', i.slug,
      'name', i.name,
      'status', i.status,
      'event_date', i.event_date,
      'event_time', i.event_time,
      'venue_name', i.venue_name,
      'address', i.address,
      'city', i.city,
      'state', i.state,
      'message', i.message,
      'content', i.content,
      'rsvp', public.rsvp_public_state(i)
    )
  );
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.get_public_invitation(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_invitation(text) TO service_role;

CREATE OR REPLACE FUNCTION public.submit_rsvp(
  _slug text,
  _status text,
  _name text,
  _people integer,
  _phone text,
  _email text,
  _update boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  i public.invitations;
  c public.rsvp_configs;
  _ph text;
  _em text;
  _existing uuid;
  _n text;
BEGIN
  SELECT * INTO i FROM public.invitations WHERE slug = _slug;
  IF NOT FOUND OR i.status NOT IN ('published','closed') THEN
    RETURN jsonb_build_object('state','unavailable');
  END IF;

  PERFORM public.apply_invitation_automation(i.id);
  SELECT * INTO i FROM public.invitations WHERE id = i.id;

  SELECT * INTO c FROM public.rsvp_configs WHERE invitation_id = i.id;
  IF NOT FOUND OR NOT c.enabled THEN
    RETURN jsonb_build_object('state','unavailable');
  END IF;

  IF i.status = 'closed' OR (c.deadline IS NOT NULL AND now() > c.deadline) THEN
    RETURN jsonb_build_object('state','closed');
  END IF;

  _n := trim(coalesce(_name,''));
  IF _n = '' OR length(_n) > 120 THEN
    RETURN jsonb_build_object('state','invalid','field','name');
  END IF;

  IF _status NOT IN ('confirmed','declined') THEN
    RETURN jsonb_build_object('state','invalid','field','status');
  END IF;

  IF _status = 'confirmed' THEN
    IF _people IS NULL OR _people < 1 OR (c.max_people IS NOT NULL AND _people > c.max_people) OR _people > 1000 THEN
      RETURN jsonb_build_object('state','invalid','field','people');
    END IF;
  ELSE
    _people := 0;
  END IF;

  _ph := CASE WHEN c.allow_phone THEN nullif(regexp_replace(coalesce(_phone,''), '\D', '', 'g'), '') END;
  _em := CASE WHEN c.allow_email THEN nullif(lower(trim(coalesce(_email,''))), '') END;

  IF _ph IS NOT NULL AND (length(_ph) < 8 OR length(_ph) > 15) THEN
    RETURN jsonb_build_object('state','invalid','field','phone');
  END IF;

  IF _em IS NOT NULL AND (_em !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' OR length(_em) > 200) THEN
    RETURN jsonb_build_object('state','invalid','field','email');
  END IF;

  IF _ph IS NOT NULL OR _em IS NOT NULL THEN
    SELECT id INTO _existing
    FROM public.rsvp_responses
    WHERE invitation_id = i.id
      AND ((_ph IS NOT NULL AND phone = _ph) OR (_em IS NOT NULL AND email = _em))
    ORDER BY updated_at DESC
    LIMIT 1;
  END IF;

  IF _existing IS NOT NULL THEN
    IF NOT coalesce(_update, false) THEN
      RETURN jsonb_build_object('state','duplicate');
    END IF;

    UPDATE public.rsvp_responses
       SET name = _n,
           status = _status::public.rsvp_status,
           people_count = _people,
           phone = coalesce(_ph, phone),
           email = coalesce(_em, email)
     WHERE id = _existing;
  ELSE
    INSERT INTO public.rsvp_responses(invitation_id, name, phone, email, people_count, status)
    VALUES (i.id, _n, _ph, _em, _people, _status::public.rsvp_status);
  END IF;

  RETURN jsonb_build_object('state','ok','status',_status,'name',_n,'people',_people,'updated',_existing IS NOT NULL);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.submit_rsvp(text,text,text,integer,text,text,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_rsvp(text,text,text,integer,text,text,boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.invitations_automation_seed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.invitation_automation_settings (invitation_id)
  VALUES (NEW.id)
  ON CONFLICT (invitation_id) DO NOTHING;
  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.invitations_automation_seed() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS invitations_automation_seed ON public.invitations;
CREATE TRIGGER invitations_automation_seed
AFTER INSERT ON public.invitations
FOR EACH ROW EXECUTE FUNCTION public.invitations_automation_seed();

INSERT INTO public.invitation_automation_settings (invitation_id)
SELECT id
FROM public.invitations
WHERE deleted_at IS NULL
ON CONFLICT (invitation_id) DO NOTHING;

COMMIT;
