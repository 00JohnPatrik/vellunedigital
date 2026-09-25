import { memo, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowDown, ArrowUp, CalendarDays, Clock, Copy, Eye, EyeOff, GripVertical, ImageIcon, Layers, MapPin, MessageCircle, Minus,
  Monitor, MousePointerClick, Plus, QrCode, Redo2, Settings2, Smartphone, Tablet, Timer, Trash2, Type, Undo2, UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BlockView } from "@/components/block-render";
import { BLOCKS, newBlock, type Block, type BlockType } from "@/lib/templates";
import { FONTS, isKnownType, type EventCtx } from "@/lib/blocks";
import { useIsMobile } from "@/hooks/use-mobile";
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
  text: Type, image: ImageIcon, date: CalendarDays, time: Clock, location: MapPin, countdown: Timer,
  rsvp: UserCheck, whatsapp: MessageCircle, button: MousePointerClick, qr_code: QrCode, divider: Minus,
};

const blockLabel = (b: Block) => (isKnownType(b.type) ? BLOCKS[b.type].label : `Desconhecido (${String(b.type)})`);

/* ---------------- Editor ---------------- */

type Device = "mobile" | "tablet" | "desktop";
const DEVICE_W: Record<Device, string> = { mobile: "max-w-[390px]", tablet: "max-w-[768px]", desktop: "max-w-[1024px]" };

export function VisualEditor({ h, ctx, toolbarExtra }: { h: BlocksHistory; ctx?: EventCtx | undefined; toolbarExtra?: ReactNode }) {
  const { blocks, set } = h;
  const isMobile = useIsMobile();
  const [selected, setSelected] = useState<string | null>(null);
  const [device, setDevice] = useState<Device>("mobile");
  const [previewOnly, setPreviewOnly] = useState(false);
  const [sheet, setSheet] = useState<"elements" | "props" | null>(null);
  const sel = blocks.find((b) => b.id === selected) ?? null;

  // Keyboard shortcuts (ignored while typing in a field).
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest("input, textarea, [contenteditable=true], [role=combobox]")) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) h.redo(); else h.undo(); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") { e.preventDefault(); h.redo(); }
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [h]);

  const add = (type: BlockType) => {
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
    const copy = { ...structuredClone(blocks[i]!), id: crypto.randomUUID() };
    set([...blocks.slice(0, i + 1), copy, ...blocks.slice(i + 1)]); setSelected(copy.id);
  };
  const toggleHidden = (id: string) => set((bs) => bs.map((b) => (b.id === id ? { ...b, hidden: !b.hidden } : b)));
  const remove = (id: string) => {
    set((bs) => bs.filter((b) => b.id !== id));
    if (selected === id) setSelected(null);
    toast("Bloco excluído.", { action: { label: "Desfazer", onClick: h.undo } });
  };
  const setProp = (id: string, k: string, v: string) => set((bs) => bs.map((b) => (b.id === id ? { ...b, props: { ...b.props, [k]: v } } : b)), `${id}:${k}`);
  const convertToText = (id: string) => set((bs) => bs.map((b) => (b.id === id ? { ...newBlock("text"), id, props: { ...BLOCKS.text.defaults, text: Object.values(b.props ?? {}).filter((x) => typeof x === "string").join(" ") || "Texto" } } : b)));

  const actions = { move, duplicate, toggleHidden, remove };
  const select = (id: string) => { setSelected(id); if (isMobile) setSheet("props"); };

  const library = <Library onAdd={add} />;
  const layers = <Layers_ blocks={blocks} selected={selected} onSelect={select} reorder={reorder} actions={actions} />;
  const props = <Properties block={sel} setProp={setProp} actions={actions} convertToText={convertToText} blocksLen={blocks.length} index={sel ? blocks.indexOf(sel) : -1} />;

  return (
    <div className="flex flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2">
        <Button type="button" variant="ghost" size="icon" aria-label="Desfazer" title="Desfazer (Ctrl+Z)" disabled={!h.canUndo} onClick={h.undo}><Undo2 className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" aria-label="Refazer" title="Refazer (Ctrl+Shift+Z)" disabled={!h.canRedo} onClick={h.redo}><Redo2 className="h-4 w-4" /></Button>
        <div className="mx-1 h-6 w-px bg-border" />
        <div className="flex rounded-md border p-0.5" role="group" aria-label="Visualização">
          {([["mobile", Smartphone, "Celular"], ["tablet", Tablet, "Tablet"], ["desktop", Monitor, "Desktop"]] as const).map(([d, Icon, label]) => (
            <Button key={d} type="button" size="sm" variant={device === d ? "secondary" : "ghost"} className="h-8 px-2" aria-label={label} aria-pressed={device === d} onClick={() => setDevice(d)}>
              <Icon className="h-4 w-4" /><span className="hidden sm:inline">{label}</span>
            </Button>
          ))}
        </div>
        <Button type="button" size="sm" variant={previewOnly ? "secondary" : "ghost"} onClick={() => { setPreviewOnly(!previewOnly); setSelected(null); }}>
          <Eye className="h-4 w-4" />{previewOnly ? "Voltar a editar" : "Preview"}
        </Button>
        {isMobile && !previewOnly && (
          <>
            <Button type="button" size="sm" variant="outline" onClick={() => setSheet("elements")}><Plus className="h-4 w-4" />Elementos</Button>
            <Button type="button" size="sm" variant="outline" disabled={!sel} onClick={() => setSheet("props")}><Settings2 className="h-4 w-4" />Propriedades</Button>
          </>
        )}
        <div className="ml-auto flex items-center gap-2">{toolbarExtra}</div>
      </div>

      <div className={cn("grid gap-3", !previewOnly && "lg:grid-cols-[220px_minmax(0,1fr)_300px]")}>
        {!previewOnly && !isMobile && (
          <aside className="space-y-3 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
            <Panel title="Elementos">{library}</Panel>
            <Panel title="Ordem dos blocos" icon={<Layers className="h-4 w-4" />}>{layers}</Panel>
          </aside>
        )}

        <div className="min-w-0 rounded-xl border bg-muted/40 p-3 sm:p-6" onClick={() => setSelected(null)}>
          <div className={cn("mx-auto w-full transition-[max-width]", DEVICE_W[device])}>
            <div className="flex w-full flex-col gap-2 rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
              {blocks.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">Adicione elementos para começar.</p>}
              {blocks.map((b, i) => previewOnly
                ? (b.hidden ? null : <div key={b.id} className="py-1"><BlockView block={b} ctx={ctx} interactive /></div>)
                : <CanvasBlock key={b.id} block={b} ctx={ctx} selected={b.id === selected} onSelect={select} first={i === 0} last={i === blocks.length - 1} actions={actions} />)}
            </div>
          </div>
        </div>

        {!previewOnly && !isMobile && (
          <aside className="lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:self-start lg:overflow-y-auto">
            <Panel title="Propriedades">{props}</Panel>
          </aside>
        )}
      </div>

      {isMobile && (
        <Sheet open={sheet !== null} onOpenChange={(o) => !o && setSheet(null)}>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto">
            <SheetHeader><SheetTitle>{sheet === "elements" ? "Elementos" : "Propriedades"}</SheetTitle></SheetHeader>
            <div className="mt-4 space-y-5">
              {sheet === "elements" ? <>{library}<div><h3 className="mb-2 text-sm font-medium">Ordem dos blocos</h3>{layers}</div></> : props}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-3">
      <h2 className="mb-2 flex items-center gap-1.5 text-sm font-medium">{icon}{title}</h2>
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
          <button key={t} type="button" onClick={() => onAdd(t)} className="flex flex-col items-center gap-1 rounded-md border p-2 text-center text-xs transition-colors hover:border-primary hover:bg-accent">
            <Icon className="h-4 w-4" />{BLOCKS[t].label}
          </button>
        );
      })}
    </div>
  );
}

type Actions = { move: (id: string, d: number) => void; duplicate: (id: string) => void; toggleHidden: (id: string) => void; remove: (id: string) => void };

function BlockActions({ b, first, last, actions, compact }: { b: Block; first: boolean; last: boolean; actions: Actions; compact?: boolean }) {
  const btn = "h-7 w-7";
  const stop = (fn: () => void) => (e: React.MouseEvent) => { e.stopPropagation(); fn(); };
  return (
    <div className={cn("flex items-center", compact ? "gap-0" : "gap-0.5")}>
      <Button type="button" variant="ghost" size="icon" className={btn} aria-label="Mover para cima" disabled={first} onClick={stop(() => actions.move(b.id, -1))}><ArrowUp className="h-3.5 w-3.5" /></Button>
      <Button type="button" variant="ghost" size="icon" className={btn} aria-label="Mover para baixo" disabled={last} onClick={stop(() => actions.move(b.id, 1))}><ArrowDown className="h-3.5 w-3.5" /></Button>
      <Button type="button" variant="ghost" size="icon" className={btn} aria-label="Duplicar" onClick={stop(() => actions.duplicate(b.id))}><Copy className="h-3.5 w-3.5" /></Button>
      <Button type="button" variant="ghost" size="icon" className={btn} aria-label={b.hidden ? "Mostrar" : "Ocultar"} onClick={stop(() => actions.toggleHidden(b.id))}>{b.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}</Button>
      <Button type="button" variant="ghost" size="icon" className={cn(btn, "text-destructive")} aria-label="Excluir" onClick={stop(() => actions.remove(b.id))}><Trash2 className="h-3.5 w-3.5" /></Button>
    </div>
  );
}

const CanvasBlock = memo(function CanvasBlock({ block, ctx, selected, onSelect, first, last, actions }: {
  block: Block; ctx?: EventCtx | undefined; selected: boolean; onSelect: (id: string) => void; first: boolean; last: boolean; actions: Actions;
}) {
  return (
    <div
      role="button" tabIndex={0} aria-label={`Selecionar ${blockLabel(block)}`}
      onClick={(e) => { e.stopPropagation(); onSelect(block.id); }}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(block.id); } }}
      className={cn("group relative cursor-pointer rounded-lg border-2 p-2 outline-none transition-colors",
        selected ? "border-primary" : "border-transparent hover:border-dashed hover:border-primary/40 focus-visible:border-primary/60",
        block.hidden && "opacity-40")}
    >
      {selected && (
        <div className="absolute -top-4 right-2 z-10 flex items-center gap-1 rounded-md border bg-popover px-1 shadow-sm">
          <span className="px-1 text-[11px] font-medium">{blockLabel(block)}</span>
          <BlockActions b={block} first={first} last={last} actions={actions} compact />
        </div>
      )}
      {block.hidden && <span className="absolute left-2 top-1 text-[10px] uppercase text-muted-foreground">Oculto</span>}
      <div className="pointer-events-none"><BlockView block={block} ctx={ctx} /></div>
    </div>
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
            className={cn("flex cursor-pointer items-center gap-1 rounded-md border px-1.5 py-1 text-xs",
              selected === b.id ? "border-primary bg-accent" : "hover:bg-accent/60",
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

function Properties({ block, setProp, actions, convertToText, index, blocksLen }: {
  block: Block | null; setProp: (id: string, k: string, v: string) => void; actions: Actions; convertToText: (id: string) => void; index: number; blocksLen: number;
}) {
  if (!block) return <p className="py-6 text-center text-sm text-muted-foreground">Selecione um elemento para editar.</p>;
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
      {block.type === "rsvp" && <p className="text-xs text-muted-foreground">A confirmação de presença funcional chegará em uma próxima fase.</p>}
      {block.type === "whatsapp" && <p className="text-xs text-muted-foreground">O envio pelo WhatsApp funcionará na página pública.</p>}
    </div>
  );
}
