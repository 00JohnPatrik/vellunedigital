-- Vellune Digital — hardening: serialize plan-limit checks per company.
-- Without a transaction-scoped lock, two concurrent inserts can both observe
-- the same usage count and exceed the configured plan limit.
BEGIN;

CREATE OR REPLACE FUNCTION public.subscription_limit_company_lock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  company_uuid uuid := NEW.company_id;
BEGIN
  -- Files may inherit the tenant from their invitation or template.
  IF TG_TABLE_NAME = 'files' AND company_uuid IS NULL THEN
    IF NEW.invitation_id IS NOT NULL THEN
      SELECT company_id INTO company_uuid
      FROM public.invitations
      WHERE id = NEW.invitation_id;
    END IF;

    IF company_uuid IS NULL AND NEW.template_id IS NOT NULL THEN
      SELECT company_id INTO company_uuid
      FROM public.templates
      WHERE id = NEW.template_id;
    END IF;

    IF company_uuid IS NOT NULL THEN
      NEW.company_id := company_uuid;
    END IF;
  END IF;

  IF company_uuid IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended(company_uuid::text, 0));
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.subscription_limit_company_lock() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS a_subscription_limit_company_lock_customers ON public.customers;
CREATE TRIGGER a_subscription_limit_company_lock_customers
BEFORE INSERT ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.subscription_limit_company_lock();

DROP TRIGGER IF EXISTS a_subscription_limit_company_lock_invitations ON public.invitations;
CREATE TRIGGER a_subscription_limit_company_lock_invitations
BEFORE INSERT ON public.invitations
FOR EACH ROW EXECUTE FUNCTION public.subscription_limit_company_lock();

DROP TRIGGER IF EXISTS a_subscription_limit_company_lock_invitation_guests ON public.invitation_guests;
CREATE TRIGGER a_subscription_limit_company_lock_invitation_guests
BEFORE INSERT ON public.invitation_guests
FOR EACH ROW EXECUTE FUNCTION public.subscription_limit_company_lock();

DROP TRIGGER IF EXISTS a_subscription_limit_company_lock_files ON public.files;
CREATE TRIGGER a_subscription_limit_company_lock_files
BEFORE INSERT ON public.files
FOR EACH ROW EXECUTE FUNCTION public.subscription_limit_company_lock();

COMMIT;
