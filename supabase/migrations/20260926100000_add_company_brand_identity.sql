alter table public.companies
  add column if not exists brand_name text,
  add column if not exists logo_url text,
  add column if not exists favicon_url text,
  add column if not exists primary_color text,
  add column if not exists secondary_color text,
  add column if not exists accent_color text,
  add column if not exists show_vellune_branding boolean not null default true,
  add column if not exists whatsapp_number text,
  add column if not exists contact_email text,
  add column if not exists website_url text;

update public.companies
set brand_name = coalesce(nullif(brand_name, ''), 'Vellune Digital'),
    primary_color = coalesce(nullif(primary_color, ''), '#7c3aed'),
    secondary_color = coalesce(nullif(secondary_color, ''), '#0f172a'),
    accent_color = coalesce(nullif(accent_color, ''), '#f59e0b')
where brand_name is null
   or primary_color is null
   or secondary_color is null
   or accent_color is null;

alter table public.companies
  drop constraint if exists companies_primary_color_hex_check,
  drop constraint if exists companies_secondary_color_hex_check,
  drop constraint if exists companies_accent_color_hex_check;

alter table public.companies
  add constraint companies_primary_color_hex_check check (primary_color is null or primary_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint companies_secondary_color_hex_check check (secondary_color is null or secondary_color ~ '^#[0-9A-Fa-f]{6}$'),
  add constraint companies_accent_color_hex_check check (accent_color is null or accent_color ~ '^#[0-9A-Fa-f]{6}$');