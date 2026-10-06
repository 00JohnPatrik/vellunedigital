// @ts-nocheck
import { useCallback, useEffect, useRef, useState } from "react";
import { BackgroundLayers, BlockView } from "@/components/block-render";
import { VisualTransformCanvas } from "@/components/visual-transform-canvas";
import { ImageUpload } from "@/components/image-upload";
import { ContextualPropertiesPanel } from "@/components/contextual-properties-panel";
import { BLOCKS, newBlock, type Block, type BlockType } from "@/lib/templates";

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
  rsvp: [{ k: "title", label: "Texto acima do botão", t: "text" }, { k: "label", label: "Texto do botão", t: "text" }, BTN_STYLE, WIDTH, ALIGN],
  whatsapp: [{ k: "label", label: "Texto do botão", t: "text" }, { k: "phone", label: "Telefone", t: "tel" }, { k: "message", label: "Mensagem", t: "text" }, BTN_STYLE, WIDTH, ALIGN],
  button: [{ k: "label", label: "Texto", t: "text" }, { k: "url", label: "Link (https://...)", t: "url" }, BTN_STYLE, WIDTH, ALIGN],
  qr_code: [{ k: "value", label: "Conteúdo (vazio = link do convite)", t: "text" }, { k: "size", label: "Tamanho", t: "select", options: [["sm", "Pequeno"], ["md", "Médio"], ["lg", "Grande"]] }, ALIGN],
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
  const compact = useIsCompact();
  const [marquee, setMarquee] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const interaction = useRef<{ mode: "drag" | "resize" | "marquee"; id?: string; startX: number; startY: number; originX?: number; originY?: number; originWidth?: number; originHeight?: number; selected?: string[] } | null>(null);
  const clipboard = useRef<any[]>([]);
  const blocks = Array.isArray(h?.blocks) ? h.blocks : [];
  const selected = blocks.filter((block: any) => selectedIds.includes(block.id));
  const editorCategories = EDITOR_CATEGORIES;
  const categoryGroups = editorCategories;
  const addBlockByType = (type: BlockType) => {
    if (type === "rsvp" && blocks.some((block: any) => block.type === "rsvp")) {
      window.alert(RSVP_DUP);
      return;
    }
    const block = newBlock(type);
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

  const getPosition = (block: any, index: number) => ({
    x: typeof block.x === "number" ? block.x : Number.isFinite(Number(block.props?.x)) ? Number(block.props.x) : 24,
    y: typeof block.y === "number" ? block.y : Number.isFinite(Number(block.props?.y)) ? Number(block.props.y) : 24 + index * 96,
  });
  const getSize = (block: any) => ({
    width: typeof block.width === "number" ? block.width : Number.isFinite(Number(block.props?.width)) ? Number(block.props.width) : 320,
    height: typeof block.height === "number" ? block.height : Number.isFinite(Number(block.props?.height)) ? Number(block.props.height) : 92,
  });
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
    const point = canvasPoint(event); const position = getPosition(block, index); const size = getSize(block);
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
  const stopInteraction = () => {
    const current = interaction.current;
    if (current?.mode === "marquee" && marquee) {
      const next = blocks.filter((block: any, index: number) => { const p = getPosition(block, index); const s = getSize(block); return p.x < marquee.x + marquee.width && p.x + s.width > marquee.x && p.y < marquee.y + marquee.height && p.y + s.height > marquee.y; }).map((block: any) => block.id);
      setSelectedIds(next);
    }
    interaction.current = null; setMarquee(null);
  };
  const addElement = (type: BlockType) => { const block = newBlock(type); h.set((items) => [...items, { ...block, x: 32, y: Math.max(24, ...items.map((item: any, index: number) => getPosition(item, index).y + 110)) }]); setSelectedIds([block.id]); };
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
  const canvasHeight = Math.max(640, ...blocks.map((block: any, index: number) => getPosition(block, index).y + getSize(block).height + 32));
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
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <aside className="hidden w-[236px] shrink-0 flex-col border-r border-border/70 bg-card/95 lg:flex" aria-label="Ferramentas do editor">
          <div className="border-b border-border/70 p-3">
            <p className="text-sm font-semibold text-foreground">Ferramentas</p>
            <p className="mt-1 text-xs text-muted-foreground">Adicione e organize o convite.</p>
          </div>
          <div className="grid grid-cols-2 gap-1.5 border-b border-border/70 p-3">
            {(["text", "image", "gallery", "date", "time", "location", "button", "divider"] as BlockType[]).map((type) => (
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
            {contextPanel === "layers" && <div className="space-y-2"><div className="mb-2 flex items-center justify-between"><p className="text-xs font-medium text-foreground">Camadas</p><span className="text-[10px] text-muted-foreground">{blocks.length} elemento(s)</span></div>{blocks.slice().reverse().map((block: any, reverseIndex: number) => { const index = blocks.length - reverseIndex - 1; const selectedLayer = selectedIds.includes(block.id); const moveLayer = (direction: number) => h.set((items) => { const current = items.findIndex((item: any) => item.id === block.id); const target = current + direction; if (current < 0 || target < 0 || target >= items.length) return items; const next = [...items]; [next[current], next[target]] = [next[target], next[current]]; return next; }, "layers:reorder"); const toggleLayer = (key: "hidden" | "locked") => h.set((items) => items.map((item: any) => item.id === block.id ? { ...item, [key]: !item[key], ...(key === "hidden" ? { visibility: item[key] } : {}) } : item), `layers:${key}`); return <div key={block.id} className={`rounded-lg border px-2 py-2 transition ${selectedLayer ? "border-primary bg-primary/10" : "border-border/70"}`}><div className="flex items-center gap-2"><button type="button" onClick={() => select(block.id, false)} className="min-w-0 flex-1 truncate text-left text-xs text-foreground"><span className="mr-1.5 text-[10px] text-muted-foreground">{index + 1}</span>{getBlockLabel(block)}</button><button type="button" aria-label={block.hidden ? "Mostrar camada" : "Ocultar camada"} onClick={() => toggleLayer("hidden")} className={`rounded px-1.5 py-1 text-[10px] ${block.hidden ? "bg-muted text-muted-foreground" : "text-foreground hover:bg-muted"}`}>{block.hidden ? "○" : "●"}</button><button type="button" aria-label={block.locked ? "Desbloquear camada" : "Bloquear camada"} onClick={() => toggleLayer("locked")} className={`rounded px-1.5 py-1 text-[10px] ${block.locked ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>{block.locked ? "🔒" : "🔓"}</button></div><div className="mt-1.5 flex items-center justify-end gap-1"><button type="button" disabled={index === blocks.length - 1} onClick={() => moveLayer(1)} className="rounded border px-1.5 py-1 text-[10px] disabled:cursor-not-allowed disabled:opacity-40">↑</button><button type="button" disabled={index === 0} onClick={() => moveLayer(-1)} className="rounded border px-1.5 py-1 text-[10px] disabled:cursor-not-allowed disabled:opacity-40">↓</button><button type="button" onClick={() => { select(block.id, false); duplicate(); }} className="rounded border px-1.5 py-1 text-[10px]">Duplicar</button><button type="button" onClick={() => { select(block.id, false); remove(); }} className="rounded border border-destructive/30 px-1.5 py-1 text-[10px] text-destructive">Excluir</button></div></div>; })}{blocks.length === 0 && <p className="rounded-lg border border-dashed p-4 text-center text-[11px] text-muted-foreground">Nenhuma camada adicionada.</p>}</div>}
            {contextPanel === "background" && <div className="space-y-4"><div><p className="text-xs font-medium text-foreground">Fundo do convite</p><p className="mt-1 text-[11px] text-muted-foreground">Ajustes aplicados em tempo real.</p></div><label className="block space-y-1 text-xs text-muted-foreground">Cor<input type="color" value={(bg as any)?.color || "#ffffff"} onChange={(event) => onBg?.({ ...((bg as any) || {}), color: event.target.value })} className="h-9 w-full cursor-pointer rounded-md border bg-transparent p-1" /></label><label className="block space-y-1 text-xs text-muted-foreground">Gradiente CSS<input value={(bg as any)?.gradient || ""} onChange={(event) => onBg?.({ ...((bg as any) || {}), gradient: event.target.value })} placeholder="linear-gradient(135deg, #fff, #e8d8ff)" className="h-9 w-full rounded-md border bg-background px-2 text-xs text-foreground" /></label><label className="block space-y-1 text-xs text-muted-foreground">Imagem<input type="url" value={String((bg as any)?.image || "").startsWith("storage:") ? "" : ((bg as any)?.image || "")} onChange={(event) => onBg?.({ ...((bg as any) || {}), image: event.target.value })} placeholder="URL https://..." className="h-9 w-full rounded-md border bg-background px-2 text-xs text-foreground" /></label>{(bg as any)?.image && <><label className="block space-y-1 text-xs text-muted-foreground">Escala: {Math.round(Number((bg as any)?.imageScale || 100))}%<input type="range" min="25" max="200" step="5" value={Number((bg as any)?.imageScale || 100)} onChange={(event) => onBg?.({ ...((bg as any) || {}), imageScale: Number(event.target.value) })} className="w-full accent-primary" /></label><label className="block space-y-1 text-xs text-muted-foreground">Opacidade: {Math.round(Number((bg as any)?.imageOpacity ?? 1) * 100)}%<input type="range" min="0" max="1" step="0.05" value={Number((bg as any)?.imageOpacity ?? 1)} onChange={(event) => onBg?.({ ...((bg as any) || {}), imageOpacity: Number(event.target.value) })} className="w-full accent-primary" /></label></>}</div>}
            {contextPanel === "view" && <div className="space-y-3"><p className="text-xs font-medium text-foreground">Exibição</p><div className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2 text-xs"><span>Guias</span><button type="button" onClick={() => setShowGrid((value) => !value)} className={`rounded-md px-2 py-1 ${showGrid ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{showGrid ? "Ativas" : "Desativadas"}</button></div><div className="flex items-center gap-2"><button type="button" onClick={() => setZoom((value) => Math.max(50, value - 10))} className="h-8 w-8 rounded-md border">−</button><span className="flex-1 text-center text-xs">{zoom}%</span><button type="button" onClick={() => setZoom((value) => Math.min(150, value + 10))} className="h-8 w-8 rounded-md border">+</button></div></div>}
          </div>
        </aside>
        <main className="min-w-0 flex-1 bg-muted/30 p-2 sm:p-4 lg:p-6">
          <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-border/70 bg-card/90 px-3 py-2 lg:hidden"><div><p className="text-xs font-semibold">Editor visual</p><p className="text-[10px] text-muted-foreground">Canvas livre e responsivo</p></div><span className="text-xs text-muted-foreground">{zoom}%</span></div>
          <div className="h-full overflow-auto rounded-2xl border border-border/70 bg-muted/40 p-3 shadow-inner sm:p-6"><div className="mx-auto origin-top transition-transform" style={{ width: `${100 / (zoom / 100)}%`, minHeight: canvasHeight / (zoom / 100) }}><div ref={canvasRef} className={`relative isolate mx-auto w-full max-w-[768px] overflow-hidden rounded-2xl border bg-card shadow-sm ${showGrid ? "[background-image:linear-gradient(to_right,hsl(var(--border)/.25)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/.25)_1px,transparent_1px)] [background-size:16px_16px]" : ""}`} style={{ minHeight: canvasHeight, backgroundColor: bg && (bg as any).color ? (bg as any).color : undefined, transform: `scale(${zoom / 100})`, transformOrigin: "top center" }} onPointerDown={(event) => { if (event.target === event.currentTarget) { const p = canvasPoint(event); interaction.current = { mode: "marquee", startX: p.x, startY: p.y }; setSelectedIds([]); } }} onPointerMove={moveInteraction} onPointerUp={stopInteraction} onPointerCancel={stopInteraction} aria-label="Área de edição do convite"><BackgroundLayers bg={bg as any} />{blocks.length === 0 && <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">Adicione elementos pela barra de ferramentas.</div>}{marquee && <div className="pointer-events-none absolute z-50 border border-primary bg-primary/10" style={{ left: marquee.x, top: marquee.y, width: marquee.width, height: marquee.height }} />}<VisualTransformCanvas
              blocks={blocks}
              selectedIds={selectedIds}
              zoom={zoom}
              canvasRef={canvasRef}
              ctx={ctx as any}
              onSelect={select}
              onChange={(update, group) => h.set(update, group)}
            /></div></div></div>
        </main>
        <aside className="hidden w-[286px] shrink-0 overflow-y-auto border-l border-border/70 bg-card/95 p-4 lg:block" aria-label="Propriedades do elemento selecionado"><div className="mb-4"><p className="text-sm font-semibold">Propriedades</p><p className="mt-1 text-xs text-muted-foreground">{selected.length ? `${selected.length} elemento(s) selecionado(s)` : "Selecione um elemento para editar"}</p></div>{selected.length === 0 ? <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">Clique em um elemento no canvas.</div> : <div className="space-y-4">{selected.length > 1 && <p className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-primary">As alterações serão aplicadas aos elementos selecionados.</p>}{selected.length === 1 && <div className="space-y-3">{(CONTROLS[selected[0]!.type] || []).slice(0, 5).map((control: any) => { const value = String(selected[0]!.props?.[control.k] ?? ""); if (control.t === "switch") return <label key={control.k} className="flex items-center justify-between gap-2 text-xs"><span>{control.label}</span><input type="checkbox" checked={value === "1" || (SWITCH_DEFAULT_ON.has(control.k) && value !== "0")} onChange={(event) => updateSelectedProp(control.k, event.target.checked ? "1" : "0")} /></label>; return <label key={control.k} className="block space-y-1 text-xs text-muted-foreground">{control.label}{control.t === "select" && control.options?.length ? <select value={value || control.options[0][0]} onChange={(event) => updateSelectedProp(control.k, event.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-xs text-foreground">{control.options.map((option: any) => <option key={option[0]} value={option[0]}>{option[1]}</option>)}</select> : <input type={control.t === "color" ? "color" : control.t === "textarea" ? "text" : control.t} value={value} onChange={(event) => updateSelectedProp(control.k, event.target.value)} className="min-h-9 w-full rounded-md border bg-background px-2 text-xs text-foreground" />}</label>; })}</div>}<div className="grid grid-cols-2 gap-2"><label className="space-y-1 text-xs text-muted-foreground">Rotação<input type="number" value={Number(selected[0]!.rotation ?? 0)} onChange={(event) => updateSelectedBlock({ rotation: Number(event.target.value) || 0 })} className="h-9 w-full rounded-md border bg-background px-2 text-foreground" /></label><label className="space-y-1 text-xs text-muted-foreground">Opacidade<input type="number" min="0" max="1" step="0.1" value={Number(selected[0]!.opacity ?? 1)} onChange={(event) => updateSelectedBlock({ opacity: Math.min(1, Math.max(0, Number(event.target.value))) })} className="h-9 w-full rounded-md border bg-background px-2 text-foreground" /></label></div><div className="flex flex-wrap gap-1.5"><button type="button" className="rounded-md border px-2 py-1.5 text-xs" onClick={duplicate}>Duplicar</button><button type="button" className="rounded-md border px-2 py-1.5 text-xs" onClick={() => rotate(-15)}>↶</button><button type="button" className="rounded-md border px-2 py-1.5 text-xs" onClick={() => rotate(15)}>↷</button><button type="button" className="rounded-md border border-destructive/30 px-2 py-1.5 text-xs text-destructive" onClick={remove}>Excluir</button></div></div>}</aside>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-border/70 bg-card/95 p-2 lg:hidden" role="toolbar" aria-label="Ferramentas móveis do editor"><button type="button" className="flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] text-muted-foreground hover:bg-muted" onClick={() => setMobileSheet("elements")}>Elementos</button><button type="button" className="flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] text-muted-foreground hover:bg-muted" onClick={() => setMobileSheet("layers")}>Camadas</button><button type="button" className="flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] text-muted-foreground hover:bg-muted" onClick={() => setMobileSheet("properties")}>Propriedades</button><button type="button" className="flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] text-muted-foreground hover:bg-muted" onClick={() => setMobileSheet("background")}>Fundo</button><button type="button" className="flex flex-1 flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-[10px] text-muted-foreground hover:bg-muted" onClick={() => setMobileSheet("view")}>Exibir</button></div>
      {compact && mobileSheet && <div className="fixed inset-x-2 bottom-2 z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-border/80 bg-card p-4 shadow-2xl"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold">{mobileSheet === "properties" ? "Propriedades" : mobileSheet === "layers" ? "Camadas" : mobileSheet === "background" ? "Fundo" : mobileSheet === "view" ? "Exibição" : "Elementos"}</p><button type="button" className="rounded-md border px-2 py-1 text-xs" onClick={() => setMobileSheet(null)}>Fechar</button></div>{mobileSheet === "elements" && <div className="grid grid-cols-2 gap-2">{(["text", "image", "gallery", "date", "time", "location", "button", "divider"] as BlockType[]).map((type) => <button key={type} type="button" className="rounded-lg border px-3 py-2 text-left text-xs" onClick={() => { addElement(type); setMobileSheet(null); }}>+ {BLOCKS[type].label}</button>)}</div>}{mobileSheet === "layers" && <div className="space-y-2">{blocks.slice().reverse().map((block: any, reverseIndex: number) => { const index = blocks.length - reverseIndex - 1; const moveLayer = (direction: number) => h.set((items) => { const current = items.findIndex((item: any) => item.id === block.id); const target = current + direction; if (current < 0 || target < 0 || target >= items.length) return items; const next = [...items]; [next[current], next[target]] = [next[target], next[current]]; return next; }, "mobile:layers:reorder"); const toggleLayer = (key: "hidden" | "locked") => h.set((items) => items.map((item: any) => item.id === block.id ? { ...item, [key]: !item[key], ...(key === "hidden" ? { visibility: item[key] } : {}) } : item), `mobile:layers:${key}`); return <div key={block.id} className={`rounded-lg border p-2 ${selectedIds.includes(block.id) ? "border-primary bg-primary/10" : "border-border"}`}><button type="button" className="w-full truncate text-left text-xs font-medium" onClick={() => { select(block.id, false); setMobileSheet("properties"); }}>{index + 1}. {getBlockLabel(block)}</button><div className="mt-2 flex flex-wrap gap-1.5"><button type="button" disabled={index === blocks.length - 1} onClick={() => moveLayer(1)} className="rounded border px-2 py-1 text-[10px] disabled:opacity-40">Subir</button><button type="button" disabled={index === 0} onClick={() => moveLayer(-1)} className="rounded border px-2 py-1 text-[10px] disabled:opacity-40">Descer</button><button type="button" onClick={() => toggleLayer("hidden")} className="rounded border px-2 py-1 text-[10px]">{block.hidden ? "Mostrar" : "Ocultar"}</button><button type="button" onClick={() => toggleLayer("locked")} className="rounded border px-2 py-1 text-[10px]">{block.locked ? "Desbloquear" : "Bloquear"}</button><button type="button" onClick={() => { select(block.id, false); duplicate(); }} className="rounded border px-2 py-1 text-[10px]">Duplicar</button><button type="button" onClick={() => { select(block.id, false); remove(); }} className="rounded border border-destructive/30 px-2 py-1 text-[10px] text-destructive">Excluir</button></div></div>; })}{blocks.length === 0 && <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">Nenhuma camada adicionada.</p>}</div>}{mobileSheet === "properties" && <div className="space-y-3 text-xs">{selected.length === 0 ? <p className="text-muted-foreground">Selecione um elemento no canvas.</p> : selected.length > 1 ? <><p className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-primary">As alterações serão aplicadas aos {selected.length} elementos selecionados.</p><div className="flex flex-wrap gap-2"><button type="button" className="rounded-md border px-3 py-2" onClick={duplicate}>Duplicar</button><button type="button" className="rounded-md border px-3 py-2" onClick={() => h.set((items) => items.map((item: any) => selectedIds.includes(item.id) ? { ...item, hidden: !item.hidden, visibility: item.hidden } : item), "mobile:selection:visibility")}>{selected.some((item: any) => item.hidden) ? "Mostrar" : "Ocultar"}</button><button type="button" className="rounded-md border border-destructive/30 px-3 py-2 text-destructive" onClick={remove}>Excluir</button></div></> : <div className="space-y-3"><p className="font-medium text-foreground">{getBlockLabel(selected[0])}</p>{(CONTROLS[selected[0]!.type] || []).map((control: any) => { const value = String(selected[0]!.props?.[control.k] ?? ""); if (control.t === "switch") return <label key={control.k} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"><span>{control.label}</span><input type="checkbox" checked={value === "1" || (SWITCH_DEFAULT_ON.has(control.k) && value !== "0")} onChange={(event) => updateSelectedProp(control.k, event.target.checked ? "1" : "0")} /></label>; if (control.t === "select" && control.options?.length) return <label key={control.k} className="block space-y-1 text-muted-foreground">{control.label}<select value={value || control.options[0][0]} onChange={(event) => updateSelectedProp(control.k, event.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-foreground">{control.options.map((option: any) => <option key={option[0]} value={option[0]}>{option[1]}</option>)}</select></label>; return <label key={control.k} className="block space-y-1 text-muted-foreground">{control.label}{control.t === "color" ? <input type="color" value={value || "#000000"} onChange={(event) => updateSelectedProp(control.k, event.target.value)} className="h-9 w-full rounded-md border bg-transparent p-1" /> : <input type={control.t === "textarea" ? "text" : control.t} value={value} onChange={(event) => updateSelectedProp(control.k, event.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-foreground" />}</label>; })}<div className="flex flex-wrap gap-2"><button type="button" className="rounded-md border px-3 py-2" onClick={duplicate}>Duplicar</button><button type="button" className="rounded-md border px-3 py-2" onClick={() => rotate(-15)}>↶</button><button type="button" className="rounded-md border px-3 py-2" onClick={() => rotate(15)}>↷</button><button type="button" className="rounded-md border border-destructive/30 px-3 py-2 text-destructive" onClick={remove}>Excluir</button></div></div>}</div>}{mobileSheet === "background" && <div className="space-y-3"><label className="block space-y-1 text-xs text-muted-foreground">Cor<input type="color" value={(bg as any)?.color || "#ffffff"} onChange={(event) => onBg?.({ ...((bg as any) || {}), color: event.target.value })} className="h-10 w-full rounded border p-1" /></label><label className="block space-y-1 text-xs text-muted-foreground">Gradiente CSS<input value={(bg as any)?.gradient || ""} onChange={(event) => onBg?.({ ...((bg as any) || {}), gradient: event.target.value })} placeholder="linear-gradient(135deg, #fff, #e8d8ff)" className="h-9 w-full rounded border bg-background px-2 text-xs" /></label><label className="block space-y-1 text-xs text-muted-foreground">Imagem<input type="url" value={String((bg as any)?.image || "").startsWith("storage:") ? "" : ((bg as any)?.image || "")} onChange={(event) => onBg?.({ ...((bg as any) || {}), image: event.target.value })} placeholder="URL https://..." className="h-9 w-full rounded border bg-background px-2 text-xs" /></label>{(bg as any)?.image && <><label className="block space-y-1 text-xs text-muted-foreground">Escala: {Math.round(Number((bg as any)?.imageScale || 100))}%<input type="range" min="25" max="200" step="5" value={Number((bg as any)?.imageScale || 100)} onChange={(event) => onBg?.({ ...((bg as any) || {}), imageScale: Number(event.target.value) })} className="w-full accent-primary" /></label><label className="block space-y-1 text-xs text-muted-foreground">Opacidade: {Math.round(Number((bg as any)?.imageOpacity ?? 1) * 100)}%<input type="range" min="0" max="1" step="0.05" value={Number((bg as any)?.imageOpacity ?? 1)} onChange={(event) => onBg?.({ ...((bg as any) || {}), imageOpacity: Number(event.target.value) })} className="w-full accent-primary" /></label></>}</div>}{mobileSheet === "view" && <div className="space-y-3"><div className="flex items-center gap-2"><button type="button" className="rounded border px-3 py-2" onClick={() => setZoom((value) => Math.max(50, value - 10))}>−</button><span className="flex-1 text-center">{zoom}%</span><button type="button" className="rounded border px-3 py-2" onClick={() => setZoom((value) => Math.min(150, value + 10))}>+</button></div><button type="button" className={`w-full rounded border px-3 py-2 ${showGrid ? "bg-primary/10 text-primary" : "text-muted-foreground"}`} onClick={() => setShowGrid((value) => !value)}>{showGrid ? "Guias ativas" : "Ativar guias"}</button></div>}</div>}
    </div>
  );
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3 shadow-sm">
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-foreground">Editor visual v1.5</p><p className="text-xs text-muted-foreground">Canvas WYSIWYG profissional com interação direta sobre a arte real, seleção, transformação, camadas, propriedades e persistência automática.</p></div>
        <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-muted/40 p-1">{(["text", "image", "gallery", "date", "time", "location", "button", "divider"] as BlockType[]).map((type) => <button key={type} type="button" className="rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-background hover:text-foreground" onClick={() => addElement(type)}>+ {BLOCKS[type].label}</button>)}</div>
        <button type="button" className="rounded-md border px-2 py-1 text-xs" onClick={() => setZoom((value) => Math.max(50, value - 10))}>−</button><span className="min-w-12 text-center text-xs">{zoom}%</span><button type="button" className="rounded-md border px-2 py-1 text-xs" onClick={() => setZoom((value) => Math.min(150, value + 10))}>+</button>
        <button type="button" className={`rounded-md border px-2 py-1 text-xs ${showGrid ? "bg-primary/10 text-primary" : "text-muted-foreground"}`} onClick={() => setShowGrid((value) => !value)}>Guias</button>
      </div>
      {selectedIds.length > 0 && <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-2 text-xs"><span className="font-medium">{selectedIds.length} selecionado(s)</span><button type="button" className="rounded border px-2 py-1" onClick={duplicate}>Duplicar</button><button type="button" className="rounded border px-2 py-1" onClick={() => rotate(-15)}>↶ Girar</button><button type="button" className="rounded border px-2 py-1" onClick={() => rotate(15)}>↷ Girar</button><button type="button" className="rounded border px-2 py-1" onClick={() => h.set((items) => items.map((item: any) => selectedIds.includes(item.id) ? { ...item, locked: !item.locked } : item), "selection:lock")}>{selected.some((item: any) => item.locked) ? "Desbloquear" : "Bloquear"}</button><button type="button" className="rounded border px-2 py-1" onClick={() => h.set((items) => items.map((item: any) => selectedIds.includes(item.id) ? { ...item, visibility: item.visibility === false, hidden: item.visibility !== false } : item), "selection:visibility")}>{selected.some((item: any) => item.hidden) ? "Mostrar" : "Ocultar"}</button><button type="button" className="rounded border border-destructive/30 px-2 py-1 text-destructive" onClick={remove}>Excluir</button></div>}
      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
        <aside className="rounded-2xl border bg-card p-4 shadow-sm" aria-label="Configurações do convite">
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Fundo</p>
              <p className="mt-1 text-xs text-muted-foreground">Atualize o fundo do convite em tempo real.</p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="editor-background-color" className="text-xs font-medium text-foreground">Cor</label>
              <div className="flex items-center gap-2">
                <input
                  id="editor-background-color"
                  type="color"
                  value={(bg as any)?.color || "#ffffff"}
                  onChange={(event) => onBg?.({ ...((bg as any) || {}), color: event.target.value })}
                  className="h-9 w-12 cursor-pointer rounded-md border bg-transparent p-1"
                />
                {(bg as any)?.color && <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => onBg?.({ ...((bg as any) || {}), color: "" })}>Limpar</button>}
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="editor-background-gradient" className="text-xs font-medium text-foreground">Gradiente</label>
              <input
                id="editor-background-gradient"
                type="text"
                value={(bg as any)?.gradient || ""}
                onChange={(event) => onBg?.({ ...((bg as any) || {}), gradient: event.target.value })}
                placeholder="linear-gradient(135deg, #fff, #e8d8ff)"
                className="h-9 w-full rounded-md border bg-background px-3 text-xs text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              />
              {(bg as any)?.gradient && <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => onBg?.({ ...((bg as any) || {}), gradient: "" })}>Remover gradiente</button>}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">Imagem</p>
              <ImageUpload scope={assets as any} value={(bg as any)?.image || ""} onChange={(value) => onBg?.({ ...((bg as any) || {}), image: value })} />
              <input
                type="url"
                value={String((bg as any)?.image || "").startsWith("storage:") ? "" : ((bg as any)?.image || "")}
                onChange={(event) => onBg?.({ ...((bg as any) || {}), image: event.target.value })}
                placeholder="Ou cole uma URL https://..."
                className="h-9 w-full rounded-md border bg-background px-3 text-xs text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
              />
              {(bg as any)?.image && <button type="button" className="w-full rounded-md border px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10" onClick={() => onBg?.({ ...((bg as any) || {}), image: "" })}>Remover imagem</button>}
            </div>
            {(bg as any)?.image && <div className="space-y-3 border-t pt-3">
              <label className="block text-xs font-medium text-foreground">Escala: {Math.round(Number((bg as any)?.imageScale || 100))}%</label>
              <input type="range" min="25" max="200" step="5" value={Number((bg as any)?.imageScale || 100)} onChange={(event) => onBg?.({ ...((bg as any) || {}), imageScale: Number(event.target.value) })} className="w-full accent-primary" />
              <label className="block text-xs font-medium text-foreground">Opacidade: {Math.round(Number((bg as any)?.imageOpacity ?? 1) * 100)}%</label>
              <input type="range" min="0" max="1" step="0.05" value={Number((bg as any)?.imageOpacity ?? 1)} onChange={(event) => onBg?.({ ...((bg as any) || {}), imageOpacity: Number(event.target.value) })} className="w-full accent-primary" />
            </div>}
          </div>
        </aside>
        <div className="overflow-auto rounded-2xl border bg-muted/40 p-3 shadow-inner sm:p-6"><div className="mx-auto origin-top transition-transform" style={{ width: `${100 / (zoom / 100)}%`, minHeight: canvasHeight / (zoom / 100) }}><div ref={canvasRef} className={`relative isolate mx-auto w-full max-w-[768px] overflow-hidden rounded-2xl border bg-card shadow-sm ${showGrid ? "[background-image:linear-gradient(to_right,hsl(var(--border)/.25)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/.25)_1px,transparent_1px)] [background-size:16px_16px]" : ""}`} style={{ minHeight: canvasHeight, backgroundColor: bg && (bg as any).color ? (bg as any).color : undefined, transform: `scale(${zoom / 100})`, transformOrigin: "top center" }} onPointerDown={(event) => { if (event.target === event.currentTarget) { const p = canvasPoint(event); interaction.current = { mode: "marquee", startX: p.x, startY: p.y }; setSelectedIds([]); } }} onPointerMove={moveInteraction} onPointerUp={stopInteraction} onPointerCancel={stopInteraction} aria-label="Área de edição do convite"><BackgroundLayers bg={bg as any} />{blocks.length === 0 && <div className="absolute inset-0 flex items-center justify-center text-center text-sm text-muted-foreground">Adicione elementos pela biblioteca acima.</div>}{marquee && <div className="pointer-events-none absolute z-50 border border-primary bg-primary/10" style={{ left: marquee.x, top: marquee.y, width: marquee.width, height: marquee.height }} />}<VisualTransformCanvas blocks={blocks} selectedIds={selectedIds} zoom={zoom} canvasRef={canvasRef} ctx={ctx as any} onSelect={select} onChange={(update, group) => h.set(update, group)} /></div></div></div><aside className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm" aria-label="Propriedades do elemento selecionado"><ContextualPropertiesPanel blocks={blocks} selectedIds={selectedIds} onChange={(update, group) => h.set(update, group)} onDuplicate={duplicateByIds} onDelete={removeByIds} /></aside></div>
      <section className="rounded-xl border bg-card p-3" aria-label="Ferramentas do editor">
        <div className="flex gap-1 overflow-x-auto pb-2" role="tablist" aria-label="Categorias do editor">
          {["Elementos", "Texto", "Imagens", "Botões", "RSVP", "QR Code", "Camadas", "Fundo", "Exibir"].map((category) => {
            const active = toolCategory === category;
            return <button key={category} type="button" role="tab" aria-selected={active} className={`shrink-0 rounded-md border px-2.5 py-1.5 text-xs transition-colors ${active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`} onClick={() => {
              setToolCategory(category);
              if (category === "Camadas") { setContextPanel("layers"); setMobileSheet("layers"); }
              else if (category === "Fundo") { setContextPanel("background"); setMobileSheet("background"); }
              else if (category === "Exibir") { setContextPanel("view"); setMobileSheet("view"); }
              else { setContextPanel("elements"); setMobileSheet("elements"); }
            }}>{category}</button>;
          })}
        </div>
        {["Fundo", "Exibir"].includes(toolCategory) ? <p className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">Os controles de {toolCategory.toLowerCase()} estão disponíveis no painel contextual.</p> : toolCategory === "Camadas" ? <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={!selectedIds.length} className="rounded-md border px-2 py-1 text-xs text-foreground disabled:opacity-50" onClick={() => duplicateByIds(selectedIds)}>Duplicar seleção</button>
            <button type="button" disabled={!selectedIds.length} className="rounded-md border border-destructive/40 px-2 py-1 text-xs text-destructive disabled:opacity-50" onClick={() => removeByIds(selectedIds)}>Excluir seleção</button>
          </div>
          <div className="space-y-1">
            {blocks.map((block: any, index: number) => <div key={block.id} className={`flex items-center gap-2 rounded-md border px-2 py-1.5 ${selectedIds.includes(block.id) ? "border-primary bg-primary/10" : "border-transparent"}`}>
              <button type="button" className="min-w-0 flex-1 truncate text-left text-xs text-foreground" onClick={() => select(block.id, false)}>{index + 1}. {getBlockLabel(block)}</button>
              <button type="button" className="rounded px-1.5 py-1 text-[11px] text-muted-foreground hover:bg-accent" aria-label={`Duplicar ${getBlockLabel(block)}`} onClick={() => duplicateByIds([block.id])}>Copiar</button>
              <button type="button" className="rounded px-1.5 py-1 text-[11px] text-destructive hover:bg-destructive/10" aria-label={`Excluir ${getBlockLabel(block)}`} onClick={() => removeByIds([block.id])}>Excluir</button>
            </div>)}
          </div>
        </div> : <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {(categoryGroups[toolCategory] || []).map((type) => <button key={type} type="button" className="rounded-lg border bg-background px-2 py-2 text-left text-xs text-foreground transition-colors hover:border-primary hover:bg-primary/5" onClick={() => addBlockByType(type)}>{BLOCKS[type].label}</button>)}
        </div>}
      </section>
      <p className="text-xs text-muted-foreground">Arraste com mouse ou toque, use Shift para snap, Shift/Ctrl para múltipla seleção, Ctrl/Cmd+C para copiar, Ctrl/Cmd+V para colar e arraste o fundo para selecionar uma área. Alterações são persistidas pelo autosave existente.</p>
    </div>
  );
  /*
  const editorRoot = useRef<HTMLDivElement>(null);
  // Side panels only fit from 1024px up; below that Elements/Properties open as bottom drawers.
  const isMobile = useIsCompact();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selected, setSelectedValue] = useState<string | null>(null);
  const [device, setDevice] = useState<Device>("mobile");
  const [zoom, setZoom] = useState(100);
  const [previewOnly, setPreviewOnly] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [sheet, setSheet] = useState<"elements" | "props" | null>(null);
  const clipboard = useRef<Block | null>(null);
  const sel = blocks.find((b) => b.id === selected) ?? null;
  const selectedBlocks = blocks.filter((b) => selectedIds.includes(b.id));
  const setSelected = (id: string | null) => {
    setSelectedValue(id);
    setSelectedIds(id ? [id] : []);
  };
  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
      setSelectedValue(next[0] ?? null);
      return next;
    });
  };


  // Atalhos de edição, ignorando campos de formulário para não interferir na digitação.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, [contenteditable=true], [role=combobox]")) return;
      const command = e.ctrlKey || e.metaKey;
      if (command && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) h.redo(); else h.undo(); return; }
      if (command && e.key.toLowerCase() === "y") { e.preventDefault(); h.redo(); return; }
      if (command && e.key.toLowerCase() === "s") { e.preventDefault(); toast("As alterações são salvas automaticamente."); return; }
      if (e.key === "Escape" && focusMode) { e.preventDefault(); setFocusMode(false); return; }
      if (command && e.key.toLowerCase() === "c" && sel) { e.preventDefault(); clipboard.current = structuredClone(sel); return; }
      if (command && e.key.toLowerCase() === "v" && clipboard.current) {
        e.preventDefault();
        if (clipboard.current.type === "rsvp" && blocks.some((x) => x.type === "rsvp")) { toast.error(RSVP_DUP); return; }
        const pasted = { ...structuredClone(clipboard.current), id: crypto.randomUUID() };
        const index = sel ? blocks.findIndex((x) => x.id === sel.id) + 1 : blocks.length;
        set([...blocks.slice(0, index), pasted, ...blocks.slice(index)]);
        setSelected(pasted.id);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && sel && !sel.locked) {
        e.preventDefault();
        set((bs) => bs.filter((b) => b.id !== sel.id));
        setSelected(null);
      }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [blocks, h, sel, set]);

  const add = (type: BlockType) => {
    if (type === "rsvp" && blocks.some((x) => x.type === "rsvp")) { toast.error(RSVP_DUP); return; }
    const b = newBlock(type);
    const idx = sel ? blocks.findIndex((x) => x.id === sel.id) + 1 : blocks.length;
    set([...blocks.slice(0, idx), b, ...blocks.slice(idx)]);
    setSelected(b.id);
    setSheet(isMobile ? "props" : null);
  };
  const move = (id: string, d: number) => set((bs) => { const i = bs.findIndex((x) => x.id === id); const j = i + d; if (i < 0 || j < 0 || j >= bs.length) return bs; const c = [...bs]; [c[i], c[j]] = [c[j]!, c[i]!]; return c; });
  const reorder = (from: number, to: number) => set((bs) => { if (from === to) return bs; const c = [...bs]; const [x] = c.splice(from, 1); c.splice(to, 0, x!); return c; });
  const duplicate = (id: string) => {
    const i = blocks.findIndex((x) => x.id === id); if (i < 0) return;
    if (blocks[i]!.type === "rsvp") { toast.error(RSVP_DUP); return; }
    const copy = { ...structuredClone(blocks[i]!), id: crypto.randomUUID() };
    set([...blocks.slice(0, i + 1), copy, ...blocks.slice(i + 1)]); setSelected(copy.id);
  };
  const toggleHidden = (id: string) => set((bs) => bs.map((b) => (b.id === id ? { ...b, hidden: !b.hidden } : b)));
  const toggleLocked = (id: string) => set((bs) => bs.map((b) => (b.id === id ? { ...b, locked: !b.locked } : b)));
  const remove = (id: string) => {
    const target = blocks.find((b) => b.id === id);
    if (target?.locked) { toast.error("Desbloqueie o bloco antes de excluí-lo."); return; }
    set((bs) => bs.filter((b) => b.id !== id));
    if (selected === id) setSelected(null);
    toast("Bloco excluído.", { action: { label: "Desfazer", onClick: h.undo } });
  };
  const setProp = (id: string, k: string, v: string) => set((bs) => bs.map((b) => {
    if (b.id !== id || b.locked) return b;
    const geometryKeys = new Set(["x", "y", "width", "height", "rotation", "zIndex", "scale", "opacity"]);
    if (!geometryKeys.has(k)) return { ...b, props: { ...b.props, [k]: v } };
    if (v.trim() === "") {
      const next = { ...b };
      delete next[k as "x" | "y" | "width" | "height" | "rotation" | "zIndex" | "scale" | "opacity"];
      return next;
    }
    const numeric = Number(v);
    if (!Number.isFinite(numeric)) return b;
    return { ...b, [k]: numeric };
  }), `${id}:${k}`);
  const alignSelected = (align: "left" | "center" | "right") => { if (sel && !sel.locked) setProp(sel.id, "align", align); };
  const alignMultiple = (align: "left" | "center" | "right") => {
    if (selectedIds.length < 2) return alignSelected(align);
    set((bs) => bs.map((b) => selectedIds.includes(b.id) && !b.locked ? { ...b, props: { ...b.props, align } } : b), "selection:align");
  };
  const distributeMultiple = () => {
    if (selectedIds.length < 3) return;
    const ordered = blocks.filter((b) => selectedIds.includes(b.id));
    set((bs) => bs.map((b) => {
      const index = ordered.findIndex((item) => item.id === b.id);
      if (index < 0 || b.locked) return b;
      return { ...b, props: { ...b.props, position: String(index), distribution: "even" } };
    }), "selection:distribute");
  };
  const groupSelected = () => {
    if (selectedIds.length < 2) return;
    const groupId = crypto.randomUUID();
    set((bs) => bs.map((b) => selectedIds.includes(b.id) && !b.locked ? { ...b, props: { ...b.props, __group: groupId } } : b), "selection:group");
    toast.success("Elementos agrupados.");
  };
  const ungroupSelected = () => {
    const groups = new Set(selectedBlocks.map((b) => b.props.__group).filter(Boolean));
    if (!groups.size) return;
    set((bs) => bs.map((b) => {
      if (!selectedIds.includes(b.id) || b.locked || !b.props.__group) return b;
      const { __group: _group, ...props } = b.props;
      return { ...b, props };
    }), "selection:ungroup");
    toast.success("Agrupamento removido.");
  };
  const duplicateMultiple = () => {
    const source = blocks.filter((b) => selectedIds.includes(b.id));
    if (!source.length) return;
    if (source.some((b) => b.type === "rsvp")) { toast.error(RSVP_DUP); return; }
    const copies = source.map((b) => ({ ...structuredClone(b), id: crypto.randomUUID() }));
    set((bs) => [...bs, ...copies]);
    setSelectedIds(copies.map((b) => b.id));
    setSelectedValue(copies[0]?.id ?? null);
  };
  const removeMultiple = () => {
    const removable = new Set(selectedBlocks.filter((b) => !b.locked).map((b) => b.id));
    if (!removable.size) return;
    set((bs) => bs.filter((b) => !removable.has(b.id)));
    setSelected(null);
  };
  const moveMultiple = (direction: -1 | 1) => {
    if (selectedIds.length < 2) return;
    set((bs) => {
      const result = [...bs];
      const indexes = selectedIds.map((id) => result.findIndex((b) => b.id === id)).filter((index) => index >= 0).sort((a, b) => direction > 0 ? b - a : a - b);
      indexes.forEach((index) => {
        const next = index + direction;
        if (next < 0 || next >= result.length || selectedIds.includes(result[next]!.id)) return;
        [result[index], result[next]] = [result[next]!, result[index]!];
      });
      return result;
    }, "selection:move");
  };
  const convertToText = (id: string) => set((bs) => bs.map((b) => (b.id === id ? { ...newBlock("text"), id, props: { ...BLOCKS.text.defaults, text: Object.values(b.props ?? {}).filter((x) => typeof x === "string").join(" ") || "Texto" } } : b)));

  const actions = { move, duplicate, toggleHidden, toggleLocked, remove };
  const select = (id: string) => { setSelected(id); if (isMobile) setSheet("props"); };

  const library = <Library onAdd={add} />;
  const layers = <Layers_ blocks={blocks} selected={selected} onSelect={select} reorder={reorder} actions={actions} />;
  const props = !sel && onBg ? <BackgroundPanel bg={bg ?? {}} onBg={onBg} assets={assets} /> : <Properties assets={assets} block={sel} setProp={setProp} actions={actions} convertToText={convertToText} blocksLen={blocks.length} index={sel ? blocks.indexOf(sel) : -1} />;

  return (
    <div ref={editorRoot} className="relative flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-2.5 shadow-sm sm:sticky sm:top-4 sm:z-20 sm:p-3">
        <div className="flex items-center gap-1 rounded-lg bg-muted/60 p-0.5" aria-label="Histórico">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Desfazer" title="Desfazer (Ctrl+Z)" disabled={!h.canUndo} onClick={h.undo}><Undo2 className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Refazer" title="Refazer (Ctrl+Shift+Z)" disabled={!h.canRedo} onClick={h.redo}><Redo2 className="h-4 w-4" /></Button>
        </div>
        <div className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <div className="flex rounded-lg border bg-background p-0.5" role="group" aria-label="Visualização">
          {([["mobile", Smartphone, "Celular"], ["tablet", Tablet, "Tablet"], ["desktop", Monitor, "Desktop"]] as const).map(([d, Icon, label]) => (
            <Button key={d} type="button" size="sm" variant={device === d ? "secondary" : "ghost"} className="h-8 px-2" aria-label={label} aria-pressed={device === d} onClick={() => setDevice(d)}>
              <Icon className="h-4 w-4" /><span className="hidden sm:inline">{label}</span>
            </Button>
          ))}
        </div>
        {!previewOnly && <div className="flex items-center rounded-lg border bg-background p-0.5" role="group" aria-label="Zoom do canvas">
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Reduzir zoom" disabled={zoom <= 60} onClick={() => setZoom((value) => Math.max(60, value - 10))}><Minus className="h-4 w-4" /></Button>
          <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground">{zoom}%</span>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Aumentar zoom" disabled={zoom >= 140} onClick={() => setZoom((value) => Math.min(140, value + 10))}><Plus className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Redefinir zoom" onClick={() => setZoom(100)}><RotateCcw className="h-3.5 w-3.5" /></Button>
        </div>}
        <Button type="button" size="sm" variant={previewOnly ? "secondary" : "ghost"} className="border border-transparent" onClick={() => { setPreviewOnly(!previewOnly); setSelected(null); }}>
          <Eye className="h-4 w-4" />{previewOnly ? "Voltar a editar" : "Preview"}
        </Button>
        {!previewOnly && (
          <>
            <div className="hidden items-center gap-0.5 rounded-lg border bg-background p-0.5 sm:flex" role="group" aria-label="Alinhamento dos blocos selecionados">
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Alinhar à esquerda" disabled={!selectedIds.length} onClick={() => alignMultiple("left")}><AlignLeft className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Centralizar" disabled={!selectedIds.length} onClick={() => alignMultiple("center")}><AlignCenter className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Alinhar à direita" disabled={!selectedIds.length} onClick={() => alignMultiple("right")}><AlignRight className="h-4 w-4" /></Button>
            </div>
            {selectedIds.length > 1 && <div className="flex flex-wrap items-center gap-1 rounded-lg border bg-background p-0.5" role="group" aria-label="Ações coletivas">
              <Button type="button" size="sm" variant="ghost" onClick={() => moveMultiple(-1)} title="Mover seleção para cima"><ArrowUp className="h-4 w-4" /></Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => moveMultiple(1)} title="Mover seleção para baixo"><ArrowDown className="h-4 w-4" /></Button>
              <Button type="button" size="sm" variant="ghost" onClick={duplicateMultiple}><Copy className="h-4 w-4" />Duplicar</Button>
              <Button type="button" size="sm" variant="ghost" onClick={groupSelected}>Agrupar</Button>
              <Button type="button" size="sm" variant="ghost" onClick={ungroupSelected}>Desagrupar</Button>
              <Button type="button" size="sm" variant="ghost" onClick={distributeMultiple}>Distribuir</Button>
              <Button type="button" size="sm" variant="ghost" className="text-destructive" onClick={removeMultiple}><Trash2 className="h-4 w-4" />Excluir</Button>
            </div>}
            <Button type="button" size="sm" variant={showGuides ? "secondary" : "ghost"} aria-pressed={showGuides} onClick={() => setShowGuides((value) => !value)}>
              <Crosshair className="h-4 w-4" />Guias
            </Button>
            <Button type="button" size="sm" variant={showRulers ? "secondary" : "ghost"} aria-pressed={showRulers} onClick={() => setShowRulers((value) => !value)} title="Mostrar ou ocultar réguas">
              <Ruler className="h-4 w-4" />Réguas
            </Button>
            <Button type="button" size="sm" variant={showGrid ? "secondary" : "ghost"} aria-pressed={showGrid} onClick={() => setShowGrid((value) => !value)} title="Mostrar ou ocultar a grade local">
              <Grid3X3 className="h-4 w-4" />Grade
            </Button>
            <Button type="button" size="sm" variant={snapToGrid ? "secondary" : "ghost"} aria-pressed={snapToGrid} onClick={() => setSnapToGrid((value) => !value)} title="Ativar ou desativar snap na grade">
              Snap
            </Button>
            <Button type="button" size="sm" variant={focusMode ? "secondary" : "ghost"} aria-pressed={focusMode} onClick={() => { setFocusMode((value) => !value); setSelected(null); }} title="Alternar modo foco (Esc)">
              <Maximize2 className="h-4 w-4" />{focusMode ? "Sair do foco" : "Modo foco"}
            </Button>
          </>
        )}
        {isMobile && !previewOnly && !focusMode && (
          <>
            <Button type="button" size="sm" variant="outline" onClick={() => setSheet("elements")}><Plus className="h-4 w-4" />Elementos</Button>
            <Button type="button" size="sm" variant="outline" disabled={!sel && !onBg} onClick={() => setSheet("props")}><Settings2 className="h-4 w-4" />{sel || !onBg ? "Propriedades" : "Fundo"}</Button>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">{toolbarExtra}</div>
      </div>

      <div className={cn("grid gap-4", !previewOnly && !focusMode && "lg:grid-cols-[220px_minmax(0,1fr)_300px]")}>
        {!previewOnly && !isMobile && !focusMode && (
          <aside className="space-y-3 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto" aria-label="Ferramentas do editor">
            <Panel title="Elementos" description="Adicione blocos ao convite">{library}</Panel>
            <Panel title="Ordem dos blocos" icon={<Layers className="h-4 w-4" />} description="Arraste para reorganizar">{layers}</Panel>
          </aside>
        )}

        <div className="min-w-0 overflow-auto rounded-2xl border bg-muted/40 p-3 shadow-inner sm:p-6" onClick={() => setSelected(null)} aria-label="Área de edição do convite">
          <div className={cn("mx-auto w-full transition-[max-width]", DEVICE_W[device])} data-editor-zoom={zoom} style={{ zoom: zoom / 100 }}>
            <div
              className="relative isolate flex w-full flex-col gap-2 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm sm:p-6"
              style={{
                ...bgColorStyle(bg),
                backgroundImage: showGrid
                  ? "linear-gradient(to right, color-mix(in oklch, var(--primary) 14%, transparent) 1px, transparent 1px), linear-gradient(to bottom, color-mix(in oklch, var(--primary) 14%, transparent) 1px, transparent 1px)"
                  : undefined,
                backgroundSize: showGrid ? `${GRID_UNIT}px ${GRID_UNIT}px` : undefined,
                backgroundPosition: "0 0",
              }}
            >
              {showRulers && !previewOnly && (
                <>
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 z-20 h-5 border-b bg-background/80"
                    style={{
                      backgroundImage: "repeating-linear-gradient(to right, transparent 0, transparent 15px, color-mix(in oklch, var(--foreground) 30%, transparent) 15px, color-mix(in oklch, var(--foreground) 30%, transparent) 16px)",
                      backgroundSize: `${GRID_UNIT}px 100%`,
                    }}
                  />
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-0 left-0 z-20 w-5 border-r bg-background/80"
                    style={{
                      backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 15px, color-mix(in oklch, var(--foreground) 30%, transparent) 15px, color-mix(in oklch, var(--foreground) 30%, transparent) 16px)",
                      backgroundSize: `100% ${GRID_UNIT}px`,
                    }}
                  />
                </>
              )}
              <BackgroundLayers bg={bg} />
              {blocks.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">Adicione elementos para começar.</p>}
              {showGuides && !previewOnly && <>
                <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-primary/20" />
                <div aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-dashed border-primary/20" />
              </>}
              {blocks.map((b, i) => previewOnly
                ? (b.hidden ? null : <div key={b.id} className="py-1"><BlockView block={b} ctx={ctx} interactive /></div>)
                : <div key={b.id} data-editor-block-id={b.id} className={cn("relative rounded-lg transition-shadow", selectedIds.includes(b.id) && "ring-2 ring-primary ring-offset-2 ring-offset-card")} onClick={(event) => { event.stopPropagation(); if (event.shiftKey || event.ctrlKey || event.metaKey) toggleSelected(b.id); else setSelected(b.id); }}>
                    <CanvasBlock block={b} ctx={ctx} selected={selectedIds.includes(b.id)} onSelect={select} first={i === 0} last={i === blocks.length - 1} actions={actions} />
                  </div>)}
            </div>
          </div>
        </div>

        {!previewOnly && !isMobile && !focusMode && (
          <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto" aria-label="Propriedades do elemento">
            <Panel title="Propriedades" description={sel ? "Ajuste o bloco selecionado" : "Selecione um bloco ou o fundo"}>{props}</Panel>
          </aside>
        )}
      </div>

      {isMobile && !focusMode && (
        <Sheet open={sheet !== null} onOpenChange={(o) => !o && setSheet(null)}>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
            <SheetHeader><SheetTitle>{sheet === "elements" ? "Elementos" : sel || !onBg ? "Propriedades" : "Fundo do convite"}</SheetTitle></SheetHeader>
            <div className="mt-4 space-y-5">
              {sheet === "elements" ? <>{library}<div><h3 className="mb-2 text-sm font-medium">Ordem dos blocos</h3>{layers}</div></> : props}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function Panel({ title, icon, description, children }: { title: string; icon?: ReactNode; description?: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border bg-card p-3 shadow-sm">
      <div className="mb-3 border-b pb-3">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold">{icon}{title}</h2>
        {description && <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Library({ onAdd }: { onAdd: (t: BlockType) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {(Object.keys(BLOCKS) as BlockType[]).map((t) => {
        const Icon = BLOCK_ICONS[t];
        return (
          <button key={t} type="button" onClick={() => onAdd(t)} aria-label={`Adicionar ${BLOCKS[t].label}`} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-md border bg-background p-2 text-center text-xs transition-colors hover:border-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <Icon className="h-4 w-4 text-muted-foreground" />{BLOCKS[t].label}
          </button>
        );
      })}
    </div>
  );
}

type Actions = { move: (id: string, d: number) => void; duplicate: (id: string) => void; toggleHidden: (id: string) => void; toggleLocked: (id: string) => void; remove: (id: string) => void };

function BlockActions({ b, first, last, actions, compact }: { b: Block; first: boolean; last: boolean; actions: Actions; compact?: boolean }) {
  const btn = "h-7 w-7";
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };
  return (
    <div className={cn("flex items-center", compact ? "gap-0" : "gap-0.5")}>
      <Button type="button" variant="ghost" size="icon" className={btn} aria-label="Mover para cima" disabled={first} onClick={stop(() => actions.move(b.id, -1))}><ArrowUp className="h-3.5 w-3.5" /></Button>
      <Button type="button" variant="ghost" size="icon" className={btn} aria-label="Mover para baixo" disabled={last} onClick={stop(() => actions.move(b.id, 1))}><ArrowDown className="h-3.5 w-3.5" /></Button>
      <Button type="button" variant="ghost" size="icon" className={btn} aria-label="Duplicar" onClick={stop(() => actions.duplicate(b.id))}><Copy className="h-3.5 w-3.5" /></Button>
      <Button type="button" variant="ghost" size="icon" className={btn} aria-label={b.hidden ? "Mostrar" : "Ocultar"} onClick={stop(() => actions.toggleHidden(b.id))}>{b.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button>
      <Button type="button" variant="ghost" size="icon" className={btn} aria-label={b.locked ? "Desbloquear" : "Bloquear"} title={b.locked ? "Desbloquear bloco" : "Bloquear bloco"} onClick={stop(() => actions.toggleLocked(b.id))}>{b.locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}</Button>
      <Button type="button" variant="ghost" size="icon" className={cn(btn, "text-destructive")} aria-label="Excluir" onClick={stop(() => actions.remove(b.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
    </div>
  );
}

const CanvasBlock = memo(function CanvasBlock({ block, ctx, selected, onSelect, first, last, actions }: {
  block: Block; ctx?: EventCtx | undefined; selected: boolean; onSelect: (id: string) => void; first: boolean; last: boolean; actions: Actions;
}) {
  const select = () => { if (!block.locked) onSelect(block.id); };
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          role="button" tabIndex={0} aria-label={`Selecionar ${blockLabel(block)}`}
          onClick={(e) => { e.stopPropagation(); select(); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); select(); } }}
          className={cn("group relative rounded-lg border-2 p-2 outline-none transition-colors",
            block.locked ? "cursor-not-allowed border-border/50" : "cursor-pointer",
            selected ? "border-primary" : "border-dashed border-border/60 hover:border-primary/40 focus-visible:border-primary/60",
            block.hidden && "opacity-40")}
        >
          {selected && (
            <div className="absolute -top-4 right-2 z-10 flex items-center gap-1 rounded-md border bg-popover px-1 shadow-sm">
              <span className="px-1 text-[11px] font-medium">{blockLabel(block)}</span>
              <BlockActions b={block} first={first} last={last} actions={actions} compact />
            </div>
          )}
          {block.hidden && <span className="absolute left-2 top-1 text-[10px] uppercase text-muted-foreground">Oculto</span>}
          {block.locked && <span className="absolute bottom-1 left-2 inline-flex items-center gap-1 text-[10px] uppercase text-muted-foreground"><Lock className="h-3 w-3" />Bloqueado</span>}
          <div className="pointer-events-none"><BlockView block={block} ctx={ctx} /></div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onSelect={select}>Selecionar <ContextMenuShortcut>Enter</ContextMenuShortcut></ContextMenuItem>
        <ContextMenuItem disabled={first} onSelect={() => actions.move(block.id, -1)}>Mover para cima</ContextMenuItem>
        <ContextMenuItem disabled={last} onSelect={() => actions.move(block.id, 1)}>Mover para baixo</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => actions.duplicate(block.id)}>Duplicar <ContextMenuShortcut>Ctrl+D</ContextMenuShortcut></ContextMenuItem>
        <ContextMenuItem onSelect={() => actions.toggleHidden(block.id)}>{block.hidden ? "Mostrar bloco" : "Ocultar bloco"}</ContextMenuItem>
        <ContextMenuItem onSelect={() => actions.toggleLocked(block.id)}>{block.locked ? "Desbloquear bloco" : "Bloquear bloco"}</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={() => actions.remove(block.id)}>Excluir bloco <ContextMenuShortcut>Del</ContextMenuShortcut></ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});

function Layers_({ blocks, selected, onSelect, reorder, actions }: {
  blocks: Block[]; selected: string | null; onSelect: (id: string) => void; reorder: (a: number, b: number) => void; actions: Actions;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const [over, setOver] = useState<number | null>(null);
  if (!blocks.length) return <p className="text-xs text-muted-foreground">Nenhum bloco ainda.</p>;
  return (
    <ul className="space-y-1">
      {blocks.map((b, i) => {
        const Icon = isKnownType(b.type) ? BLOCK_ICONS[b.type] : Type;
        return (
          <li key={b.id} draggable
            onDragStart={(e) => { setDrag(i); e.dataTransfer.effectAllowed = "move"; }}
            onDragOver={(e) => { e.preventDefault(); setOver(i); }}
            onDragLeave={() => setOver((o) => (o === i ? null : o))}
            onDrop={(e) => { e.preventDefault(); if (drag !== null) reorder(drag, i); setDrag(null); setOver(null); }}
            onDragEnd={() => { setDrag(null); setOver(null); }}
            onClick={() => onSelect(b.id)}
            aria-current={selected === b.id ? "true" : undefined}
            className={cn("flex cursor-pointer items-center gap-1 rounded-md border px-1.5 py-1.5 text-xs transition-colors",
              selected === b.id ? "border-primary bg-primary/10 text-foreground shadow-sm" : "hover:bg-accent/60",
              over === i && drag !== null && drag !== i && "border-dashed border-primary", drag === i && "opacity-50", b.hidden && "text-muted-foreground")}
          >
            <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab text-muted-foreground" aria-hidden />
            <Icon className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{blockLabel(b)}</span>
            {b.hidden && <EyeOff className="h-3 w-3" />}
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label="Mover para cima" disabled={i === 0} onClick={(e) => { e.stopPropagation(); actions.move(b.id, -1); }}><ArrowUp className="h-3 w-3" /></Button>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6" aria-label="Mover para baixo" disabled={i === blocks.length - 1} onClick={(e) => { e.stopPropagation(); actions.move(b.id, 1); }}><ArrowDown className="h-3 w-3" /></Button>
          </li>
        );
      })}
    </ul>
  );
}

function Properties({ block, setProp, actions, convertToText, index, blocksLen, assets }: {
  assets?: AssetScope | undefined; block: Block | null; setProp: (id: string, k: string, v: string) => void; actions: Actions; convertToText: (id: string) => void; index: number; blocksLen: number;
}) {
  if (!block) return (
    <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center">
      <Settings2 className="mx-auto mb-2 h-5 w-5 text-muted-foreground" />
      <p className="text-sm font-medium">Nenhum elemento selecionado</p>
      <p className="mt-1 text-xs text-muted-foreground">Selecione um bloco no convite ou na ordem dos blocos para editar suas propriedades.</p>
    </div>
  );
  if (!isKnownType(block.type)) {
    return (
      <div className="space-y-3 text-sm">
        <p className="text-destructive">Este bloco ("{String(block.type)}") não é reconhecido e impede o salvamento.</p>
        <p className="text-muted-foreground">Converta-o em texto (o conteúdo é preservado) ou exclua-o.</p>
        <div className="flex gap-2">
          <Button type="button" size="sm" onClick={() => convertToText(block.id)}>Converter em texto</Button>
          <Button type="button" size="sm" variant="outline" onClick={() => actions.remove(block.id)}>Excluir</Button>
        </div>
      </div>
    );
  }
  const p = block.props ?? {};
  const custom = p["source"] === "custom";
  const layoutNumber = (key: string, fallback: string) => p[key] ?? fallback;
  const layoutText = (key: string, fallback = "") => p[key] ?? fallback;
  if (block.type === "gallery") return <GalleryProperties block={block} setProp={setProp} assets={assets} actions={actions} index={index} blocksLen={blocksLen} />;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 border-b pb-2">
        <span className="text-sm font-medium">{BLOCKS[block.type].label}</span>
        <BlockActions b={block} first={index === 0} last={index === blocksLen - 1} actions={actions} compact />
      </div>
      <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Canvas livre</p>
        <div className="grid grid-cols-2 gap-2">
          {([[
            "x", "X", "0"
          ], ["y", "Y", "0"], ["width", "Largura", ""], ["height", "Altura", ""]] as const).map(([key, label, fallback]) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={`layout-${block.id}-${key}`} className="text-xs text-muted-foreground">{label}</Label>
              <Input
                id={`layout-${block.id}-${key}`}
                type="number"
                min={key === "width" || key === "height" ? 1 : undefined}
                value={layoutNumber(key, fallback)}
                onChange={(event) => setProp(block.id, key, event.target.value)}
                className="h-8"
              />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {([["rotation", "Rotação", "0"], ["zIndex", "Camada", "0"], ["scale", "Escala", "1"], ["opacity", "Opacidade", "1"]] as const).map(([key, label, fallback]) => (
            <div key={key} className="space-y-1">
              <Label htmlFor={`layout-${block.id}-${key}`} className="text-xs text-muted-foreground">{label}</Label>
              <Input
                id={`layout-${block.id}-${key}`}
                type="number"
                min={key === "scale" ? 0.1 : key === "opacity" ? 0 : undefined}
                max={key === "opacity" ? 1 : undefined}
                step={key === "scale" || key === "opacity" ? 0.1 : 1}
                value={layoutNumber(key, fallback)}
                onChange={(event) => setProp(block.id, key, event.target.value)}
                className="h-8"
              />
            </div>
          ))}
        </div>
        <p className="text-[11px] text-muted-foreground">Blocos antigos sem coordenadas continuam usando o layout vertical compatível.</p>
      </div>
      {CONTROLS[block.type].map((c) => {
        // Custom-value fields only matter when the source is "custom".
        if (["date", "time", "target"].includes(c.k) && !custom) return null;
        if (block.type === "location" && ["name", "address"].includes(c.k) && !custom) return null;
        const id = `prop-${block.id}-${c.k}`;
        const val = p[c.k] ?? "";
        const set = (v: string) => setProp(block.id, c.k, v);
        if (c.t === "switch") {
          const on = SWITCH_DEFAULT_ON.has(c.k) ? val !== "0" : val === "1";
          return (
            <div key={c.k} className="flex items-center justify-between gap-2">
              <Label htmlFor={id} className="text-sm font-normal">{c.label}</Label>
              <Switch id={id} checked={on} onCheckedChange={(x) => set(x ? "1" : "0")} />
            </div>
          );
        }
        if (block.type === "image" && c.k === "url") {
          const stored = val.startsWith(STORAGE_PREFIX);
          return (
            <div key={c.k} className="space-y-2">
              <Label className="text-xs text-muted-foreground">Imagem</Label>
              <ImageUpload scope={assets} value={val} onChange={set} />
              <Input id={id} type="url" maxLength={500} placeholder={stored ? "Imagem enviada (ou cole uma URL)" : "https://..."}
                value={stored ? "" : val} onChange={(e) => set(e.target.value)} className="h-9" aria-label="URL da imagem" />
            </div>
          );
        }
        return (
          <div key={c.k} className="space-y-1">
            <Label htmlFor={id} className="text-xs text-muted-foreground">{c.label}</Label>
            {c.t === "select" ? (
              <Select value={val || c.options[0]![0]} onValueChange={set}>
                <SelectTrigger id={id} className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{c.options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
              </Select>
            ) : c.t === "textarea" ? (
              <Textarea id={id} rows={4} maxLength={2000} value={val} onChange={(e) => set(e.target.value)} />
            ) : c.t === "color" ? (
              <div className="flex items-center gap-2">
                <input id={id} type="color" value={val || "#000000"} onChange={(e) => set(e.target.value)} className="h-9 w-12 cursor-pointer rounded border bg-transparent" />
                <Button type="button" size="sm" variant="ghost" disabled={!val} onClick={() => set("")}>Padrão</Button>
              </div>
            ) : (
              <Input id={id} type={c.t} maxLength={500} value={val} onChange={(e) => set(e.target.value)} className="h-9" />
            )}
          </div>
        );
      })}
      {block.type === "rsvp" && <p className="text-xs text-muted-foreground">O formulário aparece na página pública somente quando o RSVP está ativado (botão "RSVP" no editor do convite).</p>}
      {block.type === "whatsapp" && <p className="text-xs text-muted-foreground">O envio pelo WhatsApp funcionará na página pública.</p>}
    </div>
  );
}

function GalleryThumbnail({ url, alt }: { url: string; alt: string }) {
  const src = useAssetUrl(url);
  return src ? <img src={src} alt={alt} className="h-12 w-12 rounded object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">Sem imagem</div>;
}

function GalleryProperties({ block, setProp, assets, actions, index, blocksLen }: { block: Block; setProp: (id: string, key: string, value: string) => void; assets?: AssetScope; actions: Actions; index: number; blocksLen: number }) {
  let images: { url: string; alt?: string; caption?: string }[] = [];
  try { const parsed = JSON.parse(block.props.images || "[]"); if (Array.isArray(parsed)) images = parsed; } catch { images = []; }
  const update = (next: { url: string; alt?: string; caption?: string }[]) => setProp(block.id, "images", JSON.stringify(next));
  const add = (url: string) => { if (!url || images.some((image) => image.url === url)) return; update([...images, { url, alt: "" }]); };
  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-2 border-b pb-2"><span className="text-sm font-medium">Galeria</span><BlockActions b={block} first={index === 0} last={index === blocksLen - 1} actions={actions} compact /></div>
    <ImageUpload scope={assets} value="" onChange={add} />
    {images.length === 0 ? <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">Escolha imagens na biblioteca acima para montar a galeria.</p> : <div className="space-y-2">{images.map((image, imageIndex) => <div key={`${image.url}-${imageIndex}`} className="flex items-center gap-2 rounded-lg border bg-muted/20 p-2"><GalleryThumbnail url={image.url} alt={image.alt || ""} /><div className="min-w-0 flex-1"><p className="truncate text-xs">{image.url}</p><Input value={image.alt || ""} placeholder="Descrição acessível" className="mt-1 h-7 text-xs" onChange={(event) => update(images.map((item, current) => current === imageIndex ? { ...item, alt: event.target.value } : item))} /></div><div className="flex flex-col gap-1"><Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={imageIndex === 0} aria-label="Mover imagem para cima" onClick={() => { const next = [...images]; [next[imageIndex - 1], next[imageIndex]] = [next[imageIndex]!, next[imageIndex - 1]!]; update(next); }}><ArrowUp className="h-3 w-3" /></Button><Button type="button" size="icon" variant="ghost" className="h-7 w-7" disabled={imageIndex === images.length - 1} aria-label="Mover imagem para baixo" onClick={() => { const next = [...images]; [next[imageIndex], next[imageIndex + 1]] = [next[imageIndex + 1]!, next[imageIndex]!]; update(next); }}><ArrowDown className="h-3 w-3" /></Button><Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-destructive" aria-label="Remover imagem" onClick={() => update(images.filter((_, current) => current !== imageIndex))}><Trash2 className="h-3 w-3" /></Button></div></div>)}</div>}
    {CONTROLS.gallery.map((control) => { const value = block.props[control.k] || (control.t === "select" ? control.options[0]![0] : ""); if (control.t === "switch") return <div key={control.k} className="flex items-center justify-between"><Label>{control.label}</Label><Switch checked={value !== "0"} onCheckedChange={(checked) => setProp(block.id, control.k, checked ? "1" : "0")} /></div>; return <div key={control.k} className="space-y-1"><Label className="text-xs text-muted-foreground">{control.label}</Label><Select value={value} onValueChange={(next) => setProp(block.id, control.k, next)}><SelectTrigger className="h-9"><SelectValue /></SelectTrigger><SelectContent>{control.options!.map(([option, label]) => <SelectItem key={option} value={option}>{label}</SelectItem>)}</SelectContent></Select></div>; })}
  </div>;
}

// Background panel

function BgSelect({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function BackgroundPanel({ bg, onBg, assets }: { bg: Background; onBg: (b: Background) => void; assets?: AssetScope | undefined }) {
  const up = (patch: Partial<Background>) => onBg({ ...bg, ...patch });
  const img = bg.image ?? "";
  const overlay = Number(bg.overlay) || 0;
  return (
    <div className="space-y-4 text-sm">
      <h3 className="font-medium">Fundo do convite</h3>
      <div className="space-y-1.5">
        <Label className="text-xs">Cor de fundo</Label>
        <div className="flex items-center gap-2">
          <Input type="color" className="h-8 w-14 p-1" value={bg.color || "#ffffff"} onChange={(e) => up({ color: e.target.value })} />
          {bg.color && <Button type="button" size="sm" variant="ghost" onClick={() => up({ color: "" })}>Padrão</Button>}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="background-gradient" className="text-xs">Gradiente CSS</Label>
        <Input id="background-gradient" type="text" placeholder="linear-gradient(135deg, #fff, #e8d8ff)" className="h-8" value={bg.gradient ?? ""} onChange={(e) => up({ gradient: e.target.value.trim() })} />
        {bg.gradient && <Button type="button" size="sm" variant="ghost" onClick={() => up({ gradient: "" })}>Remover gradiente</Button>}
        <p className="text-[11px] text-muted-foreground">Use linear-gradient, radial-gradient ou outro gradiente CSS válido.</p>
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Imagem de fundo</Label>
        <ImageUpload scope={assets} value={img} onChange={(v) => up({ image: v })} />
        <Input type="url" placeholder="Ou cole uma URL https://..." className="h-8" value={img.startsWith(STORAGE_PREFIX) ? "" : img} onChange={(e) => up({ image: e.target.value.trim() })} />
        {img && <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => up({ image: "" })}>Remover imagem</Button>}
      </div>
      {img && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <BgSelect label="Ajuste" value={bg.size ?? "cover"} options={[["cover", "Cobrir"], ["contain", "Conter"]]} onChange={(v) => up({ size: v as "cover" | "contain" })} />
            <BgSelect label="Horizontal" value={bg.x ?? "center"} options={[["left", "Esquerda"], ["center", "Centro"], ["right", "Direita"]]} onChange={(v) => up({ x: v as "left" | "center" | "right" })} />
            <BgSelect label="Vertical" value={bg.y ?? "center"} options={[["top", "Topo"], ["center", "Centro"], ["bottom", "Baixo"]]} onChange={(v) => up({ y: v as "top" | "center" | "bottom" })} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Escala: {Math.round(bg.imageScale ?? 100)}%</Label>
            <input type="range" min={25} max={200} step={5} value={bg.imageScale ?? 100} onChange={(e) => up({ imageScale: Number(e.target.value) })} className="w-full accent-primary" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Opacidade: {Math.round((bg.imageOpacity ?? 1) * 100)}%</Label>
            <input type="range" min={0} max={1} step={0.05} value={bg.imageOpacity ?? 1} onChange={(e) => up({ imageOpacity: Number(e.target.value) })} className="w-full accent-primary" />
          </div>
        </>
      )}
      <BgSelect label="Sobreposição" value={overlay > 0 ? "dark" : "none"} options={[["none", "Nenhuma"], ["dark", "Escura"]]} onChange={(v) => up({ overlay: v === "dark" ? 20 : 0 })} />
      {overlay > 0 && (
        <div className="space-y-1.5">
          <Label className="text-xs">Intensidade: {overlay}%</Label>
          <input type="range" min={1} max={40} value={overlay} onChange={(e) => up({ overlay: Number(e.target.value) })} className="w-full accent-primary" />
        </div>
      )}
      <p className="text-xs text-muted-foreground">Selecione um elemento no convite para editar suas propriedades.</p>
    </div>
  );
}
*/
}
