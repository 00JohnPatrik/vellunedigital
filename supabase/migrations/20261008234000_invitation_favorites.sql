-- Vellune Digital — invitation favorites
-- Per-user favorites with RLS scoped to the same invitation visibility rules.
BEGIN;

CREATE TABLE IF NOT EXISTS public.invitation_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  invitation_id uuid NOT NULL REFERENCES public.invitations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invitation_favorites_user_invitation_unique UNIQUE (user_id, invitation_id)
);

REVOKE ALL PRIVILEGES ON TABLE public.invitation_favorites FROM PUBLIC, anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.invitation_favorites TO authenticated;

ALTER TABLE public.invitation_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "invitation_favorites_select_own" ON public.invitation_favorites;
CREATE POLICY "invitation_favorites_select_own"
  ON public.invitation_favorites
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
    AND EXISTS (
      SELECT 1
      FROM public.invitations i
      WHERE i.id = invitation_id
        AND i.deleted_at IS NULL
        AND i.status <> 'deleted'
        AND (public.is_super_admin() OR i.company_id = public.current_company_id())
    )
  );

DROP POLICY IF EXISTS "invitation_favorites_insert_own" ON public.invitation_favorites;
CREATE POLICY "invitation_favorites_insert_own"
  ON public.invitation_favorites
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
    AND EXISTS (
      SELECT 1
      FROM public.invitations i
      WHERE i.id = invitation_id
        AND i.deleted_at IS NULL
        AND i.status <> 'deleted'
        AND (public.is_super_admin() OR i.company_id = public.current_company_id())
    )
  );

DROP POLICY IF EXISTS "invitation_favorites_delete_own" ON public.invitation_favorites;
CREATE POLICY "invitation_favorites_delete_own"
  ON public.invitation_favorites
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
    AND EXISTS (
      SELECT 1
      FROM public.invitations i
      WHERE i.id = invitation_id
        AND i.deleted_at IS NULL
        AND i.status <> 'deleted'
        AND (public.is_super_admin() OR i.company_id = public.current_company_id())
    )
  );

CREATE INDEX IF NOT EXISTS invitation_favorites_invitation_idx
  ON public.invitation_favorites (invitation_id);

CREATE INDEX IF NOT EXISTS invitation_favorites_user_created_idx
  ON public.invitation_favorites (user_id, created_at DESC);

COMMIT;
