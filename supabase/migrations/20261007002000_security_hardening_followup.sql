-- Follow-up hardening for policies and trigger helpers.
-- Keep this migration separate from already-applied historical migrations.

ALTER POLICY "users_company_isolation_restrictive"
  ON public.users
  TO authenticated;

REVOKE EXECUTE ON FUNCTION public.set_updated_at()
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.prevent_invitation_access_token_update()
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.prevent_guest_identity_update()
  FROM PUBLIC, anon, authenticated;
