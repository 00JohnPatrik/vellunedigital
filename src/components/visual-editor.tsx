// @ts-nocheck
import { useCallback, useEffect, useRef, useState } from "react";
import { BackgroundLayers, BlockView } from "@/components/block-render";
import { VisualTransformCanvas } from "@/components/visual-transform-canvas";

import { BackgroundPropertiesPanel, ContextualPropertiesPanel } from "@/components/contextual-properties-panel";
import { BLOCKS, getBlockDefaultSize, getNextBlockZIndex, moveBlockLayer, newBlock, resolveBlockGeometry, type Block, type BlockType } from "@/lib/templates";
import { ElementsLibrary } from "@/components/elements-library";
import { TemplateGallery } from "@/components/template-gallery";
import { Grid3X3, Minus, Plus, Redo2, Undo2, PanelLeft, PanelRight, Sparkles } from "lucide-react";

function useIsCompact() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mql = window.matchMedia("(max-width: 1023px)");
    const on = () => setCompact(mql.matches);
    on(); mql.addEventListener("change", on);
    return () => mql.removeEventListener("change", on);
  }, []);
  return compact;
}

/* ---------------- History (local, session only) ---------------- */

type Hist = { past: Block[][]; present: Block[]; future: Block[][] };
const LIMIT = 100;

export type BlocksHistory = ReturnType<typeof useBlocksHistory>;

/** Undo/redo over the blocks array. Rapid edits with the same `group` (e.g. typing in one field) merge into one step. */
export function useBlocksHistory(initial: Block[]) {
  const [h, setH] = useState<Hist>(() => ({ past: [], present: structuredClone(initial), future: [] }));
  const last = useRef<{ group: string; at: number } | null>(null);
  const set = useCallback((next: Block[] | ((b: Block[]) => Block[]), group?: string) => {
    setH((s) => {
      const value = typeof next === "function" ? next(s.present) : next;
      if (value === s.present) return s;
      const snapshot = structuredClone(value);
      const now = Date.now();
      const merge = group && last.current?.group === group && now - last.current.at < 1000;
      last.current = group ? { group, at: now } : null;
      return merge
        ? { ...s, present: snapshot, future: [] }
        : { past: [...s.past, structuredClone(s.present)].slice(-LIMIT), present: snapshot, future: [] };
    });
  }, []);
  const undo = useCallback(() => {
    last.current = null;
    setH((s) => s.past.length
      ? { past: s.past.slice(0, -1), present: structuredClone(s.past[s.past.length - 1]!), future: [structuredClone(s.present), ...s.future] }
      : s);
  }, []);
  const redo = useCallback(() => {
    last.current = null;
    setH((s) => s.future.length
      ? { past: [...s.past, structuredClone(s.present)], present: structuredClone(s.future[0]!), future: s.future.slice(1) }
      : s);
  }, []);
  return { blocks: h.present, set, undo, redo, canUndo: h.past.length > 0, canRedo: h.future.length > 0 };
}

/* ---------------- Property controls ---------------- */

type Ctl =
  | { k: string; label: string; t: "text" | "textarea" | "url" | "tel" | "date" | "time" | "datetime-local" | "color" }
  | { k: string; label: string; t: "select"; options: [string, string][] }
  | { k: string; label: string; t: "switch" };

const ALIGN: Ctl = { k: "align", label: "Alinhamento", t: "select", options: [["left", "Esquerda"], ["center", "Centro"], ["right", "Direita"]] };
const WIDTH: Ctl = { k: "width", label: "Largura", t: "select", options: [["auto", "Automática"], ["partial", "Parcial"], ["full", "Total"]] };
const BTN_STYLE: Ctl = { k: "style", label: "Estilo", t: "select", options: [["solid", "Preenchido"], ["outline", "Contorno"], ["soft", "Suave"]] };
const SOURCE: Ctl = { k: "source", label: "Origem", t: "select", options: [["event", "Dados do evento"], ["custom", "Personalizado"]] };

const CONTROLS: Record<BlockType, Ctl[]> = {
  text: [
    { k: "text", label: "Conteúdo", t: "textarea" },
    { k: "size", label: "Tamanho", t: "select", options: [["sm", "Pequeno"], ["md", "Médio"], ["lg", "Grande"], ["xl", "Muito grande"], ["2xl", "Destaque"]] },
    { k: "font", label: "Fonte", t: "select", options: [] },
    { k: "bold", label: "Negrito", t: "switch" }, ALIGN, WIDTH, { k: "color", label: "Cor", t: "color" },
  ],
  image: [
    { k: "url", label: "URL da imagem", t: "url" }, { k: "alt", label: "Descrição", t: "text" },
    { k: "width", label: "Largura", t: "select", options: [["auto", "Pequena"], ["partial", "Parcial"], ["full", "Total"]] },
    { k: "height", label: "Altura", t: "select", options: [["auto", "Automática"], ["square", "Quadrada"], ["wide", "Paisagem"], ["portrait", "Retrato"]] },
    ALIGN, { k: "position", label: "Posição no bloco", t: "select", options: [["center", "Centro"], ["top", "Topo"], ["bottom", "Base"]] },
  ],
  gallery: [
    { k: "mode", label: "Modo", t: "select", options: [["grid", "Grade"], ["carousel", "Carrossel"]] },
    { k: "columns", label: "Colunas", t: "select", options: [["2", "2 colunas"], ["3", "3 colunas"], ["4", "4 colunas"]] },
    { k: "height", label: "Formato", t: "select", options: [["square", "Quadrado"], ["wide", "Paisagem"], ["portrait", "Retrato"]] },
    { k: "captions", label: "Mostrar legendas", t: "switch" }, ALIGN,
  ],
  date: [SOURCE, { k: "date", label: "Data personalizada", t: "date" }, { k: "format", label: "Formato", t: "select", options: [["long", "15 de outubro de 2026"], ["weekday", "Com dia da semana"], ["short", "15/10/2026"]] }, { k: "label", label: "Título (opcional)", t: "text" }, ALIGN],
  time: [SOURCE, { k: "time", label: "Horário personalizado", t: "time" }, { k: "format", label: "Formato", t: "select", options: [["24h", "19:30"], ["text", "às 19h30"]] }, { k: "label", label: "Título (opcional)", t: "text" }, ALIGN],
  location: [
    SOURCE, { k: "name", label: "Nome do local (personalizado)", t: "text" }, { k: "address", label: "Endereço (personalizado)", t: "text" },
    { k: "show_name", label: "Mostrar nome", t: "switch" }, { k: "show_address", label: "Mostrar endereço", t: "switch" },
    { k: "show_city", label: "Mostrar cidade/UF", t: "switch" }, { k: "show_directions", label: "Botão \"Como chegar\"", t: "switch" }, ALIGN,
  ],
  countdown: [SOURCE, { k: "target", label: "Data e hora personalizadas", t: "datetime-local" }, { k: "title", label: "Título", t: "text" }, ALIGN],
  shape: [
    { k: "shape", label: "Forma", t: "select", options: [["rectangle", "Retângulo"], ["circle", "Círculo"], ["triangle", "Triângulo"], ["star", "Estrela"], ["heart", "Coração"]] },
    { k: "fill", label: "Preenchimento", t: "select", options: [["none", "Nenhum"], ["solid", "Sólido"], ["gradient", "Gradiente"]] },
    { k: "fillColor", label: "Cor", t: "color" },
    { k: "borderColor", label: "Cor da borda", t: "color" },
    { k: "borderWidth", label: "Espessura da borda", t: "text" },
  ],
  decoration: [
    { k: "shape", label: "Decoração", t: "select", options: [["line", "Linha"], ["circle", "Círculo"], ["star", "Estrela"], ["heart", "Coração"]] },
    { k: "borderColor", label: "Cor", t: "color" },
    { k: "borderWidth", label: "Espessura", t: "text" },
  ],
  rsvp: [{ k: "title", label: "Texto acima do botão", t: "text" }, { k: "label", label: "Texto do botão", t: "text" }, { k: "preset", label: "Preset visual", t: "select", options: [["classic", "Clássico"], ["pill", "Pílula"], ["minimal", "Minimalista"], ["square", "Quadrado"]] }, BTN_STYLE, { k: "fontFamily", label: "Fonte", t: "text" }, { k: "fontSize", label: "Tamanho da fonte", t: "text" }, { k: "fontWeight", label: "Peso da fonte", t: "select", options: [["400", "Regular"], ["500", "Médio"], ["600", "Semibold"], ["700", "Negrito"]] }, { k: "textTransform", label: "Texto", t: "select", options: [["none", "Normal"], ["uppercase", "Maiúsculas"], ["capitalize", "Inicial maiúscula"]] }, { k: "textColor", label: "Cor do texto", t: "color" }, { k: "backgroundColor", label: "Cor do botão", t: "color" }, { k: "borderColor", label: "Cor da borda", t: "color" }, { k: "radius", label: "Raio dos cantos", t: "text" }, { k: "paddingX", label: "Espaçamento horizontal", t: "text" }, { k: "paddingY", label: "Espaçamento vertical", t: "text" }, { k: "shadow", label: "Sombra", t: "select", options: [["none", "Nenhuma"], ["soft", "Suave"], ["strong", "Intensa"]] }, WIDTH, ALIGN],
  whatsapp: [{ k: "label", label: "Texto do botão", t: "text" }, { k: "phone", label: "Telefone", t: "tel" }, { k: "message", label: "Mensagem", t: "text" }, BTN_STYLE, WIDTH, ALIGN],
  button: [{ k: "label", label: "Texto", t: "text" }, { k: "url", label: "Link (https://...)", t: "url" }, { k: "preset", label: "Preset visual", t: "select", options: [["classic", "Clássico"], ["pill", "Pílula"], ["minimal", "Minimalista"], ["square", "Quadrado"]] }, BTN_STYLE, { k: "fontFamily", label: "Fonte", t: "text" }, { k: "fontSize", label: "Tamanho da fonte", t: "text" }, { k: "fontWeight", label: "Peso da fonte", t: "select", options: [["400", "Regular"], ["500", "Médio"], ["600", "Semibold"], ["700", "Negrito"]] }, { k: "textTransform", label: "Texto", t: "select", options: [["none", "Normal"], ["uppercase", "Maiúsculas"], ["capitalize", "Inicial maiúscula"]] }, { k: "textColor", label: "Cor do texto", t: "color" }, { k: "backgroundColor", label: "Cor do botão", t: "color" }, { k: "borderColor", label: "Cor da borda", t: "color" }, { k: "radius", label: "Raio dos cantos", t: "text" }, { k: "paddingX", label: "Espaçamento horizontal", t: "text" }, { k: "paddingY", label: "Espaçamento vertical", t: "text" }, { k: "shadow", label: "Sombra", t: "select", options: [["none", "Nenhuma"], ["soft", "Suave"], ["strong", "Intensa"]] }, WIDTH, ALIGN],
  qr_code: [{ k: "value", label: "Conteúdo (vazio = link do convite)", t: "text" }, { k: "size", label: "Tamanho", t: "select", options: [["sm", "Pequeno"], ["md", "Médio"], ["lg", "Grande"], ["xl", "Extra grande"]] }, { k: "foregroundColor", label: "Cor do código", t: "color" }, { k: "backgroundColor", label: "Cor do fundo", t: "color" }, { k: "padding", label: "Espaçamento interno", t: "text" }, { k: "radius", label: "Raio dos cantos", t: "text" }, { k: "shadow", label: "Sombra", t: "select", options: [["none", "Nenhuma"], ["soft", "Suave"], ["strong", "Intensa"]] }, { k: "caption", label: "Legenda", t: "text" }, ALIGN],
  divider: [
    { k: "thickness", label: "Espessura", t: "select", options: [["1", "Fina"], ["2", "Média"], ["4", "Grossa"]] },
    { k: "width", label: "Largura", t: "select", options: [["auto", "Curta"], ["partial", "Parcial"], ["full", "Total"]] },
    { k: "style", label: "Estilo", t: "select", options: [["solid", "Contínuo"], ["dashed", "Tracejado"], ["dotted", "Pontilhado"]] }, ALIGN,
  ],
};

const SWITCH_DEFAULT_ON = new Set(["show_name", "show_address", "show_city", "show_directions"]);

export const BLOCK_ICONS: Record<string, unknown> = {};

const blockLabel = (b: Block) => (isKnownType(b.type) ? BLOCKS[b.type].label : `Desconhecido (${String(b.type)})`);

/* ---------------- Editor ---------------- */

type Device = "mobile" | "tablet" | "desktop";
const DEVICE_W: Record<Device, string> = { mobile: "max-w-[390px]", tablet: "max-w-[768px]", desktop: "max-w-[1024px]" };

const EDITOR_CATEGORIES: Record<string, BlockType[]> = {
  Elementos: ["date", "time", "location", "countdown", "divider"],
  Texto: ["text"],
  Imagens: ["image", "gallery"],
  Botões: ["button", "whatsapp"],
  RSVP: ["rsvp"],
  "QR Code": ["qr_code"],
  Camadas: [],
  Fundo: [],
  Exibir: [],
};

const RSVP_DUP = "Este convite já possui confirmação de presença.";
const GRID_UNIT = 16;
type EditorPointer = { clientX: number; clientY: number };

export type EditorPoint = { x: number; y: number };

export function VisualEditor({ h, ctx, assets, bg, onBg }: { h: BlocksHistory; ctx?: unknown; assets?: unknown; bg?: unknown; onBg?: (value: any) => void }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [contextPanel, setContextPanel] = useState<"elements" | "layers" | "background" | "view" | null>("elements");
  const [mobileSheet, setMobileSheet] = useState<"elements" | "layers" | "properties" | "background" | "view" | null>(null);
  const [toolCategory, setToolCategory] = useState("Elementos");
  const [templateOpen, setTemplateOpen] = useState(false);
  const compact = useIsCompact();
  const [marquee, setMarquee] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const interaction = useRef<{ mode: "drag" | "resize" | "marquee" | "background"; id?: string; startX: number; startY: number; originX?: number; originY?: number; originWidth?: number; originHeight?: number; selected?: string[] } | null>(null);
  const clipboard = useRef<any[]>([]);
  const blocks = Array.isArray(h?.blocks) ? h.blocks : [];
  const selected = blocks.filter((block: any) => selectedIds.includes(block.id));
  const editorCategories = EDITOR_CATEGORIES;
  const categoryGroups = editorCategories;
  const applyStarterTemplate = (content: any) => {
    h.set(structuredClone(content.blocks ?? []), "template:apply");
    onBg?.(structuredClone(content.settings?.background ?? {}));
    setSelectedIds([]);
    setContextPanel("elements");
    setToolCategory("Elementos");
  };
  const addBlockByType = (type: BlockType) => {
    if (type === "rsvp" && blocks.some((block: any) => block.type === "rsvp")) {
      window.alert(RSVP_DUP);
      return;
    }
    const block = newBlock(type);
    const size = getBlockDefaultSize(type);
    const lastY = blocks.reduce((maxY: number, item: any, index: number) => {
      const pos = getPosition(item, index);
      const itemSize = getSize(item, index);
      return Math.max(maxY, pos.y + itemSize.height);
    }, 24);
    block.x = 24;
    block.y = Math.min(Math.max(24, lastY + 24), 1200);
    block.width = size.width;
    block.height = size.height;
    block.zIndex = getNextBlockZIndex(blocks);
    if (type === "text") {
      const textCount = blocks.filter((current: any) => current.type === "text").length;
      const textPresets = ["Título", "Subtítulo", "Texto"];
      block.props = { ...(block.props || {}), text: textPresets[Math.min(textCount, textPresets.length - 1)] };
    }
    h.set((current) => [...current, block]);
    setSelectedIds([block.id]);
  };
  const duplicateByIds = (ids: string[]) => {
    if (!ids.length) return;
    const copies = blocks.filter((block: any) => ids.includes(block.id)).map((block: any) => ({
      ...structuredClone(block),
      id: crypto.randomUUID(),
      x: typeof block.x === "number" ? block.x + 24 : block.x,
      y: typeof block.y === "number" ? block.y + 24 : block.y,
      props: { ...(block.props || {}) },
    }));
    h.set((current) => [...current, ...copies]);
    setSelectedIds(copies.map((block: any) => block.id));
  };
  const removeByIds = (ids: string[]) => {
    if (!ids.length) return;
    h.set((current) => current.filter((block: any) => !ids.includes(block.id)));
    setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
  };

  // Geometry is resolved exclusively through the canonical resolver used by the
  // interactive canvas and the read-only invitation renderer. This prevents the
  // editor's placement/height calculations from disagreeing with what is rendered.
  const getPosition = (block: any, index: number) => {
    const resolved = resolveBlockGeometry(block as Block, index);
    return { x: resolved.x, y: resolved.y };
  };
  const getSize = (block: any, index = 0) => {
    const resolved = resolveBlockGeometry(block as Block, index);
    return { width: resolved.width, height: resolved.height };
  };
  const getBlockLabel = (block: any) => {
    const props = block.props ?? {};
    if (block.type === "text") return props.text || "Texto";
    if (block.type === "image") return props.url ? "Imagem" : "Imagem sem endereço";
    if (block.type === "date") return "Data do evento";
    if (block.type === "time") return "Horário do evento";
    if (block.type === "location") return "Local do evento";
    if (block.type === "countdown") return props.title || "Contagem regressiva";
    if (block.type === "rsvp") return props.label || "Confirmar presença";
    if (block.type === "whatsapp") return props.label || "Fale pelo WhatsApp";
    if (block.type === "button") return props.label || "Botão";
    return BLOCKS[block.type as BlockType]?.label ?? String(block.type || "Bloco");
  };
  const canvasPoint = (event: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return rect ? { x: (event.clientX - rect.left) / (zoom / 100), y: (event.clientY - rect.top) / (zoom / 100) } : { x: 0, y: 0 };
  };
  const select = (id: string, additive: boolean) => setSelectedIds((current) => additive ? current.includes(id) ? current.filter((item) => item !== id) : [...current, id] : [id]);
  const startDrag = (event: React.PointerEvent<HTMLDivElement>, block: any, index: number) => {
    if (block.locked) return;
    const additive = event.shiftKey || event.ctrlKey || event.metaKey;
    const activeIds = selectedIds.includes(block.id) && !additive ? selectedIds : additive ? (selectedIds.includes(block.id) ? selectedIds : [...selectedIds, block.id]) : [block.id];
    const point = canvasPoint(event);
    const position = getPosition(block, index);
    select(block.id, additive);
    interaction.current = {
      mode: "drag",
      id: block.id,
      startX: point.x,
      startY: point.y,
      originX: position.x,
      originY: position.y,
      selected: activeIds,
    };
    event.currentTarget.setPointerCapture(event.pointerId); event.stopPropagation(); event.preventDefault();
  };
  const startResize = (event: React.PointerEvent<HTMLButtonElement>, block: any, index: number) => {
    if (block.locked || block.visibility === false || block.hidden) return;
    const point = canvasPoint(event); const position = getPosition(block, index); const size = getSize(block, index);
    interaction.current = {
      mode: "resize",
      id: block.id,
      startX: point.x,
      startY: point.y,
      originX: position.x,
      originY: position.y,
      originWidth: size.width,
      originHeight: size.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId); event.stopPropagation(); event.preventDefault();
  };
  const moveInteraction = (event: React.PointerEvent<HTMLDivElement>) => {
    const current = interaction.current; if (!current) return;
    const point = canvasPoint(event);
    if (current.mode === "marquee") {
      setMarquee({ x: Math.min(current.startX, point.x), y: Math.min(current.startY, point.y), width: Math.abs(point.x - current.startX), height: Math.abs(point.y - current.startY) }); return;
    }
    const dx = point.x - current.startX; const dy = point.y - current.startY;
    if (current.mode === "background") {
      onBg?.({
        ...((bg as any) || {}),
        imageOffsetX: Math.round((current.originX ?? 0) + dx),
        imageOffsetY: Math.round((current.originY ?? 0) + dy),
      });
      return;
    }
    if (current.mode === "resize" && current.id) {
      const originWidth = current.originWidth ?? 320;
      const originHeight = current.originHeight ?? 92;
      let width = Math.max(120, Math.round(originWidth + dx));
      let height = Math.max(56, Math.round(originHeight + dy));
      if (event.shiftKey) {
        const ratio = originWidth / Math.max(1, originHeight);
        if (Math.abs(dx) >= Math.abs(dy)) height = Math.max(56, Math.round(width / ratio));
        else width = Math.max(120, Math.round(height * ratio));
      }
      h.set((items) => items.map((item: any) => item.id === current.id && !item.locked
        ? { ...item, x: current.originX, y: current.originY, width, height }
        : item), `resize:${current.id}`);
      return;
    }
    if (current.mode === "drag" && current.id) {
      const snap = event.shiftKey ? GRID_UNIT : 1;
      const x = Math.max(0, Math.round(((current.originX ?? 0) + dx) / snap) * snap);
      const y = Math.max(0, Math.round(((current.originY ?? 0) + dy) / snap) * snap);
      const movingIds = current.selected?.length ? current.selected : [current.id];
      const originBlock = blocks.find((item: any) => item.id === current.id);
      const originPosition = originBlock ? getPosition(originBlock, blocks.indexOf(originBlock)) : { x: 24, y: 24 };
      const deltaX = x - originPosition.x;
      const deltaY = y - originPosition.y;
      h.set((items) => items.map((item: any) => {
        if (!movingIds.includes(item.id) || item.locked) return item;
        const itemPosition = getPosition(item, items.indexOf(item));
        return {
          ...item,
          x: Math.max(0, Math.round((itemPosition.x + deltaX) / snap) * snap),
          y: Math.max(0, Math.round((itemPosition.y + deltaY) / snap) * snap),
        };
      }), `drag:${movingIds.join(",")}`);
    }
  };
  const startBackgroundDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!bg || !(bg as any).image) return;
    const point = canvasPoint(event);
    interaction.current = {
      mode: "background",
      startX: point.x,
      startY: point.y,
      originX: Number((bg as any).imageOffsetX) || 0,
      originY: Number((bg as any).imageOffsetY) || 0,
    };
    setContextPanel("background");
    setMobileSheet(compact ? "background" : mobileSheet);
    event.currentTarget.setPointerCapture(event.pointerId);
    event.stopPropagation();
    event.preventDefault();
  };
  const stopInteraction = () => {
    const current = interaction.current;
    if (current?.mode === "marquee" && marquee) {
      const next = blocks.filter((block: any, index: number) => { const p = getPosition(block, index); const s = getSize(block, index); return p.x < marquee.x + marquee.width && p.x + s.width > marquee.x && p.y < marquee.y + marquee.height && p.y + s.height > marquee.y; }).map((block: any) => block.id);
      setSelectedIds(next);
    }
    interaction.current = null; setMarquee(null);
  };
  const addElement = (type: BlockType) => {
    const block = newBlock(type);
    const size = getBlockDefaultSize(type);
    h.set((items) => {
      const y = Math.min(1200, Math.max(24, ...items.map((item: any, index: number) => getPosition(item, index).y + getSize(item, index).height + 24)));
      return [...items, { ...block, x: 32, y, width: size.width, height: size.height, zIndex: getNextBlockZIndex(items) }];
    });
    setSelectedIds([block.id]);
  };
  const duplicate = () => { if (!selected.length) return; const copies = selected.filter((block: any) => block.type !== "rsvp" || !blocks.some((item: any) => item.type === "rsvp" && !selectedIds.includes(item.id))).map((block: any) => ({ ...structuredClone(block), id: crypto.randomUUID(), x: (block.x ?? 24) + 24, y: (block.y ?? 24) + 24 })); h.set((items) => [...items, ...copies]); setSelectedIds(copies.map((block: any) => block.id)); };
  const remove = () => { if (!selected.length) return; h.set((items) => items.filter((block: any) => !selectedIds.includes(block.id) || block.locked)); setSelectedIds([]); };
  const rotate = (amount: number) => h.set((items) => items.map((block: any) => selectedIds.includes(block.id) && !block.locked ? { ...block, rotation: (block.rotation ?? 0) + amount } : block), "selection:rotation");
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable=true], [role=combobox]")) return;
      const command = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      if (command && key === "z") { event.preventDefault(); event.shiftKey ? h.redo() : h.undo(); }
      else if (command && key === "y") { event.preventDefault(); h.redo(); }
      else if (command && key === "c" && selectedIds.length) { event.preventDefault(); clipboard.current = blocks.filter((block: any) => selectedIds.includes(block.id)).map((block: any) => structuredClone(block)); }
      else if (command && key === "v" && clipboard.current.length) {
        event.preventDefault();
        const pasted = clipboard.current.map((block: any, index: number) => ({ ...structuredClone(block), id: crypto.randomUUID(), x: (block.x ?? 24) + 24 + index * 8, y: (block.y ?? 24) + 24 + index * 8 }));
        h.set((items) => [...items, ...pasted]);
        setSelectedIds(pasted.map((block: any) => block.id));
      }
      else if (event.key === "Delete" || event.key === "Backspace") { if (selectedIds.length) { event.preventDefault(); remove(); } }
      else if (command && key === "d") { event.preventDefault(); duplicate(); }
      else if (event.key === "Escape") setSelectedIds([]);
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [selectedIds, blocks, h]);
  const canvasHeight = Math.max(640, ...blocks.map((block: any, index: number) => getPosition(block, index).y + getSize(block, index).height + 32));
  const updateSelectedBlock = (patch: Record<string, unknown>) => {
    if (!selected.length) return;
    h.set((items) => items.map((item: any) => selectedIds.includes(item.id) ? { ...item, ...patch } : item), "selection:properties");
  };
  const updateSelectedProp = (key: string, value: string) => {
    if (!selected.length) return;
    h.set((items) => items.map((item: any) => selectedIds.includes(item.id) ? { ...item, props: { ...(item.props ?? {}), [key]: value } } : item), "selection:properties");
  };
  return (
    <div className="flex min-h-[680px] flex-col overflow-hidden rounded-2xl border border-border/70 bg-background shadow-2xl shadow-black/10">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 bg-card/95 px-3 py-2.5" role="toolbar" aria-label="Barra principal do editor">
        <div className="flex min-w-0 items-center gap-2">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground sm:text-sm">Editor visual</p>
            <p className="hidden text-[10px] text-muted-foreground sm:block">Crie, organize e refine o convite diretamente no canvas.</p>
          </div>
          <span className="hidden rounded-full border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-medium text-primary sm:inline-flex">{selectedIds.length ? `${selectedIds.length} selecionado(s)` : `${blocks.length} elemento(s)`}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button type="button" aria-label="Desfazer" title="Desfazer (Ctrl/Cmd+Z)" disabled={!h.canUndo} onClick={h.undo} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"><Undo2 className="h-3.5 w-3.5" /></button>
          <button type="button" aria-label="Refazer" title="Refazer (Ctrl/Cmd+Shift+Z)" disabled={!h.canRedo} onClick={h.redo} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"><Redo2 className="h-3.5 w-3.5" /></button>
          <span className="mx-0.5 h-5 w-px bg-border/70" />
          <button type="button" aria-label="Diminuir zoom" title="Diminuir zoom" onClick={() => setZoom((value) => Math.max(50, value - 10))} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 text-muted-foreground transition hover:bg-accent hover:text-foreground"><Minus className="h-3.5 w-3.5" /></button>
          <span className="min-w-12 text-center text-[11px] font-medium tabular-nums text-foreground">{zoom}%</span>
          <button type="button" aria-label="Aumentar zoom" title="Aumentar zoom" onClick={() => setZoom((value) => Math.min(150, value + 10))} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 text-muted-foreground transition hover:bg-accent hover:text-foreground"><Plus className="h-3.5 w-3.5" /></button>
          <button type="button" aria-pressed={showGrid} title={showGrid ? "Ocultar guias" : "Mostrar guias"} onClick={() => setShowGrid((value) => !value)} className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11px] transition ${showGrid ? "border-primary/25 bg-primary/10 text-primary" : "border-border/70 text-muted-foreground hover:bg-accent hover:text-foreground"}`}><Grid3X3 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Guias</span></button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="hidden w-[236px] shrink-0 flex-col border-r border-border/70 bg-card/95 lg:flex" aria-label="Ferramentas do editor">
          <div className="border-b border-border/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Ferramentas</p>
                <p className="mt-1 text-xs text-muted-foreground">Adicione e organize o convite.</p>
              </div>
              <button type="button" onClick={() => setTemplateOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 text-[11px] font-medium text-primary transition hover:bg-primary/15" aria-label="Abrir modelos">
                <Sparkles className="h-3.5 w-3.5" />Modelos
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 border-b border-border/70 p-3">
            {(["text", "image", "gallery", "date", "time", "location", "button", "divider", "shape", "decoration"] as BlockType[]).map((type) => (
              <button key={type} type="button" className="rounded-lg border border-border/70 bg-background px-2 py-2 text-left text-[11px] text-muted-foreground transition hover:border-primary/50 hover:bg-primary/5 hover:text-foreground" onClick={() => addElement(type)}>
                + {BLOCKS[type].label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 border-b border-border/70 p-2">
            {[['elements', 'Elementos'], ['layers', 'Camadas'], ['background', 'Fundo'], ['view', 'Exibir']].map(([key, label]) => (
              <button key={key} type="button" onClick={() => setContextPanel(key as any)} className={`flex-1 rounded-md px-1 py-2 text-[10px] ${contextPanel === key ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {contextPanel === "elements" && <div className="space-y-3"><div><p className="text-xs font-medium text-foreground">Adicionar elemento</p><p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Escolha um bloco para inserir no canvas. Os elementos existentes continuam editáveis diretamente.</p></div><div className="grid grid-cols-1 gap-1.5">{(Object.keys(BLOCKS) as BlockType[]).map((type) => <button key={type} type="button" onClick={() => addElement(type)} className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2 text-left text-xs text-foreground transition hover:border-primary/50 hover:bg-primary/5"><span>{BLOCKS[type].label}</span><span className="text-primary">+</span></button>)}</div></div>}
            {contextPanel === "layers" && <div className="space-y-2"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-medium text-foreground">Camadas</p><span className="text-[10px] text-muted-foreground">{blocks.length} elemento(s)</span></div>{blocks.slice().reverse().map((block: any, reverseIndex: number) => { const index = blocks.length - reverseIndex - 1; const selectedLayer = selectedIds.includes(block.id); const moveLayer = (direction: number) => h.set((items) => moveBlockLayer(items, block.id, direction as -1 | 1), "layers:reorder"); const toggleLayer = (key: "hidden" | "locked") => h.set((items) => items.map((item: any) => item.id === block.id ? { ...item, [key]: !item[key], ...(key === "hidden" ? { visibility: item[key] } : {}) } : item), `layers:${key}`); return <div key={block.id} className={`rounded-lg border px-2 py-2 transition ${selectedLayer ? "border-primary bg-primary/10" : "border-border/70"}`}><div className="flex items-center gap-2"><button type="button" onClick={() => select(block.id, false)} className="min-w-0 flex-1 truncate text-left text-xs text-foreground"><span className="mr-1.5 text-[10px] text-muted-foreground">{index + 1}</span>{getBlockLabel(block)}</button><button type="button" aria-label={block.hidden ? "Mostrar camada" : "Ocultar camada"} onClick={() => toggleLayer("hidden")} className={`rounded px-1.5 py-1 text-[10px] ${block.hidden ? "bg-muted text-muted-foreground" : "text-foreground hover:bg-muted"}`}>{block.hidden ? "○" : "●"}</button><button type="button" aria-label={block.locked ? "Desbloquear camada" : "Bloquear camada"} onClick={() => toggleLayer("locked")} className={`rounded px-1.5 py-1 text-[10px] ${block.locked ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>{block.locked ? "🔒" : "🔓"}</button></div><div className="mt-1.5 flex items-center justify-end gap-1"><button type="button" disabled={index === blocks.length - 1} onClick={() => moveLayer(1)} className="rounded border px-1.5 py-1 text-[10px] disabled:cursor-not-allowed disabled:opacity-40">↑</button><button type="button" disabled={index === 0} onClick={() => moveLayer(-1)} className="rounded border px-1.5 py-1 text-[10px] disabled:cursor-not-allowed disabled:opacity-40">↓</button><button type="button" onClick={() => { select(block.id, false); duplicate(); }} className="rounded border px-1.5 py-1 text-[10px]">Duplicar</button><button type="button" onClick={() => { select(block.id, false); remove(); }} className="rounded border border-destructive/30 px-1.5 py-1 text-[10px] text-destructive">Excluir</button></div></div>; })}{blocks.length === 0 && <p className="rounded-lg border border-dashed p-4 text-center text-[11px] text-muted-foreground">Nenhuma camada adicionada.</p>}</div>}
            {contextPanel === "background" && <BackgroundPropertiesPanel background={(bg as Record<string, unknown>) || {}} assets={assets as any} onChange={(value) => onBg?.(value)} />}{contextPanel === "view" && <div className="space-y-3"><p className="text-xs font-medium text-foreground">Exibição</p><div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2 text-xs"><span>Guias</span><button type="button" onClick={() => setShowGrid((value) => !value)} className={`rounded-md px-2 py-1 ${showGrid ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{showGrid ? "Ativas" : "Desativadas"}</button></div><div className="flex items-center gap-2"><button type="button" onClick={() => setZoom((value) => Math.max(50, value - 10))} className="h-8 w-8 rounded-md border">−</button><span className="flex-1 text-center text-xs">{zoom}%</span><button type="button" onClick={() => setZoom((value) => Math.min(150, value + 10))} className="h-8 w-8 rounded-md border">+</button></div></div>}
          </div>
        </aside>
        <main className="relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-primary/10 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.1),transparent_36%),linear-gradient(145deg,hsl(var(--muted)/.5),hsl(var(--background)/.9))] p-2 shadow-inner sm:p-4 lg:p-5">
          <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-primary/15 bg-card/85 px-3 py-2.5 shadow-lg shadow-black/10 backdrop-blur-xl lg:hidden"><div className="flex min-w-0 items-center gap-2"><div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Sparkles className="h-3.5 w-3.5" /></div><div className="min-w-0"><p className="truncate text-xs font-semibold">Editor visual</p><p className="truncate text-[10px] text-muted-foreground">Composição livre e responsiva</p></div></div><span className="rounded-md bg-muted/70 px-2 py-1 text-xs font-medium text-muted-foreground">{zoom}%</span></div>
          <div className="h-full overflow-auto rounded-2xl border border-primary/10 bg-background/35 p-2 shadow-inner sm:p-4 lg:p-6"><div className="mx-auto origin-top transition-transform" style={{ width: `${100 / (zoom / 100)}%`, minHeight: canvasHeight / (zoom / 100) }}><div ref={canvasRef} className={`relative isolate mx-auto w-full max-w-[768px] overflow-hidden rounded-2xl border bg-card shadow-sm ${showGrid ? "[background-image:linear-gradient(to_right,hsl(var(--border)/.25)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/.25)_1px,transparent_1px)] [background-size:16px_16px]" : ""}`} style={{ minHeight: canvasHeight, backgroundColor: bg && (bg as any).color ? (bg as any).color : undefined, transform: `scale(${zoom / 100})`, transformOrigin: "top center" }} onPointerDown={(event) => { if (event.target === event.currentTarget) { const p = canvasPoint(event); interaction.current = { mode: "marquee", startX: p.x, startY: p.y }; setSelectedIds([]); } }} onPointerMove={moveInteraction} onPointerUp={stopInteraction} onPointerCancel={stopInteraction} aria-label="Área de edição do convite"><BackgroundLayers bg={bg as any} />
              {(bg as any)?.image && (
                <div
                  className="absolute inset-0 z-[1] cursor-grab active:cursor-grabbing"
                  onPointerDown={startBackgroundDrag}
                  onPointerMove={moveInteraction}
                  onPointerUp={stopInteraction}
                  onPointerCancel={stopInteraction}
                  title="Arraste para reposicionar o fundo"
                  aria-label="Mover imagem de fundo"
                />
              )}{blocks.length === 0 && <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">Adicione elementos pela barra de ferramentas.</div>}{marquee && <div className="pointer-events-none absolute z-50 border border-primary bg-primary/10" style={{ left: marquee.x, top: marquee.y, width: marquee.width, height: marquee.height }} />}<VisualTransformCanvas
              blocks={blocks}
              selectedIds={selectedIds}
              zoom={zoom}
              canvasRef={canvasRef}
              ctx={ctx as any}
              onSelect={select}
              onChange={(update, group) => h.set(update, group)}
            /></div></div></div>
        </main>
        <aside className="hidden w-[320px] shrink-0 overflow-y-auto rounded-2xl border border-primary/15 bg-card/90 p-3 shadow-xl shadow-black/10 backdrop-blur-xl lg:block" aria-label="Painel contextual de propriedades"><div className="mb-3 flex items-center gap-2 border-b border-border/70 pb-3"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><PanelRight className="h-3.5 w-3.5" /></div><div className="min-w-0"><p className="text-xs font-semibold text-foreground">Painel contextual</p><p className="text-[10px] text-muted-foreground">Ajustes do elemento selecionado</p></div></div><ContextualPropertiesPanel blocks={blocks} selectedIds={selectedIds} assets={assets as any} onChange={(update, group) => h.set(update, group)} onDuplicate={duplicateByIds} onDelete={removeByIds} /></aside>
      </div>
      <div className="flex items-center justify-between gap-1.5 rounded-2xl border border-primary/15 bg-card/95 p-2 shadow-2xl shadow-black/25 backdrop-blur-xl lg:hidden" role="toolbar" aria-label="Ferramentas móveis do editor"><button type="button" className="flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] text-muted-foreground transition hover:bg-primary/10 hover:text-primary" onClick={() => setMobileSheet("elements")}><PanelLeft className="h-4 w-4" />Elementos</button><button type="button" className="flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] text-muted-foreground transition hover:bg-primary/10 hover:text-primary" onClick={() => setMobileSheet("layers")}><Grid3X3 className="h-4 w-4" />Camadas</button><button type="button" className="flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] text-muted-foreground transition hover:bg-primary/10 hover:text-primary" onClick={() => setMobileSheet("properties")}><PanelRight className="h-4 w-4" />Propriedades</button><button type="button" className="flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] text-muted-foreground transition hover:bg-primary/10 hover:text-primary" onClick={() => setMobileSheet("background")}><Sparkles className="h-4 w-4" />Fundo</button><button type="button" className="flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] text-muted-foreground transition hover:bg-primary/10 hover:text-primary" onClick={() => setMobileSheet("view")}><Grid3X3 className="h-4 w-4" />Exibir</button></div>
      {compact && mobileSheet && <div className="fixed inset-x-2 bottom-2 z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-border/80 bg-card p-4 shadow-2xl"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">{mobileSheet === "properties" && <ContextualPropertiesPanel blocks={blocks} selectedIds={selectedIds} assets={assets as any} onChange={(update, group) => h.set(update, group)} onDuplicate={duplicateByIds} onDelete={removeByIds} />}}{mobileSheet === "background" && <BackgroundPropertiesPanel background={(bg as Record<string, unknown>) || {}} assets={assets as any} onChange={(value) => onBg?.(value)} />}{mobileSheet === "view" && <div className="space-y-3"><div className="flex items-center gap-2"><button type="button" className="rounded border px-3 py-2" onClick={() => setZoom((value) => Math.max(50, value - 10))}>−</button><span className="flex-1 text-center">{zoom}%</span><button type="button" className="rounded border px-3 py-2" onClick={() => setZoom((value) => Math.min(150, value + 10))}>+</button></div><button type="button" className={`w-full rounded border px-3 py-2 ${showGrid ? "bg-primary/10 text-primary" : "text-muted-foreground"}`} onClick={() => setShowGrid((value) => !value)}>{showGrid ? "Guias ativas" : "Ativar guias"}</button></div>}</div>}
    </div>
  );
