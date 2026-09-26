import { supabase } from "@/integrations/supabase/client";

export type BrandIdentity = {
  id: string;
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

export type BrandIdentityInput = Omit<BrandIdentity, "id" | "name">;

const COMPANY_FIELDS = "id, name, brand_name, logo_url, favicon_url, primary_color, secondary_color, accent_color, show_vellune_branding, whatsapp_number, contact_email, website_url";

export const brandKey = (companyId: string) => ["brand-identity", companyId] as const;

export function isHexColor(value: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

export async function getBrandIdentity(companyId: string): Promise<BrandIdentity> {
  const { data, error } = await supabase.from("companies" as never).select(COMPANY_FIELDS).eq("id", companyId).single();
  if (error) throw error;
  return data as unknown as BrandIdentity;
}

export async function saveBrandIdentity(companyId: string, values: BrandIdentityInput) {
  const colors = [values.primary_color, values.secondary_color, values.accent_color];
  if (colors.some((color) => color && !isHexColor(color))) throw new Error("Use cores hexadecimais no formato #RRGGBB.");
  const { error } = await supabase.from("companies" as never).update(values as never).eq("id", companyId);
  if (error) throw error;
}

export async function hasCustomBranding(companyId: string) {
  const { data, error } = await supabase
    .from("company_subscriptions")
    .select("plan_id, status, expires_at")
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data?.plan_id || (data.expires_at && new Date(data.expires_at) < new Date())) return false;
  const planResult = await supabase.from("subscription_plans").select("features").eq("id", data.plan_id).single();
  if (planResult.error) throw planResult.error;
  const features = (planResult.data?.features ?? {}) as Record<string, unknown>;
  return features.custom_branding === true;
}

export async function uploadBrandAsset(companyId: string, file: File, kind: "logo" | "favicon") {
  if (!file.type.startsWith("image/")) throw new Error("Envie um arquivo de imagem.");
  if (file.size > 5 * 1024 * 1024) throw new Error("O arquivo deve ter no máximo 5 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `companies/${companyId}/brand/${kind}-${crypto.randomUUID()}.${extension}`;
  const upload = await supabase.storage.from("invitation-assets").upload(path, file, { contentType: file.type, upsert: false });
  if (upload.error) throw new Error("Não foi possível enviar a imagem.");
  const { error } = await supabase.from("files" as never).insert({
    company_id: companyId,
    storage_path: path,
    file_name: file.name.slice(0, 200),
    mime_type: file.type,
    size: file.size,
  } as never);
  if (error) {
    await supabase.storage.from("invitation-assets").remove([path]);
    throw new Error("Não foi possível registrar a imagem.");
  }
  const signed = await supabase.storage.from("invitation-assets").createSignedUrl(path, 60 * 60 * 24 * 30);
  if (signed.error || !signed.data?.signedUrl) throw new Error("Não foi possível preparar a imagem.");
  return signed.data.signedUrl;
}