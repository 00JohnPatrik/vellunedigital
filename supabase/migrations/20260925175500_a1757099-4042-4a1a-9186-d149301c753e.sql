CREATE UNIQUE INDEX IF NOT EXISTS companies_name_unique ON public.companies (lower(btrim(name)));
CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON public.users (lower(btrim(email)));
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_company_admin_needs_company;
ALTER TABLE public.users ADD CONSTRAINT users_company_admin_needs_company
  CHECK (role <> 'company_admin' OR company_id IS NOT NULL);
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS companies_name_not_blank;
ALTER TABLE public.companies ADD CONSTRAINT companies_name_not_blank CHECK (length(btrim(name)) > 0);