import { useCallback, useEffect, useRef, useState, type ComponentType } from "react";
import { BackgroundLayers } from "@/components/block-render";
import { VisualTransformCanvas } from "@/components/visual-transform-canvas";

import { BackgroundPropertiesPanel, ContextualPropertiesPanel } from "@/components/contextual-properties-panel";
import { BLOCKS, getBlockDefaultSize, getNextBlockZIndex, newBlock, resolveBlockGeometry, type Block, type BlockType } from "@/lib/templates";
import { ElementsLibrary } from "@/components/elements-library";
import { EditorCommandPalette } from "@/components/editor-command-palette";
import { TemplateGallery } from "@/components/template-gallery";
import { cn } from "@/lib/utils";
import { CalendarDays, CheckCircle2, Eye, EyeOff, Grid3X3, Minus, Plus, Redo2, Undo2, PanelLeft, PanelRight, Sparkles, Smartphone, Tablet, Monitor, BringToFront, SendToBack, Trash2, X, Pencil, RotateCcw, RotateCw, Lock, Unlock, AlignCenterHorizontal, AlignCenterVertical, Link2, Unlink2, MapPin, Type, Image as ImageIcon, Palette, MoreHorizontal, Maximize2, Minimize2, Search } from "lucide-react";

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


/* ---------------- Editor ---------------- */

type Device = "mobile" | "tablet" | "desktop";
const DEVICE_W: Record<Device, string> = { mobile: "max-w-[390px]", tablet: "max-w-[768px]", desktop: "max-w-[1024px]" };

const RSVP_DUP = "Este convite já possui confirmação de presença.";
const ELEMENT_ICONS: Partial<Record<BlockType, ComponentType<{ className?: string }>>> = {
  text: Type,
  image: ImageIcon,
  date: CalendarDays,
  location: MapPin,
  button: Link2,
  rsvp: CheckCircle2,
};
export type EditorPoint = { x: number; y: number };

export function VisualEditor({ h, ctx, assets, bg, onBg, toolbarExtra, desktopHeaderLeft, desktopHeaderRight, fullHeight = false }: { h: BlocksHistory; ctx?: unknown; assets?: unknown; bg?: unknown; onBg?: (value: any) => void; toolbarExtra?: React.ReactNode; desktopHeaderLeft?: React.ReactNode; desktopHeaderRight?: React.ReactNode; fullHeight?: boolean }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(100);
  const [showGrid, setShowGrid] = useState(false);
  const [mobileSheet, setMobileSheet] = useState<"elements" | "layers" | "properties" | "background" | "view" | null>(null);
  const [toolCategory, setToolCategory] = useState("Modelos");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [startEditingTextId, setStartEditingTextId] = useState<string | null>(null);
  const [imageReplaceId, setImageReplaceId] = useState<string | null>(null);
  const [device, setDevice] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [canvasDragOver, setCanvasDragOver] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [commandOpen, setCommandOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const canvasDragDepth = useRef(0);
  const panRef = useRef<{ pointerId: number; x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);
  const compact = useIsCompact();
  const fitCanvasToViewport = useCallback(() => {
    if (!compact) return;
    const viewportWidth = viewportRef.current?.clientWidth || window.innerWidth;
    const deviceWidth = device === "mobile" ? 390 : device === "tablet" ? 768 : 1024;
    const available = Math.max(280, viewportWidth - 28);
    setZoom(Math.round(Math.min(100, Math.max(50, (available / deviceWidth) * 100))));
  }, [compact, device]);
  const fitCanvas = useCallback(() => {
    const viewportWidth = viewportRef.current?.clientWidth || window.innerWidth;
    const deviceWidth = device === "mobile" ? 390 : device === "tablet" ? 768 : 1024;
    const available = Math.max(260, viewportWidth - (compact ? 28 : 56));
    const fitted = Math.round((available / deviceWidth) * 100);
    setZoom(Math.min(100, Math.max(50, fitted)));
  }, [compact, device]);

  useEffect(() => {
    if (!compact) return;
    setDevice("mobile");
  }, [compact]);

  useEffect(() => {
    const isTypingTarget = (target: EventTarget | null) => {
      const element = target as HTMLElement | null;
      return !!element?.closest?.("input, textarea, [contenteditable=true], [role=combobox]");
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== " " || isTypingTarget(event.target)) return;
      event.preventDefault();
      setSpaceHeld(true);
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === " ") {
        event.preventDefault();
        setSpaceHeld(false);
        panRef.current = null;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    if (!compact) return;
    requestAnimationFrame(fitCanvasToViewport);
    const node = viewportRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => requestAnimationFrame(fitCanvasToViewport));
    observer.observe(node);
    return () => observer.disconnect();
  }, [compact, fitCanvasToViewport]);
  useEffect(() => {
    if (selectedIds.length > 0) setInspectorOpen(true);
  }, [selectedIds]);
  useEffect(() => {
    if (compact) return;
    requestAnimationFrame(fitCanvas);
  }, [compact, device, fitCanvas]);
  const clipboard = useRef<any[]>([]);
  const blocks = Array.isArray(h?.blocks) ? h.blocks : [];
  const selected = blocks.filter((block: any) => selectedIds.includes(block.id));
  const applyStarterTemplate = (content: any) => {
    h.set(structuredClone(content.blocks ?? []), "template:apply");
    onBg?.(structuredClone(content.settings?.background ?? {}));
    setSelectedIds([]);
    setToolCategory("Elementos");
  };
  const addBlockByType = (type: BlockType, initialProps?: Record<string, string>, dropPoint?: { x: number; y: number }) => {
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
      block.props = { ...(block.props || {}), text: textPresets[Math.min(textCount, textPresets.length - 1)] ?? "Texto" };
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
        const first = ordered[0]!;
        const last = ordered[ordered.length - 1]!;
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
    h.set((items) => items.map((item: any) => item.id === imageReplaceId && item.type === "image" && !item.locked
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
      setToolCategory("Fotos");
      if (compact) setMobileSheet("elements");
      requestAnimationFrame(() => document.getElementById("editor-elements-library")?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
      return;
    }

    setInspectorOpen(true);
    if (compact) {
      setMobileSheet("properties");
      return;
    }
    requestAnimationFrame(() => document.getElementById("editor-contextual-properties")?.scrollIntoView({ behavior: "smooth", block: "nearest" }));
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
      selectedIds.includes(item.id) && !item.locked ? { ...item, groupId: undefined } : item
    ), "selection:ungroup");
  }, [h, selectedIds]);
  const duplicateByIds = (ids: string[]) => {
    if (!ids.length) return;
    const sourceBlocks = blocks.filter((block: any) => ids.includes(block.id) && block.type !== "rsvp" && !block.locked);
    if (!sourceBlocks.length) return;

    const groupIds = new Map<string, string>();
    sourceBlocks.forEach((block: any) => {
      if (block.groupId && !groupIds.has(block.groupId)) {
        groupIds.set(block.groupId, `group-${crypto.randomUUID()}`);
      }
    });

    const copies = sourceBlocks.map((block: any, copyIndex: number) => {
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
        zIndex: copyIndex + 1,
        groupId: block.groupId ? groupIds.get(block.groupId) : undefined,
        props: { ...(block.props || {}) },
      };
    });

    h.set((current) => {
      const maxZ = current.reduce(
        (max, item, index) => Math.max(max, resolveBlockGeometry(item as Block, index).zIndex),
        0,
      );
      const inserted = copies.map((block: any, index: number) => ({ ...block, zIndex: maxZ + index + 1 }));
      return [...current, ...inserted];
    });
    setSelectedIds(copies.map((block: any) => block.id));
  };
  const removeByIds = (ids: string[]) => {
    if (!ids.length) return;
    h.set((current) => current.filter((block: any) => !ids.includes(block.id) || block.locked));
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
    if (!id) {
      setSelectedIds([]);
      return;
    }
    const targetIds = selectionGroupIds(id);
    setSelectedIds((current) => {
      if (!additive) return targetIds;
      const fullySelected = targetIds.every((targetId) => current.includes(targetId));
      if (fullySelected) return current.filter((item) => !targetIds.includes(item));
      return [...current, ...targetIds.filter((targetId) => !current.includes(targetId))];
    });
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
      if (command && key === "k") {
        event.preventDefault();
        setCommandOpen(true);
        return;
      }
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
        const firstSelectedId = selectedIds[0];
        if (!firstSelectedId) return;
        const copyIds = selectionGroupIds(firstSelectedId);
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
            zIndex: index + 1,
            groupId: block.groupId ? groupMap.get(block.groupId) : undefined,
            props: { ...(block.props || {}) },
          };
        });
        h.set((items) => {
          const maxZ = items.reduce(
            (max, item, itemIndex) => Math.max(max, resolveBlockGeometry(item as Block, itemIndex).zIndex),
            0,
          );
          const inserted = pasted.map((block: any, index: number) => ({ ...block, zIndex: maxZ + index + 1 }));
          return [...items, ...inserted];
        });
        setSelectedIds(pasted.map((block: any) => block.id));
      }
      else if (event.key === "Delete" || event.key === "Backspace") {
        if (selectedIds.length) { event.preventDefault(); removeByIds(selectedIds); }
      }
      else if (command && key === "d") {
        if (selectedIds.length) { event.preventDefault(); duplicateByIds(selectedIds); }
      }
      else if (event.key === "Escape") {
        setSelectedIds([]);
        setCommandOpen(false);
      }
      else if (!event.ctrlKey && !event.metaKey && !event.altKey && (event.key === "+" || event.key === "=")) {
        event.preventDefault();
        setZoom((value) => Math.min(150, value + 10));
      }
      else if (!event.ctrlKey && !event.metaKey && !event.altKey && event.key === "-") {
        event.preventDefault();
        setZoom((value) => Math.max(50, value - 10));
      }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  }, [selectedIds, blocks, h]);
  const canvasHeight = Math.max(640, ...blocks.map((block: any, index: number) => getPosition(block, index).y + getSize(block, index).height + 32));
  const updateSelectedBlock = (patch: Record<string, unknown>) => {
    if (!selected.length) return;
    h.set((items) => items.map((item: any) => selectedIds.includes(item.id) && !item.locked ? { ...item, ...patch } : item), "selection:properties");
  };
  const updateSelectedProp = (key: string, value: string) => {
    if (!selected.length) return;
    h.set((items) => items.map((item: any) => selectedIds.includes(item.id) && !item.locked ? { ...item, props: { ...(item.props ?? {}), [key]: value } } : item), "selection:properties");
  };
  return (
    <div className={cn("vellune-editor-root flex flex-col overflow-hidden border border-primary/10 bg-background/95 shadow-2xl shadow-black/15 ring-1 ring-black/5", fullHeight ? "h-full min-h-0 rounded-none border-0 pb-0 shadow-none ring-0" : "min-h-[calc(100dvh-7rem)] rounded-[1.25rem] pb-20 lg:min-h-[680px] lg:pb-0")} style={{ "--color-primary": "#d4af37", "--color-primary-foreground": "#16130b" } as React.CSSProperties}>
      <div className="hidden h-14 shrink-0 items-center gap-3 border-b border-white/[0.07] bg-[#0b0d12]/95 px-4 shadow-[0_8px_30px_rgba(0,0,0,0.18)] backdrop-blur-xl lg:flex" role="toolbar" aria-label="Barra principal do editor">
        <div className="min-w-0 flex-1">
          {desktopHeaderLeft ?? (
            <div className="flex min-w-0 items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate text-sm font-semibold text-foreground">Editor visual</span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.025] p-1">
            <button type="button" aria-label="Desfazer" title="Desfazer (Ctrl/Cmd+Z)" disabled={!h.canUndo} onClick={h.undo} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/55 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"><Undo2 className="h-3.5 w-3.5" /></button>
            <button type="button" aria-label="Refazer" title="Refazer (Ctrl/Cmd+Shift+Z)" disabled={!h.canRedo} onClick={h.redo} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/55 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-35"><Redo2 className="h-3.5 w-3.5" /></button>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.025] p-1">
            <button type="button" aria-label="Diminuir zoom" title="Diminuir zoom" onClick={() => setZoom((value) => Math.max(50, value - 10))} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/55 transition hover:bg-white/[0.06] hover:text-white"><Minus className="h-3.5 w-3.5" /></button>
            <span className="min-w-12 text-center text-[11px] font-medium tabular-nums text-white/75">{zoom}%</span>
            <button type="button" aria-label="Aumentar zoom" title="Aumentar zoom" onClick={() => setZoom((value) => Math.min(150, value + 10))} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/55 transition hover:bg-white/[0.06] hover:text-white"><Plus className="h-3.5 w-3.5" /></button>
            <button type="button" aria-label="Ajustar canvas à área disponível" title="Ajustar canvas" onClick={fitCanvas} className="hidden h-8 items-center justify-center rounded-md px-2 text-[10px] font-medium text-white/50 transition hover:bg-white/[0.06] hover:text-white xl:inline-flex"><Maximize2 className="mr-1.5 h-3.5 w-3.5" />Ajustar</button>
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.025] p-1" role="group" aria-label="Tamanho da tela do convite">
            {([["mobile", Smartphone, "Celular"], ["tablet", Tablet, "Tablet"], ["desktop", Monitor, "Desktop"]] as const).map(([value, Icon, label]) => (
              <button key={value} type="button" aria-pressed={device === value} aria-label={label} title={`Visualizar em ${label.toLowerCase()}`} onClick={() => setDevice(value)} className={`inline-flex h-8 items-center gap-1 rounded-md px-2 text-[10px] transition-colors ${device === value ? "bg-primary/15 text-primary" : "text-white/45 hover:bg-white/[0.06] hover:text-white"}`}>
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden xl:inline">{label}</span>
              </button>
            ))}
          </div>

          <button type="button" onClick={() => setCommandOpen(true)} className="hidden h-9 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.025] px-2.5 text-[10px] font-medium text-white/50 transition hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white xl:inline-flex" title="Buscar e adicionar (Ctrl/Cmd+K)" aria-label="Buscar e adicionar">
            <Search className="h-3.5 w-3.5" /><span>Buscar / adicionar</span><kbd className="rounded border border-white/[0.08] bg-black/10 px-1.5 py-0.5 text-[9px] text-white/30">⌘K</kbd>
          </button>
          <button type="button" onClick={() => setFocusMode((value) => !value)} className={cn("inline-flex h-9 w-9 items-center justify-center rounded-lg border text-white/50 transition hover:bg-white/[0.06] hover:text-white", focusMode ? "border-primary/25 bg-primary/10 text-primary" : "border-white/[0.08] bg-white/[0.025]")} title={focusMode ? "Sair do modo foco" : "Modo foco"} aria-label={focusMode ? "Sair do modo foco" : "Ativar modo foco"} aria-pressed={focusMode}>
            {focusMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5">
          {desktopHeaderRight}
        </div>
      </div>
      <div className="vellune-editor-topbar flex flex-wrap items-center justify-between gap-2 border-b border-primary/10 bg-card/90 px-3 py-2.5 shadow-sm backdrop-blur-xl lg:hidden" role="toolbar" aria-label="Barra principal do editor">
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
        <div className="flex items-center gap-1.5">
          {toolbarExtra && <div className="hidden items-center gap-1.5 md:flex">{toolbarExtra}</div>}
          <div className="vellune-editor-history-cluster flex items-center gap-1 rounded-xl border border-primary/10 bg-background/60 p-1 shadow-sm">
          <button type="button" aria-label="Desfazer" title="Desfazer (Ctrl/Cmd+Z)" disabled={!h.canUndo} onClick={h.undo} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"><Undo2 className="h-3.5 w-3.5" /></button>
          <button type="button" aria-label="Refazer" title="Refazer (Ctrl/Cmd+Shift+Z)" disabled={!h.canRedo} onClick={h.redo} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"><Redo2 className="h-3.5 w-3.5" /></button>
          <span className="mx-0.5 h-5 w-px bg-border/70" />
          <button type="button" aria-label="Diminuir zoom" title="Diminuir zoom" onClick={() => setZoom((value) => Math.max(50, value - 10))} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 text-muted-foreground transition hover:bg-accent hover:text-foreground"><Minus className="h-3.5 w-3.5" /></button>
          <span className="min-w-12 text-center text-[11px] font-medium tabular-nums text-foreground">{zoom}%</span>
          <button type="button" aria-label="Aumentar zoom" title="Aumentar zoom" onClick={() => setZoom((value) => Math.min(150, value + 10))} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/70 text-muted-foreground transition hover:bg-accent hover:text-foreground"><Plus className="h-3.5 w-3.5" /></button>
          <button type="button" aria-label="Ajustar canvas à área disponível" title="Ajustar canvas" onClick={fitCanvas} className="inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-border/70 px-2 text-[11px] text-muted-foreground transition hover:bg-accent hover:text-foreground"><Maximize2 className="h-3.5 w-3.5" /><span className="hidden md:inline">Ajustar</span></button>
          <button type="button" aria-label="Buscar e adicionar" title="Buscar e adicionar" onClick={() => setCommandOpen(true)} className="inline-flex h-8 items-center justify-center rounded-md border border-border/70 px-2 text-[11px] text-muted-foreground transition hover:bg-accent hover:text-foreground sm:px-2.5"><Search className="h-3.5 w-3.5" /><span className="ml-1.5 hidden sm:inline">Adicionar</span></button>
          <button type="button" aria-pressed={showGrid} title={showGrid ? "Ocultar guias" : "Mostrar guias"} onClick={() => setShowGrid((value) => !value)} className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[11px] transition ${showGrid ? "border-primary/25 bg-primary/10 text-primary" : "border-border/70 text-muted-foreground hover:bg-accent hover:text-foreground"}`}><Grid3X3 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Guias</span></button>
          </div>
        </div>
        {toolbarExtra && <div className="mt-2 flex items-center justify-end gap-1.5 border-t border-primary/10 pt-2 md:hidden">{toolbarExtra}</div>}
      </div>
      <div className="vellune-editor-body flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className={cn("vellune-editor-sidebar hidden shrink-0 grid-rows-[auto_minmax(0,1fr)] border-r border-white/[0.06] bg-[#0d0f14]/95 backdrop-blur-xl", focusMode ? "lg:hidden" : cn("lg:grid", sidebarOpen ? "w-[330px] grid-cols-[74px_minmax(0,1fr)]" : "w-[74px] grid-cols-[74px]")))} aria-label="Ferramentas do editor">
          <div className={cn("border-b border-white/[0.06] bg-[#101217]/80 p-3.5", sidebarOpen ? "col-span-2" : "hidden")}>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-4 w-4" /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-foreground">Criar convite</p>
                <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">Tudo o que você precisa, na ordem certa.</p>
              </div>
              <button type="button" onClick={() => setSidebarOpen(false)} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/45 transition hover:bg-white/[0.06] hover:text-white" aria-label="Recolher biblioteca lateral" title="Recolher biblioteca lateral">
                <PanelLeft className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <nav className="row-start-2 col-start-1 flex flex-col gap-1 border-r border-white/[0.06] bg-[#0a0c10]/70 p-2" aria-label="Ferramentas principais">
            <button type="button" onClick={() => setSidebarOpen((value) => !value)} className="mb-1 flex min-h-[42px] w-full items-center justify-center gap-1 rounded-lg border border-white/[0.06] bg-white/[0.02] text-white/35 transition hover:bg-white/[0.05] hover:text-white" aria-label={sidebarOpen ? "Recolher biblioteca lateral" : "Expandir biblioteca lateral"} title={sidebarOpen ? "Recolher biblioteca lateral" : "Expandir biblioteca lateral"}>
              <PanelLeft className="h-3.5 w-3.5" />
              {sidebarOpen && <span className="text-[8px] font-medium">Recolher</span>}
            </button>
            {[
              ["Modelos", Sparkles, "Comece por um modelo pronto"],
              ["Texto", Type, "Títulos, subtítulos e mensagens"],
              ["Fotos", ImageIcon, "Imagens e galerias"],
              ["Elementos", PanelLeft, "Data, local, botões e mais"],
              ["Fundo", Palette, "Cor e imagem de fundo"],
              ["Mais", MoreHorizontal, "Camadas e ajustes avançados"],
            ].map(([key, Icon, description]) => {
              const IconComponent = Icon ?? MoreHorizontal;
              return (
              <button
                key={key as string}
                type="button"
                onClick={() => { setToolCategory(key as string); setSidebarOpen(true); }}
                className={cn(
                  "group flex min-h-[64px] w-full flex-col items-center justify-center gap-1 rounded-xl border border-transparent px-1.5 py-2 text-center transition-all",
                  toolCategory === key
                    ? "border-primary/25 bg-primary/10 text-primary shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
                    : "text-white/45 hover:bg-white/[0.05] hover:text-white",
                )}
                aria-pressed={toolCategory === key}
                title={description as string}
              >
                <IconComponent className="h-4 w-4" />
                <span className="text-[9px] font-medium leading-3">{key as string}</span>
              </button>
              );
            })}
          </nav>

          <div className={cn("row-start-2 col-start-2 min-h-0 overflow-y-auto bg-[#0f1117]/65 p-3.5", !sidebarOpen && "hidden")}>
            {toolCategory === "Modelos" && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">Comece sem complicação</p>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">Escolha uma composição pronta e depois personalize tudo no canvas.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setTemplateOpen(true)}
                  className="group w-full rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/12 via-primary/5 to-background p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-lg"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary"><Sparkles className="h-4 w-4" /></span>
                    <span className="text-[10px] font-semibold text-primary">ABRIR GALERIA →</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">Modelos prontos</p>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">Casamento, aniversário, chá de bebê e outras composições editáveis.</p>
                </button>
                <div className="rounded-xl border border-dashed border-primary/20 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Depois</p>
                  <p className="mt-1 text-xs font-medium text-foreground">Texto → Fotos → Elementos → Visualizar → Publicar</p>
                </div>
              </div>
            )}

            {toolCategory === "Texto" && (
              <ElementsLibrary
                id="editor-text-library"
                availableTypes={["text"]}
                assets={assets as any}
                onAdd={(type) => { addBlockByType(type); }}
                onAddImage={addImageByUrl}
                imageMode="add"
              />
            )}

            {toolCategory === "Fotos" && (
              <ElementsLibrary
                id="editor-photo-library"
                availableTypes={["image", "gallery"]}
                assets={assets as any}
                onAdd={(type) => { addBlockByType(type); }}
                onAddImage={addImageByUrl}
                imageMode={imageReplaceId ? "replace" : "add"}
                onSelectImage={replaceSelectedImage}
                onCancelImageReplace={cancelImageReplace}
              />
            )}

            {toolCategory === "Elementos" && (
              <ElementsLibrary
                id="editor-elements-library"
                availableTypes={(Object.keys(BLOCKS) as BlockType[]).filter((type) => !["text", "image", "gallery"].includes(type))}
                assets={assets as any}
                onAdd={(type) => { addBlockByType(type); }}
                onAddImage={addImageByUrl}
                imageMode="add"
              />
            )}

            {toolCategory === "Fundo" && (
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-foreground">Aparência do convite</p>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">Troque a cor ou a imagem de fundo. Ajustes mais finos ficam disponíveis quando necessário.</p>
                </div>
                <BackgroundPropertiesPanel background={(bg as Record<string, unknown>) || {}} assets={assets as any} onChange={(value) => onBg?.(value)} />
              </div>
            )}

            {toolCategory === "Mais" && (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-foreground">Organizar</p>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">Camadas, visibilidade, bloqueio e ajustes técnicos ficam aqui para não atrapalhar a criação.</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/35 p-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Camadas</p>
                    <div className="flex items-center gap-1">
                      <button type="button" disabled={!selectedIds.length} onClick={() => reorderSelectedLayers("back")} className="rounded-md border p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40" title="Enviar para trás"><SendToBack className="h-3.5 w-3.5" /></button>
                      <button type="button" disabled={!selectedIds.length} onClick={() => reorderSelectedLayers("front")} className="rounded-md border p-1.5 text-muted-foreground hover:bg-muted disabled:opacity-40" title="Trazer para frente"><BringToFront className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {orderedLayerBlocks.map(({ block, layerIndex }) => {
                      const selectedLayer = selectedIds.includes(block.id);
                      return (
                        <div key={block.id} className={cn("rounded-lg border px-2 py-2 transition", selectedLayer ? "border-primary/30 bg-primary/10" : "border-border/70")}>
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => select(block.id, false)} className="min-w-0 flex-1 truncate text-left text-xs font-medium text-foreground">
                              <span className="mr-1.5 text-[10px] text-muted-foreground">{layerIndex + 1}</span>{getBlockLabel(block)}
                            </button>
                            <button type="button" aria-label={block.hidden ? "Mostrar camada" : "Ocultar camada"} onClick={() => h.set((items) => items.map((item: any) => item.id === block.id ? { ...item, hidden: !item.hidden, visibility: item.hidden } : item), "layer:visibility")} className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">{block.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</button>
                            <button type="button" aria-label={block.locked ? "Desbloquear camada" : "Bloquear camada"} onClick={() => h.set((items) => items.map((item: any) => item.id === block.id ? { ...item, locked: !item.locked } : item), "layer:lock")} className={cn("inline-flex h-7 w-7 items-center justify-center rounded-lg", block.locked ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>{block.locked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}</button>
                          </div>
                        </div>
                      );
                    })}
                    {blocks.length === 0 && <p className="rounded-lg border border-dashed p-4 text-center text-[11px] text-muted-foreground">Nenhuma camada adicionada.</p>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => document.getElementById("editor-contextual-properties")?.scrollIntoView({ behavior: "smooth", block: "nearest" })}
                  disabled={!selectedIds.length}
                  className="flex w-full items-center justify-between rounded-xl border border-border/70 bg-background/35 px-3 py-3 text-left transition hover:border-primary/30 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>
                    <span className="block text-xs font-semibold text-foreground">Ajustes avançados</span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">X/Y, tamanho, rotação, opacidade e propriedades do elemento.</span>
                  </span>
                  <PanelRight className="h-4 w-4 text-primary" />
                </button>
                <div className="flex items-center justify-between rounded-xl border border-border/70 bg-background/35 px-3 py-3 text-xs">
                  <span className="text-foreground">Guias e grade</span>
                  <button type="button" onClick={() => setShowGrid((value) => !value)} className={cn("rounded-lg px-2.5 py-1.5 text-[10px] font-medium", showGrid ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{showGrid ? "Ativas" : "Desativadas"}</button>
                </div>
              </div>
            )}
          </div>
        </aside>
        <main className="vellune-editor-workspace relative flex min-h-0 h-auto flex-1 flex-col overflow-hidden rounded-2xl border border-primary/10 bg-[radial-gradient(circle_at_top,hsl(var(--primary)/.12),transparent_38%),linear-gradient(145deg,hsl(var(--muted)/.45),hsl(var(--background)/.95))] p-2 shadow-inner sm:p-4 lg:h-full lg:min-w-0 lg:p-5">
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
          <div
            ref={viewportRef}
            onPointerDownCapture={(event) => {
              if (!spaceHeld || event.pointerType === "touch" || event.button !== 0 || !viewportRef.current) return;
              event.preventDefault();
              event.stopPropagation();
              panRef.current = {
                pointerId: event.pointerId,
                x: event.clientX,
                y: event.clientY,
                scrollLeft: viewportRef.current.scrollLeft,
                scrollTop: viewportRef.current.scrollTop,
              };
              (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
            }}
            onPointerMoveCapture={(event) => {
              const pan = panRef.current;
              const viewport = viewportRef.current;
              if (!pan || pan.pointerId !== event.pointerId || !viewport) return;
              event.preventDefault();
              event.stopPropagation();
              viewport.scrollLeft = pan.scrollLeft - (event.clientX - pan.x);
              viewport.scrollTop = pan.scrollTop - (event.clientY - pan.y);
            }}
            onPointerUpCapture={(event) => {
              if (panRef.current?.pointerId === event.pointerId) {
                event.preventDefault();
                event.stopPropagation();
                panRef.current = null;
              }
            }}
            onPointerCancelCapture={(event) => {
              if (panRef.current?.pointerId === event.pointerId) panRef.current = null;
            }}
            className="vellune-editor-viewport min-h-0 flex-1 overflow-auto overscroll-contain rounded-2xl border border-primary/10 bg-background/25 p-2 shadow-inner backdrop-blur-[2px] sm:p-4 lg:p-6"
            onWheel={(event) => {
              if (!event.ctrlKey && !event.metaKey) return;
              event.preventDefault();
              const direction = event.deltaY > 0 ? -1 : 1;
              setZoom((value) => Math.min(150, Math.max(50, value + direction * 5)));
            }}
            title={spaceHeld ? "Arraste para mover a área de trabalho" : "Ctrl/Cmd + roda do mouse para ajustar o zoom"}
          ><div className="mx-auto origin-top transition-transform" style={{ width: `${100 / (zoom / 100)}%`, minHeight: canvasHeight / (zoom / 100) }}><div ref={canvasRef} className={`vellune-editor-canvas relative isolate mx-auto w-full ${DEVICE_W[device]} overflow-hidden border bg-card ${device === "mobile" ? "rounded-[1.75rem] border-[5px] border-black/20 shadow-[0_30px_80px_-34px_rgba(0,0,0,0.78),0_10px_30px_-16px_rgba(0,0,0,0.5)]" : device === "tablet" ? "rounded-2xl border-black/10 shadow-[0_28px_70px_-36px_rgba(0,0,0,0.68),0_8px_24px_-12px_rgba(0,0,0,0.4)]" : "rounded-lg border-black/10 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.62),0_6px_20px_-12px_rgba(0,0,0,0.34)]"} ${showGrid ? "[background-image:linear-gradient(to_right,hsl(var(--border)/.25)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/.25)_1px,transparent_1px)] [background-size:16px_16px]" : ""}`} style={{ minHeight: canvasHeight, backgroundColor: bg && (bg as any).color ? (bg as any).color : undefined, transform: `scale(${zoom / 100})`, transformOrigin: "top center" }}
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
              aria-label="Área de edição do convite"
              onPointerDown={() => { setSelectedIds([]); setInspectorOpen(false); }}><BackgroundLayers bg={bg as any} />
              {canvasDragOver && <div className="pointer-events-none absolute inset-3 z-[120] flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/10 backdrop-blur-[2px]"><div className="rounded-full border border-primary/20 bg-background/90 px-4 py-2 text-xs font-semibold text-primary shadow-lg">Solte para adicionar ao convite</div></div>}
{blocks.length === 0 && <div className="absolute inset-0 z-[30] flex items-center justify-center p-6"><div className="max-w-sm rounded-2xl border border-primary/15 bg-background/92 p-5 text-center shadow-xl backdrop-blur-md"><div className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-5 w-5" /></div><p className="mt-3 text-sm font-semibold text-foreground">Comece seu convite</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Escolha um modelo ou adicione seu primeiro elemento. Depois, personalize tudo diretamente no canvas.</p><div className="mt-4 flex flex-wrap justify-center gap-2"><button type="button" onClick={() => setTemplateOpen(true)} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-sm">Escolher modelo</button><button type="button" onClick={() => addBlockByType("text")} className="rounded-lg border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted">Adicionar texto</button><button type="button" onClick={() => addBlockByType("image")} className="rounded-lg border px-3 py-2 text-xs font-medium text-foreground hover:bg-muted">Adicionar imagem</button></div></div></div>}<VisualTransformCanvas
              blocks={blocks}
              selectedIds={selectedIds}
              zoom={zoom}
              canvasRef={canvasRef}
              ctx={ctx as any}
              onSelect={select}
              onChange={(update, group) => h.set(update, group)}
              onDuplicate={duplicateByIds}
              onDelete={removeByIds}
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
              showGrid={showGrid}
              onAdvanced={() => {
                if (compact) {
                  setMobileSheet("properties");
                  return;
                }
                setInspectorOpen(true);
              }}
            /></div></div></div>
        </main>
        {inspectorOpen && <aside id="editor-contextual-properties" className={cn("vellune-editor-inspector hidden w-[300px] shrink-0 overflow-y-auto rounded-2xl border border-primary/10 bg-card/75 p-3 shadow-xl shadow-black/10 backdrop-blur-xl lg:block", focusMode && "!hidden")} aria-label="Ajustes avançados do elemento">
          <div className="mb-2 flex items-center justify-between gap-2 rounded-xl border border-primary/10 bg-background/35 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><PanelRight className="h-3.5 w-3.5" /></div>
              <div className="min-w-0"><p className="text-xs font-semibold text-foreground">Ajustes</p><p className="text-[10px] text-muted-foreground">Opções avançadas, sem poluir o canvas.</p></div>
            </div>
            <button type="button" onClick={() => setInspectorOpen(false)} className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Recolher ajustes" title="Recolher ajustes"><X className="h-3.5 w-3.5" /></button>
          </div>
          <ContextualPropertiesPanel blocks={blocks} selectedIds={selectedIds} assets={assets as any} onChange={(update, group) => h.set(update, group)} onDuplicate={duplicateByIds} onDelete={removeByIds} />
        </aside>}
      </div>
      <div className="vellune-editor-mobile-bar shrink-0 flex items-center justify-between gap-1.5 rounded-2xl border border-primary/15 bg-card/95 p-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] shadow-2xl shadow-black/25 backdrop-blur-xl lg:hidden" role="toolbar" aria-label="Ferramentas móveis do editor"><button type="button" className="flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] text-muted-foreground transition hover:bg-primary/10 hover:text-primary" onClick={() => setMobileSheet("elements")}><PanelLeft className="h-4 w-4" />Elementos</button><button type="button" className="flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] text-muted-foreground transition hover:bg-primary/10 hover:text-primary" onClick={() => setMobileSheet("layers")}><Grid3X3 className="h-4 w-4" />Camadas</button><button type="button" className="flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] text-muted-foreground transition hover:bg-primary/10 hover:text-primary" onClick={() => setMobileSheet("properties")}><PanelRight className="h-4 w-4" />Propriedades</button><button type="button" className="flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] text-muted-foreground transition hover:bg-primary/10 hover:text-primary" onClick={() => setMobileSheet("background")}><Sparkles className="h-4 w-4" />Fundo</button><button type="button" className="flex flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] text-muted-foreground transition hover:bg-primary/10 hover:text-primary" onClick={() => setMobileSheet("view")}><Grid3X3 className="h-4 w-4" />Exibir</button></div>
      {compact && mobileSheet && (
        <>
          <button type="button" aria-label="Fechar painel" className="fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px]" onClick={() => setMobileSheet(null)} />
          <div className="fixed inset-x-2 bottom-2 z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-border/80 bg-card p-4 shadow-2xl">
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
              <div className="flex items-center gap-2">
                <button type="button" className="rounded border px-3 py-2" onClick={() => setZoom((value) => Math.max(50, value - 10))}>−</button>
                <span className="flex-1 text-center">{zoom}%</span>
                <button type="button" className="rounded border px-3 py-2" onClick={() => setZoom((value) => Math.min(150, value + 10))}>+</button>
              </div>
              <button type="button" className={`w-full rounded border px-3 py-2 ${showGrid ? "bg-primary/10 text-primary" : "text-muted-foreground"}`} onClick={() => setShowGrid((value) => !value)}>
                {showGrid ? "Guias ativas" : "Ativar guias"}
              </button>
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
              {blocks.slice().reverse().map((block: any, reverseIndex: number) => {
                const index = blocks.length - reverseIndex - 1;
                return (
                  <div key={block.id} className="rounded-lg border p-2">
                    <button type="button" className="w-full truncate text-left text-xs font-medium" onClick={() => { select(block.id, false); setMobileSheet("properties"); }}>
                      {index + 1}. {getBlockLabel(block)}
                    </button>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button type="button" disabled={index === blocks.length - 1} onClick={() => reorderSelectedLayers("up", [block.id])} className="rounded border px-2 py-1 text-[10px] disabled:opacity-40">Subir</button>
                      <button type="button" disabled={index === 0} onClick={() => reorderSelectedLayers("down", [block.id])} className="rounded border px-2 py-1 text-[10px] disabled:opacity-40">Descer</button>
                      <button type="button" onClick={() => duplicateByIds([block.id])} className="rounded border px-2 py-1 text-[10px]">Duplicar</button>
                      <button type="button" onClick={() => removeByIds([block.id])} className="rounded border border-destructive/30 px-2 py-1 text-[10px] text-destructive">Excluir</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </>
      )}
      <EditorCommandPalette
        open={commandOpen}
        selectedCount={selectedIds.length}
        onClose={() => setCommandOpen(false)}
        onAdd={(type) => {
          addBlockByType(type);
          if (compact) setMobileSheet(null);
        }}
        onOpenTemplates={() => {
          setToolCategory("Modelos");
          setSidebarOpen(true);
          setTemplateOpen(true);
          if (compact) setMobileSheet(null);
        }}
        onOpenBackground={() => {
          setToolCategory("Fundo");
          setSidebarOpen(true);
          if (compact) setMobileSheet("background");
        }}
      />
    </div>
  );
}