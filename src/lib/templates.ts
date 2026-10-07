import { supabase } from "@/integrations/supabase/client";
import type { Status } from "@/components/admin-ui";
import type { EditorAnimation } from "@/lib/invitation-editor-animation";

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

export type BlockType = "text" | "image" | "gallery" | "date" | "time" | "location" | "countdown" | "rsvp" | "whatsapp" | "button" | "qr_code" | "divider" | "shape" | "decoration";

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
  shape: { label: "Forma", defaults: { shape: "rectangle", fill: "solid", fillColor: "#7c3aed", borderWidth: "0", borderStyle: "solid", borderColor: "#7c3aed", borderRadius: "12", shadow: "none" } },
  decoration: { label: "Decoração", defaults: { shape: "line", fill: "none", fillColor: "", borderWidth: "2", borderStyle: "solid", borderColor: "#7c3aed", borderRadius: "0", shadow: "none" } },
};

export type Block = {
  id: string;
  type: BlockType;
  props: Record<string, string>;
  /** Optional free-canvas layout values. Older blocks omit these fields and keep the flow layout. */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  zIndex?: number;
  scale?: number;
  opacity?: number;
  visibility?: boolean;
  hidden?: boolean;
  locked?: boolean;
  groupId?: string;
  animation?: EditorAnimation;
};

export const BLOCK_GEOMETRY_KEYS = ["x", "y", "width", "height", "rotation", "zIndex", "scale", "opacity"] as const;
export type BlockGeometryKey = (typeof BLOCK_GEOMETRY_KEYS)[number];
export type BlockGeometry = Pick<Block, BlockGeometryKey>;

const numericGeometryValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

/**
 * Única fonte de verdade para o tamanho inicial dos elementos do canvas.
 * Valores de apresentação (width/height em props como "full"/"wide") não são tratados como geometria.
 */
export const DEFAULT_BLOCK_GEOMETRY: Record<BlockType, { width: number; height: number }> = {
  text: { width: 360, height: 72 },
  image: { width: 300, height: 190 },
  gallery: { width: 300, height: 220 },
  date: { width: 280, height: 60 },
  time: { width: 280, height: 60 },
  location: { width: 320, height: 76 },
  countdown: { width: 340, height: 90 },
  rsvp: { width: 340, height: 250 },
  whatsapp: { width: 260, height: 56 },
  button: { width: 260, height: 56 },
  qr_code: { width: 160, height: 190 },
  divider: { width: 320, height: 24 },
  shape: { width: 180, height: 120 },
  decoration: { width: 280, height: 24 },
};

export type ResolvedBlockGeometry = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  scale: number;
  opacity: number;
};

/** Reads geometry from the canonical block fields while accepting older content that stored it in props. */
export function getBlockGeometry(block: Block): BlockGeometry {
  const result: BlockGeometry = {};
  for (const key of BLOCK_GEOMETRY_KEYS) {
    const value = numericGeometryValue(block[key]);
    const legacyValue = numericGeometryValue(block.props?.[key]);
    if (value !== undefined) result[key] = value;
    else if (legacyValue !== undefined) result[key] = legacyValue;
  }
  return result;
}

/**
 * Resolve a block into safe, render-ready geometry without mutating persistence.
 * Canvas zoom is intentionally not part of this calculation.
 */
export function resolveBlockGeometry(block: Block, index = 0): ResolvedBlockGeometry {
  const stored = getBlockGeometry(block);
  const fallback = DEFAULT_BLOCK_GEOMETRY[block.type] ?? { width: 300, height: 72 };
  return {
    x: Math.max(0, stored.x ?? 24),
    y: Math.max(0, stored.y ?? 24 + index * 96),
    width: Math.max(24, stored.width ?? fallback.width),
    height: Math.max(24, stored.height ?? fallback.height),
    rotation: stored.rotation ?? 0,
    zIndex: stored.zIndex ?? index + 1,
    scale: Math.max(0.1, stored.scale ?? 1),
    opacity: Math.min(1, Math.max(0, stored.opacity ?? 1)),
  };
}

/** Returns the canonical starting size without forcing a new block into free-canvas mode. */
export function getBlockDefaultSize(type: BlockType) {
  return DEFAULT_BLOCK_GEOMETRY[type] ?? { width: 300, height: 72 };
}

/** Returns the next available layer value, using the same resolver used by the canvas. */
export function getNextBlockZIndex(blocks: Block[]) {
  return Math.max(0, ...blocks.map((block, index) => resolveBlockGeometry(block, index).zIndex)) + 1;
}

/**
 * Move one block one layer up/down by swapping actual zIndex values.
 * Array order is not used as the visual stacking source of truth.
 */
export function moveBlockLayer(blocks: Block[], blockId: string, direction: -1 | 1) {
  const ranked = blocks
    .map((block, index) => ({ block, index, zIndex: resolveBlockGeometry(block, index).zIndex }))
    .sort((a, b) => a.zIndex - b.zIndex || a.index - b.index);
  const current = ranked.findIndex(({ block }) => block.id === blockId);
  const target = current + direction;
  if (current < 0 || target < 0 || target >= ranked.length) return blocks;

  const currentZ = ranked[current]!.zIndex;
  const targetZ = ranked[target]!.zIndex;
  return blocks.map((block) => {
    if (block.id === blockId) return { ...block, zIndex: targetZ };
    if (block.id === ranked[target]!.block.id) return { ...block, zIndex: currentZ };
    return block;
  });
}

/** Converts legacy geometry in props to canonical fields without removing the original props. */
export function normalizeBlockGeometry(block: Block): Block {
  return { ...block, ...getBlockGeometry(block) };
}
export type Background = { color?: string; gradient?: string; image?: string; size?: "cover" | "contain"; x?: "left" | "center" | "right"; y?: "top" | "center" | "bottom"; imageOffsetX?: number; imageOffsetY?: number; overlay?: number; overlayColor?: string; imageScale?: number; imageOpacity?: number };
export type TemplateContent = { version: 1; blocks: Block[]; settings?: { background?: Background } };
/** Builds content keeping `version`/`blocks` and adding `settings.background` only when set. */
export const buildContent = (blocks: Block[], bg: Background | undefined): TemplateContent => {
  const normalizedBlocks = blocks.map((block) => normalizeBlockGeometry(block));
  return bg && Object.values(bg).some((x) => x !== undefined && x !== "" && x !== 0)
    ? { version: 1, blocks: normalizedBlocks, settings: { background: bg } }
    : { version: 1, blocks: normalizedBlocks };
};
export type Template = {
  id: string; company_id: string | null; name: string; category: Category; type: "official" | "company";
  preview_image: string | null; content: TemplateContent; status: Status; created_at: string; updated_at: string;
};
export type TemplateValues = { name: string; category: Category | ""; preview_image: string; status: Status; content: TemplateContent };

export const newBlock = (type: BlockType): Block => ({ id: crypto.randomUUID(), type, props: { ...BLOCKS[type].defaults } });

export const STARTERS: Record<string, { label: string; build: () => TemplateContent }> = {
  editorial: {
    label: "Vellune Editorial — base profissional",
    build: () => ({
      version: 1,
      settings: {
        background: {
          color: "#f7f3ee",
          gradient: "linear-gradient(180deg, #f7f3ee 0%, #efe6dc 48%, #f8f5f1 100%)",
          overlay: 0,
          imageOpacity: 1,
        },
      },
      blocks: [
        {
          ...newBlock("text"),
          x: 32, y: 42, width: 356, height: 42, zIndex: 2,
          props: { text: "UM MOMENTO ESPECIAL", size: "sm", font: "sans", bold: "", align: "center", color: "#8a7664", width: "full", fontSize: "12", letterSpacing: "3.2", lineHeight: "1.2", textTransform: "uppercase" },
        },
        {
          ...newBlock("text"),
          x: 24, y: 94, width: 372, height: 116, zIndex: 3,
          props: { text: "Você está\nconvidado", size: "2xl", font: "display", bold: "", align: "center", color: "#2e2a27", width: "full", fontSize: "46", letterSpacing: "-1.2", lineHeight: "1.02" },
        },
        {
          ...newBlock("divider"),
          x: 108, y: 228, width: 204, height: 20, zIndex: 4,
          props: { thickness: "1", width: "full", align: "center", style: "solid" },
        },
        {
          ...newBlock("text"),
          x: 42, y: 266, width: 336, height: 62, zIndex: 5,
          props: { text: "Para celebrar um dia feito de detalhes,\nafeto e pessoas especiais.", size: "md", font: "sans", bold: "", align: "center", color: "#655b54", width: "full", fontSize: "17", letterSpacing: "0", lineHeight: "1.45" },
        },
        {
          ...newBlock("date"),
          x: 46, y: 356, width: 326, height: 66, zIndex: 6,
          props: { source: "event", date: "", format: "long", label: "DATA", align: "center" },
        },
        {
          ...newBlock("time"),
          x: 46, y: 436, width: 326, height: 66, zIndex: 7,
          props: { source: "event", time: "", format: "text", label: "HORÁRIO", align: "center" },
        },
        {
          ...newBlock("location"),
          x: 36, y: 520, width: 346, height: 112, zIndex: 8,
          props: { source: "event", name: "", address: "", show_name: "1", show_address: "1", show_city: "1", show_directions: "1", align: "center" },
        },
        {
          ...newBlock("rsvp"),
          x: 54, y: 666, width: 310, height: 94, zIndex: 9,
          props: {
            title: "Sua presença tornará este momento ainda mais especial.",
            label: "Confirmar presença",
            preset: "pill",
            style: "solid",
            fontFamily: "sans",
            fontSize: "15",
            fontWeight: "600",
            textTransform: "none",
            textColor: "#ffffff",
            backgroundColor: "#6f6258",
            borderColor: "#6f6258",
            radius: "999",
            paddingX: "28",
            paddingY: "12",
            shadow: "soft",
            width: "auto",
            align: "center",
          },
        },
        {
          ...newBlock("text"),
          x: 42, y: 804, width: 336, height: 34, zIndex: 10,
          props: { text: "Esperamos você.", size: "md", font: "display", bold: "", align: "center", color: "#6f6258", width: "full", fontSize: "19", lineHeight: "1.2" },
        },
      ] as Block[],
    }),
  },
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
