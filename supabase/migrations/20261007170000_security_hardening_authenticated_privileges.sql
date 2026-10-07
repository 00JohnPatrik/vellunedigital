-- Security hardening: authenticated clients only need DML privileges.
-- RLS remains the authorization boundary; these privileges remove unnecessary
-- low-level capabilities such as TRUNCATE/TRIGGER/REFERENCES from app users.
REVOKE TRUNCATE, REFERENCES, TRIGGER
ON TABLE
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
  public.subscription_plans,
  public.templates,
  public.users
FROM authenticated;
