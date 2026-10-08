-- Vellune Digital — Fase 3: limites de plano aplicados no backend
BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_subscription_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  plan_row public.subscription_plans;
  company_uuid uuid;
  resource_limit integer;
  current_value bigint;
  requested_value bigint := 1;
  resource_label text;
BEGIN
  IF public.is_super_admin() THEN
    RETURN NEW;
  END IF;

  company_uuid := NEW.company_id;

  IF company_uuid IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT sp.*
    INTO plan_row
  FROM public.company_subscriptions cs
  JOIN public.subscription_plans sp
    ON sp.id = cs.plan_id
  WHERE cs.company_id = company_uuid
    AND cs.status = 'active'
    AND (cs.expires_at IS NULL OR cs.expires_at >= now())
    AND sp.status = 'active'
  ORDER BY cs.updated_at DESC
  LIMIT 1;

  -- Legacy/demo companies without an assigned plan keep the existing behavior.
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'customers' THEN
    resource_limit := plan_row.customers_limit;
    resource_label := 'clientes';
    SELECT count(*) INTO current_value
    FROM public.customers
    WHERE company_id = company_uuid
      AND status = 'active'
      AND deleted_at IS NULL;

  ELSIF TG_TABLE_NAME = 'invitations' THEN
    resource_limit := plan_row.invitations_limit;
    resource_label := 'convites';
    SELECT count(*) INTO current_value
    FROM public.invitations
    WHERE company_id = company_uuid
      AND status <> 'deleted'
      AND deleted_at IS NULL;

  ELSIF TG_TABLE_NAME = 'invitation_guests' THEN
    resource_limit := plan_row.guests_limit;
    resource_label := 'convidados';
    SELECT count(*) INTO current_value
    FROM public.invitation_guests
    WHERE company_id = company_uuid
      AND status = 'active'
      AND deleted_at IS NULL;

  ELSIF TG_TABLE_NAME = 'files' THEN
    IF plan_row.storage_limit_mb IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT coalesce(sum(size), 0) INTO current_value
    FROM public.files
    WHERE company_id = company_uuid;

    requested_value := coalesce(NEW.size, 0);
    IF current_value + requested_value > plan_row.storage_limit_mb * 1024 * 1024 THEN
      RAISE EXCEPTION 'Limite de armazenamento do plano atingido.'
        USING ERRCODE = 'P0001';
    END IF;
    RETURN NEW;
  ELSE
    RETURN NEW;
  END IF;

  IF resource_limit IS NOT NULL AND current_value >= resource_limit THEN
    RAISE EXCEPTION 'Limite do plano atingido: % (% de %).', resource_label, current_value, resource_limit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.enforce_subscription_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS subscription_limit_guard_customers ON public.customers;
CREATE TRIGGER subscription_limit_guard_customers
BEFORE INSERT ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_limit();

DROP TRIGGER IF EXISTS subscription_limit_guard_invitations ON public.invitations;
CREATE TRIGGER subscription_limit_guard_invitations
BEFORE INSERT ON public.invitations
FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_limit();

DROP TRIGGER IF EXISTS subscription_limit_guard_invitation_guests ON public.invitation_guests;
CREATE TRIGGER subscription_limit_guard_invitation_guests
BEFORE INSERT ON public.invitation_guests
FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_limit();

DROP TRIGGER IF EXISTS subscription_limit_guard_files ON public.files;
CREATE TRIGGER subscription_limit_guard_files
BEFORE INSERT ON public.files
FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_limit();

COMMIT;
