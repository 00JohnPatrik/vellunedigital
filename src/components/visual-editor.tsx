import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, CalendarDays, Clock, Copy, Eye, EyeOff, GripVertical, ImageIcon, Images, Layers, Lock, MapPin, MessageCircle, Minus,
  Monitor, MousePointerClick, Plus, QrCode, Redo2, RotateCcw, Settings2, Smartphone, Tablet, Timer, Trash2, Type, Undo2, Unlock, UserCheck, Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { BackgroundLayers, bgColorStyle, BlockView } from "@/components/block-render";
import { ImageUpload } from "@/components/image-upload";
import { STORAGE_PREFIX, type AssetScope, useAssetUrl } from "@/lib/assets";
import { BLOCKS, newBlock, type Background, type Block, type BlockType } from "@/lib/templates";
import { FONTS, isKnownType, type EventCtx } from "@/lib/blocks";
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
import { cn } from "@/lib/utils";

/* ---------------- History (local, session only) ---------------- */

type Hist = { past: Block[][]; present: Block[]; future: Block[][] };
const LIMIT = 100;

export type BlocksHistory = ReturnType<typeof useBlocksHistory>;

/** Undo/redo over the blocks array. Rapid edits with the same `group` (e.g. typing in one field) merge into one step. */
export function useBlocksHistory(initial: Block[]) {
  const [h, setH] = useState<Hist>({ past: [], present: initial, future: [] });
  const last = useRef<{ group: string; at: number } | null>(null);
  const set = useCallback((next: Block[] | ((b: Block[]) => Block[]), group?: string) => {
    setH((s) => {
      const value = typeof next === "function" ? next(s.present) : next;
      if (value === s.present) return s;
      const now = Date.now();
      const merge = group && last.current?.group === group && now - last.current.at < 1000;
      last.current = group ? { group, at: now } : null;
      return merge ? { ...s, present: value, future: [] } : { past: [...s.past, s.present].slice(-LIMIT), present: value, future: [] };
    });
  }, []);
  const undo = useCallback(() => { last.current = null; setH((s) => s.past.length ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1]!, future: [s.present, ...s.future] } : s); }, []);
  const redo = useCallback(() => { last.current = null; setH((s) => s.future.length ? { past: [...s.past, s.present], present: s.future[0]!, future: s.future.slice(1) } : s); }, []);
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
    { k: "font", label: "Fonte", t: "select", options: FONTS.map((f) => [f.value, f.label]) },
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

export const BLOCK_ICONS: Record<BlockType, typeof Type> = {
  text: Type, image: ImageIcon, gallery: Images, date: CalendarDays, time: Clock, location: MapPin, countdown: Timer,
  rsvp: UserCheck, whatsapp: MessageCircle, button: MousePointerClick, qr_code: QrCode, divider: Minus,
};

const blockLabel = (b: Block) => (isKnownType(b.type) ? BLOCKS[b.type].label : `Desconhecido (${String(b.type)})`);

/* ---------------- Editor ---------------- */

type Device = "mobile" | "tablet" | "desktop";
const DEVICE_W: Record<Device, string> = { mobile: "max-w-[390px]", tablet: "max-w-[768px]", desktop: "max-w-[1024px]" };

const RSVP_DUP = "Este convite já possui confirmação de presença.";

export function VisualEditor({ h, ctx, toolbarExtra, assets, bg, onBg }: { h: BlocksHistory; ctx?: EventCtx | undefined; toolbarExtra?: ReactNode; assets?: AssetScope | undefined; bg?: Background | undefined; onBg?: ((b: Background) => void) | undefined }) {
  const { blocks, set } = h;
  // Side panels only fit from 1024px up; below that Elements/Properties open as bottom drawers.
  const isMobile = useIsCompact();
  const [selected, setSelected] = useState<string | null>(null);
  const [device, setDevice] = useState<Device>("mobile");
  const [zoom, setZoom] = useState(100);
  const [previewOnly, setPreviewOnly] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [sheet, setSheet] = useState<"elements" | "props" | null>(null);
  const clipboard = useRef<Block | null>(null);
  const sel = blocks.find((b) => b.id === selected) ?? null;

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
  const setProp = (id: string, k: string, v: string) => set((bs) => bs.map((b) => (b.id === id && !b.locked ? { ...b, props: { ...b.props, [k]: v } } : b)), `${id}:${k}`);
  const alignSelected = (align: "left" | "center" | "right") => { if (sel && !sel.locked) setProp(sel.id, "align", align); };
  const convertToText = (id: string) => set((bs) => bs.map((b) => (b.id === id ? { ...newBlock("text"), id, props: { ...BLOCKS.text.defaults, text: Object.values(b.props ?? {}).filter((x) => typeof x === "string").join(" ") || "Texto" } } : b)));

  const actions = { move, duplicate, toggleHidden, toggleLocked, remove };
  const select = (id: string) => { setSelected(id); if (isMobile) setSheet("props"); };

  const library = <Library onAdd={add} />;
  const layers = <Layers_ blocks={blocks} selected={selected} onSelect={select} reorder={reorder} actions={actions} />;
  const props = !sel && onBg ? <BackgroundPanel bg={bg ?? {}} onBg={onBg} assets={assets} /> : <Properties assets={assets} block={sel} setProp={setProp} actions={actions} convertToText={convertToText} blocksLen={blocks.length} index={sel ? blocks.indexOf(sel) : -1} />;

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
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
            <div className="hidden items-center gap-0.5 rounded-lg border bg-background p-0.5 sm:flex" role="group" aria-label="Alinhamento do bloco selecionado">
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Alinhar à esquerda" disabled={!sel || sel.locked} onClick={() => alignSelected("left")}><AlignLeft className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Centralizar" disabled={!sel || sel.locked} onClick={() => alignSelected("center")}><AlignCenter className="h-4 w-4" /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label="Alinhar à direita" disabled={!sel || sel.locked} onClick={() => alignSelected("right")}><AlignRight className="h-4 w-4" /></Button>
            </div>
            <Button type="button" size="sm" variant={showGuides ? "secondary" : "ghost"} aria-pressed={showGuides} onClick={() => setShowGuides((value) => !value)}>
              Guias
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

        <div className="min-w-0 rounded-2xl border bg-muted/40 p-3 shadow-inner sm:p-6" onClick={() => setSelected(null)}>
          <div className={cn("mx-auto w-full transition-[max-width]", DEVICE_W[device])}>
            <div className="relative isolate flex w-full flex-col gap-2 overflow-hidden rounded-2xl border bg-card p-4 shadow-sm sm:p-6" style={bgColorStyle(bg)}>
              <BackgroundLayers bg={bg} />
              {blocks.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">Adicione elementos para começar.</p>}
              {showGuides && !previewOnly && <>
                <div aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-primary/20" />
                <div aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-dashed border-primary/20" />
              </>}
              {blocks.map((b, i) => previewOnly
                ? (b.hidden ? null : <div key={b.id} className="py-1"><BlockView block={b} ctx={ctx} interactive /></div>)
                : <FreeCanvasBlock key={b.id} block={b} ctx={ctx} selected={b.id === selected} onSelect={select} first={i === 0} last={i === blocks.length - 1} actions={actions} setProp={setProp} />)}
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
  if (block.type === "gallery") return <GalleryProperties block={block} setProp={setProp} assets={assets} actions={actions} index={index} blocksLen={blocksLen} />;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 border-b pb-2">
        <span className="text-sm font-medium">{BLOCKS[block.type].label}</span>
        <BlockActions b={block} first={index === 0} last={index === blocksLen - 1} actions={actions} compact />
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

/* ---------------- Background (shown when no block is selected) ---------------- */

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
        <Label className="text-xs">Imagem de fundo</Label>
        <ImageUpload scope={assets} value={img} onChange={(v) => up({ image: v })} />
        <Input type="url" placeholder="Ou cole uma URL https://..." className="h-8" value={img.startsWith(STORAGE_PREFIX) ? "" : img} onChange={(e) => up({ image: e.target.value.trim() })} />
        {img && <Button type="button" size="sm" variant="outline" className="w-full" onClick={() => up({ image: "" })}>Remover imagem</Button>}
      </div>
      {img && (
        <div className="grid grid-cols-2 gap-2">
          <BgSelect label="Tamanho" value={bg.size ?? "cover"} options={[["cover", "Cover"], ["contain", "Contain"]]} onChange={(v) => up({ size: v as "cover" })} />
          <BgSelect label="Horizontal" value={bg.x ?? "center"} options={[["left", "Esquerda"], ["center", "Centro"], ["right", "Direita"]]} onChange={(v) => up({ x: v as "center" })} />
          <BgSelect label="Vertical" value={bg.y ?? "center"} options={[["top", "Topo"], ["center", "Centro"], ["bottom", "Baixo"]]} onChange={(v) => up({ y: v as "center" })} />
        </div>
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
