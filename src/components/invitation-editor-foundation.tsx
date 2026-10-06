import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlignCenter, AlignHorizontalDistributeCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, Copy, Eye, EyeOff, Grid2X2, Layers3, Lock, Maximize2, Minus, MousePointer2, Plus, RotateCw, Save, Scissors, Trash2, Unlock, WandSparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { BlockView } from "@/components/block-render";
import { localRecoveryKey, normalizeInvitationContent, type EditorElement, type EditorSaveState, type InvitationEditorDocument, createTextElement, updateElement } from "@/lib/invitation-editor-foundation";

type Props = { invitationId: string; content: unknown };
type History = { past: InvitationEditorDocument[]; present: InvitationEditorDocument; future: InvitationEditorDocument[] };

const clone = <T,>(value: T): T => structuredClone(value);

function useDocumentHistory(initial: InvitationEditorDocument) {
  const [history, setHistory] = useState<History>(() => ({ past: [], present: clone(initial), future: [] }));
  const group = useRef<{ key: string; at: number } | null>(null);
  const change = useCallback((next: InvitationEditorDocument | ((current: InvitationEditorDocument) => InvitationEditorDocument), key?: string) => {
    setHistory((current) => {
      const value = typeof next === "function" ? next(current.present) : next;
      const now = Date.now();
      const merge = !!key && group.current?.key === key && now - group.current.at < 700;
      group.current = key ? { key, at: now } : null;
      if (merge) return { ...current, present: clone(value), future: [] };
      return { past: [...current.past, clone(current.present)].slice(-80), present: clone(value), future: [] };
    });
  }, []);
  const undo = useCallback(() => setHistory((current) => current.past.length ? { past: current.past.slice(0, -1), present: clone(current.past.at(-1)), future: [clone(current.present), ...current.future] } : current), []);
  const redo = useCallback(() => setHistory((current) => current.future.length ? { past: [...current.past, clone(current.present)], present: clone(current.future[0]), future: current.future.slice(1) } : current), []);
  return { document: history.present, change, undo, redo, canUndo: history.past.length > 0, canRedo: history.future.length > 0 };
}

function SaveStatus({ state }: { state: EditorSaveState }) {
  const label = state === "saving" ? "Salvando" : state === "error" ? "Erro ao salvar" : state === "dirty" ? "Alterações locais" : "Salvo";
  return <span className={cn("inline-flex items-center gap-1.5 text-xs", state === "error" ? "text-destructive" : "text-muted-foreground")}><Save className="h-3.5 w-3.5" />{label}</span>;
}

export function InvitationEditorFoundation({ invitationId, content }: Props) {
  const initial = useMemo(() => normalizeInvitationContent(content), [content]);
  const h = useDocumentHistory(initial);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(100);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [state, setState] = useState<EditorSaveState>("saved");
  const [mobilePanel, setMobilePanel] = useState<"elements" | "properties" | null>(null);
  const [clipboard, setClipboard] = useState<EditorElement[]>([]);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; originX: number; originY: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const selected = h.document.elements.filter((element) => selectedIds.includes(element.id));
  const primary = selected[0];

  useEffect(() => {
    const stored = localStorage.getItem(localRecoveryKey(invitationId));
    if (!stored) return;
    try {
      const recovered = JSON.parse(stored) as InvitationEditorDocument;
      if (recovered?.version === 1 && Array.isArray(recovered.elements)) h.change(recovered);
    } catch { /* recuperação inválida é ignorada sem afetar o convite */ }
  }, [h, invitationId]);

  useEffect(() => {
    if (state === "saved") return;
    setState("saving");
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(localRecoveryKey(invitationId), JSON.stringify(h.document));
        setState("saved");
      } catch {
        setState("error");
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [h.document, invitationId, state]);

  const markChange = useCallback((next: InvitationEditorDocument | ((current: InvitationEditorDocument) => InvitationEditorDocument), key?: string) => {
    h.change(next, key);
    setState("dirty");
  }, [h]);

  const select = (id: string, additive: boolean) => setSelectedIds((current) => additive ? current.includes(id) ? current.filter((item) => item !== id) : [...current, id] : [id]);
  const addText = () => { const element = createTextElement(48, 48 + h.document.elements.length * 88); markChange((document) => ({ ...document, elements: [...document.elements, element], sections: document.sections.map((section) => ({ ...section, elementIds: [...section.elementIds, element.id] })) })); setSelectedIds([element.id]); };
  const remove = () => { if (!selectedIds.length) return; markChange((document) => ({ ...document, elements: document.elements.filter((element) => !selectedIds.includes(element.id)), sections: document.sections.map((section) => ({ ...section, elementIds: section.elementIds.filter((id) => !selectedIds.includes(id)) })) })); setSelectedIds([]); };
  const duplicate = () => { const next = selected.map((element, index) => ({ ...clone(element), id: crypto.randomUUID(), x: element.x + 24 + index * 8, y: element.y + 24 + index * 8 })); if (!next.length) return; markChange((document) => ({ ...document, elements: [...document.elements, ...next] })); setSelectedIds(next.map((element) => element.id)); };
  const reorder = (direction: number) => markChange((document) => ({ ...document, elements: document.elements.map((element) => selectedIds.includes(element.id) ? { ...element, zIndex: Math.max(0, element.zIndex + direction) } : element) }), "reorder");
  const align = (mode: "left" | "center" | "right" | "distribution") => { if (!selected.length) return; const min = Math.min(...selected.map((element) => element.x)); const max = Math.max(...selected.map((element) => element.x + element.width)); const center = (min + max) / 2; markChange((document) => ({ ...document, elements: document.elements.map((element) => { if (!selectedIds.includes(element.id)) return element; if (mode === "left") return { ...element, x: min }; if (mode === "right") return { ...element, x: max - element.width }; if (mode === "center") return { ...element, x: center - element.width / 2 }; return element; }) }), "align"); };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, [contenteditable=true]")) return;
      const command = event.ctrlKey || event.metaKey;
      if (command && event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? h.redo() : h.undo(); setState("dirty"); }
      if (command && event.key.toLowerCase() === "c") setClipboard(selected.map(clone));
      if (command && event.key.toLowerCase() === "v" && clipboard.length) { const pasted = clipboard.map((element, index) => ({ ...clone(element), id: crypto.randomUUID(), x: element.x + 24 + index * 8, y: element.y + 24 + index * 8 })); markChange((document) => ({ ...document, elements: [...document.elements, ...pasted] })); setSelectedIds(pasted.map((element) => element.id)); }
      if (event.key === "Delete" || event.key === "Backspace") remove();
      if (command && event.key.toLowerCase() === "d") duplicate();
      if (event.key === "Escape") setSelectedIds([]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const startDrag = (event: React.PointerEvent, element: EditorElement) => {
    if (element.locked) return;
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    setDrag({ id: element.id, x: event.clientX, y: event.clientY, originX: element.x, originY: element.y });
    select(element.id, event.shiftKey || event.metaKey || event.ctrlKey);
  };
  const moveDrag = (event: React.PointerEvent) => {
    if (!drag) return;
    const factor = 100 / zoom;
    const dx = (event.clientX - drag.x) * factor;
    const dy = (event.clientY - drag.y) * factor;
    const snap = event.shiftKey ? 8 : 1;
    markChange((document) => updateElement(document, drag.id, { x: Math.round((drag.originX + dx) / snap) * snap, y: Math.round((drag.originY + dy) / snap) * snap }), "drag");
  };

  return <section className="overflow-hidden rounded-2xl border border-dashed border-primary/40 bg-muted/20 shadow-sm" aria-label="Fundação do novo editor de convites">
    <div className="flex flex-wrap items-center gap-2 border-b bg-card p-3"><div className="min-w-0 flex-1"><p className="flex items-center gap-2 text-sm font-semibold"><WandSparkles className="h-4 w-4 text-primary" />Fundação do novo editor</p><p className="text-xs text-muted-foreground">Área experimental isolada; o editor atual continua ativo e os dados ainda não são gravados no convite.</p></div><SaveStatus state={state} /><Button size="sm" variant="outline" onClick={() => { localStorage.removeItem(localRecoveryKey(invitationId)); setState("saved"); }}>Limpar recuperação</Button></div>
    <div className="grid min-h-[720px] lg:grid-cols-[220px_minmax(0,1fr)_240px]">
      <aside className="hidden border-r bg-card p-3 lg:block"><PanelTitle icon={<Layers3 className="h-4 w-4" />}>Elementos</PanelTitle><div className="mt-3 space-y-2"><Button className="w-full justify-start" variant="outline" onClick={addText}><Plus className="mr-2 h-4 w-4" />Adicionar texto</Button><Button className="w-full justify-start" variant="outline" onClick={() => setMobilePanel("elements")}><Grid2X2 className="mr-2 h-4 w-4" />Biblioteca preparada</Button></div><SectionList document={h.document} /></aside>
      <main className="relative overflow-auto bg-muted/40 p-4 sm:p-8" onPointerMove={moveDrag} onPointerUp={() => setDrag(null)}><div className="mb-3 flex flex-wrap items-center justify-center gap-1"><Button size="icon" variant="outline" onClick={() => setZoom((value) => Math.max(50, value - 10))}><Minus className="h-4 w-4" /></Button><span className="min-w-14 text-center text-xs">{zoom}%</span><Button size="icon" variant="outline" onClick={() => setZoom((value) => Math.min(180, value + 10))}><Plus className="h-4 w-4" /></Button><Button size="sm" variant="outline" onClick={() => { setZoom(100); setPan({ x: 0, y: 0 }); }}><Maximize2 className="mr-1 h-4 w-4" />Centralizar</Button><Button size="sm" variant="outline" onClick={() => setMobilePanel("properties")}><MousePointer2 className="mr-1 h-4 w-4" />Propriedades</Button></div><div className="mx-auto origin-top" style={{ width: `${100 / (zoom / 100)}%`, transform: `translate(${pan.x}px, ${pan.y}px)` }}><div ref={canvasRef} className="relative mx-auto min-h-[640px] w-full max-w-[768px] overflow-hidden rounded-xl border bg-card shadow-lg" style={{ minHeight: h.document.canvas.minHeight }} onPointerDown={(event) => { if (event.target === event.currentTarget) setSelectedIds([]); }}><div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,hsl(var(--border)/.2)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/.2)_1px,transparent_1px)] [background-size:16px_16px]" />{h.document.elements.map((element) => <div key={element.id} className={cn("absolute rounded-md transition-shadow", selectedIds.includes(element.id) && "ring-2 ring-primary ring-offset-2", !element.visible && "opacity-40")} style={{ left: element.x, top: element.y, width: element.width, height: element.height, zIndex: element.zIndex, opacity: element.visible ? element.opacity : 0.35, transform: `rotate(${element.rotation}deg)` }} onPointerDown={(event) => startDrag(event, element)} onClick={(event) => { event.stopPropagation(); select(element.id, event.shiftKey || event.metaKey || event.ctrlKey); }}>{element.content.block ? <BlockView block={element.content.block} interactive={false} /> : <div className="flex h-full items-center justify-center rounded border bg-primary/10 p-3 text-center text-sm">{element.content.text}</div>}{selectedIds.includes(element.id) && <span className="absolute -top-6 left-0 rounded bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">{element.type}</span>}</div>)}</div></div><div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-xl border bg-card p-2 lg:hidden"><Button size="sm" variant="outline" onClick={addText}><Plus className="mr-1 h-4 w-4" />Texto</Button><Button size="sm" variant="outline" onClick={() => setMobilePanel("elements")}><Layers3 className="mr-1 h-4 w-4" />Seções</Button><Button size="sm" variant="outline" onClick={() => setMobilePanel("properties")}><MousePointer2 className="mr-1 h-4 w-4" />Painel</Button></div></main>
      <aside className="hidden border-l bg-card p-3 lg:block"><Properties selected={primary} selectedCount={selected.length} update={(patch) => primary && markChange((document) => updateElement(document, primary.id, patch), "property")} remove={remove} duplicate={duplicate} reorder={reorder} align={align} toggleVisibility={() => primary && markChange((document) => updateElement(document, primary.id, { visible: !primary.visible }), "visibility")} toggleLock={() => primary && markChange((document) => updateElement(document, primary.id, { locked: !primary.locked }), "lock")} /></aside>
    </div>
    <div className="flex flex-wrap items-center gap-2 border-t bg-card p-3"><span className="text-xs font-medium text-muted-foreground">Seções</span>{h.document.sections.map((section) => <button key={section.id} type="button" className="rounded-md border bg-background px-3 py-1.5 text-xs text-foreground">{section.name}</button>)}<Button size="sm" variant="outline" className="ml-auto" onClick={() => setPan((value) => ({ x: value.x + 12, y: value.y + 12 }))}>Pan</Button><Button size="sm" variant="outline" disabled={!h.canUndo} onClick={() => { h.undo(); setState("dirty"); }}>Desfazer</Button><Button size="sm" variant="outline" disabled={!h.canRedo} onClick={() => { h.redo(); setState("dirty"); }}>Refazer</Button></div>
    <Sheet open={mobilePanel !== null} onOpenChange={(open) => !open && setMobilePanel(null)}><SheetContent side="bottom" className="max-h-[82vh] overflow-y-auto"><SheetHeader><SheetTitle>{mobilePanel === "elements" ? "Elementos e seções" : "Propriedades"}</SheetTitle></SheetHeader><div className="mt-4">{mobilePanel === "elements" ? <><Button className="w-full" onClick={addText}><Plus className="mr-2 h-4 w-4" />Adicionar texto</Button><SectionList document={h.document} /></> : <Properties selected={primary} selectedCount={selected.length} update={(patch) => primary && markChange((document) => updateElement(document, primary.id, patch), "property")} remove={remove} duplicate={duplicate} reorder={reorder} align={align} toggleVisibility={() => primary && markChange((document) => updateElement(document, primary.id, { visible: !primary.visible }))} toggleLock={() => primary && markChange((document) => updateElement(document, primary.id, { locked: !primary.locked }))} />}</div></SheetContent></Sheet>
  </section>;
}

function PanelTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) { return <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">{icon}{children}</h2>; }
function SectionList({ document }: { document: InvitationEditorDocument }) { return <div className="mt-6 space-y-2"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Estrutura</p>{document.sections.map((section) => <div key={section.id} className="rounded-lg border bg-muted/30 p-2 text-xs"><div className="flex items-center gap-2"><Layers3 className="h-3.5 w-3.5 text-muted-foreground" />{section.name}</div><p className="mt-1 text-muted-foreground">{section.elementIds.length} elemento(s)</p></div>)}</div>; }
function Properties({ selected, selectedCount, update, remove, duplicate, reorder, align, toggleVisibility, toggleLock }: { selected?: EditorElement; selectedCount: number; update: (patch: Partial<EditorElement>) => void; remove: () => void; duplicate: () => void; reorder: (direction: number) => void; align: (mode: "left" | "center" | "right" | "distribution") => void; toggleVisibility: () => void; toggleLock: () => void }) {
  if (!selected) return <div className="flex min-h-40 items-center justify-center text-center text-xs text-muted-foreground">Selecione um elemento para editar suas propriedades.</div>;
  const number = (key: keyof EditorElement, fallback: number) => Number(selected[key] ?? fallback);
  return <div className="space-y-4"><div><p className="text-sm font-semibold">Propriedades</p><p className="text-xs text-muted-foreground">{selectedCount} selecionado(s)</p></div><div className="grid grid-cols-2 gap-2">{(["x", "y", "width", "height", "rotation", "zIndex"] as const).map((key) => <label key={key} className="space-y-1 text-xs text-muted-foreground">{key}<Input type="number" value={number(key, 0)} onChange={(event) => update({ [key]: Number(event.target.value) })} className="h-8 text-foreground" /></label>)}</div><div className="flex flex-wrap gap-1"><Button size="icon" variant="outline" onClick={() => align("left")} aria-label="Alinhar à esquerda"><AlignLeft className="h-4 w-4" /></Button><Button size="icon" variant="outline" onClick={() => align("center")} aria-label="Centralizar"><AlignCenter className="h-4 w-4" /></Button><Button size="icon" variant="outline" onClick={() => align("right")} aria-label="Alinhar à direita"><AlignRight className="h-4 w-4" /></Button><Button size="icon" variant="outline" onClick={() => align("distribution")} aria-label="Distribuir"><AlignHorizontalDistributeCenter className="h-4 w-4" /></Button></div><div className="grid grid-cols-2 gap-2"><Button size="sm" variant="outline" onClick={duplicate}><Copy className="mr-1 h-3.5 w-3.5" />Duplicar</Button><Button size="sm" variant="outline" onClick={toggleLock}>{selected.locked ? <Unlock className="mr-1 h-3.5 w-3.5" /> : <Lock className="mr-1 h-3.5 w-3.5" />}{selected.locked ? "Desbloquear" : "Bloquear"}</Button><Button size="sm" variant="outline" onClick={toggleVisibility}>{selected.visible ? <EyeOff className="mr-1 h-3.5 w-3.5" /> : <Eye className="mr-1 h-3.5 w-3.5" />}{selected.visible ? "Ocultar" : "Mostrar"}</Button><Button size="sm" variant="outline" onClick={() => update({ rotation: selected.rotation + 15 })}><RotateCw className="mr-1 h-3.5 w-3.5" />Girar</Button><Button size="sm" variant="outline" onClick={() => reorder(1)}><ArrowUp className="mr-1 h-3.5 w-3.5" />Subir</Button><Button size="sm" variant="outline" onClick={() => reorder(-1)}><ArrowDown className="mr-1 h-3.5 w-3.5" />Descer</Button></div><Button size="sm" variant="outline" className="w-full text-destructive" onClick={remove}><Trash2 className="mr-1 h-3.5 w-3.5" />Excluir</Button></div>;
}
