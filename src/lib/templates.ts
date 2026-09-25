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

export type BlockType = "text" | "image" | "date" | "time" | "location" | "countdown" | "rsvp" | "whatsapp" | "button" | "qr_code" | "divider";
type Field = { key: string; label: string; input: "text" | "textarea" | "url" | "date" | "time" | "datetime-local" | "tel" };

/** Block catalogue: single source of truth for labels, fields and defaults (consumed by the future editor). */
export const BLOCKS: Record<BlockType, { label: string; fields: Field[]; defaults: Record<string, string> }> = {
  text: { label: "Texto", fields: [{ key: "text", label: "Texto", input: "textarea" }], defaults: { text: "Seu texto aqui" } },
  image: { label: "Imagem", fields: [{ key: "url", label: "URL da imagem", input: "url" }, { key: "alt", label: "Descrição", input: "text" }], defaults: { url: "", alt: "" } },
  date: { label: "Data", fields: [{ key: "date", label: "Data", input: "date" }], defaults: { date: "" } },
  time: { label: "Horário", fields: [{ key: "time", label: "Horário", input: "time" }], defaults: { time: "" } },
  location: { label: "Local", fields: [{ key: "name", label: "Nome do local", input: "text" }, { key: "address", label: "Endereço", input: "text" }], defaults: { name: "", address: "" } },
  countdown: { label: "Contagem regressiva", fields: [{ key: "target", label: "Data e hora", input: "datetime-local" }], defaults: { target: "" } },
  rsvp: { label: "Confirmação de presença", fields: [{ key: "label", label: "Texto do botão", input: "text" }], defaults: { label: "Confirmar presença" } },
  whatsapp: { label: "WhatsApp", fields: [{ key: "phone", label: "Telefone", input: "tel" }, { key: "message", label: "Mensagem", input: "text" }], defaults: { phone: "", message: "" } },
  button: { label: "Botão", fields: [{ key: "label", label: "Texto", input: "text" }, { key: "url", label: "Link", input: "url" }], defaults: { label: "Saiba mais", url: "" } },
  qr_code: { label: "QR Code", fields: [{ key: "value", label: "Conteúdo", input: "text" }], defaults: { value: "" } },
  divider: { label: "Divisor", fields: [], defaults: {} },
};

export type Block = { id: string; type: BlockType; props: Record<string, string> };
export type TemplateContent = { version: 1; blocks: Block[] };
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
  return { version: 1, blocks: (copy.blocks ?? []).map((b) => ({ ...b, id: crypto.randomUUID() })) };
}

export const templatesKey = ["templates"] as const;

export async function listTemplates(): Promise<Template[]> {
  const { data, error } = await supabase.from("templates").select("*").order("created_at", { ascending: false });
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
