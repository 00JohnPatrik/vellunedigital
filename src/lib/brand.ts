import { supabase } from "@/integrations/supabase/client";

export type BrandIdentity = {
  id: string;
  company_id: string;
  name: string;
  brand_name: string | null;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  show_vellune_branding: boolean;
  whatsapp_number: string | null;
  contact_email: string | null;
  website_url: string | null;
};

export type BrandIdentityInput = Omit<BrandIdentity, "id" | "company_id" | "name">;

export type CompanyDomain = {
  id: string;
  company_id: string;
  domain: string;
  domain_type: string;
  status: "pending" | "active" | "disabled" | string;
  is_primary: boolean;
  verification_token: string;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

const BRAND_FIELDS = "id, company_id, brand_name, logo_url, favicon_url, primary_color, secondary_color, accent_color, show_vellune_branding, whatsapp_number, contact_email, website_url";
const cache = new Map<string, { value: BrandIdentity; expiresAt: number }>();
const CACHE_TIME = 5 * 60 * 1000;

export const brandKey = (companyId: string) => ["brand-identity", companyId] as const;
export const domainsKey = (companyId: string) => ["company-domains", companyId] as const;

export function isHexColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

function normalizeDomain(value: string) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");
}

async function getCompanyName(companyId: string) {
  const { data, error } = await supabase.from("companies").select("name").eq("id", companyId).single();
  if (error) throw error;
  return data.name;
}

export async function getBrandIdentity(companyId: string, options: { force?: boolean } = {}): Promise<BrandIdentity> {
  const cached = cache.get(companyId);
  if (!options.force && cached && cached.expiresAt > Date.now()) return cached.value;

  const [{ data: branding, error: brandingError }, name] = await Promise.all([
    supabase.from("company_branding" as never).select(BRAND_FIELDS).eq("company_id", companyId).maybeSingle(),
    getCompanyName(companyId),
  ]);
  if (brandingError) throw brandingError;

  const value = {
    id: (branding as { id?: string } | null)?.id ?? "",
    company_id: companyId,
    name,
    brand_name: (branding as { brand_name?: string | null } | null)?.brand_name ?? null,
    logo_url: (branding as { logo_url?: string | null } | null)?.logo_url ?? null,
    favicon_url: (branding as { favicon_url?: string | null } | null)?.favicon_url ?? null,
    primary_color: (branding as { primary_color?: string | null } | null)?.primary_color ?? null,
    secondary_color: (branding as { secondary_color?: string | null } | null)?.secondary_color ?? null,
    accent_color: (branding as { accent_color?: string | null } | null)?.accent_color ?? null,
    show_vellune_branding: (branding as { show_vellune_branding?: boolean } | null)?.show_vellune_branding ?? true,
    whatsapp_number: (branding as { whatsapp_number?: string | null } | null)?.whatsapp_number ?? null,
    contact_email: (branding as { contact_email?: string | null } | null)?.contact_email ?? null,
    website_url: (branding as { website_url?: string | null } | null)?.website_url ?? null,
  } satisfies BrandIdentity;
  cache.set(companyId, { value, expiresAt: Date.now() + CACHE_TIME });
  return value;
}

export function clearBrandCache(companyId?: string) {
  if (companyId) cache.delete(companyId);
  else cache.clear();
}

export async function saveBrandIdentity(companyId: string, values: BrandIdentityInput) {
  const colors = [values.primary_color, values.secondary_color, values.accent_color];
  if (colors.some((color) => color && !isHexColor(color))) throw new Error("Use cores hexadecimais no formato #RRGGBB.");

  const { data: existing, error: readError } = await supabase.from("company_branding" as never).select("id").eq("company_id", companyId).maybeSingle();
  if (readError) throw readError;
  const result = existing
    ? await supabase.from("company_branding" as never).update(values as never).eq("company_id", companyId)
    : await supabase.from("company_branding" as never).insert({ company_id: companyId, ...values } as never);
  if (result.error) throw result.error;
  clearBrandCache(companyId);
}

export async function hasCustomBranding(companyId: string) {
  const { data, error } = await supabase.from("company_subscriptions").select("plan_id, status, expires_at").eq("company_id", companyId).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (error) throw error;
  if (!data?.plan_id || (data.expires_at && new Date(data.expires_at) < new Date())) return false;
  const plan = await supabase.from("subscription_plans").select("features").eq("id", data.plan_id).single();
  if (plan.error) throw plan.error;
  return (plan.data?.features as Record<string, unknown> | null)?.["custom_branding"] === true;
}

export async function listCompanyDomains(companyId: string): Promise<CompanyDomain[]> {
  const { data, error } = await supabase.from("company_domains" as never).select("*").eq("company_id", companyId).order("is_primary", { ascending: false }).order("domain");
  if (error) throw error;
  return (data ?? []) as unknown as CompanyDomain[];
}

export async function saveCompanyDomain(companyId: string, values: { domain: string; domain_type?: string; status?: string; is_primary?: boolean; notes?: string | null }, id?: string) {
  const domain = normalizeDomain(values.domain);
  if (!domain || domain.includes(" ")) throw new Error("Informe um domínio válido.");
  const payload = { domain, domain_type: values.domain_type ?? "custom", status: values.status ?? "pending", is_primary: values.is_primary ?? false, notes: values.notes ?? null };
  if (payload.is_primary) await supabase.from("company_domains" as never).update({ is_primary: false } as never).eq("company_id", companyId);
  const result = id
    ? await supabase.from("company_domains" as never).update(payload as never).eq("id", id).eq("company_id", companyId)
    : await supabase.from("company_domains" as never).insert({ company_id: companyId, ...payload } as never);
  if (result.error) throw result.error;
}

export async function setCompanyDomainStatus(id: string, companyId: string, status: "pending" | "active" | "disabled") {
  if (status === "active") {
    const { data, error: readError } = await supabase.from("company_domains" as never).select("verified_at").eq("id", id).eq("company_id", companyId).maybeSingle();
    if (readError) throw readError;
    if (!(data as { verified_at?: string | null } | null)?.verified_at) throw new Error("O domínio só pode ser ativado depois da verificação de DNS.");
  }
  const { error } = await supabase.from("company_domains" as never).update({ status } as never).eq("id", id).eq("company_id", companyId);
  if (error) throw error;
}

export async function resolveBrandByHostname(hostname: string): Promise<BrandIdentity | null> {
  const domain = normalizeDomain(hostname);
  if (!domain || domain === "localhost") return null;
  const { data, error } = await supabase.from("company_domains" as never).select("company_id").eq("domain", domain).eq("status", "active").maybeSingle();
  if (error || !data) return null;
  try { return await getBrandIdentity((data as { company_id: string }).company_id); } catch { return null; }
}

export async function uploadBrandAsset(companyId: string, file: File, kind: "logo" | "favicon") {
  if (!file.type.startsWith("image/")) throw new Error("Envie um arquivo de imagem.");
  if (file.size > 5 * 1024 * 1024) throw new Error("O arquivo deve ter no máximo 5 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `companies/${companyId}/brand/${kind}-${crypto.randomUUID()}.${extension}`;
  const upload = await supabase.storage.from("invitation-assets").upload(path, file, { contentType: file.type, upsert: false });
  if (upload.error) throw new Error("Não foi possível enviar a imagem.");
  const registered = await supabase.from("files" as never).insert({ company_id: companyId, storage_path: path, file_name: file.name.slice(0, 200), mime_type: file.type, size: file.size } as never);
  if (registered.error) { await supabase.storage.from("invitation-assets").remove([path]); throw new Error("Não foi possível registrar a imagem."); }
  const signed = await supabase.storage.from("invitation-assets").createSignedUrl(path, 60 * 60 * 24 * 30);
  if (signed.error || !signed.data?.signedUrl) throw new Error("Não foi possível preparar a imagem.");
  return signed.data.signedUrl;
}
