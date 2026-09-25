REVOKE EXECUTE ON FUNCTION public.get_public_invitation(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_invitation(text) TO service_role;