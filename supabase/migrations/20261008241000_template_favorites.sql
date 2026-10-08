-- Vellune Digital — template favorites
BEGIN;

CREATE TABLE IF NOT EXISTS public.template_favorites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT template_favorites_unique UNIQUE (user_id, template_id)
);

REVOKE ALL PRIVILEGES ON TABLE public.template_favorites FROM PUBLIC, anon;
GRANT SELECT, INSERT, DELETE ON TABLE public.template_favorites TO authenticated;
ALTER TABLE public.template_favorites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "template_favorites_select_own" ON public.template_favorites;
CREATE POLICY "template_favorites_select_own" ON public.template_favorites
FOR SELECT TO authenticated
USING (
  user_id = (SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid() AND u.deleted_at IS NULL AND u.status = 'active' LIMIT 1)
);

DROP POLICY IF EXISTS "template_favorites_insert_own" ON public.template_favorites;
CREATE POLICY "template_favorites_insert_own" ON public.template_favorites
FOR INSERT TO authenticated
WITH CHECK (
  user_id = (SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid() AND u.deleted_at IS NULL AND u.status = 'active' LIMIT 1)
  AND EXISTS (
    SELECT 1 FROM public.templates t
    WHERE t.id = template_id
      AND t.deleted_at IS NULL
      AND t.status = 'active'
      AND (
        t.type = 'official'
        OR (t.type = 'company' AND t.company_id = public.current_company_id())
        OR public.is_super_admin()
      )
  )
);

DROP POLICY IF EXISTS "template_favorites_delete_own" ON public.template_favorites;
CREATE POLICY "template_favorites_delete_own" ON public.template_favorites
FOR DELETE TO authenticated
USING (
  user_id = (SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid() AND u.deleted_at IS NULL AND u.status = 'active' LIMIT 1)
);

CREATE INDEX IF NOT EXISTS template_favorites_user_created_idx
  ON public.template_favorites(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS template_favorites_template_idx
  ON public.template_favorites(template_id);

COMMIT;
