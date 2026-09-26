import { supabase } from "@/integrations/supabase/client";
import type { Status } from "@/components/admin-ui";

export const CATEGORIES = [
  { value: "casamento", label: "Casamento" },
  { value: "aniversario", label: "Aniversário" },
  { value: "cha_de_bebe", label: "Chá de bebê" },
  { value: "cha_revelacao", label: "Chá revelação" },
  { value: "15_anos", label: "15 anos" },
  { value: "formatura", label: "Formatura" },
  { value: "festa_infantil", label: "Festa infantil" },
  { value: "outros", label: "Outros" },
] as const;
export type Category = (typeof CATEGORIES)[number]["value"];
export const categoryLabel = (c: string) => CATEGORIES.find((x) => x.value === c)?.label ?? c;

export type BlockType = "text" | "image" | "gallery" | "date" | "time" | "location" | "countdown" | "rsvp" | "whatsapp" | "button" | "qr_code" | "divider";

/** Block catalogue: single source of truth for labels and defaults (property controls live in the visual editor). */
export const BLOCKS: Record<BlockType, { label: string; defaults: Record<string, string> }> = {
  text: { label: "Texto", defaults: { text: "Seu texto aqui", size: "lg", font: "display", bold: "", align: "center", color: "", width: "full" } },
  image: { label: "Imagem", defaults: { url: "", alt: "", width: "full", height: "wide", align: "center", position: "center" } },
  gallery: { label: "Galeria", defaults: { images: "[]", mode: "grid", columns: "2", height: "square", align: "center", autoplay: "0", captions: "1" } },
  date: { label: "Data", defaults: { source: "event", date: "", format: "long", label: "", align: "center" } },
  time: { label: "Horário", defaults: { source: "event", time: "", format: "24h", label: "", align: "center" } },
  location: { label: "Local", defaults: { source: "event", name: "", address: "", show_name: "1", show_address: "1", show_city: "1", show_directions: "1", align: "center" } },
  countdown: { label: "Contagem regressiva", defaults: { source: "event", target: "", title: "Faltam", align: "center" } },
  rsvp: { label: "Confirmação de presença", defaults: { title: "", label: "Confirmar presença", style: "solid", width: "auto", align: "center" } },
  whatsapp: { label: "WhatsApp", defaults: { label: "Fale pelo WhatsApp", phone: "", message: "", style: "outline", width: "auto", align: "center" } },
  button: { label: "Botão", defaults: { label: "Saiba mais", url: "", style: "solid", width: "auto", align: "center" } },
  qr_code: { label: "QR Code", defaults: { value: "", size: "md", align: "center" } },
  divider: { label: "Divisor", defaults: { thickness: "1", width: "full", align: "center", style: "solid" } },
};

export type Block = { id: string; type: BlockType; props: Record<string, string>; hidden?: boolean; locked?: boolean };
export type Background = { color?: string; image?: string; size?: "cover" | "contain"; x?: "left" | "center" | "right"; y?: "top" | "center" | "bottom"; overlay?: number };
export type TemplateContent = { version: 1; blocks: Block[]; settings?: { background?: Background } };
/** Builds content keeping `version`/`blocks` and adding `settings.background` only when set. */
export const buildContent = (blocks: Block[], bg: Background | undefined): TemplateContent =>
  bg && Object.values(bg).some((x) => x !== undefined && x !== "" && x !== 0) ? { version: 1, blocks, settings: { background: bg } } : { version: 1, blocks };
export type Template = {
  id: string; company_id: string | null; name: string; category: Category; type: "official" | "company";
  preview_image: string | null; content: TemplateContent; status: Status; created_at: string; updated_at: string;
};
export type TemplateValues = { name: string; category: Category | ""; preview_image: string; status: Status; content: TemplateContent };

export const newBlock = (type: BlockType): Block => ({ id: crypto.randomUUID(), type, props: { ...BLOCKS[type].defaults } });

export const STARTERS: Record<string, { label: string; build: () => TemplateContent }> = {
  blank: { label: "Em branco", build: () => ({ version: 1, blocks: [] }) },
  basic: {
    label: "Convite básico",
    build: () => ({ version: 1, blocks: [
      { ...newBlock("text"), props: { text: "Você está convidado!" } },
      newBlock("date"), newBlock("time"), newBlock("location"), newBlock("divider"), newBlock("rsvp"),
    ] }),
  },
  complete: {
    label: "Convite completo",
    build: () => ({ version: 1, blocks: [
      newBlock("image"), { ...newBlock("text"), props: { text: "Você está convidado!" } }, newBlock("countdown"),
      newBlock("date"), newBlock("time"), newBlock("location"), newBlock("divider"), newBlock("rsvp"), newBlock("whatsapp"), newBlock("qr_code"),
    ] }),
  },
};

/** Deep copy with fresh block ids — the copy never shares objects with the source. */
export function cloneContent(c: TemplateContent): TemplateContent {
  const copy = structuredClone(c ?? { version: 1, blocks: [] });
  return buildContent((copy.blocks ?? []).map((b) => ({ ...b, id: crypto.randomUUID() })), copy.settings?.background);
}

export const templatesKey = ["templates"] as const;

export async function listTemplates(): Promise<Template[]> {
  const { data, error } = await supabase.from("templates").select("*").is("deleted_at", null).order("created_at", { ascending: false });
  if (error) throw error;
  return data as unknown as Template[];
}

export async function getTemplate(id: string): Promise<Template | null> {
  const { data, error } = await supabase.from("templates").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as Template | null;
}

const toRow = (v: TemplateValues) => ({
  name: v.name.trim(), category: v.category as Category, preview_image: v.preview_image.trim() || null,
  status: v.status, content: v.content as never,
});

export async function createTemplate(v: TemplateValues, type: "official" | "company", companyId: string | null) {
  const { data, error } = await supabase.from("templates").insert({ ...toRow(v), type, company_id: companyId }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function updateTemplate(id: string, v: TemplateValues) {
  const { error } = await supabase.from("templates").update(toRow(v)).eq("id", id);
  if (error) throw error;
}

export async function setTemplateStatus(id: string, status: Status) {
  const { error } = await supabase.from("templates").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function duplicateTemplate(t: Template) {
  const { data, error } = await supabase.from("templates").insert({
    name: `Cópia de ${t.name}`.slice(0, 150), category: t.category, preview_image: t.preview_image,
    content: cloneContent(t.content) as never, status: "active", type: t.type, company_id: t.company_id,
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

/** Server-side (DB function) independent copy of an official template into the caller's company. */
export async function useOfficialTemplate(id: string) {
  const { data, error } = await supabase.rpc("use_official_template", { _template_id: id });
  if (error) throw error;
  return data as string;
}

export const isTemplateId = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
