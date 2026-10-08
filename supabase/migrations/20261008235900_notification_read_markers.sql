-- Vellune Digital — notification read markers
-- Per-user last-read timestamps for notification groups.
-- Super Admin groups by company; Company Admin groups by customer.
BEGIN;

CREATE TABLE IF NOT EXISTS public.notification_read_markers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  group_type text NOT NULL CHECK (group_type IN ('company', 'customer')),
  group_id uuid NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT notification_read_markers_unique UNIQUE (user_id, group_type, group_id)
);

REVOKE ALL PRIVILEGES ON TABLE public.notification_read_markers FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notification_read_markers TO authenticated;

ALTER TABLE public.notification_read_markers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_read_markers_select_own" ON public.notification_read_markers;
CREATE POLICY "notification_read_markers_select_own"
  ON public.notification_read_markers
  FOR SELECT TO authenticated
  USING (
    user_id = (
      SELECT u.id
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.status = 'active'
      LIMIT 1
    )
  );

DROP POLICY IF EXISTS "notification_read_markers_insert_own" ON public.notification_read_markers;
CREATE POLICY "notification_read_markers_insert_own"
  ON public.notification_read_markers
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (
      SELECT u.id
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.status = 'active'
      LIMIT 1
    )
    AND (
      (
        group_type = 'company'
        AND (
          public.is_super_admin()
          OR group_id = public.current_company_id()
        )
      )
      OR (
        group_type = 'customer'
        AND EXISTS (
          SELECT 1
          FROM public.customers c
          WHERE c.id = group_id
            AND c.deleted_at IS NULL
            AND c.status = 'active'
            AND c.company_id = public.current_company_id()
        )
      )
    )
  );

DROP POLICY IF EXISTS "notification_read_markers_update_own" ON public.notification_read_markers;
CREATE POLICY "notification_read_markers_update_own"
  ON public.notification_read_markers
  FOR UPDATE TO authenticated
  USING (
    user_id = (
      SELECT u.id
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.status = 'active'
      LIMIT 1
    )
  )
  WITH CHECK (
    user_id = (
      SELECT u.id
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.status = 'active'
      LIMIT 1
    )
    AND (
      (
        group_type = 'company'
        AND (
          public.is_super_admin()
          OR group_id = public.current_company_id()
        )
      )
      OR (
        group_type = 'customer'
        AND EXISTS (
          SELECT 1
          FROM public.customers c
          WHERE c.id = group_id
            AND c.deleted_at IS NULL
            AND c.status = 'active'
            AND c.company_id = public.current_company_id()
        )
      )
    )
  );

DROP POLICY IF EXISTS "notification_read_markers_delete_own" ON public.notification_read_markers;
CREATE POLICY "notification_read_markers_delete_own"
  ON public.notification_read_markers
  FOR DELETE TO authenticated
  USING (
    user_id = (
      SELECT u.id
      FROM public.users u
      WHERE u.auth_user_id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.status = 'active'
      LIMIT 1
    )
  );

CREATE INDEX IF NOT EXISTS notification_read_markers_user_idx
  ON public.notification_read_markers (user_id, group_type, group_id);

CREATE INDEX IF NOT EXISTS notification_read_markers_updated_idx
  ON public.notification_read_markers (updated_at DESC);

CREATE OR REPLACE FUNCTION public.touch_notification_read_marker()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_notification_read_marker() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_notification_read_markers_touch ON public.notification_read_markers;
CREATE TRIGGER trg_notification_read_markers_touch
BEFORE UPDATE ON public.notification_read_markers
FOR EACH ROW
EXECUTE FUNCTION public.touch_notification_read_marker();

COMMIT;
