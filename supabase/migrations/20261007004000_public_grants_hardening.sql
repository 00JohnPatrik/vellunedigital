-- Remove unnecessary direct table privileges from the public role.
-- Public application flows use server-side SECURITY DEFINER functions instead.
-- subscription_plans remains the only intentionally readable public table.

REVOKE ALL PRIVILEGES ON TABLE
  public.companies,
  public.company_branding,
  public.company_domains,
  public.company_subscriptions,
  public.customers,
  public.files,
  public.guest_checkins,
  public.invitation_guests,
  public.invitation_views,
  public.invitations,
  public.rsvp_configs,
  public.rsvp_responses,
  public.templates,
  public.users
FROM anon;

REVOKE ALL PRIVILEGES ON TABLE public.subscription_plans FROM anon;
GRANT SELECT ON TABLE public.subscription_plans TO anon;
