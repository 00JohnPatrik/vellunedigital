CREATE TABLE public.invitation_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id uuid NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invitation_views_invitation_idx ON public.invitation_views(invitation_id);
GRANT SELECT ON public.invitation_views TO authenticated;
GRANT ALL ON public.invitation_views TO service_role;
ALTER TABLE public.invitation_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_admin reads own invitation views" ON public.invitation_views
  FOR SELECT TO authenticated USING (public.invitation_company(invitation_id) = public.current_company_id());
CREATE POLICY "super_admin reads invitation views" ON public.invitation_views
  FOR SELECT TO authenticated USING (public.is_super_admin());

-- Public view registration: only published/closed, server-only.
CREATE OR REPLACE FUNCTION public.record_invitation_view(_slug text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid;
BEGIN
  SELECT id INTO _id FROM invitations WHERE slug = _slug AND status IN ('published','closed');
  IF _id IS NULL THEN RETURN false; END IF;
  INSERT INTO invitation_views(invitation_id) VALUES (_id);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.record_invitation_view(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_invitation_view(text) TO service_role;

-- Per-invitation metrics; SECURITY INVOKER so RLS scopes rows to the caller.
CREATE OR REPLACE FUNCTION public.invitation_report(_company_id uuid DEFAULT NULL)
RETURNS TABLE(id uuid, company_id uuid, name text, customer_name text, event_date date, event_time time,
  status invitation_status, updated_at timestamptz, views bigint, confirmed bigint, declined bigint, people bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT i.id, i.company_id, i.name, c.name, i.event_date, i.event_time, i.status, i.updated_at,
    (SELECT count(*) FROM invitation_views v WHERE v.invitation_id = i.id),
    (SELECT count(*) FROM rsvp_responses r WHERE r.invitation_id = i.id AND r.status = 'confirmed'),
    (SELECT count(*) FROM rsvp_responses r WHERE r.invitation_id = i.id AND r.status = 'declined'),
    (SELECT coalesce(sum(r.people_count),0) FROM rsvp_responses r WHERE r.invitation_id = i.id AND r.status = 'confirmed')
  FROM invitations i LEFT JOIN customers c ON c.id = i.customer_id
  WHERE i.status <> 'deleted' AND (_company_id IS NULL OR i.company_id = _company_id)
  ORDER BY i.updated_at DESC
$$;
REVOKE ALL ON FUNCTION public.invitation_report(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invitation_report(uuid) TO authenticated, service_role;