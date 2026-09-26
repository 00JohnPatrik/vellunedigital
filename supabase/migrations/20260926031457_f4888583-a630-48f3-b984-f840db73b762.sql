ALTER TABLE public.companies ADD COLUMN deleted_at timestamptz, ADD COLUMN deleted_by uuid REFERENCES public.users(id);
ALTER TABLE public.users ADD COLUMN deleted_at timestamptz, ADD COLUMN deleted_by uuid REFERENCES public.users(id);

CREATE TRIGGER soft_delete_guard BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.soft_delete_guard();
CREATE TRIGGER soft_delete_guard BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.soft_delete_guard();

CREATE OR REPLACE FUNCTION public.users_no_delete_super_admin()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.deleted_at IS NOT NULL AND NEW.role = 'super_admin' THEN
    RAISE EXCEPTION 'Super admin cannot be deleted' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.users_no_delete_super_admin() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER users_no_delete_super_admin BEFORE INSERT OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.users_no_delete_super_admin();

CREATE OR REPLACE FUNCTION public.current_company_id()
 RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT u.company_id FROM public.users u JOIN public.companies c ON c.id = u.company_id
  WHERE u.auth_user_id = auth.uid() AND u.role = 'company_admin' AND u.status = 'active' AND c.status = 'active'
    AND u.deleted_at IS NULL AND c.deleted_at IS NULL
$function$;

CREATE OR REPLACE FUNCTION public.invitation_report(_company_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(id uuid, company_id uuid, name text, customer_name text, event_date date, event_time time without time zone, status invitation_status, updated_at timestamp with time zone, views bigint, confirmed bigint, declined bigint, people bigint)
 LANGUAGE sql STABLE SET search_path TO 'public'
AS $function$
  SELECT i.id, i.company_id, i.name, c.name, i.event_date, i.event_time, i.status, i.updated_at,
    (SELECT count(*) FROM invitation_views v WHERE v.invitation_id = i.id),
    (SELECT count(*) FROM rsvp_responses r WHERE r.invitation_id = i.id AND r.status = 'confirmed'),
    (SELECT count(*) FROM rsvp_responses r WHERE r.invitation_id = i.id AND r.status = 'declined'),
    (SELECT coalesce(sum(r.people_count),0) FROM rsvp_responses r WHERE r.invitation_id = i.id AND r.status = 'confirmed')
  FROM invitations i LEFT JOIN customers c ON c.id = i.customer_id
  JOIN companies co ON co.id = i.company_id AND co.deleted_at IS NULL
  WHERE i.status <> 'deleted' AND (_company_id IS NULL OR i.company_id = _company_id)
  ORDER BY i.updated_at DESC
$function$;