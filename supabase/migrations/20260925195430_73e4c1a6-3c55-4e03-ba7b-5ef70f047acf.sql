REVOKE EXECUTE ON FUNCTION public.invitation_company(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.invitation_company(uuid) TO authenticated, service_role;