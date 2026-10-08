-- Vellune Digital — authorize authenticated Realtime presence channels.
-- Keep presence topics private and scope company channels to the signed-in company.
-- Super admins use the dedicated super-admin presence topic.

BEGIN;

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
