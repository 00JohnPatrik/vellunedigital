CREATE TABLE public.files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id),
  invitation_id uuid REFERENCES public.invitations(id),
  template_id uuid REFERENCES public.templates(id),
  storage_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  mime_type text NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp')),
  size integer NOT NULL CHECK (size > 0 AND size <= 10485760),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((invitation_id IS NULL) <> (template_id IS NULL)),
  CHECK (company_id IS NOT NULL OR invitation_id IS NULL)
);
CREATE INDEX files_invitation_idx ON public.files(invitation_id);
CREATE INDEX files_template_idx ON public.files(template_id);
GRANT SELECT, INSERT, DELETE ON public.files TO authenticated;
GRANT ALL ON public.files TO service_role;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "company_admin reads own files" ON public.files FOR SELECT TO authenticated
  USING (company_id IS NOT NULL AND company_id = public.current_company_id());
CREATE POLICY "company_admin creates own files" ON public.files FOR INSERT TO authenticated
  WITH CHECK (company_id IS NOT NULL AND company_id = public.current_company_id());
CREATE POLICY "company_admin deletes own files" ON public.files FOR DELETE TO authenticated
  USING (company_id IS NOT NULL AND company_id = public.current_company_id());
CREATE POLICY "super_admin manages files" ON public.files FOR ALL TO authenticated
  USING (public.is_super_admin()) WITH CHECK (public.is_super_admin());

-- Derives company from the owning invitation/template and forces the storage path to match it.
CREATE OR REPLACE FUNCTION public.files_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cid uuid; _t public.templates; _prefix text;
BEGIN
  IF NEW.invitation_id IS NOT NULL THEN
    SELECT company_id INTO _cid FROM invitations WHERE id = NEW.invitation_id AND status <> 'deleted';
    IF _cid IS NULL THEN RAISE EXCEPTION 'Convite inválido' USING ERRCODE = '23514'; END IF;
    _prefix := 'companies/' || _cid || '/invitations/' || NEW.invitation_id || '/';
  ELSE
    SELECT * INTO _t FROM templates WHERE id = NEW.template_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Modelo inválido' USING ERRCODE = '23514'; END IF;
    _cid := _t.company_id;
    IF _t.type = 'official' THEN
      IF NOT public.is_super_admin() THEN RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501'; END IF;
      _prefix := 'official/templates/' || NEW.template_id || '/';
    ELSE
      _prefix := 'companies/' || _cid || '/templates/' || NEW.template_id || '/';
    END IF;
  END IF;
  IF auth.uid() IS NOT NULL AND NOT public.is_super_admin() AND _cid IS DISTINCT FROM public.current_company_id() THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  NEW.company_id := _cid;
  IF left(NEW.storage_path, length(_prefix)) <> _prefix OR NEW.storage_path ~ '\.\.'
     OR lower(NEW.storage_path) !~ '\.(jpg|jpeg|png|webp)$' THEN
    RAISE EXCEPTION 'Caminho inválido' USING ERRCODE = '23514';
  END IF;
  NEW.created_at := now();
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.files_guard() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER files_guard BEFORE INSERT ON public.files FOR EACH ROW EXECUTE FUNCTION public.files_guard();

-- Storage policies for the private bucket (no anon access at all; public pages get server-signed URLs).
CREATE POLICY "assets read own company or official" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'invitation-assets' AND (
    public.is_super_admin()
    OR ((storage.foldername(name))[1] = 'companies' AND (storage.foldername(name))[2] = public.current_company_id()::text)
    OR ((storage.foldername(name))[1] = 'official' AND public.current_company_id() IS NOT NULL)));
CREATE POLICY "assets upload own company" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'invitation-assets'
    AND lower(storage.extension(name)) IN ('jpg','jpeg','png','webp')
    AND (public.is_super_admin()
      OR ((storage.foldername(name))[1] = 'companies' AND (storage.foldername(name))[2] = public.current_company_id()::text)));
CREATE POLICY "assets delete own company" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'invitation-assets' AND (public.is_super_admin()
    OR ((storage.foldername(name))[1] = 'companies' AND (storage.foldername(name))[2] = public.current_company_id()::text)));