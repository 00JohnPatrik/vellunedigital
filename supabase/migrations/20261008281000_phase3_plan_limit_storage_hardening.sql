-- Vellune Digital — Fase 3: reforço do limite de armazenamento
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

  -- Files can be created from an invitation/template without explicitly
  -- carrying company_id. Resolve the owner before evaluating the plan.
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

COMMIT;
