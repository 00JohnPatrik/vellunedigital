-- Vellune Digital — final release security hardening
-- Keeps the live production protections reproducible through migrations.
-- Safe to re-run: privileges are revoked idempotently and Realtime policies are replaced.

BEGIN;

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

DROP POLICY IF EXISTS "vellune_presence_select" ON realtime.messages;
DROP POLICY IF EXISTS "vellune_presence_insert" ON realtime.messages;

CREATE POLICY "vellune_presence_select"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (
    extension = 'presence'
    AND (
      (realtime.topic() = 'presence:super-admin' AND public.is_super_admin())
      OR realtime.topic() = 'presence:company:' || public.current_company_id()::text
    )
  );

CREATE POLICY "vellune_presence_insert"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    extension = 'presence'
    AND (
      (realtime.topic() = 'presence:super-admin' AND public.is_super_admin())
      OR realtime.topic() = 'presence:company:' || public.current_company_id()::text
    )
  );

COMMIT;
