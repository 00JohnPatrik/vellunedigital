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
  wedding: {
    label: "Casamento — Romântico",
    build: () => ({
      version: 1,
      settings: { background: { color: "#fbf8f5", gradient: "linear-gradient(145deg, #fbf8f5 0%, #f1e5e4 52%, #fffdfb 100%)" } },
      blocks: [
        { ...newBlock("text"), x: 28, y: 42, width: 364, height: 34, zIndex: 2, props: { text: "PARA UM DIA INESQUECÍVEL", font: "sans", fontSize: "11", letterSpacing: "3.4", color: "#9d766f", align: "center", width: "full", textTransform: "uppercase" } },
        { ...newBlock("text"), x: 24, y: 96, width: 372, height: 108, zIndex: 3, props: { text: "Ana & Lucas", font: "display", fontSize: "48", letterSpacing: "-1", lineHeight: "1.05", color: "#3a2f31", align: "center", width: "full" } },
        { ...newBlock("divider"), x: 118, y: 226, width: 184, height: 18, zIndex: 4, props: { thickness: "1", width: "full", align: "center", style: "solid" } },
        { ...newBlock("text"), x: 36, y: 266, width: 348, height: 64, zIndex: 5, props: { text: "Com carinho, convidamos você para celebrar\neste novo capítulo conosco.", font: "sans", fontSize: "16", lineHeight: "1.5", color: "#625658", align: "center", width: "full" } },
        { ...newBlock("date"), x: 48, y: 360, width: 324, height: 60, zIndex: 6, props: { source: "event", date: "", format: "weekday", label: "DATA", align: "center" } },
        { ...newBlock("time"), x: 48, y: 432, width: 324, height: 60, zIndex: 7, props: { source: "event", time: "", format: "text", label: "HORÁRIO", align: "center" } },
        { ...newBlock("location"), x: 34, y: 510, width: 352, height: 108, zIndex: 8, props: { source: "event", show_name: "1", show_address: "1", show_city: "1", show_directions: "1", align: "center" } },
        { ...newBlock("rsvp"), x: 58, y: 652, width: 304, height: 92, zIndex: 9, props: { title: "Será uma alegria ter você conosco.", label: "Confirmar presença", preset: "pill", style: "solid", fontFamily: "sans", fontSize: "15", fontWeight: "600", textColor: "#ffffff", backgroundColor: "#8d6d69", borderColor: "#8d6d69", radius: "999", paddingX: "26", paddingY: "12", shadow: "soft", align: "center" } },
        { ...newBlock("text"), x: 36, y: 788, width: 348, height: 34, zIndex: 10, props: { text: "Com amor, Ana & Lucas", font: "display", fontSize: "19", color: "#8d6d69", align: "center", width: "full" } },
      ] as Block[],
    }),
  },
  birthday: {
    label: "Aniversário — Elegante",
    build: () => ({
      version: 1,
      settings: { background: { color: "#f4f0e8", gradient: "linear-gradient(180deg, #f4f0e8 0%, #e7dccb 100%)" } },
      blocks: [
        { ...newBlock("text"), x: 34, y: 42, width: 356, height: 30, zIndex: 2, props: { text: "VAMOS CELEBRAR", font: "sans", fontSize: "12", letterSpacing: "3", color: "#7c6a51", align: "center", textTransform: "uppercase", width: "full" } },
        { ...newBlock("shape"), x: 132, y: 100, width: 156, height: 156, zIndex: 1, props: { shape: "circle", fill: "solid", fillColor: "#cdb48f", borderWidth: "0", borderColor: "#cdb48f", borderRadius: "999", shadow: "soft" } },
        { ...newBlock("text"), x: 70, y: 118, width: 280, height: 94, zIndex: 3, props: { text: "40", font: "display", fontSize: "70", color: "#fffaf2", align: "center", width: "full", lineHeight: "1" } },
        { ...newBlock("text"), x: 28, y: 286, width: 364, height: 84, zIndex: 4, props: { text: "Mariana\nfaz 40!", font: "display", fontSize: "42", lineHeight: "1.02", letterSpacing: "-1", color: "#3e382f", align: "center", width: "full" } },
        { ...newBlock("text"), x: 44, y: 398, width: 332, height: 54, zIndex: 5, props: { text: "Uma noite especial merece pessoas especiais.", font: "sans", fontSize: "16", lineHeight: "1.45", color: "#6b6258", align: "center", width: "full" } },
        { ...newBlock("date"), x: 46, y: 470, width: 326, height: 60, zIndex: 6, props: { source: "event", format: "long", label: "DATA", align: "center" } },
        { ...newBlock("time"), x: 46, y: 540, width: 326, height: 60, zIndex: 7, props: { source: "event", format: "24h", label: "HORÁRIO", align: "center" } },
        { ...newBlock("location"), x: 36, y: 616, width: 344, height: 100, zIndex: 8, props: { source: "event", show_name: "1", show_address: "1", show_city: "1", show_directions: "1", align: "center" } },
        { ...newBlock("rsvp"), x: 56, y: 748, width: 308, height: 88, zIndex: 9, props: { title: "Reserve sua noite.", label: "Confirmar presença", preset: "pill", style: "solid", backgroundColor: "#6f624f", borderColor: "#6f624f", textColor: "#ffffff", radius: "999", paddingX: "26", paddingY: "12", shadow: "soft", align: "center" } },
      ] as Block[],
    }),
  },
  baby_shower: {
    label: "Chá de bebê — Delicado",
    build: () => ({
      version: 1,
      settings: { background: { color: "#f8f5f0", gradient: "linear-gradient(160deg, #f8f5f0 0%, #eef3f2 50%, #f9f8f5 100%)" } },
      blocks: [
        { ...newBlock("text"), x: 32, y: 46, width: 356, height: 28, zIndex: 2, props: { text: "CHÁ DE BEBÊ", font: "sans", fontSize: "12", letterSpacing: "3", color: "#7b8d89", align: "center", textTransform: "uppercase", width: "full" } },
        { ...newBlock("text"), x: 24, y: 102, width: 372, height: 112, zIndex: 3, props: { text: "Isabela", font: "display", fontSize: "54", letterSpacing: "-1", lineHeight: "1", color: "#445653", align: "center", width: "full" } },
        { ...newBlock("decoration"), x: 160, y: 236, width: 80, height: 42, zIndex: 4, props: { shape: "heart", borderColor: "#9ab0aa", borderWidth: "2", fill: "none" } },
        { ...newBlock("text"), x: 40, y: 302, width: 340, height: 70, zIndex: 5, props: { text: "Esperamos você para uma tarde\ncheia de carinho e descobertas.", font: "sans", fontSize: "17", lineHeight: "1.45", color: "#5f6e6a", align: "center", width: "full" } },
        { ...newBlock("date"), x: 46, y: 404, width: 326, height: 60, zIndex: 6, props: { source: "event", format: "weekday", label: "DATA", align: "center" } },
        { ...newBlock("time"), x: 46, y: 476, width: 326, height: 60, zIndex: 7, props: { source: "event", format: "text", label: "HORÁRIO", align: "center" } },
        { ...newBlock("location"), x: 34, y: 552, width: 352, height: 102, zIndex: 8, props: { source: "event", show_name: "1", show_address: "1", show_city: "1", show_directions: "1", align: "center" } },
        { ...newBlock("rsvp"), x: 58, y: 686, width: 304, height: 88, zIndex: 9, props: { title: "Sua presença fará parte desta memória.", label: "Confirmar presença", preset: "pill", style: "solid", backgroundColor: "#78918b", borderColor: "#78918b", textColor: "#ffffff", radius: "999", paddingX: "24", paddingY: "12", shadow: "soft", align: "center" } },
      ] as Block[],
    }),
  },
  quince: {
    label: "15 anos — Moderno",
    build: () => ({
      version: 1,
      settings: { background: { color: "#191722", gradient: "radial-gradient(circle at top, #3a3654 0%, #191722 60%, #101016 100%)" } },
      blocks: [
        { ...newBlock("text"), x: 36, y: 44, width: 348, height: 26, zIndex: 2, props: { text: "UMA NOITE PARA LEMBRAR", font: "sans", fontSize: "11", letterSpacing: "3", color: "#d8c9a8", align: "center", textTransform: "uppercase", width: "full" } },
        { ...newBlock("text"), x: 24, y: 90, width: 372, height: 54, zIndex: 3, props: { text: "SOFIA", font: "display", fontSize: "50", letterSpacing: "5", color: "#f4efe2", align: "center", width: "full" } },
        { ...newBlock("divider"), x: 128, y: 166, width: 164, height: 18, zIndex: 4, props: { thickness: "1", width: "full", align: "center", style: "solid" } },
        { ...newBlock("text"), x: 40, y: 218, width: 340, height: 80, zIndex: 5, props: { text: "Minha noite de 15 anos.\nVocê faz parte dela.", font: "sans", fontSize: "21", lineHeight: "1.35", color: "#e3dbca", align: "center", width: "full" } },
        { ...newBlock("countdown"), x: 42, y: 328, width: 336, height: 74, zIndex: 6, props: { source: "event", target: "", title: "FALTAM", align: "center" } },
        { ...newBlock("date"), x: 46, y: 430, width: 326, height: 58, zIndex: 7, props: { source: "event", format: "long", label: "DATA", align: "center" } },
        { ...newBlock("time"), x: 46, y: 500, width: 326, height: 58, zIndex: 8, props: { source: "event", format: "24h", label: "HORÁRIO", align: "center" } },
        { ...newBlock("location"), x: 34, y: 574, width: 352, height: 102, zIndex: 9, props: { source: "event", show_name: "1", show_address: "1", show_city: "1", show_directions: "1", align: "center" } },
        { ...newBlock("rsvp"), x: 58, y: 708, width: 304, height: 88, zIndex: 10, props: { title: "Confirme sua presença.", label: "Confirmar presença", preset: "pill", style: "outline", backgroundColor: "transparent", borderColor: "#d8c9a8", textColor: "#f4efe2", radius: "999", paddingX: "24", paddingY: "12", shadow: "none", align: "center" } },
      ] as Block[],
    }),
  },
  minimal: {
    label: "Minimal — Contemporâneo",
    build: () => ({
      version: 1,
      settings: { background: { color: "#faf9f7", gradient: "linear-gradient(180deg, #faf9f7 0%, #f0ebe4 100%)" } },
      blocks: [
        { ...newBlock("text"), x: 42, y: 44, width: 336, height: 28, zIndex: 2, props: { text: "UM DIA ESPECIAL", font: "sans", fontSize: "11", letterSpacing: "3.8", color: "#857a6f", align: "center", textTransform: "uppercase", width: "full" } },
        { ...newBlock("text"), x: 28, y: 94, width: 364, height: 118, zIndex: 3, props: { text: "Seu nome\naqui", font: "display", fontSize: "52", lineHeight: "1", letterSpacing: "-1.4", color: "#292522", align: "center", width: "full" } },
        { ...newBlock("divider"), x: 132, y: 230, width: 156, height: 14, zIndex: 4, props: { thickness: "1", width: "full", align: "center", style: "solid" } },
        { ...newBlock("text"), x: 42, y: 268, width: 336, height: 62, zIndex: 5, props: { text: "Um convite leve, elegante\ne feito para você.", font: "sans", fontSize: "16", lineHeight: "1.45", color: "#625a53", align: "center", width: "full" } },
        { ...newBlock("date"), x: 52, y: 358, width: 316, height: 58, zIndex: 6, props: { source: "event", format: "weekday", label: "DATA", align: "center" } },
        { ...newBlock("time"), x: 52, y: 428, width: 316, height: 58, zIndex: 7, props: { source: "event", format: "text", label: "HORÁRIO", align: "center" } },
        { ...newBlock("location"), x: 40, y: 502, width: 340, height: 102, zIndex: 8, props: { source: "event", show_name: "1", show_address: "1", show_city: "1", show_directions: "1", align: "center" } },
        { ...newBlock("rsvp"), x: 62, y: 644, width: 296, height: 86, zIndex: 9, props: { title: "Será um prazer ter você conosco.", label: "Confirmar presença", preset: "pill", style: "outline", backgroundColor: "transparent", borderColor: "#5f554c", borderWidth: "1", textColor: "#413a34", radius: "999", paddingX: "24", paddingY: "12", shadow: "none", align: "center" } },
      ] as Block[],
    }),
  },
  floral: {
    label: "Floral — Romântico",
    build: () => ({
      version: 1,
      settings: { background: { color: "#fbf7f5", gradient: "radial-gradient(circle at 20% 15%, #f4dfe0 0%, transparent 34%), radial-gradient(circle at 85% 80%, #e4dcef 0%, transparent 36%), linear-gradient(180deg, #fffafa 0%, #f3ecea 100%)" } },
      blocks: [
        { ...newBlock("shape"), x: 20, y: 22, width: 96, height: 96, zIndex: 1, props: { shape: "circle", fill: "solid", fillColor: "#ead2d3", borderWidth: "0", borderRadius: "999", shadow: "soft" } },
        { ...newBlock("shape"), x: 318, y: 690, width: 92, height: 92, zIndex: 1, props: { shape: "circle", fill: "solid", fillColor: "#dcd1ea", borderWidth: "0", borderRadius: "999", shadow: "soft" } },
        { ...newBlock("text"), x: 44, y: 72, width: 332, height: 28, zIndex: 3, props: { text: "COM CARINHO", font: "sans", fontSize: "11", letterSpacing: "3.2", color: "#977174", align: "center", textTransform: "uppercase", width: "full" } },
        { ...newBlock("text"), x: 24, y: 116, width: 372, height: 118, zIndex: 4, props: { text: "Celebre\ncom a gente", font: "display", fontSize: "47", lineHeight: "1.02", letterSpacing: "-1", color: "#493d42", align: "center", width: "full" } },
        { ...newBlock("decoration"), x: 166, y: 246, width: 98, height: 34, zIndex: 5, props: { shape: "heart", borderColor: "#b9878c", borderWidth: "2", fill: "none" } },
        { ...newBlock("text"), x: 46, y: 300, width: 328, height: 66, zIndex: 6, props: { text: "Uma celebração ganha outro sentido\nquando compartilhada.", font: "sans", fontSize: "16", lineHeight: "1.45", color: "#66585d", align: "center", width: "full" } },
        { ...newBlock("date"), x: 54, y: 398, width: 316, height: 58, zIndex: 7, props: { source: "event", format: "weekday", label: "DATA", align: "center" } },
        { ...newBlock("time"), x: 54, y: 468, width: 316, height: 58, zIndex: 8, props: { source: "event", format: "text", label: "HORÁRIO", align: "center" } },
        { ...newBlock("location"), x: 42, y: 542, width: 336, height: 104, zIndex: 9, props: { source: "event", show_name: "1", show_address: "1", show_city: "1", show_directions: "1", align: "center" } },
        { ...newBlock("rsvp"), x: 60, y: 678, width: 300, height: 90, zIndex: 10, props: { title: "Guarde esta data.", label: "Confirmar presença", preset: "pill", style: "solid", backgroundColor: "#8b686e", borderColor: "#8b686e", textColor: "#ffffff", radius: "999", paddingX: "24", paddingY: "12", shadow: "soft", align: "center" } },
      ] as Block[],
    }),
  },
  party: {
    label: "Festa — Noturno sofisticado",
    build: () => ({
      version: 1,
      settings: { background: { color: "#10131f", gradient: "radial-gradient(circle at 50% 0%, #31365e 0%, #10131f 58%, #080a10 100%)" } },
      blocks: [
        { ...newBlock("text"), x: 34, y: 46, width: 352, height: 28, zIndex: 2, props: { text: "UMA NOITE ESPECIAL", font: "sans", fontSize: "10", letterSpacing: "4", color: "#d6bf8a", align: "center", textTransform: "uppercase", width: "full" } },
        { ...newBlock("text"), x: 24, y: 98, width: 372, height: 72, zIndex: 3, props: { text: "Você está\nconvidado", font: "display", fontSize: "48", lineHeight: "1.02", color: "#f5efe4", align: "center", width: "full" } },
        { ...newBlock("divider"), x: 120, y: 190, width: 180, height: 16, zIndex: 4, props: { thickness: "1", width: "full", align: "center", style: "solid" } },
        { ...newBlock("text"), x: 42, y: 232, width: 336, height: 66, zIndex: 5, props: { text: "Vista-se para uma noite\nfeita para celebrar.", font: "sans", fontSize: "18", lineHeight: "1.35", color: "#ddd6c8", align: "center", width: "full" } },
        { ...newBlock("countdown"), x: 42, y: 330, width: 336, height: 78, zIndex: 6, props: { source: "event", title: "FALTAM", align: "center" } },
        { ...newBlock("date"), x: 48, y: 432, width: 324, height: 58, zIndex: 7, props: { source: "event", format: "long", label: "DATA", align: "center" } },
        { ...newBlock("time"), x: 48, y: 502, width: 324, height: 58, zIndex: 8, props: { source: "event", format: "24h", label: "HORÁRIO", align: "center" } },
        { ...newBlock("location"), x: 34, y: 576, width: 352, height: 104, zIndex: 9, props: { source: "event", show_name: "1", show_address: "1", show_city: "1", show_directions: "1", align: "center" } },
        { ...newBlock("rsvp"), x: 58, y: 712, width: 304, height: 90, zIndex: 10, props: { title: "Confirme e venha celebrar.", label: "Confirmar presença", preset: "pill", style: "outline", backgroundColor: "transparent", borderColor: "#d6bf8a", textColor: "#f5efe4", radius: "999", paddingX: "24", paddingY: "12", shadow: "none", align: "center" } },
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
