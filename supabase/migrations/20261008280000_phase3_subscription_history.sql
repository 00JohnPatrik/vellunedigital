-- Vellune Digital — Fase 3: histórico comercial e ciclo de vida das assinaturas
BEGIN;

CREATE TABLE IF NOT EXISTS public.company_subscription_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  subscription_id uuid NOT NULL REFERENCES public.company_subscriptions(id) ON DELETE CASCADE,
  action text NOT NULL,
  from_status text,
  to_status text,
  from_plan_id uuid,
  to_plan_id uuid,
  from_expires_at timestamptz,
  to_expires_at timestamptz,
  notes text,
  changed_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS company_subscription_history_company_created_idx
  ON public.company_subscription_history(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS company_subscription_history_subscription_created_idx
  ON public.company_subscription_history(subscription_id, created_at DESC);

REVOKE ALL PRIVILEGES ON TABLE public.company_subscription_history FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.company_subscription_history TO authenticated;
GRANT ALL ON TABLE public.company_subscription_history TO service_role;

ALTER TABLE public.company_subscription_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_subscription_history_company_select" ON public.company_subscription_history;
CREATE POLICY "company_subscription_history_company_select"
  ON public.company_subscription_history
  FOR SELECT TO authenticated
  USING (company_id = public.current_company_id());

DROP POLICY IF EXISTS "company_subscription_history_super_admin_all" ON public.company_subscription_history;
CREATE POLICY "company_subscription_history_super_admin_all"
  ON public.company_subscription_history
  FOR ALL TO authenticated
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

CREATE OR REPLACE FUNCTION public.record_company_subscription_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_action text;
  v_changed_by uuid;
BEGIN
  v_changed_by := coalesce(NEW.changed_by, OLD.changed_by, auth.uid());

  IF TG_OP = 'INSERT' THEN
    v_action := 'created';
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      v_action := CASE NEW.status
        WHEN 'active' THEN 'activated'
        WHEN 'suspended' THEN 'suspended'
        WHEN 'cancelled' THEN 'cancelled'
        ELSE 'status_changed'
      END;
    ELSIF NEW.plan_id IS DISTINCT FROM OLD.plan_id THEN
      v_action := 'plan_changed';
    ELSIF NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
      IF (OLD.expires_at IS NULL AND NEW.expires_at IS NOT NULL)
         OR (OLD.expires_at IS NOT NULL AND NEW.expires_at IS NOT NULL AND NEW.expires_at > OLD.expires_at) THEN
        v_action := 'renewed';
      ELSE
        v_action := 'expiration_changed';
      END IF;
    ELSIF NEW.starts_at IS DISTINCT FROM OLD.starts_at THEN
      v_action := 'start_changed';
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.company_subscription_history (
    company_id,
    subscription_id,
    action,
    from_status,
    to_status,
    from_plan_id,
    to_plan_id,
    from_expires_at,
    to_expires_at,
    notes,
    changed_by
  )
  VALUES (
    NEW.company_id,
    NEW.id,
    v_action,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
    NEW.status,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.plan_id ELSE NULL END,
    NEW.plan_id,
    CASE WHEN TG_OP = 'UPDATE' THEN OLD.expires_at ELSE NULL END,
    NEW.expires_at,
    NEW.notes,
    v_changed_by
  );

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.record_company_subscription_history() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS company_subscription_history_trigger ON public.company_subscriptions;
CREATE TRIGGER company_subscription_history_trigger
AFTER INSERT OR UPDATE ON public.company_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.record_company_subscription_history();

-- Backfill a single initial event for existing subscriptions so the history
-- screen is useful immediately after the migration.
INSERT INTO public.company_subscription_history (
  company_id,
  subscription_id,
  action,
  from_status,
  to_status,
  from_plan_id,
  to_plan_id,
  from_expires_at,
  to_expires_at,
  notes,
  changed_by,
  created_at
)
SELECT
  cs.company_id,
  cs.id,
  'created',
  NULL,
  cs.status,
  NULL,
  cs.plan_id,
  NULL,
  cs.expires_at,
  cs.notes,
  cs.changed_by,
  cs.created_at
FROM public.company_subscriptions cs
WHERE NOT EXISTS (
  SELECT 1
  FROM public.company_subscription_history h
  WHERE h.subscription_id = cs.id
);

COMMIT;
