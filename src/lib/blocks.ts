import { BLOCKS, type Block, type BlockType, type TemplateContent } from "@/lib/templates";

/** Event data used by date/time/location/countdown blocks when their source is "event". */
export type EventCtx = {
  event_date?: string | null; event_time?: string | null; venue_name?: string | null;
  address?: string | null; city?: string | null; state?: string | null; publicUrl?: string | null;
};

export const isKnownType = (t: unknown): t is BlockType => typeof t === "string" && t in BLOCKS;

/** Validates the content before saving. Unknown types are never saved (and never silently removed). */
export function validateContent(c: unknown): string | null {
  const x = c as TemplateContent | null;
  if (!x || typeof x !== "object") return "Conteúdo ausente.";
  if (x.version !== 1) return "Versão do conteúdo inválida.";
  if (!Array.isArray(x.blocks)) return "Lista de blocos inválida.";
  const ids = new Set<string>();
  for (const b of x.blocks) {
    if (!b || typeof b.id !== "string" || !b.id) return "Há um bloco sem identificador.";
    if (ids.has(b.id)) return "Há blocos com identificador repetido.";
    ids.add(b.id);
    if (!isKnownType(b.type)) return `Bloco desconhecido ("${String(b.type)}"). Corrija ou exclua antes de salvar.`;
    if (b.props && typeof b.props !== "object") return "Propriedades de bloco inválidas.";
  }
  return null;
}

/** Normalizes loaded content without dropping anything (unknown blocks are kept for correction). */
export function normalizeBlocks(c: TemplateContent | null | undefined): Block[] {
  const list = Array.isArray(c?.blocks) ? c!.blocks : [];
  return structuredClone(list).map((b) => ({ ...b, id: typeof b?.id === "string" && b.id ? b.id : crypto.randomUUID(), props: b?.props && typeof b.props === "object" ? b.props : {} }));
}

export const FONTS = [
  { value: "display", label: "Elegante (padrão)", css: "var(--font-display, Georgia, serif)" },
  { value: "sans", label: "Moderna", css: "ui-sans-serif, system-ui, sans-serif" },
  { value: "serif", label: "Clássica", css: "Georgia, 'Times New Roman', serif" },
  { value: "script", label: "Manuscrita", css: "'Brush Script MT', 'Segoe Script', cursive" },
  { value: "mono", label: "Máquina de escrever", css: "'Courier New', ui-monospace, monospace" },
] as const;
export const fontCss = (f?: string) => FONTS.find((x) => x.value === f)?.css;

const MONTH_FMT = (d: Date, opts: Intl.DateTimeFormatOptions) => d.toLocaleDateString("pt-BR", opts);
export function formatDate(iso: string | null | undefined, format = "long") {
  if (!iso) return null;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  if (format === "short") return MONTH_FMT(d, { day: "2-digit", month: "2-digit", year: "numeric" });
  if (format === "weekday") return MONTH_FMT(d, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return MONTH_FMT(d, { day: "numeric", month: "long", year: "numeric" });
}
export function formatTime(t: string | null | undefined, format = "24h") {
  if (!t) return null;
  const [h, m] = t.slice(0, 5).split(":");
  if (!h) return null;
  return format === "text" ? `às ${Number(h)}h${m && m !== "00" ? m : ""}` : `${h}:${m ?? "00"}`;
}

/** Custom value wins when source is "custom"; otherwise the event value (falling back to the custom one). */
export const pick = (p: Record<string, string>, custom: string | undefined, event: string | null | undefined) =>
  p["source"] === "custom" ? custom || null : event || custom || null;
