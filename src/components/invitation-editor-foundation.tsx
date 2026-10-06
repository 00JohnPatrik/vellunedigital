// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, CalendarDays, Check, ChevronDown, Copy, Eye, EyeOff, ExternalLink, Gift, Grid2X2, Image as ImageIcon, Layers3, Link2, Lock, MapPin, MessageCircle, Minus, MousePointer2, Plus, QrCode, Redo2, RotateCw, Search, Shapes, Shirt, Sparkles, Trash2, Type, Undo2, Unlock, UsersRound, WandSparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { BlockView } from "@/components/block-render";
import { listFiles, useAssetUrl, type AssetScope } from "@/lib/assets";
import { localRecoveryKey, normalizeInvitationContent, createMediaElement, createShapeElement, createSmartElement, createTextElement, SMART_ELEMENT_DEFINITIONS, updateElement, type EditorElement, type EditorSaveState, type InvitationEditorDocument, type SmartElementType } from "@/lib/invitation-editor-foundation";

type Props = { invitationId: string; content: unknown; onSave?: (document: InvitationEditorDocument) => void };
type History = { past: InvitationEditorDocument[]; present: InvitationEditorDocument; future: InvitationEditorDocument[] };
const clone = <T,>(value: T): T => structuredClone(value);

function useDocumentHistory(initial: InvitationEditorDocument) {
  const [history, setHistory] = useState<History>(() => ({ past: [], present: clone(initial), future: [] }));
  const group = useRef<{ key: string; at: number } | null>(null);
  const change = useCallback((next: InvitationEditorDocument | ((current: InvitationEditorDocument) => InvitationEditorDocument), key?: string) => setHistory((current) => {
    const value = typeof next === "function" ? next(current.present) : next;
    const now = Date.now();
    const merge = !!key && group.current?.key === key && now - group.current.at < 700;
    group.current = key ? { key, at: now } : null;
    return merge ? { ...current, present: clone(value), future: [] } : { past: [...current.past, clone(current.present)].slice(-80), present: clone(value), future: [] };
  }), []);
  const undo = useCallback(() => setHistory((current) => current.past.length ? { past: current.past.slice(0, -1), present: clone(current.past.at(-1)), future: [clone(current.present), ...current.future] } : current), []);
  const redo = useCallback(() => setHistory((current) => current.future.length ? { past: [...current.past, clone(current.present)], present: clone(current.future[0]), future: current.future.slice(1) } : current), []);
  return { document: history.present, change, undo, redo, canUndo: history.past.length > 0, canRedo: history.future.length > 0 };
}

function SaveStatus({ state }: { state: EditorSaveState }) {
  return <span className={cn("inline-flex items-center gap-1.5 text-xs", state === "error" ? "text-destructive" : "text-muted-foreground")}><Check className="h-3.5 w-3.5" />{state === "dirty" ? "Alterações locais" : state === "error" ? "Erro local" : "Estado experimental salvo"}</span>;
}

function ActionButton({ label, children, onClick, disabled = false }: any) {
  return <Tooltip><TooltipTrigger asChild><Button type="button" size="icon" variant="outline" disabled={disabled} onClick={onClick} aria-label={label}>{children}</Button></TooltipTrigger><TooltipContent>{label}</TooltipContent></Tooltip>;
}

const smartIcon = (name: string) => ({ check: <Check className="h-4 w-4" />, clock: <span className="text-sm">◷</span>, map: <MapPin className="h-4 w-4" />, whatsapp: <MessageCircle className="h-4 w-4" />, button: <MousePointer2 className="h-4 w-4" />, link: <Link2 className="h-4 w-4" />, calendar: <CalendarDays className="h-4 w-4" />, qr: <QrCode className="h-4 w-4" />, gallery: <ImageIcon className="h-4 w-4" />, gift: <Gift className="h-4 w-4" />, shirt: <Shirt className="h-4 w-4" />, timeline: <span className="text-sm">☷</span>, hosts: <UsersRound className="h-4 w-4" />, social: <ExternalLink className="h-4 w-4" />, sparkles: <Sparkles className="h-4 w-4" />, external: <ExternalLink className="h-4 w-4" /> } as Record<string, React.ReactNode>)[name] ?? <Sparkles className="h-4 w-4" />;

export function InvitationEditorFoundation({ invitationId, content, onSave }: Props) {
  const initial = useMemo(() => normalizeInvitationContent(content), [content]);
  const h = useDocumentHistory(initial);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(100);
  const [state, setState] = useState<EditorSaveState>("saved");
  const [panel, setPanel] = useState<"library" | "properties" | "layers" | null>(null);
  const [clipboard, setClipboard] = useState<EditorElement[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [favorite, setFavorite] = useState<string[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [assetError, setAssetError] = useState("");
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const drag = useRef<{ x: number; y: number; ids: string[]; origins: Record<string, { x: number; y: number }> } | null>(null);
  const selected = h.document.elements.filter((element) => selectedIds.includes(element.id));
  const primary = selected[0];
  const mark = useCallback((next: any, key?: string) => { h.change(next, key); setState("dirty"); }, [h.change]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(localRecoveryKey(invitationId));
      if (stored) { const recovered = JSON.parse(stored); if (recovered?.version === 1 && Array.isArray(recovered.elements)) { h.change(recovered); setState("dirty"); } }
    } catch { setState("error"); }
  }, [invitationId]);

  useEffect(() => {
    if (state !== "dirty") return;
    const timer = window.setTimeout(() => { try { localStorage.setItem(localRecoveryKey(invitationId), JSON.stringify(h.document)); onSave?.(h.document); setState("saved"); } catch { setState("error"); } }, 650);
    return () => window.clearTimeout(timer);
  }, [h.document, invitationId, state, onSave]);

  useEffect(() => {
    const scope: AssetScope = { kind: "invitation", id: invitationId, companyId: "" };
    listFiles(scope).then(setFiles).catch(() => setAssetError("Não foi possível carregar a mídia do convite."));
  }, [invitationId]);

  const select = (id: string, additive = false) => setSelectedIds((current) => additive ? current.includes(id) ? current.filter((item) => item !== id) : [...current, id] : [id]);
  const add = (element: EditorElement) => { mark((document) => ({ ...document, elements: [...document.elements, { ...element, zIndex: document.elements.length + 1 }], sections: document.sections.map((section) => ({ ...section, elementIds: [...section.elementIds, element.id] })) })); setSelectedIds([element.id]); };
  const remove = () => { if (!selectedIds.length) return; mark((document) => ({ ...document, elements: document.elements.filter((element) => !selectedIds.includes(element.id)), sections: document.sections.map((section) => ({ ...section, elementIds: section.elementIds.filter((id) => !selectedIds.includes(id)) })) })); setSelectedIds([]); };
  const duplicate = () => { const copies = selected.map((element, index) => ({ ...clone(element), id: crypto.randomUUID(), x: element.x + 24 + index * 8, y: element.y + 24 + index * 8 })); if (!copies.length) return; mark((document) => ({ ...document, elements: [...document.elements, ...copies] })); setSelectedIds(copies.map((element) => element.id)); };
  const group = () => { if (selectedIds.length < 2) return; const groupId = crypto.randomUUID(); mark((document) => ({ ...document, elements: document.elements.map((element) => selectedIds.includes(element.id) ? { ...element, groupId } : element) })); };
  const ungroup = () => mark((document) => ({ ...document, elements: document.elements.map((element) => selectedIds.includes(element.id) ? { ...element, groupId: null } : element) }));
  const copy = () => setClipboard(selected.map(clone));
  const paste = () => { if (!clipboard.length) return; const pasted = clipboard.map((element, index) => ({ ...clone(element), id: crypto.randomUUID(), x: element.x + 24 + index * 8, y: element.y + 24 + index * 8 })); mark((document) => ({ ...document, elements: [...document.elements, ...pasted] })); setSelectedIds(pasted.map((element) => element.id)); };
  const updateSelected = (patch: any, key = "property") => { if (!primary) return; mark((document) => ({ ...document, elements: document.elements.map((element) => selectedIds.includes(element.id) && !element.locked ? { ...element, ...patch, styles: patch.styles ? patch.styles : element.styles } : element) }), key); };

  const startDrag = (event: any, element: EditorElement) => {
    if (element.locked) return;
    event.stopPropagation();
    select(element.id, event.shiftKey || event.metaKey || event.ctrlKey);
    const ids = selectedIds.includes(element.id) ? selectedIds : [element.id];
    const origins = Object.fromEntries(h.document.elements.filter((item) => ids.includes(item.id)).map((item) => [item.id, { x: item.x, y: item.y }]));
    drag.current = { x: event.clientX, y: event.clientY, ids, origins };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const moveDrag = (event: any) => { if (!drag.current) return; const factor = 100 / zoom; const dx = (event.clientX - drag.current.x) * factor; const dy = (event.clientY - drag.current.y) * factor; mark((document) => ({ ...document, elements: document.elements.map((element) => drag.current?.ids.includes(element.id) ? { ...element, x: Math.round(drag.current.origins[element.id].x + dx), y: Math.round(drag.current.origins[element.id].y + dy) } : element) }), "drag"); };
  const endDrag = () => { drag.current = null; };

  useEffect(() => { const onKey = (event: KeyboardEvent) => { if ((event.target as HTMLElement)?.closest("input, textarea")) return; const command = event.ctrlKey || event.metaKey; if (command && event.key.toLowerCase() === "z") { event.preventDefault(); event.shiftKey ? h.redo() : h.undo(); setState("dirty"); } if (command && event.key.toLowerCase() === "c") copy(); if (command && event.key.toLowerCase() === "v") paste(); if (command && event.key.toLowerCase() === "d") duplicate(); if (event.key === "Delete" || event.key === "Backspace") remove(); if (event.key === "Escape") setSelectedIds([]); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); });

  const media = files.filter((file) => !search || file.file_name.toLowerCase().includes(search.toLowerCase())).map((file) => ({ id: file.id, label: file.file_name, src: `storage:${file.storage_path}`, category: "Mídia do convite" }));
  const library = [
    { id: "text", label: "Texto", category: "Elementos", icon: <Type className="h-4 w-4" />, action: () => add(createTextElement(48, 48 + h.document.elements.length * 80)) },
    { id: "shape", label: "Forma", category: "Formas", icon: <Shapes className="h-4 w-4" />, action: () => add(createShapeElement("rectangle", 80, 80 + h.document.elements.length * 24)) },
    { id: "circle", label: "Círculo", category: "Formas", icon: <Sparkles className="h-4 w-4" />, action: () => add(createShapeElement("circle", 100, 100)) },
    { id: "decoration", label: "Linha decorativa", category: "Decorações", icon: <Minus className="h-4 w-4" />, action: () => add(createShapeElement("line", 80, 180)) },
    ...SMART_ELEMENT_DEFINITIONS.map((definition) => ({ id: `smart-${definition.type}`, label: definition.label, category: definition.category, icon: smartIcon(definition.icon), action: () => add(createSmartElement(definition.type as SmartElementType, 48, 48 + h.document.elements.length * 24)) })),
    ...media.map((item) => ({ id: item.id, label: item.label, category: item.category, icon: <ImageIcon className="h-4 w-4" />, action: () => add(createMediaElement(item.src, item.label.toLowerCase().endsWith(".gif") ? "gif" : "image")) })),
  ].filter((item) => category === "Todos" || item.category === category || (category === "Componentes inteligentes" && SMART_ELEMENT_DEFINITIONS.some((definition) => definition.label === item.label))).filter((item) => !search || item.label.toLowerCase().includes(search.toLowerCase()));

  return <TooltipProvider><section className="overflow-hidden rounded-2xl border border-dashed border-primary/40 bg-muted/20 shadow-sm" aria-label="Editor experimental isolado">
    <header className="flex flex-wrap items-center gap-2 border-b bg-card p-3"><div className="min-w-0 flex-1"><p className="flex items-center gap-2 text-sm font-semibold"><WandSparkles className="h-4 w-4 text-primary" />Editor experimental isolado</p><p className="text-xs text-muted-foreground">Estado próprio, reversível e salvo apenas na recuperação local. O conteúdo oficial do convite não é alterado.</p></div><SaveStatus state={state} /><div className="flex items-center gap-1"><ActionButton label="Desfazer" onClick={() => { h.undo(); setState("dirty"); }} disabled={!h.canUndo}><Undo2 className="h-4 w-4" /></ActionButton><ActionButton label="Refazer" onClick={() => { h.redo(); setState("dirty"); }} disabled={!h.canRedo}><Redo2 className="h-4 w-4" /></ActionButton><ActionButton label="Biblioteca" onClick={() => setPanel("library")}><Grid2X2 className="h-4 w-4" /></ActionButton><ActionButton label="Camadas" onClick={() => setPanel("layers")}><Layers3 className="h-4 w-4" /></ActionButton></div></header>
    <div className="grid min-h-[720px] lg:grid-cols-[220px_minmax(0,1fr)_260px]">
      <aside className="hidden border-r bg-card p-3 lg:block"><LibraryPanel library={library} search={search} setSearch={setSearch} category={category} setCategory={setCategory} favorite={favorite} setFavorite={setFavorite} error={assetError} /></aside>
      <main className="relative overflow-auto bg-muted/40 p-3 sm:p-8" onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onWheel={(event) => { if (event.ctrlKey) { event.preventDefault(); setZoom((value) => Math.max(50, Math.min(180, value + (event.deltaY > 0 ? -5 : 5)))); } }}>
        <div className="mb-3 flex flex-wrap items-center justify-center gap-1"><ActionButton label="Diminuir zoom" onClick={() => setZoom((value) => Math.max(50, value - 10))}><Minus className="h-4 w-4" /></ActionButton><span className="min-w-14 text-center text-xs">{zoom}%</span><ActionButton label="Aumentar zoom" onClick={() => setZoom((value) => Math.min(180, value + 10))}><Plus className="h-4 w-4" /></ActionButton><Button size="sm" variant="outline" onClick={() => setZoom(100)}><MousePointer2 className="mr-1 h-4 w-4" />Centralizar</Button></div>
        <div className="mx-auto origin-top" style={{ width: `${100 / (zoom / 100)}%` }}><div className="relative mx-auto min-h-[640px] w-full max-w-[768px] overflow-hidden rounded-xl border bg-card shadow-lg" style={{ minHeight: h.document.canvas.minHeight }} onPointerDown={(event) => { if (event.target === event.currentTarget) setSelectedIds([]); }}>
          <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,hsl(var(--border)/.2)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/.2)_1px,transparent_1px)] [background-size:16px_16px]" />
          {h.document.elements.map((element) => <CanvasElement key={element.id} element={element} selected={selectedIds.includes(element.id)} onPointerDown={startDrag} onClick={(event: any) => { event.stopPropagation(); select(element.id, event.shiftKey || event.metaKey || event.ctrlKey); }} />)}
        </div></div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 rounded-xl border bg-card p-2 lg:hidden"><Button size="sm" variant="outline" onClick={() => setPanel("library")}><Grid2X2 className="mr-1 h-4 w-4" />Biblioteca</Button><Button size="sm" variant="outline" onClick={() => setPanel("properties")}><MousePointer2 className="mr-1 h-4 w-4" />Propriedades</Button><Button size="sm" variant="outline" onClick={() => setPanel("layers")}><Layers3 className="mr-1 h-4 w-4" />Camadas</Button></div>
      </main>
      <aside className="hidden border-l bg-card p-3 lg:block"><Properties selected={primary} count={selected.length} update={updateSelected} remove={remove} duplicate={duplicate} group={group} ungroup={ungroup} /></aside>
    </div>
    <div className="flex flex-wrap items-center gap-2 border-t bg-card p-3"><span className="text-xs font-medium text-muted-foreground">Seções</span>{h.document.sections.map((section) => <span key={section.id} className="rounded-md border bg-background px-3 py-1.5 text-xs">{section.name}</span>)}<Button size="sm" variant="outline" className="ml-auto" onClick={() => { localStorage.removeItem(localRecoveryKey(invitationId)); setState("saved"); }}>Limpar recuperação</Button></div>
    <Sheet open={panel !== null} onOpenChange={(open) => !open && setPanel(null)}><SheetContent side="bottom" className="max-h-[84vh] overflow-y-auto"><SheetHeader><SheetTitle>{panel === "library" ? "Biblioteca de mídia e elementos" : panel === "layers" ? "Camadas" : "Propriedades"}</SheetTitle></SheetHeader><div className="mt-4">{panel === "library" ? <LibraryPanel library={library} search={search} setSearch={setSearch} category={category} setCategory={setCategory} favorite={favorite} setFavorite={setFavorite} error={assetError} /> : panel === "layers" ? <LayersPanel elements={h.document.elements} selectedIds={selectedIds} select={select} /> : <Properties selected={primary} count={selected.length} update={updateSelected} remove={remove} duplicate={duplicate} group={group} ungroup={ungroup} />}</div></SheetContent></Sheet>
  </section></TooltipProvider>;
}

function SmartPreview({ element }: { element: EditorElement }) {
  const block = element.content.block as any;
  const props = block?.props ?? {};
  const type = element.type as SmartElementType;
  const title = props.title || props.label || props.text || "Componente inteligente";
  const accent = String(element.styles.accentColor || "#7c3aed");
  if (type === "qr_code") return <div className="flex h-full flex-col items-center justify-center gap-2 p-3 text-center"><div className="flex h-36 w-36 items-center justify-center border-8 border-foreground bg-background"><QrCode className="h-28 w-28" /></div><span className="text-xs text-muted-foreground">{props.label}</span></div>;
  if (type === "gallery") return <div className="h-full space-y-2 p-3"><p className="text-sm font-semibold">{title}</p><div className="grid h-[calc(100%-28px)] grid-cols-3 gap-2">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="rounded-lg bg-muted" />)}</div></div>;
  if (type === "timeline") return <div className="space-y-3 p-4"><p className="text-sm font-semibold">{title}</p>{String(props.items || "Cerimônia|Recepção|Festa").split("|").map((item: string, index: number) => <div key={`${item}-${index}`} className="flex items-center gap-3 text-xs"><span className="h-2 w-2 rounded-full" style={{ background: accent }} /><span>{item}</span></div>)}</div>;
  if (type === "hosts") return <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center"><UsersRound className="h-7 w-7" style={{ color: accent }} /><p className="text-sm font-semibold">{title}</p><p className="text-xs text-muted-foreground">{String(props.names || "Nome 1|Nome 2").split("|").join(" · ")}</p></div>;
  if (type === "location") return <div className="flex h-full items-center gap-3 p-4"><MapPin className="h-8 w-8 shrink-0" style={{ color: accent }} /><div className="min-w-0"><p className="text-sm font-semibold">{props.name || "Nome do local"}</p><p className="truncate text-xs text-muted-foreground">{props.address || "Endereço do evento"}</p><span className="text-xs" style={{ color: accent }}>{props.button || "Como chegar"}</span></div></div>;
  if (type === "social") return <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center"><ExternalLink className="h-6 w-6" style={{ color: accent }} /><p className="text-sm font-semibold">{title}</p><p className="text-xs text-muted-foreground">Instagram · Facebook · TikTok</p></div>;
  if (type === "dress_code") return <div className="flex h-full items-center gap-3 p-4"><Shirt className="h-7 w-7" style={{ color: accent }} /><div><p className="text-sm font-semibold">{title}</p><p className="text-xs text-muted-foreground">{props.value || "Passeio completo"}</p></div></div>;
  if (type === "special_text") return <div className="flex h-full items-center justify-center p-5 text-center text-lg font-medium italic" style={{ color: element.styles.color as string }}>{props.text}</div>;
  if (type === "calendar") return <div className="flex h-full items-center gap-3 p-4"><CalendarDays className="h-7 w-7" style={{ color: accent }} /><span className="text-sm font-medium">{props.label}</span></div>;
  return <div className="flex h-full items-center justify-center gap-2 p-4 text-center"><span className="rounded-lg px-4 py-2 text-sm font-semibold text-white" style={{ background: accent }}>{title}</span>{(type === "whatsapp" || type === "rsvp") && <span className="text-xs text-muted-foreground">Preview interativo</span>}</div>;
}

function CanvasElement({ element, selected, onPointerDown, onClick }: any) {
  const src = useAssetUrl(element.content.src);
  const style: any = { left: element.x, top: element.y, width: element.width, height: element.height, zIndex: element.zIndex, opacity: element.visible ? element.opacity : 0.25, transform: `rotate(${element.rotation}deg)`, color: element.styles.color, background: element.styles.background || element.styles.color, borderRadius: element.styles.borderRadius, border: `${element.styles.borderWidth || 0}px solid ${element.styles.borderColor || "transparent"}`, fontFamily: element.styles.fontFamily, fontSize: element.styles.fontSize, fontWeight: element.styles.fontWeight, textAlign: element.styles.textAlign, objectFit: element.styles.objectFit, objectPosition: element.styles.objectPosition };
  const shape = element.content.shape;
  return <div className={cn("absolute rounded-md transition-shadow", selected && "ring-2 ring-primary ring-offset-2", !element.visible && "opacity-40")} style={style} onPointerDown={(event) => onPointerDown(event, element)} onClick={onClick}>
    {element.type === "block" && element.content.block ? <BlockView block={element.content.block} interactive={false} /> : SMART_ELEMENT_DEFINITIONS.some((definition) => definition.type === element.type) ? <SmartPreview element={element} /> : element.type === "image" || element.type === "gif" ? <>{src ? <img src={src} alt={element.content.alt || ""} className="h-full w-full" style={{ objectFit: element.styles.objectFit as any, objectPosition: element.styles.objectPosition as any, borderRadius: element.styles.borderRadius }} /> : <div className="flex h-full items-center justify-center bg-muted text-xs text-muted-foreground">Imagem indisponível</div>}</> : element.type === "shape" || element.type === "decoration" ? <div className={cn("h-full w-full", shape === "circle" && "rounded-full", shape === "heart" && "rotate-45 rounded-tl-full")} /> : <div className="flex h-full w-full items-center justify-center p-3">{element.content.text}</div>}
    {selected && <span className="absolute -top-6 left-0 rounded bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">{element.type}</span>}
  </div>;
}

function LibraryPanel({ library, search, setSearch, category, setCategory, favorite, setFavorite, error }: any) {
  const categories = ["Todos", "Elementos", "Componentes inteligentes", "Formas", "Decorações", "Mídia do convite", "Assets Vellune", "Assets da empresa"];
  return <div className="space-y-3"><div><p className="text-sm font-semibold">Biblioteca</p><p className="text-xs text-muted-foreground">Elementos e mídia separados conceitualmente por origem.</p></div><div className="relative"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar mídia ou elemento" className="pl-8" /></div><div className="flex gap-1 overflow-x-auto pb-1">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={cn("whitespace-nowrap rounded-md border px-2 py-1 text-[11px]", category === item && "border-primary bg-primary/10 text-primary")}>{item}</button>)}</div>{error && <p className="text-xs text-destructive">{error}</p>}<div className="grid grid-cols-2 gap-2">{library.map((item: any) => <div key={item.id} className="relative"><Button variant="outline" className="h-auto min-h-16 w-full flex-col gap-1 p-2 text-xs" onClick={item.action}>{item.icon}{item.label}</Button><button type="button" className="absolute right-1 top-1 text-muted-foreground" aria-label="Favoritar" onClick={() => setFavorite((items: string[]) => items.includes(item.id) ? items.filter((id) => id !== item.id) : [...items, item.id])}>{favorite.includes(item.id) ? "★" : "☆"}</button></div>)}</div></div>;
}

function LayersPanel({ elements, selectedIds, select }: any) { return <div className="space-y-2">{[...elements].sort((a, b) => b.zIndex - a.zIndex).map((element) => <button key={element.id} type="button" onClick={() => select(element.id)} className={cn("flex w-full items-center gap-2 rounded-md border p-2 text-left text-xs", selectedIds.includes(element.id) && "border-primary bg-primary/10")}>{element.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}{element.type}<span className="ml-auto text-muted-foreground">z{element.zIndex}</span></button>)}</div>; }

function Properties({ selected, count, update, remove, duplicate, group, ungroup }: any) {
  if (!selected) return <div className="flex min-h-40 items-center justify-center text-center text-xs text-muted-foreground">Selecione um elemento para editar suas propriedades.</div>;
  const number = (key: string, fallback = 0) => Number(selected[key] ?? fallback);
  const styles = selected.styles || {};
  const block = selected.content?.block as any;
  const props = block?.props || {};
  const style = (key: string, value: any) => update({ styles: { ...styles, [key]: value } });
  const updateSmartProp = (key: string, value: string) => update({ content: { ...selected.content, block: { ...block, props: { ...props, [key]: value } } } });
  const smartDefinition = SMART_ELEMENT_DEFINITIONS.find((definition) => definition.type === selected.type);
  return <div className="space-y-4"><div><p className="text-sm font-semibold">Propriedades</p><p className="text-xs text-muted-foreground">{count} selecionado(s)</p></div>{smartDefinition && <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3"><div><p className="text-sm font-medium">{smartDefinition.label}</p><p className="text-xs text-muted-foreground">Configuração funcional do componente experimental.</p></div>{Object.entries(props).filter(([key]) => key !== "style").slice(0, 5).map(([key, value]) => <label key={key} className="block space-y-1 text-xs text-muted-foreground"><span>{key === "url" ? "Link" : key === "phone" ? "Telefone" : key === "target" ? "Destino" : key}</span><Input value={String(value ?? "")} onChange={(event) => updateSmartProp(key, event.target.value)} className="h-8 text-foreground" /></label>)}</div>}<div className="grid grid-cols-2 gap-2">{["x", "y", "width", "height", "rotation", "zIndex"].map((key) => <label key={key} className="space-y-1 text-xs text-muted-foreground">{key}<Input type="number" value={number(key)} onChange={(event) => update({ [key]: Number(event.target.value) })} className="h-8 text-foreground" /></label>)}</div>{selected.type === "text" && <><label className="block space-y-1 text-xs text-muted-foreground">Texto<Input value={selected.content.text || ""} onChange={(event) => update({ content: { ...selected.content, text: event.target.value } })} /></label><div className="grid grid-cols-2 gap-2"><label className="space-y-1 text-xs text-muted-foreground">Fonte<select value={styles.fontFamily || "Manrope"} onChange={(event) => style("fontFamily", event.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-foreground"><option>Manrope</option><option>Sora</option><option>Georgia</option><option>Arial</option></select></label><label className="space-y-1 text-xs text-muted-foreground">Tamanho<Input type="number" value={styles.fontSize || 28} onChange={(event) => style("fontSize", Number(event.target.value))} /></label></div></>}{(selected.type === "image" || selected.type === "gif") && <><label className="space-y-1 text-xs text-muted-foreground">Ajuste<select value={styles.objectFit || "cover"} onChange={(event) => style("objectFit", event.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-foreground"><option value="cover">Crop / Cobrir</option><option value="contain">Conter</option><option value="fill">Preencher</option></select></label><label className="space-y-1 text-xs text-muted-foreground">Posição do crop<Input value={styles.objectPosition || "center"} onChange={(event) => style("objectPosition", event.target.value)} /></label></>}{selected.type !== "block" && <label className="space-y-1 text-xs text-muted-foreground">Cor / gradiente<Input value={styles.background || styles.color || ""} placeholder="#7c3aed ou linear-gradient(...)" onChange={(event) => { style("background", event.target.value); style("color", event.target.value); }} /></label>}<div className="flex flex-wrap gap-1"><Button size="sm" variant="outline" onClick={() => update({ visible: !selected.visible })}>{selected.visible ? <EyeOff className="mr-1 h-3.5 w-3.5" /> : <Eye className="mr-1 h-3.5 w-3.5" />}{selected.visible ? "Ocultar" : "Mostrar"}</Button><Button size="sm" variant="outline" onClick={() => update({ locked: !selected.locked })}>{selected.locked ? <Unlock className="mr-1 h-3.5 w-3.5" /> : <Lock className="mr-1 h-3.5 w-3.5" />}{selected.locked ? "Desbloquear" : "Bloquear"}</Button><Button size="sm" variant="outline" onClick={() => update({ rotation: selected.rotation + 15 })}><RotateCw className="mr-1 h-3.5 w-3.5" />Girar</Button></div><div className="grid grid-cols-2 gap-2"><Button size="sm" variant="outline" onClick={duplicate}><Copy className="mr-1 h-3.5 w-3.5" />Duplicar</Button><Button size="sm" variant="outline" onClick={group}>Agrupar</Button><Button size="sm" variant="outline" onClick={ungroup}>Desagrupar</Button><Button size="sm" variant="outline" onClick={() => update({ zIndex: selected.zIndex + 1 })}><ArrowUp className="mr-1 h-3.5 w-3.5" />Subir</Button><Button size="sm" variant="outline" onClick={() => update({ zIndex: Math.max(0, selected.zIndex - 1) })}><ArrowDown className="mr-1 h-3.5 w-3.5" />Descer</Button></div><Button size="sm" variant="outline" className="w-full text-destructive" onClick={remove}><Trash2 className="mr-1 h-3.5 w-3.5" />Excluir</Button></div>;
}
