// @ts-nocheck
import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { BackgroundLayers, BlockView } from "@/components/block-render";
import { VisualTransformCanvas } from "@/components/visual-transform-canvas";

import { BackgroundPropertiesPanel, ContextualPropertiesPanel } from "@/components/contextual-properties-panel";
import { BLOCKS, getBlockDefaultSize, getNextBlockZIndex, newBlock, resolveBlockGeometry, type Block, type BlockType } from "@/lib/templates";
import { ElementsLibrary } from "@/components/elements-library";
import { TemplateGallery } from "@/components/template-gallery";
import { Grid3X3, Minus, Plus, Redo2, Undo2, PanelLeft, PanelRight, Sparkles, Smartphone, Tablet, Monitor, BringToFront, SendToBack, Trash2, X, Pencil, RotateCcw, RotateCw, Lock, Unlock, AlignCenterHorizontal, AlignCenterVertical, Link2, Unlink2, Image as ImageIcon } from "lucide-react";

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
const ELEMENT_ICONS: Partial<Record<BlockType, ComponentType<{ className?: string }>>> = {
  text: Type,
  image: ImageIcon,
  date: CalendarDays,
  location: MapPin,
  button: Link2,
  rsvp: CheckCircle2,
};
const GRID_UNIT = 16;
type EditorPointer = { clientX: number; clientY: number };

export type EditorPoint = { x: number; y: number };

export function VisualEditor({ h, ctx, assets, bg, onBg, toolbarExtra }: { h: BlocksHistory; ctx?: unknown; assets?: unknown; bg?: unknown; onBg?: (value: any) => void; toolbarExtra?: React.ReactNode }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(true);
  const [contextPanel, setContextPanel] = useState<"elements" | "layers" | "background" | "view" | null>("elements");
  const [mobileSheet, setMobileSheet] = useState<"elements" | "layers" | "properties" | "background" | "view" | null>(null);
  const [toolCategory, setToolCategory] = useState("Elementos");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [startEditingTextId, setStartEditingTextId] = useState<string | null>(null);
  const [imageReplaceId, setImageReplaceId] = useState<string | null>(null);
  const [device, setDevice] = useState<"mobile" | "tablet" | "desktop">("tablet");
  const [canvasDragOver, setCanvasDragOver] = useState(false);
  const compact = useIsCompact();
  const fitCanvasToViewport = useCallback(() => {
    if (!compact) return;
    const viewportWidth = viewportRef.current?.clientWidth || window.innerWidth;
    const available = Math.max(280, viewportWidth - 28);
    setZoom(Math.round(Math.min(100, Math.max(72, (available / 390) * 100))));
  }, [compact]);

  useEffect(() => {
    if (!compact) return;
    setDevice("mobile");
    requestAnimationFrame(fitCanvasToViewport);
    const node = viewportRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => requestAnimationFrame(fitCanvasToViewport));
    observer.observe(node);
    return () => observer.disconnect();
  }, [compact, fitCanvasToViewport]);
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
  const addBlockByType = (type: BlockType, initialProps?: Record<string, unknown>, dropPoint?: { x: number; y: number }) => {
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
    const canvasWidth = canvasRef.current?.clientWidth || 390;
    if (dropPoint) {
      block.x = Math.round(Math.max(24, Math.min(dropPoint.x - size.width / 2, canvasWidth - size.width - 24)));
      block.y = Math.round(Math.max(24, Math.min(dropPoint.y - size.height / 2, canvasHeight - size.height - 24)));
    } else {
      const safeMaxY = Math.max(24, canvasHeight - size.height - 24);
      block.x = Math.round(Math.max(24, Math.min((canvasWidth - size.width) / 2, canvasWidth - size.width - 24)));
      block.y = Math.round(Math.min(Math.max(24, lastY + 24), safeMaxY));
    }
    block.width = size.width;
    block.height = size.height;
    block.zIndex = getNextBlockZIndex(blocks);
    if (type === "text") {
      const textCount = blocks.filter((current: any) => current.type === "text").length;
      const textPresets = ["Título", "Subtítulo", "Texto"];
      block.props = { ...(block.props || {}), text: textPresets[Math.min(textCount, textPresets.length - 1)] };
    }
    if (initialProps) block.props = { ...(block.props || {}), ...initialProps };
    h.set((current) => [...current, block]);
    setSelectedIds([block.id]);
    setStartEditingTextId(type === "text" ? block.id : null);
    setImageReplaceId(null);
  };
  const addImageByUrl = (url: string) => {
    if (!url) return;
    addBlockByType("image", { url });
  };

  const alignSelectedOnCanvas = (mode: "left" | "center" | "right" | "top" | "middle" | "bottom" | "distributeX" | "distributeY" | "canvasCenterX" | "canvasCenterY", ids: string[]) => {
    const targetIds = Array.from(new Set(ids));
    if (targetIds.length < 2) return;
    h.set((items) => {
      const selectedItems = items
        .map((block: any, index: number) => ({ block, index, position: getPosition(block, index), size: getSize(block, index) }))
        .filter(({ block }) => targetIds.includes(block.id) && !block.locked);
      if (selectedItems.length < 2) return items;

      if (mode === "canvasCenterX" || mode === "canvasCenterY") {
        const canvasWidth = canvasRef.current?.clientWidth || 390;
        const canvasHeightForAlign = canvasRef.current?.clientHeight || canvasHeight;
        const minLeft = Math.min(...selectedItems.map((entry) => entry.position.x));
        const minTop = Math.min(...selectedItems.map((entry) => entry.position.y));
        const maxRight = Math.max(...selectedItems.map((entry) => entry.position.x + entry.size.width));
        const maxBottom = Math.max(...selectedItems.map((entry) => entry.position.y + entry.size.height));
        const groupWidth = maxRight - minLeft;
        const groupHeight = maxBottom - minTop;
        const dx = mode === "canvasCenterX" ? (canvasWidth - groupWidth) / 2 - minLeft : 0;
        const dy = mode === "canvasCenterY" ? (canvasHeightForAlign - groupHeight) / 2 - minTop : 0;
        return items.map((block: any) => {
          const entry = selectedItems.find((item) => item.block.id === block.id);
          if (!entry) return block;
          return { ...block, x: Math.round(entry.position.x + dx), y: Math.round(entry.position.y + dy) };
        });
      }

      if (mode === "distributeX" || mode === "distributeY") {
        if (selectedItems.length < 3) return items;
        const axis = mode === "distributeX" ? "x" : "y";
        const sizeKey = mode === "distributeX" ? "width" : "height";
        const ordered = [...selectedItems].sort((a, b) => a.position[axis] - b.position[axis]);
        const first = ordered[0];
        const last = ordered[ordered.length - 1];
        const firstStart = first.position[axis];
        const lastEnd = last.position[axis] + last.size[sizeKey];
        const totalSize = ordered.reduce((sum, entry) => sum + entry.size[sizeKey], 0);
        const gap = (lastEnd - firstStart - totalSize) / Math.max(1, ordered.length - 1);
        let cursor = firstStart;
        const next = new Map<string, number>();
        ordered.forEach((entry) => {
          next.set(entry.block.id, Math.round(cursor));
          cursor += entry.size[sizeKey] + gap;
        });
        return items.map((block: any) => {
          const value = next.get(block.id);
          return value === undefined ? block : { ...block, [axis]: value };
        });
      }

      const left = Math.min(...selectedItems.map((entry) => entry.position.x));
      const right = Math.max(...selectedItems.map((entry) => entry.position.x + entry.size.width));
      const top = Math.min(...selectedItems.map((entry) => entry.position.y));
      const bottom = Math.max(...selectedItems.map((entry) => entry.position.y + entry.size.height));
      const centerX = (left + right) / 2;
      const centerY = (top + bottom) / 2;

      return items.map((block: any) => {
        const entry = selectedItems.find((item) => item.block.id === block.id);
        if (!entry) return block;
        const nextX = mode === "left" ? left
          : mode === "center" ? centerX - entry.size.width / 2
          : mode === "right" ? right - entry.size.width
          : entry.position.x;
        const nextY = mode === "top" ? top
          : mode === "middle" ? centerY - entry.size.height / 2
          : mode === "bottom" ? bottom - entry.size.height
          : entry.position.y;
        return { ...block, x: Math.round(nextX), y: Math.round(nextY) };
      });
    }, `selection:align:${mode}`);
  };
  const updateSelectedOpacity = (value: number, ids: string[]) => {
    const safe = Math.min(1, Math.max(0, Number(value) || 0));
    h.set((items) => items.map((block: any) =>
      ids.includes(block.id) && !block.locked ? { ...block, opacity: safe } : block
    ), "selection:opacity");
  };

  const rotateSelectedBy = (amount: number, ids: string[]) => {
    if (!ids.length) return;
    h.set((items) => items.map((block: any) =>
      ids.includes(block.id) && !block.locked
        ? { ...block, rotation: (Number(block.rotation) || 0) + amount }
        : block
    ), "selection:rotation");
  };

  const replaceSelectedImage = (url: string) => {
    if (!imageReplaceId || !url) return;
    h.set((items) => items.map((item: any) => item.id === imageReplaceId && item.type === "image"
      ? { ...item, props: { ...(item.props || {}), url } }
      : item), "image:replace");
    setSelectedIds([imageReplaceId]);
    setImageReplaceId(null);
    if (compact) setMobileSheet(null);
  };
  const openImageAction = (id: string, action: "replace" | "crop" | "adjust") => {
    setSelectedIds([id]);
    if (action === "replace") {
      setImageReplaceId(id);
      setToolCategory("Imagens");
      setContextPanel("elements");
      if (compact) setMobileSheet("elements");
      requestAnimationFrame(() => document.getElementById("editor-elements-library")?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
    }
  };
  const cancelImageReplace = () => setImageReplaceId(null);
  const handleStartEditingHandled = useCallback(() => setStartEditingTextId(null), []);
  const groupSelected = useCallback(() => {
    if (selectedIds.length < 2 || selected.some((item: any) => item.locked)) return;
    const groupId = `group-${crypto.randomUUID()}`;
    h.set((items) => items.map((item: any) =>
      selectedIds.includes(item.id) && !item.locked ? { ...item, groupId } : item
    ), "selection:group");
  }, [h, selected, selectedIds]);
  const ungroupSelected = useCallback(() => {
    if (!selectedIds.length) return;
    h.set((items) => items.map((item: any) =>
      selectedIds.includes(item.id) ? { ...item, groupId: undefined } : item
    ), "selection:ungroup");
  }, [h, selectedIds]);
  const duplicateByIds = (ids: string[]) => {
    if (!ids.length) return;
    const sourceBlocks = blocks.filter((block: any) => ids.includes(block.id) && block.type !== "rsvp");
    if (!sourceBlocks.length) return;

    const groupIds = new Map<string, string>();
    sourceBlocks.forEach((block: any) => {
      if (block.groupId && !groupIds.has(block.groupId)) {
        groupIds.set(block.groupId, `group-${crypto.randomUUID()}`);
      }
    });

    const copies = sourceBlocks.map((block: any) => {
      const index = blocks.indexOf(block);
      const value = resolveBlockGeometry(block as Block, index);
      const nextId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${block.id}-copy-${Date.now()}-${index}`;
      return {
        ...structuredClone(block),
        id: nextId,
        x: Math.round(value.x + 24),
        y: Math.round(value.y + 24),
        width: Math.round(value.width),
        height: Math.round(value.height),
        rotation: value.rotation,
        scale: value.scale,
        zIndex: Math.round(value.zIndex + 1),
        groupId: block.groupId ? groupIds.get(block.groupId) : undefined,
        props: { ...(block.props || {}) },
      };
    });

    h.set((current) => [...current, ...copies]);
    setSelectedIds(copies.map((block: any) => block.id));
  };
  const removeByIds = (ids: string[]) => {
    if (!ids.length) return;
    h.set((current) => current.filter((block: any) => !ids.includes(block.id)));
    setSelectedIds((current) => current.filter((id) => !ids.includes(id)));
  };

  const reorderSelectedLayers = (mode: "front" | "back" | "up" | "down", ids = selectedIds) => {
    if (!ids.length) return;
    h.set((items) => {
      const selectedSet = new Set(ids);
      const ranked = items
        .map((block: any, index: number) => ({
          block,
          index,
          zIndex: resolveBlockGeometry(block as Block, index).zIndex,
        }))
        .sort((a, b) => a.zIndex - b.zIndex || a.index - b.index);

      const movable = ranked.filter(({ block }) => selectedSet.has(block.id) && !block.locked);
      if (!movable.length) return items;

      const movableSet = new Set(movable.map(({ block }) => block.id));
      const isMovable = (entry: { block: any }) => movableSet.has(entry.block.id);
      let nextOrder = ranked.slice();

      if (mode === "front") {
        nextOrder = [...ranked.filter((entry) => !isMovable(entry)), ...movable];
      } else if (mode === "back") {
        nextOrder = [...movable, ...ranked.filter((entry) => !isMovable(entry))];
      } else if (mode === "up") {
        const movableRanks = ranked
          .map((entry, rank) => (isMovable(entry) ? rank : -1))
          .filter((rank) => rank >= 0);
        const highestRank = Math.max(...movableRanks);
        const stationary = ranked.filter((entry) => !isMovable(entry));
        if (highestRank >= ranked.length - 1) return items;
        const insertAt = ranked.slice(0, highestRank + 1).filter((entry) => !isMovable(entry)).length;
        stationary.splice(insertAt, 0, ...movable);
        nextOrder = stationary;
      } else {
        const movableRanks = ranked
          .map((entry, rank) => (isMovable(entry) ? rank : -1))
          .filter((rank) => rank >= 0);
        const lowestRank = Math.min(...movableRanks);
        const stationary = ranked.filter((entry) => !isMovable(entry));
        if (lowestRank <= 0) return items;
        const insertAt = Math.max(0, ranked.slice(0, lowestRank).filter((entry) => !isMovable(entry)).length - 1);
        stationary.splice(insertAt, 0, ...movable);
        nextOrder = stationary;
      }

      const zById = new Map(nextOrder.map((entry, index) => [entry.block.id, index + 1]));
      return items.map((block: any) =>
        zById.has(block.id) ? { ...block, zIndex: zById.get(block.id) } : block
      );
    }, `layers:${mode}`);
  };

  const orderedLayerBlocks = blocks
    .map((block: any, index: number) => ({
      block,
      sourceIndex: index,
      zIndex: resolveBlockGeometry(block as Block, index).zIndex,
    }))
    .sort((a, b) => b.zIndex - a.zIndex || b.sourceIndex - a.sourceIndex)
    .map((entry, layerIndex) => ({ ...entry, layerIndex }));

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
  const canvasPoint = (event: { clientX: number; clientY: number }) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    return rect ? { x: (event.clientX - rect.left) / (zoom / 100), y: (event.clientY - rect.top) / (zoom / 100) } : { x: 0, y: 0 };
  };
  const selectionGroupIds = (id: string) => {
    const block = blocks.find((item: any) => item.id === id);
    if (!block?.groupId) return [id];
    return blocks.filter((item: any) => item.groupId === block.groupId).map((item: any) => item.id);
  };
  const select = (id: string, additive: boolean) => {
    const targetIds = selectionGroupIds(id);
    setSelectedIds((current) => {
      if (!additive) return targetIds;
      const fullySelected = targetIds.every((targetId) => current.includes(targetId));
      if (fullySelected) return current.filter((item) => !targetIds.includes(item));
      return [...current, ...targetIds.filter((targetId) => !current.includes(targetId))];
    });
  };
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
    // Keep every insertion path on the same flow so text/images behave
    // identically whether added from desktop shortcuts, mobile drawer,
    // category bar or the element library.
    addBlockByType(type);
  };
  const duplicate = () => {
    if (!selectedIds.length) return;
    duplicateByIds(selectedIds);
  };
  const remove = () => {
    if (!selectedIds.length) return;
    removeByIds(selectedIds);
  };
  const rotate = (amount: number) => h.set((items) => items.map((block: any) => selectedIds.includes(block.id) && !block.locked ? { ...block, rotation: (block.rotation ?? 0) + amount } : block), "selection:rotation");
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable=true], [role=combobox]")) return;
      const command = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      // Canva-style quick text insertion: T creates a text element and
      // immediately enters text editing while the canvas is focused.
      if (!command && !event.altKey && key === "t") {
        event.preventDefault();
        addBlockByType("text");
        return;
      }
      if (command && key === "z") { event.preventDefault(); event.shiftKey ? h.redo() : h.undo(); }
      else if (command && key === "y") { event.preventDefault(); h.redo(); }
      else if (command && key === "c" && selectedIds.length) {
        event.preventDefault();
        const copyIds = selectionGroupIds(selectedIds[0]);
        const allIds = selectedIds.length > 1
          ? Array.from(new Set([...copyIds, ...selectedIds]))
          : copyIds;
        clipboard.current = blocks
          .filter((block: any) => allIds.includes(block.id))
          .map((block: any) => structuredClone(block));
      }
      else if (command && key === "v" && clipboard.current.length) {
        event.preventDefault();
        const pastedIds = clipboard.current.filter((block: any) => block.type !== "rsvp").map((block: any) => block.id);
        if (!pastedIds.length) { window.alert(RSVP_DUP); return; }
        const before = blocks;
        const source = clipboard.current.filter((block: any) => block.type !== "rsvp");
        const groupMap = new Map<string, string>();
        source.forEach((block: any) => {
          if (block.groupId && !groupMap.has(block.groupId)) groupMap.set(block.groupId, `group-${crypto.randomUUID()}`);
        });
        const pasted = source.map((block: any, index: number) => {
          const originalIndex = before.findIndex((item: any) => item.id === block.id);
          const value = resolveBlockGeometry(block as Block, Math.max(0, originalIndex));
          return {
            ...structuredClone(block),
            id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${block.id}-paste-${Date.now()}-${index}`,
            x: Math.round(value.x + 24 + index * 8),
            y: Math.round(value.y + 24 + index * 8),
            width: Math.round(value.width),
            height: Math.round(value.height),
            rotation: value.rotation,
            scale: value.scale,
            zIndex: Math.round(value.zIndex + 1),
            groupId: block.groupId ? groupMap.get(block.groupId) : undefined,
            props: { ...(block.props || {}) },
          };
        });
        h.set((items) => [...items, ...pasted]);
        setSelectedIds(pasted.map((block: any) => block.id));
      }
      else if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedIds.length) { event.preventDefault(); removeByIds(selectedIds); }
      }
      else if (command && key === "d") {
        if (selectedIds.length) { event.preventDefault(); duplicateByIds(selectedIds); }
      }
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
    <div className="vellune-editor-root flex min-h-[calc(100dvh-7rem)] flex-col overflow-hidden rounded-[1.25rem] border border-primary/10 bg-background/95 pb-20 shadow-2xl shadow-black/15 ring-1 ring-black/5 lg:min-h-[680px] lg:pb-0">
      <div className="vellune-editor-topbar flex flex-wrap items-center justify-between gap-2 border-b border-primary/10 bg-card/90 px-3 py-2.5 shadow-sm backdrop-blur-xl" role="toolbar" aria-label="Barra principal do editor">
        <div className="flex min-w-0 items-center gap-2">
          <div className="vellune-editor-device-switcher hidden items-center gap-0.5 rounded-xl border border-primary/10 bg-background/80 p-1 shadow-sm sm:flex" role="group" aria-label="Tamanho da tela do convite">
            {([["mobile", Smartphone, "Celular"], ["tablet", Tablet, "Tablet"], ["desktop", Monitor, "Desktop"]] as const).map(([value, Icon, label]) => (
              <button key={value} type="button" aria-pressed={device === value} aria-label={label} title={`Visualizar em ${label.toLowerCase()}`} onClick={() => setDevice(value)} className={`inline-flex h-7 items-center gap-1 rounded-md px-2 text-[10px] transition-colors ${device === value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <Icon className="h-3.5 w-3.5" /><span className="hidden md:inline">{label}</span>
              </button>
            ))}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-foreground sm:text-sm">Editor visual</p>
            <p className="hidden text-[10px] text-muted-foreground sm:block">Crie, organize e refine o convite diretamente no canvas.</p>
          </div>
          <span className="hidden rounded-full border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-medium text-primary sm:inline-flex">{selectedIds.length ? `${selectedIds.length} selecionado(s)` : `${blocks.length} elemento(s)`}</span>
        </div>
        <div className="vellune-editor-history-cluster flex items-center gap-1 rounded-xl border border-primary/10 bg-background/60 p-1 shadow-sm">
          <button type="button" aria-label="Desfazer" title="Desfazer (Ctrl/Cmd+Z)" disabled={!h.canUndo} onClick={h.undo} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"><Undo2 className="h-3.5 w-3.5" /></button>
          <button type="button" aria-label="Refazer" title="Refazer (Ctrl/Cmd+Shift+Z)" disabled={!h.canRedo} onClick={h.redo} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"><Redo2 className="h-3.5 w-3.5" /></button>
          <span className="mx-0.5 h-5 w-px bg-border/70" />
          <button type="button" aria-label="Diminuir zoom" title="Diminuir zoom" onClick={() => setZoom((value) => Math.max(50, value - 10))} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 text-muted-foreground transition hover:bg-accent hover:text-foreground"><Minus className="h-3.5 w-3.5" /></button>
          <span className="min-w-12 text-center text-[11px] font-medium tabular-nums text-foreground">{zoom}%</span>
          <button type="button" aria-label="Aumentar zoom" title="Aumentar zoom" onClick={() => setZoom((value) => Math.min(150, value + 10))} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 text-muted-foreground transition hover:bg-accent hover:text-foreground"><Plus className="h-3.5 w-3.5" /></button>
          <button type="button" aria-pressed={showGrid} title={showGrid ? "Ocultar guias" : "Mostrar guias"} onClick={() => setShowGrid((value) => !value)} className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11px] transition ${showGrid ? "border-primary/25 bg-primary/10 text-primary" : "border-border/70 text-muted-foreground hover:bg-accent hover:text-foreground"}`}><Grid3X3 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Guias</span></button>
        </div>
      </div>
      <div className="vellune-editor-body flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="vellune-editor-sidebar hidden w-[244px] shrink-0 flex-col border-r border-primary/10 bg-card/80 backdrop-blur-xl lg:flex" aria-label="Ferramentas do editor">
          <div className="border-b border-primary/10 p-3.5">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-foreground">Ferramentas</p>
                <p className="mt-1 text-xs text-muted-foreground">Monte o convite de forma simples e visual.</p>
              </div>
              <button type="button" onClick={() => setTemplateOpen(true)} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 text-[11px] font-medium text-primary transition hover:bg-primary/15" aria-label="Abrir modelos">
                <Sparkles className="h-3.5 w-3.5" />Modelos
              </button>
            </div>
          </div>
        <div className="vellune-editor-tabs flex gap-1 border-b border-primary/10 bg-background/20 p-2">
            {[['elements', 'Adicionar'], ['layers', 'Organizar'], ['background', 'Fundo'], ['view', 'Visualizar']].map(([key, label]) => (
              <button key={key} type="button" onClick={() => setContextPanel(key as any)} className={`flex-1 rounded-md px-1 py-2 text-[10px] ${contextPanel === key ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted"}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {contextPanel === "elements" && <div className="space-y-4">
  <div>
    <p className="text-xs font-medium text-foreground">Comece seu convite</p>
    <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Escolha um modelo pronto ou adicione só o que precisa.</p>
  </div>
  <button type="button" onClick={() => setTemplateOpen(true)} className="vellune-editor-start-card group flex w-full items-center gap-3 rounded-xl border border-primary/20 bg-primary/8 p-3 text-left shadow-sm transition hover:border-primary/40 hover:bg-primary/10 active:scale-[.99]">
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary"><Sparkles className="h-4 w-4" /></span>
    <span className="min-w-0 flex-1"><span className="block text-xs font-semibold text-foreground">Começar com um modelo</span><span className="mt-0.5 block text-[10px] leading-4 text-muted-foreground">Casamento, aniversário, chá de bebê e mais.</span></span>
    <span className="text-[10px] font-semibold text-primary">Ver modelos</span>
  </button>
  <div>
    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Mais usados</p>
    <div className="grid grid-cols-2 gap-2">
      {(["text", "image", "date", "location", "button", "rsvp"] as BlockType[]).map((type) => (
        <button key={type} type="button" onClick={() => addElement(type)} className="group flex items-center gap-2 rounded-xl border border-border/70 bg-background/45 px-3 py-2.5 text-left text-xs text-foreground transition hover:border-primary/35 hover:bg-primary/5 active:scale-[.99]">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">{(() => { const Icon = ELEMENT_ICONS[type]; return Icon ? <Icon className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />; })()}</span>
          <span className="min-w-0 truncate">{BLOCKS[type].label}</span>
        </button>
      ))}
    </div>
  </div>
  <details className="group rounded-xl border border-primary/10 bg-background/30">
    <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2.5 text-xs font-medium text-foreground [&::-webkit-details-marker]:hidden">
      Mais elementos
      <span className="text-muted-foreground transition-transform group-open:rotate-180">⌄</span>
    </summary>
    <div className="grid grid-cols-1 gap-1.5 border-t border-border/60 p-2">
      {(Object.keys(BLOCKS) as BlockType[]).filter((type) => !["text", "image", "date", "location", "button", "rsvp"].includes(type)).map((type) => (
        <button key={type} type="button" onClick={() => addElement(type)} className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2 text-left text-xs text-foreground transition hover:border-primary/50 hover:bg-primary/5">
          <span>{BLOCKS[type].label}</span><span className="text-primary">+</span>
        </button>
      ))}
    </div>
  </details>
</div>}
            {contextPanel === "layers" && <div className="space-y-2"><div className="mb-2 flex items-center justify-between gap-2"><div><p className="text-xs font-medium text-foreground">Organizar elementos</p><span className="text-[10px] text-muted-foreground">{blocks.length} elemento(s)</span></div><div className="flex items-center gap-1"><button type="button" disabled={!selectedIds.length} onClick={() => reorderSelectedLayers("back")} className="rounded-md border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40" title="Enviar seleção para trás" aria-label="Enviar seleção para trás"><SendToBack className="h-3.5 w-3.5" /></button><button type="button" disabled={!selectedIds.length} onClick={() => reorderSelectedLayers("front")} className="rounded-md border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40" title="Trazer seleção para frente" aria-label="Trazer seleção para frente"><BringToFront className="h-3.5 w-3.5" /></button></div></div>{orderedLayerBlocks.map(({ block, layerIndex }) => { const selectedLayer = selectedIds.includes(block.id); const moveLayer = (direction: number) => { select(block.id, false); reorderSelectedLayers(direction === 1 ? "up" : "down", [block.id]); }; const toggleLayer = (key: "hidden" | "locked") => h.set((items) => items.map((item: any) => item.id === block.id ? { ...item, [key]: !item[key], ...(key === "hidden" ? { visibility: item[key] } : {}) } : item), `layers:${key}`); return <div key={block.id} className={`rounded-lg border px-2 py-2 transition ${selectedLayer ? "border-primary bg-primary/10" : "border-border/70"}`}><div className="flex items-center gap-2"><button type="button" onClick={() => select(block.id, false)} className="min-w-0 flex-1 truncate text-left text-xs text-foreground"><span className="mr-1.5 text-[10px] text-muted-foreground">{layerIndex + 1}</span>{getBlockLabel(block)}{block.groupId && <span className="ml-1 rounded bg-muted px-1 py-0.5 text-[9px]">grupo</span>}</button><button type="button" aria-label={block.hidden ? "Mostrar camada" : "Ocultar camada"} onClick={() => toggleLayer("hidden")} className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${block.hidden ? "bg-muted text-muted-foreground" : "text-foreground hover:bg-muted"}`}>{block.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button><button type="button" aria-label={block.locked ? "Desbloquear camada" : "Bloquear camada"} onClick={() => toggleLayer("locked")} className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${block.locked ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>{block.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}</button></div><div className="mt-1.5 flex items-center justify-end gap-1"><button type="button" disabled={layerIndex === 0} onClick={() => moveLayer(1)} className="rounded border px-1.5 py-1 text-[10px] disabled:cursor-not-allowed disabled:opacity-40">↑</button><button type="button" disabled={layerIndex === orderedLayerBlocks.length - 1} onClick={() => moveLayer(-1)} className="rounded border px-1.5 py-1 text-[10px] disabled:cursor-not-allowed disabled:opacity-40">↓</button><button type="button" onClick={() => { select(block.id, false); duplicate(); }} className="rounded border px-1.5 py-1 text-[10px]">Duplicar</button><button type="button" onClick={() => { select(block.id, false); remove(); }} className="rounded border border-destructive/30 px-1.5 py-1 text-[10px] text-destructive">Excluir</button></div></div>; })}{blocks.length === 0 && <p className="rounded-lg border border-dashed p-4 text-center text-[11px] text-muted-foreground">Nenhuma camada adicionada.</p>}</div>}
            {contextPanel === "background" && <BackgroundPropertiesPanel background={(bg as Record<string, unknown>) || {}} assets={assets as any} onChange={(value) => onBg?.(value)} />}{contextPanel === "view" && <div className="space-y-3"><p className="text-xs font-medium text-foreground">Exibição</p><div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2 text-xs"><span>Guias</span><button type="button" onClick={() => setShowGrid((value) => !value)} className={`rounded-md px-2 py-1 ${showGrid ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{showGrid ? "Ativas" : "Desativadas"}</button></div><div className="flex items-center gap-2"><button type="button" onClick={() => setZoom((value) => Math.max(50, value - 10))} className="h-8 w-8 rounded-md border">−</button><span className="flex-1 text-center text-xs">{zoom}%</span><button type="button" onClick={() => setZoom((value) => Math.min(150, value + 10))} className="h-8 w-8 rounded-md border">+</button></div></div>}
          </div>
        </aside>
        <main className="vellune-editor-workspace relative min-w-0 flex-1 overflow-hidden rounded-2xl border border-primary/10 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.12),transparent_38%),linear-gradient(145deg,hsl(var(--muted)/.45),hsl(var(--background)/.95))] p-2 shadow-inner sm:p-4 lg:p-5">
          <div className="vellune-editor-mobile-bar mb-3 flex items-center justify-between gap-2 rounded-xl border border-primary/15 bg-card/85 px-3 py-2.5 shadow-lg shadow-black/10 backdrop-blur-xl lg:hidden">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Sparkles className="h-3.5 w-3.5" /></div>
              <div className="min-w-0"><p className="truncate text-xs font-semibold">Editor visual</p><p className="truncate text-[10px] text-muted-foreground">{selectedIds.length ? `${selectedIds.length} selecionado(s)` : "Toque para selecionar e arraste para posicionar"}</p></div>
            </div>
            <div className="flex items-center gap-1">
              <button type="button" aria-label="Desfazer" title="Desfazer" disabled={!h.canUndo} onClick={h.undo} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background/80 text-muted-foreground disabled:opacity-35"><Undo2 className="h-3.5 w-3.5" /></button>
              <button type="button" aria-label="Refazer" title="Refazer" disabled={!h.canRedo} onClick={h.redo} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border bg-background/80 text-muted-foreground disabled:opacity-35"><Redo2 className="h-3.5 w-3.5" /></button>
              <span className="rounded-lg bg-muted/70 px-2 py-1.5 text-[11px] font-medium tabular-nums text-foreground">{zoom}%</span>
            </div>
          </div>
          <div ref={viewportRef} className="vellune-editor-viewport h-full overflow-auto overscroll-contain rounded-2xl border border-primary/10 bg-background/25 p-2 shadow-inner backdrop-blur-[2px] sm:p-4 lg:p-6"><div className="mx-auto origin-top transition-transform" style={{ width: `${100 / (zoom / 100)}%`, minHeight: canvasHeight / (zoom / 100) }}><div ref={canvasRef} className={`vellune-editor-canvas relative isolate mx-auto w-full ${DEVICE_W[device]} overflow-hidden rounded-2xl border bg-card shadow-sm ${showGrid ? "[background-image:linear-gradient(to_right,hsl(var(--border)/.25)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/.25)_1px,transparent_1px)] [background-size:16px_16px]" : ""}`} style={{ minHeight: canvasHeight, backgroundColor: bg && (bg as any).color ? (bg as any).color : undefined, transform: `scale(${zoom / 100})`, transformOrigin: "top center" }} onPointerDown={(event) => { if (event.target === event.currentTarget) { const p = canvasPoint(event); interaction.current = { mode: "marquee", startX: p.x, startY: p.y }; setSelectedIds([]); } }} onPointerMove={moveInteraction} onPointerUp={stopInteraction} onPointerCancel={stopInteraction}
              onDragEnter={(event) => {
                if (event.dataTransfer.types.includes("application/x-vellune-block-type")) {
                  canvasDragDepth.current += 1;
                  setCanvasDragOver(true);
                }
              }}
              onDragLeave={(event) => {
                if (!event.dataTransfer.types.includes("application/x-vellune-block-type")) return;
                canvasDragDepth.current = Math.max(0, canvasDragDepth.current - 1);
                if (canvasDragDepth.current === 0) setCanvasDragOver(false);
              }}
              onDragOver={(event) => {
                if (event.dataTransfer.types.includes("application/x-vellune-block-type")) {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "copy";
                  setCanvasDragOver(true);
                }
              }}
              onDrop={(event) => {
                const type = event.dataTransfer.getData("application/x-vellune-block-type") as BlockType;
                canvasDragDepth.current = 0;
                setCanvasDragOver(false);
                if (!type || !(Object.keys(BLOCKS) as string[]).includes(type)) return;
                event.preventDefault();
                const point = canvasPoint(event);
                addBlockByType(type, undefined, point);
              }}
              aria-label="Área de edição do convite"><BackgroundLayers bg={bg as any} />
              {canvasDragOver && <div className="pointer-events-none absolute inset-3 z-[120] flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/10 backdrop-blur-[2px]"><div className="rounded-full border border-primary/20 bg-background/90 px-4 py-2 text-xs font-semibold text-primary shadow-lg">Solte para adicionar ao convite</div></div>}
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
              )}{blocks.length === 0 && <div className="absolute inset-0 z-[30] flex items-center justify-center p-6"><div className="max-w-sm rounded-2xl border border-primary/15 bg-background/92 p-5 text-center shadow-xl backdrop-blur-md"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-5 w-5" /></div><p className="mt-3 text-sm font-semibold text-foreground">Comece seu convite</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Escolha um modelo ou adicione seu primeiro elemento. Depois, personalize tudo diretamente no canvas.</p><div className="mt-4 flex flex-wrap justify-center gap-2"><button type="button" onClick={() => setTemplateOpen(true)} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm">Escolher modelo</button><button type="button" onClick={() => addBlockByType("text")} className="rounded-lg border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted">Adicionar texto</button><button type="button" onClick={() => addBlockByType("image")} className="rounded-lg border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted">Adicionar imagem</button></div></div></div>}{marquee && <div className="pointer-events-none absolute z-50 border border-primary bg-primary/10" style={{ left: marquee.x, top: marquee.y, width: marquee.width, height: marquee.height }} />}<VisualTransformCanvas
              blocks={blocks}
              selectedIds={selectedIds}
              zoom={zoom}
              canvasRef={canvasRef}
              ctx={ctx as any}
              onSelect={select}
              onChange={(update, group) => h.set(update, group)}
              onDuplicate={duplicateByIds}
              onDelete={removeByIds}
              onUndo={h.undo}
              onRedo={h.redo}
              onClearSelection={() => setSelectedIds([])}
              onLayer={(direction, ids) => reorderSelectedLayers(direction, ids)}
              onAlign={(mode, ids) => alignSelectedOnCanvas(mode, ids)}
              onOpacity={(value, ids) => updateSelectedOpacity(value, ids)}
              onRotate={(amount, ids) => rotateSelectedBy(amount, ids)}
              onGroup={(ids) => {
                if (ids.length < 2) return;
                groupSelected();
              }}
              onUngroup={(ids) => {
                if (!ids.length) return;
                ungroupSelected();
              }}
              onImageAction={openImageAction}
              startEditingId={startEditingTextId}
              onStartEditingHandled={handleStartEditingHandled}
              onAdvanced={() => {
                if (compact) {
                  setMobileSheet("properties");
                  return;
                }
                requestAnimationFrame(() => {
                  document.getElementById("editor-contextual-properties")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
                });
              }}
            /></div></div></div>
        </main>
        <aside id="editor-contextual-properties" className="vellune-editor-inspector hidden w-[328px] shrink-0 overflow-y-auto rounded-2xl border border-primary/10 bg-card/80 p-3.5 shadow-xl shadow-black/10 backdrop-blur-xl lg:block" aria-label="Painel contextual de propriedades"><div className="mb-3 flex items-center gap-2 border-b border-border/70 pb-3"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><PanelRight className="h-3.5 w-3.5" /></div><div className="min-w-0"><p className="text-xs font-semibold text-foreground">Painel contextual</p><p className="text-[10px] text-muted-foreground">Ajustes do elemento selecionado</p></div></div><ContextualPropertiesPanel blocks={blocks} selectedIds={selectedIds} assets={assets as any} onChange={(update, group) => h.set(update, group)} onDuplicate={duplicateByIds} onDelete={removeByIds} /></aside>
      </div>
      <div className="fixed inset-x-2 z-[70] lg:hidden" style={{ bottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        {selectedIds.length > 0 && (
          <div className="mb-2 flex items-center gap-1 overflow-x-auto rounded-2xl border border-primary/20 bg-card/95 p-2 shadow-2xl shadow-black/30 backdrop-blur-xl" role="toolbar" aria-label="Ações da seleção no mobile">
            {selected.length === 1 && selected[0]?.type === "text" && !selected[0]?.locked && (
              <button type="button" className="flex min-w-[64px] flex-col items-center gap-1 rounded-xl bg-primary/10 px-2 py-1.5 text-[10px] font-medium text-primary touch-manipulation active:scale-95" onClick={() => setStartEditingTextId(selected[0].id)}><Pencil className="h-4 w-4" />Texto</button>
            )}
            <button type="button" className="flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] text-muted-foreground touch-manipulation active:scale-95 hover:bg-primary/10 hover:text-primary" onClick={() => setMobileSheet("properties")}><PanelRight className="h-4 w-4" />Editar</button>
            <button type="button" className="flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] text-muted-foreground touch-manipulation active:scale-95 hover:bg-primary/10 hover:text-primary" onClick={() => rotate(-15)}><RotateCcw className="h-4 w-4" />−15°</button>
            <button type="button" className="flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] text-muted-foreground touch-manipulation active:scale-95 hover:bg-primary/10 hover:text-primary" onClick={() => rotate(15)}><RotateCw className="h-4 w-4" />+15°</button>
            {selected.length === 1 && selected[0]?.type === "image" && !selected[0]?.locked && (
              <button type="button" className="flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] text-muted-foreground touch-manipulation active:scale-95 hover:bg-primary/10 hover:text-primary" onClick={() => openImageAction(selected[0].id, "replace")}><ImageIcon className="h-4 w-4" />Trocar</button>
            )}
            {selected.length > 1 && (() => {
              const sameGroup = Boolean(selected[0]?.groupId) && selected.every((item: any) => item.groupId === selected[0]?.groupId);
              return (
                <button type="button" disabled={!sameGroup && selected.some((item: any) => item.locked)} className="flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] text-muted-foreground touch-manipulation active:scale-95 hover:bg-primary/10 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40" onClick={sameGroup ? ungroupSelected : groupSelected}>
                  {sameGroup ? <Unlink2 className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
                  {sameGroup ? "Desagrupar" : "Agrupar"}
                </button>
              );
            })()}
            <button type="button" className="flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] text-muted-foreground touch-manipulation active:scale-95 hover:bg-primary/10 hover:text-primary" onClick={duplicate}><Plus className="h-4 w-4" />Duplicar</button>
                        <button type="button" className="flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] text-muted-foreground touch-manipulation active:scale-95 hover:bg-primary/10 hover:text-primary" onClick={() => reorderSelectedLayers("front")}><BringToFront className="h-4 w-4" />Frente</button>
            <button type="button" className="flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] text-muted-foreground touch-manipulation active:scale-95 hover:bg-primary/10 hover:text-primary" onClick={() => reorderSelectedLayers("back")}><SendToBack className="h-4 w-4" />Trás</button>
            <button type="button" className="flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] text-muted-foreground touch-manipulation active:scale-95 hover:bg-primary/10 hover:text-primary" onClick={() => alignSelectedOnCanvas("canvasCenterX", selectedIds)}><AlignCenterHorizontal className="h-4 w-4" />Centro X</button>
            <button type="button" className="flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] text-muted-foreground touch-manipulation active:scale-95 hover:bg-primary/10 hover:text-primary" onClick={() => alignSelectedOnCanvas("canvasCenterY", selectedIds)}><AlignCenterVertical className="h-4 w-4" />Centro Y</button>
            <button type="button" className="flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] text-muted-foreground touch-manipulation active:scale-95 hover:bg-primary/10 hover:text-primary" onClick={() => setMobileSheet("layers")}><Grid3X3 className="h-4 w-4" />Organizar</button>
            <button type="button" className="flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] text-muted-foreground touch-manipulation active:scale-95 hover:bg-primary/10 hover:text-primary" onClick={() => setMobileSheet("elements")}><Plus className="h-4 w-4" />Adicionar</button>
            <button type="button" className="flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] text-muted-foreground touch-manipulation active:scale-95 hover:bg-primary/10 hover:text-primary" onClick={() => { const shouldUnlock = selected.some((item: any) => item.locked); h.set((items) => items.map((item: any) => selectedIds.includes(item.id) ? { ...item, locked: !shouldUnlock } : item), "mobile:lock"); }}>{selected.some((item: any) => item.locked) ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}{selected.some((item: any) => item.locked) ? "Abrir" : "Travar"}</button>
            <button type="button" className="flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] text-destructive touch-manipulation active:scale-95 hover:bg-destructive/10" onClick={remove}><Trash2 className="h-4 w-4" />Excluir</button>
            <button type="button" className="flex min-w-[64px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] text-muted-foreground touch-manipulation active:scale-95 hover:bg-primary/10 hover:text-primary" onClick={() => setSelectedIds([])}><X className="h-4 w-4" />Fechar</button>
          </div>
        )}
        {!selectedIds.length && <div className="flex items-center justify-between gap-1 rounded-2xl border border-primary/15 bg-card/95 p-2 shadow-2xl shadow-black/25 backdrop-blur-xl" role="toolbar" aria-label="Ferramentas móveis do editor">
          <button type="button" className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] text-muted-foreground transition touch-manipulation active:scale-95 hover:bg-primary/10 hover:text-primary" onClick={() => setMobileSheet("elements")}><PanelLeft className="h-4 w-4" />Elementos</button>
          <button type="button" className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] text-muted-foreground transition touch-manipulation active:scale-95 hover:bg-primary/10 hover:text-primary" onClick={() => setMobileSheet("layers")}><Grid3X3 className="h-4 w-4" />Camadas</button>
          <button type="button" className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] text-muted-foreground transition touch-manipulation active:scale-95 hover:bg-primary/10 hover:text-primary" onClick={() => setTemplateOpen(true)}><Sparkles className="h-4 w-4" />Modelos</button>
          <button type="button" className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] text-muted-foreground transition touch-manipulation active:scale-95 hover:bg-primary/10 hover:text-primary" onClick={() => setMobileSheet("view")}><Tablet className="h-4 w-4" />Zoom</button>
          <button type="button" className="flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] text-muted-foreground transition touch-manipulation active:scale-95 hover:bg-primary/10 hover:text-primary" onClick={() => setMobileSheet("background")}><Sparkles className="h-4 w-4" />Fundo</button>
        </div>}
      </div>
      {compact && mobileSheet && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <button type="button" aria-label="Fechar painel" className="absolute inset-0 bg-background/55 backdrop-blur-[2px]" onClick={() => setMobileSheet(null)} />
          <div className="absolute inset-x-0 bottom-0 max-h-[78vh] overflow-y-auto overscroll-contain rounded-t-3xl border border-border/80 bg-card px-4 pb-[calc(env(safe-area-inset-bottom)+6.5rem)] pt-2 shadow-2xl [&_input]:text-base [&_select]:text-base [&_textarea]:text-base sm:[&_input]:text-xs sm:[&_select]:text-xs sm:[&_textarea]:text-xs">
            <div className="mx-auto mb-3 mt-1 h-1 w-10 rounded-full bg-muted-foreground/30" aria-hidden="true" />
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">
              {mobileSheet === "properties" ? "Propriedades" : mobileSheet === "background" ? "Fundo" : mobileSheet === "view" ? "Exibição" : "Elementos"}
            </p>
            <button type="button" className="rounded-md border px-2 py-1 text-xs" onClick={() => setMobileSheet(null)}>Fechar</button>
          </div>
          {mobileSheet === "properties" && (
            <ContextualPropertiesPanel
              blocks={blocks}
              selectedIds={selectedIds}
              assets={assets as any}
              onChange={(update, group) => h.set(update, group)}
              onDuplicate={duplicateByIds}
              onDelete={removeByIds}
            />
          )}
          {mobileSheet === "background" && (
            <BackgroundPropertiesPanel
              background={(bg as Record<string, unknown>) || {}}
              assets={assets as any}
              onChange={(value) => onBg?.(value)}
            />
          )}
          {mobileSheet === "view" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className="flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium disabled:opacity-40" disabled={!h.canUndo} onClick={h.undo}><Undo2 className="h-4 w-4" />Desfazer</button>
                <button type="button" className="flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium disabled:opacity-40" disabled={!h.canRedo} onClick={h.redo}><Redo2 className="h-4 w-4" />Refazer</button>
              </div>
              <div className="rounded-xl border bg-muted/20 p-2.5">
                <div className="flex items-center gap-2">
                  <button type="button" aria-label="Diminuir zoom" className="h-10 w-10 rounded-xl border bg-background text-lg" onClick={() => setZoom((value) => Math.max(50, value - 10))}>−</button>
                  <span className="flex-1 text-center text-sm font-semibold tabular-nums">{zoom}%</span>
                  <button type="button" aria-label="Aumentar zoom" className="h-10 w-10 rounded-xl border bg-background text-lg" onClick={() => setZoom((value) => Math.min(150, value + 10))}>+</button>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button type="button" className="rounded-lg border bg-background px-3 py-2 text-xs" onClick={fitCanvasToViewport}>Ajustar à tela</button>
                  <button type="button" className="rounded-lg border bg-background px-3 py-2 text-xs" onClick={() => setZoom(100)}>100%</button>
                </div>
              </div>
              <button type="button" className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-medium ${showGrid ? "bg-primary/10 text-primary" : "text-muted-foreground"}`} onClick={() => setShowGrid((value) => !value)}>
                <Grid3X3 className="h-4 w-4" />{showGrid ? "Guias ativas" : "Ativar guias"}
              </button>
              <button type="button" className="flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold text-foreground" onClick={() => setMobileSheet(null)}><X className="h-4 w-4" />Fechar painel</button>
            </div>
          )}
          {mobileSheet === "elements" && (
            <ElementsLibrary
              id="editor-elements-library-mobile"
              availableTypes={(Object.keys(BLOCKS) as BlockType[])}
              assets={assets as any}
              onAdd={(type) => { addBlockByType(type); setMobileSheet(null); }}
              onAddImage={addImageByUrl}
              imageMode={imageReplaceId ? "replace" : "add"}
              onSelectImage={replaceSelectedImage}
              onCancelImageReplace={cancelImageReplace}
            />
          )}
          {mobileSheet === "layers" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 rounded-lg border bg-muted/20 p-2">
                <div>
                  <p className="text-xs font-semibold text-foreground">Camadas</p>
                  <p className="text-[10px] text-muted-foreground">{blocks.length} elemento(s)</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" disabled={!selectedIds.length} onClick={() => reorderSelectedLayers("back")} className="rounded-md border px-2 py-1 text-[10px] disabled:opacity-40">Para trás</button>
                  <button type="button" disabled={!selectedIds.length} onClick={() => reorderSelectedLayers("front")} className="rounded-md border px-2 py-1 text-[10px] disabled:opacity-40">Para frente</button>
                </div>
              </div>
              {orderedLayerBlocks.map(({ block, layerIndex }) => {
                const selectedLayer = selectedIds.includes(block.id);
                const toggleLayer = (key: "hidden" | "locked") => h.set((items) => items.map((item: any) => item.id === block.id ? { ...item, [key]: !item[key], ...(key === "hidden" ? { visibility: item[key] } : {}) } : item), `mobile:layers:${key}`);
                return (
                  <div key={block.id} className={`rounded-lg border p-2 ${selectedLayer ? "border-primary bg-primary/10" : ""}`}>
                    <div className="flex items-center gap-2">
                      <button type="button" className="min-w-0 flex-1 truncate text-left text-xs font-medium" onClick={() => { select(block.id, false); setMobileSheet("properties"); }}>
                        {layerIndex + 1}. {getBlockLabel(block)}{block.groupId && <span className="ml-1 rounded bg-muted px-1 py-0.5 text-[9px]">grupo</span>}
                      </button>
                      <button type="button" aria-label={block.hidden ? "Mostrar camada" : "Ocultar camada"} onClick={() => toggleLayer("hidden")} className="rounded border px-1.5 py-1 text-[10px]">{block.hidden ? "○" : "●"}</button>
                      <button type="button" aria-label={block.locked ? "Desbloquear camada" : "Bloquear camada"} onClick={() => toggleLayer("locked")} className="rounded border px-1.5 py-1 text-[10px]">{block.locked ? "🔒" : "🔓"}</button>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button type="button" disabled={layerIndex === 0} onClick={() => { select(block.id, false); reorderSelectedLayers("up", [block.id]); }} className="rounded border px-2 py-1 text-[10px] disabled:opacity-40">Subir</button>
                      <button type="button" disabled={layerIndex === orderedLayerBlocks.length - 1} onClick={() => { select(block.id, false); reorderSelectedLayers("down", [block.id]); }} className="rounded border px-2 py-1 text-[10px] disabled:opacity-40">Descer</button>
                      <button type="button" onClick={() => { select(block.id, false); duplicate(); }} className="rounded border px-2 py-1 text-[10px]">Duplicar</button>
                      <button type="button" onClick={() => { select(block.id, false); remove(); }} className="rounded border border-destructive/30 px-2 py-1 text-[10px] text-destructive">Excluir</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}