-- Vellune Digital — security hardening
-- Idempotent live-database hardening: restrict administrative policies to authenticated
-- callers and remove direct EXECUTE from trigger-only SECURITY DEFINER functions.

BEGIN;

-- Administrative/company-scoped policies must only evaluate for authenticated users.
-- USING / WITH CHECK expressions are intentionally preserved by ALTER POLICY.
ALTER POLICY "company_branding_company_admin_insert"
  ON public.company_branding TO authenticated;
ALTER POLICY "company_branding_company_admin_select"
  ON public.company_branding TO authenticated;
ALTER POLICY "company_branding_company_admin_update"
  ON public.company_branding TO authenticated;
ALTER POLICY "company_branding_super_admin_all"
  ON public.company_branding TO authenticated;

ALTER POLICY "company_domains_company_admin_select"
  ON public.company_domains TO authenticated;
ALTER POLICY "company_domains_super_admin_all"
  ON public.company_domains TO authenticated;

ALTER POLICY "company_subscriptions_company_admin_select"
  ON public.company_subscriptions TO authenticated;
ALTER POLICY "company_subscriptions_super_admin_all"
  ON public.company_subscriptions TO authenticated;

ALTER POLICY "guest_checkins_company_admin_insert"
  ON public.guest_checkins TO authenticated;
ALTER POLICY "guest_checkins_company_admin_select"
  ON public.guest_checkins TO authenticated;
ALTER POLICY "guest_checkins_company_admin_update"
  ON public.guest_checkins TO authenticated;
ALTER POLICY "guest_checkins_super_admin_all"
  ON public.guest_checkins TO authenticated;

ALTER POLICY "invitation_guests_company_admin_insert"
  ON public.invitation_guests TO authenticated;
ALTER POLICY "invitation_guests_company_admin_select"
  ON public.invitation_guests TO authenticated;
ALTER POLICY "invitation_guests_company_admin_update"
  ON public.invitation_guests TO authenticated;
ALTER POLICY "invitation_guests_super_admin_all"
  ON public.invitation_guests TO authenticated;

-- Active subscription plans remain intentionally publicly readable.
-- Only administrative write policies are restricted to authenticated users.
ALTER POLICY "subscription_plans_super_admin_delete"
  ON public.subscription_plans TO authenticated;
ALTER POLICY "subscription_plans_super_admin_insert"
  ON public.subscription_plans TO authenticated;
ALTER POLICY "subscription_plans_super_admin_update"
  ON public.subscription_plans TO authenticated;

-- Trigger-only SECURITY DEFINER functions must not be directly executable by
-- PUBLIC/anon/authenticated callers. PostgreSQL trigger execution is retained.
REVOKE EXECUTE ON FUNCTION public.prevent_company_admin_privilege_changes() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_guest_checkin_company() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_invitation_guest_company() FROM PUBLIC, anon, authenticated;


-- Additional verified live-database hardening.
ALTER POLICY "users_company_isolation_restrictive" ON public.users TO authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_invitation_access_token_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_guest_identity_update() FROM PUBLIC, anon, authenticated;

COMMIT;
