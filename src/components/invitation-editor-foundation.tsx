// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowUp, CalendarDays, Check, ChevronDown, Copy, Eye, EyeOff, ExternalLink, Gift, Grid2X2, Image as ImageIcon, Layers3, LayoutTemplate, Link2, Lock, MapPin, MessageCircle, Minus, MousePointer2, Plus, QrCode, Redo2, RotateCw, Search, Shapes, Settings2, Shirt, Sparkles, Trash2, Type, Undo2, Unlock, UsersRound, WandSparkles, X, Maximize2, Minimize2, ShieldCheck, Smartphone, Monitor, Tablet, AlertTriangle, Info, CircleAlert, MousePointerClick } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { BlockView } from "@/components/block-render";
import { listFiles, useAssetUrl, type AssetScope } from "@/lib/assets";
import { localRecoveryKey, normalizeInvitationContent, createMediaElement, createShapeElement, createSmartElement, createTextElement, SMART_ELEMENT_DEFINITIONS, updateElement, type EditorElement, type EditorSaveState, type InvitationEditorDocument, type SmartElementType } from "@/lib/invitation-editor-foundation";
import { ANIMATION_FEATURE_FLAG, ANIMATION_PRESETS, DEFAULT_ANIMATION, animationStyle, normalizeAnimation, parallaxStyle, type EditorAnimation } from "@/lib/invitation-editor-animation";
import { ExperimentalTemplateLibrary, type ExperimentalLibraryItem, type LibraryMode } from "@/lib/invitation-editor-library";
import { PREVIEW_PRESETS, getQualityScore, validateInvitationEditorDocument, validateResponsivePreset, type PreviewPreset, type QualityAlert } from "@/lib/invitation-editor-quality";

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

const isCanvasBackgroundElement = (element: EditorElement) => {
  const candidate = element as EditorElement & { role?: string; content?: EditorElement["content"] & { background?: boolean } };
  return candidate.type === "background" || candidate.role === "background" || candidate.content?.background === true;
};

export function InvitationEditorFoundation({ invitationId, content, onSave }: Props) {
  const initial = useMemo(() => normalizeInvitationContent(content), [content]);
  const h = useDocumentHistory(initial);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [zoom, setZoom] = useState(100);
  const [state, setState] = useState<EditorSaveState>("saved");
  const [panel, setPanel] = useState<"library" | "properties" | "layers" | null>(null);
  const [templateLibraryOpen, setTemplateLibraryOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [clipboard, setClipboard] = useState<EditorElement[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [favorite, setFavorite] = useState<string[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [assetError, setAssetError] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [previewTime, setPreviewTime] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [previewPreset, setPreviewPreset] = useState<PreviewPreset>("desktop");
  const [fullscreen, setFullscreen] = useState(false);
  const [showQuality, setShowQuality] = useState(false);
  const [safeArea, setSafeArea] = useState(true);
  const [parallaxOffset, setParallaxOffset] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const drag = useRef<{ x: number; y: number; ids: string[]; origins: Record<string, { x: number; y: number }> } | null>(null);
  const selected = h.document.elements.filter((element) => selectedIds.includes(element.id));
  const primary = selected[0];
  const qualityAlerts = useMemo<QualityAlert[]>(() => [...validateInvitationEditorDocument(h.document), ...validateResponsivePreset(h.document, previewPreset)], [h.document, previewPreset]);
  const qualityErrors = qualityAlerts.filter((alert) => alert.severity === "error").length;
  const qualityWarnings = qualityAlerts.filter((alert) => alert.severity === "warning").length;
  const qualityScore = getQualityScore(qualityAlerts);
  const mark = useCallback((next: any, key?: string) => { h.change(next, key); setState("dirty"); }, [h.change]);
  const applyLibraryItem = useCallback((item: ExperimentalLibraryItem, mode: LibraryMode) => {
    const created = item.elements.map((definition, index) => {
      const x = 48 + (index % 2) * 24;
      const y = 48 + index * 88;
      if (definition.type === "text") return createTextElement(x, y);
      if (definition.type === "shape") return createShapeElement(definition.shape ?? "rectangle", x, y);
      return createSmartElement((definition.smartType ?? "special_text") as SmartElementType, x, y);
    }).map((element, index) => {
      const definition = item.elements[index];
      if (definition.type === "text" && definition.text) return { ...element, content: { ...element.content, text: definition.text } };
      if (definition.type === "smart" && definition.text && element.content.block) return { ...element, content: { ...element.content, block: { ...element.content.block, props: { ...(element.content.block.props ?? {}), text: definition.text } } } };
      return element;
    });
    mark((document) => {
      const base = mode === "replace" ? [] : document.elements;
      const offset = mode === "replace" ? 0 : base.length * 24;
      const elements = [...base, ...created.map((element, index) => ({ ...element, id: crypto.randomUUID(), x: element.x + offset, y: element.y + offset, zIndex: base.length + index + 1 }))];
      const section = { id: crypto.randomUUID(), name: item.name, height: Math.max(640, 520 + created.length * 88), elementIds: elements.slice(base.length).map((element) => element.id) };
      return { ...document, elements, sections: mode === "replace" ? [section] : [...document.sections, section] };
    }, "library");
    setSelectedIds(created.map((element) => element.id));
  }, [mark]);
  const updateAnimation = (patch: Partial<EditorAnimation>) => {
    if (!primary) return;
    updateSelected({ animation: { ...normalizeAnimation(primary.animation), ...patch } });
  };

  useEffect(() => {
    const updateFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", updateFullscreen);
    return () => document.removeEventListener("fullscreenchange", updateFullscreen);
  }, []);

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen?.();
  };

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!previewing || reducedMotion) return;
    const timer = window.setInterval(() => setPreviewTime((value) => (value + 50) % 10000), 50);
    return () => window.clearInterval(timer);
  }, [previewing, reducedMotion]);

  useEffect(() => {
    if (!previewing || reducedMotion || !("DeviceOrientationEvent" in window)) return;
    const handler = (event: DeviceOrientationEvent) => {
      const x = Math.max(-1, Math.min(1, (event.gamma ?? 0) / 30));
      const y = Math.max(-1, Math.min(1, (event.beta ?? 0) / 30));
      setParallaxOffset({ x, y });
    };
    window.addEventListener("deviceorientation", handler, { passive: true });
    return () => window.removeEventListener("deviceorientation", handler);
  }, [previewing, reducedMotion]);

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

  const preset = PREVIEW_PRESETS[previewPreset];
  return <TooltipProvider><section className={cn("overflow-hidden rounded-2xl border border-dashed border-primary/40 bg-muted/20 shadow-sm", fullscreen && "fixed inset-0 z-[60] rounded-none border-0 bg-background")} aria-label="Editor experimental isolado">
    <style>{`@keyframes vellune-fade-in{from{opacity:0}to{opacity:1}}@keyframes vellune-fade-out{from{opacity:1}to{opacity:0}}@keyframes vellune-slide_up-in{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}@keyframes vellune-slide_down-in{from{opacity:0;transform:translateY(-28px)}to{opacity:1;transform:translateY(0)}}@keyframes vellune-slide_left-in{from{opacity:0;transform:translateX(28px)}to{opacity:1;transform:translateX(0)}}@keyframes vellune-slide_right-in{from{opacity:0;transform:translateX(-28px)}to{opacity:1;transform:translateX(0)}}@keyframes vellune-zoom-in{from{opacity:0;transform:scale(.88)}to{opacity:1;transform:scale(1)}}@keyframes vellune-blur-in{from{opacity:0;filter:blur(10px)}to{opacity:1;filter:blur(0)}}@keyframes vellune-float-in{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}@keyframes vellune-pulse-in{0%,100%{opacity:1}50%{opacity:.72}}@media(prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;animation-iteration-count:1!important;scroll-behavior:auto!important}}`}</style>
    {h.document.elements.length === 0 && !started && <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/95 p-4 backdrop-blur-sm"><div className="w-full max-w-xl rounded-2xl border bg-card p-6 text-center shadow-xl sm:p-8"><div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><WandSparkles className="h-7 w-7" /></div><h2 className="mt-5 font-display text-2xl font-semibold tracking-tight">Como você quer começar?</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Escolha uma base pronta para personalizar ou comece com um canvas vazio.</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><Button className="h-auto min-h-24 flex-col gap-2" onClick={() => { setStarted(true); setTemplateLibraryOpen(true); }}><LayoutTemplate className="h-5 w-5" />Usar um modelo<span className="text-xs font-normal opacity-80">Templates e seções prontas</span></Button><Button variant="outline" className="h-auto min-h-24 flex-col gap-2" onClick={() => setStarted(true)}><Plus className="h-5 w-5" />Canvas vazio<span className="text-xs font-normal text-muted-foreground">Criar do zero</span></Button></div></div></div>}
    <header className="border-b bg-card/95 p-3 shadow-sm backdrop-blur sm:p-4"><div className="flex flex-wrap items-center gap-3"><div className="flex min-w-0 flex-1 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-background shadow-sm"><img src="/uploads/LogoClara.png" alt="Vellune Digital" className="h-full w-full object-cover" /></div><div className="min-w-0"><p className="flex items-center gap-2 text-sm font-semibold tracking-tight"><WandSparkles className="h-4 w-4 text-primary" />Editor experimental<span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">Beta</span></p><p className="truncate text-xs text-muted-foreground">Canvas experimental independente</p></div></div><div className="flex items-center gap-2 rounded-lg border bg-background px-2.5 py-1.5"><span className="h-2 w-2 rounded-full bg-emerald-500" /><SaveStatus state={state} /></div></div><div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3"><div className="flex items-center gap-1 rounded-lg border bg-background p-1"><Button size="sm" variant={viewMode === "edit" ? "secondary" : "ghost"} onClick={() => setViewMode("edit")}><MousePointer2 className="mr-1.5 h-4 w-4" />Editar</Button><Button size="sm" variant={viewMode === "preview" ? "secondary" : "ghost"} onClick={() => setViewMode("preview")}><Eye className="mr-1.5 h-4 w-4" />Preview</Button></div><Button size="sm" variant="outline" onClick={() => setPanel("library")}><Grid2X2 className="mr-1.5 h-4 w-4" />Criar</Button><Button size="sm" variant="outline" onClick={() => setPanel("library")}><ImageIcon className="mr-1.5 h-4 w-4" />Imagens</Button><Button size="sm" variant="outline" onClick={() => setPanel("library")}><Shapes className="mr-1.5 h-4 w-4" />Elementos</Button><Button size="sm" variant="outline" onClick={() => setPanel("library")}><Sparkles className="mr-1.5 h-4 w-4" />Componentes</Button><Button size="sm" variant="outline" onClick={() => setTemplateLibraryOpen(true)}><LayoutTemplate className="mr-1.5 h-4 w-4" />Modelos e seções</Button><div className="ml-auto flex items-center gap-1"><ActionButton label="Desfazer" onClick={() => { h.undo(); setState("dirty"); }} disabled={!h.canUndo}><Undo2 className="h-4 w-4" /></ActionButton><ActionButton label="Refazer" onClick={() => { h.redo(); setState("dirty"); }} disabled={!h.canRedo}><Redo2 className="h-4 w-4" /></ActionButton><Button size="sm" variant="ghost" onClick={() => setAdvancedOpen((value) => !value)}><Settings2 className="mr-1.5 h-4 w-4" />{advancedOpen ? "Ocultar opções" : "Opções avançadas"}</Button></div></div>{advancedOpen && <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-2"><select aria-label="Preset responsivo" value={previewPreset} onChange={(event) => setPreviewPreset(event.target.value as PreviewPreset)} className="h-8 rounded-md border bg-background px-2 text-xs"><option value="desktop">Desktop</option><option value="tablet">Tablet</option><option value="mobile">Mobile</option></select><Button size="sm" variant={previewing ? "secondary" : "outline"} onClick={() => setPreviewing((value) => !value)}>{previewing ? "Pausar animação" : "Reproduzir animação"}</Button><Button size="sm" variant="outline" onClick={() => { setPreviewKey((value) => value + 1); setPreviewTime(0); setPreviewing(true); }}>Reiniciar preview</Button><Button size="sm" variant="outline" onClick={() => setShowQuality((value) => !value)}><ShieldCheck className="mr-1 h-4 w-4" />Qualidade{qualityErrors + qualityWarnings > 0 ? ` (${qualityErrors + qualityWarnings})` : ""}</Button><ActionButton label={fullscreen ? "Sair da tela cheia" : "Abrir em tela cheia"} onClick={() => void toggleFullscreen()}>{fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</ActionButton><ActionButton label="Camadas" onClick={() => setPanel("layers")}><Layers3 className="h-4 w-4" /></ActionButton></div>}</header>
    {showQuality && <details open className="border-b bg-card/80 px-3 py-2"><summary className="cursor-pointer list-none text-xs font-medium text-muted-foreground">Qualidade e área segura · Score {qualityScore}</summary><div className="pt-2"><QualityPanel alerts={qualityAlerts} score={qualityScore} reducedMotion={reducedMotion} safeArea={safeArea} setSafeArea={setSafeArea} onSelect={(alert) => { if (!alert.elementId) return; setSelectedIds([alert.elementId]); setViewMode("edit"); setShowQuality(false); }} /></div></details>}
    <div className={cn("grid min-h-[720px] md:grid-cols-[240px_minmax(0,1fr)] xl:grid-cols-[280px_minmax(0,1fr)_300px]", viewMode === "preview" && "md:grid-cols-1")}>
      <aside className="hidden border-r bg-card/80 p-4 md:block"><div className="sticky top-0"><div className="mb-4 flex items-center gap-2 border-b pb-3"><Grid2X2 className="h-4 w-4 text-primary" /><div><p className="text-sm font-semibold">Biblioteca criativa</p><p className="text-[11px] text-muted-foreground">Elementos, componentes e mídia</p></div></div><LibraryPanel library={library} search={search} setSearch={setSearch} category={category} setCategory={setCategory} favorite={favorite} setFavorite={setFavorite} error={assetError} /></div></aside>
      <main className="relative min-w-0 overflow-auto bg-muted/40 p-3 sm:p-6 lg:p-8" onPointerUp={endDrag} onPointerCancel={endDrag} onPointerMove={(event) => { if (!drag.current && (previewing || viewMode === "preview") && !reducedMotion) { const rect = event.currentTarget.getBoundingClientRect(); setParallaxOffset({ x: Math.max(-1, Math.min(1, (event.clientX - rect.left - rect.width / 2) / (rect.width / 2))), y: Math.max(-1, Math.min(1, (event.clientY - rect.top - rect.height / 2) / (rect.height / 2))) }); } moveDrag(event); }} onWheel={(event) => { if (event.ctrlKey) { event.preventDefault(); setZoom((value) => Math.max(50, Math.min(180, value + (event.deltaY > 0 ? -5 : 5)))); } }}>
        <div className="mb-3 flex flex-wrap items-center justify-center gap-1"><ActionButton label="Diminuir zoom" onClick={() => setZoom((value) => Math.max(50, value - 10))}><Minus className="h-4 w-4" /></ActionButton><span className="min-w-14 text-center text-xs">{zoom}%</span><ActionButton label="Aumentar zoom" onClick={() => setZoom((value) => Math.min(180, value + 10))}><Plus className="h-4 w-4" /></ActionButton><Button size="sm" variant="outline" onClick={() => setZoom(100)}><MousePointer2 className="mr-1 h-4 w-4" />Centralizar</Button></div>
        <div className="mx-auto origin-top" style={{ width: `${100 / (zoom / 100)}%` }}><div className={cn("relative mx-auto min-h-[640px] overflow-hidden border bg-card shadow-lg", preset.frame && "rounded-[2.5rem] border-[10px] border-foreground/80 p-2", !preset.frame && "rounded-xl", viewMode === "preview" && "cursor-default")} style={{ width: `${Math.min(preset.width, 768)}px`, minHeight: `${preset.height}px`, maxWidth: "100%" }} onPointerDown={(event) => { if (event.target === event.currentTarget && viewMode === "edit") setSelectedIds([]); }}>
          <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,hsl(var(--border)/.2)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/.2)_1px,transparent_1px)] [background-size:16px_16px]" />
          {safeArea && <div className="pointer-events-none absolute inset-6 z-20 rounded-lg border border-dashed border-primary/40 bg-primary/[0.02]" aria-label="Área segura do preview" />}
          {h.document.elements.filter((element) => !isCanvasBackgroundElement(element)).map((element, index) => <CanvasElement key={`${element.id}-${previewKey}`} element={element} index={index} selected={viewMode === "edit" && selectedIds.includes(element.id)} previewing={previewing || viewMode === "preview"} reducedMotion={reducedMotion} parallaxOffset={parallaxOffset} onPointerDown={viewMode === "edit" ? startDrag : undefined} onClick={(event: any) => { event.stopPropagation(); if (viewMode === "edit") select(element.id, event.shiftKey || event.metaKey || event.ctrlKey); }} />)}
        </div></div>
        <div className="fixed inset-x-3 bottom-3 z-40 flex items-center justify-around gap-1 rounded-2xl border bg-card/95 p-2 shadow-xl backdrop-blur lg:hidden"><Button size="sm" variant="ghost" className="flex-1 flex-col gap-1 px-2 py-1.5 text-[10px]" onClick={() => setPanel("library")}><Grid2X2 className="h-4 w-4" />Criar</Button><Button size="sm" variant="ghost" className="flex-1 flex-col gap-1 px-2 py-1.5 text-[10px]" onClick={() => setPanel("properties")}><MousePointer2 className="h-4 w-4" />Editar</Button><Button size="sm" variant="ghost" className="flex-1 flex-col gap-1 px-2 py-1.5 text-[10px]" onClick={() => setViewMode("preview")}><Eye className="h-4 w-4" />Preview</Button><Button size="sm" variant="ghost" className="flex-1 flex-col gap-1 px-2 py-1.5 text-[10px]" onClick={() => setPanel("layers")}><Layers3 className="h-4 w-4" />Camadas</Button></div>
      </main>
      {viewMode === "edit" && <aside className="hidden border-l bg-card/80 p-4 xl:block"><div className="sticky top-0"><div className="mb-4 flex items-center gap-2 border-b pb-3"><MousePointer2 className="h-4 w-4 text-primary" /><div><p className="text-sm font-semibold">Propriedades</p><p className="text-[11px] text-muted-foreground">Ajustes do elemento selecionado</p></div></div><Properties selected={primary} count={selected.length} update={updateSelected} remove={remove} duplicate={duplicate} group={group} ungroup={ungroup} /></div></aside>}
    </div>
    <div className="flex flex-wrap items-center gap-3 border-t bg-card p-3 sm:p-4"><div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-primary" /><span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Seções</span></div><div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-1">{h.document.sections.map((section, index) => <button key={section.id} type="button" className={cn("whitespace-nowrap rounded-lg border bg-background px-3 py-1.5 text-xs transition-colors hover:border-primary hover:bg-primary/5", index === 0 && "border-primary/40 bg-primary/5 text-primary")}><span className="mr-1.5 text-[10px] text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>{section.name}</button>)}</div><Button size="sm" variant="outline" className="shrink-0" onClick={() => { localStorage.removeItem(localRecoveryKey(invitationId)); setState("saved"); }}>Limpar recuperação</Button></div>
    <Sheet open={panel !== null} onOpenChange={(open) => !open && setPanel(null)}><SheetContent side="bottom" className="max-h-[84vh] overflow-y-auto"><SheetHeader><SheetTitle>{panel === "library" ? "Biblioteca de mídia e elementos" : panel === "layers" ? "Camadas" : "Propriedades"}</SheetTitle></SheetHeader><div className="mt-4">{panel === "library" ? <LibraryPanel library={library} search={search} setSearch={setSearch} category={category} setCategory={setCategory} favorite={favorite} setFavorite={setFavorite} error={assetError} /> : panel === "layers" ? <LayersPanel elements={h.document.elements} selectedIds={selectedIds} select={select} /> : <Properties selected={primary} count={selected.length} update={updateSelected} remove={remove} duplicate={duplicate} group={group} ungroup={ungroup} />}</div></SheetContent></Sheet>
    <ExperimentalTemplateLibrary open={templateLibraryOpen} document={h.document} onClose={() => setTemplateLibraryOpen(false)} onApply={applyLibraryItem} />
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

function CanvasElement({ element, index = 0, selected, previewing = false, reducedMotion = false, parallaxOffset = { x: 0, y: 0 }, onPointerDown, onClick }: any) {
  const src = useAssetUrl(element.content.src);
  const style: any = { left: element.x, top: element.y, width: element.width, height: element.height, zIndex: element.zIndex, opacity: element.visible ? element.opacity : 0.25, transform: `rotate(${element.rotation}deg)`, color: element.styles.color, background: element.styles.background || element.styles.color, borderRadius: element.styles.borderRadius, border: `${element.styles.borderWidth || 0}px solid ${element.styles.borderColor || "transparent"}`, fontFamily: element.styles.fontFamily, fontSize: element.styles.fontSize, fontWeight: element.styles.fontWeight, textAlign: element.styles.textAlign, objectFit: element.styles.objectFit, objectPosition: element.styles.objectPosition, ...animationStyle(element.animation, { playing: previewing, selected, reducedMotion, index }), ...parallaxStyle(element.animation, parallaxOffset, previewing && !selected && !reducedMotion) };
  const shape = element.content.shape;
  return <div className={cn("absolute rounded-md transition-shadow", selected && "ring-2 ring-primary ring-offset-2", !element.visible && "opacity-40")} style={style} onPointerDown={(event) => onPointerDown(event, element)} onClick={onClick}>
    {element.type === "block" && element.content.block ? <BlockView block={element.content.block} interactive={false} /> : SMART_ELEMENT_DEFINITIONS.some((definition) => definition.type === element.type) ? <SmartPreview element={element} /> : element.type === "image" || element.type === "gif" ? <>{src ? <img src={src} alt={element.content.alt || ""} className="h-full w-full" style={{ objectFit: element.styles.objectFit as any, objectPosition: element.styles.objectPosition as any, borderRadius: element.styles.borderRadius }} /> : <div className="flex h-full items-center justify-center bg-muted text-xs text-muted-foreground">Imagem indisponível</div>}</> : element.type === "shape" || element.type === "decoration" ? <div className={cn("h-full w-full", shape === "circle" && "rounded-full", shape === "heart" && "rotate-45 rounded-tl-full")} /> : <div className="flex h-full w-full items-center justify-center p-3">{element.content.text}</div>}
    {selected && <span className="absolute -top-6 left-0 rounded bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">{element.type}</span>}
  </div>;
}

function QualityPanel({ alerts, score, reducedMotion, safeArea, setSafeArea, onSelect }: { alerts: QualityAlert[]; score: number; reducedMotion: boolean; safeArea: boolean; setSafeArea: (value: boolean) => void; onSelect: (alert: QualityAlert) => void }) {
  const errors = alerts.filter((alert) => alert.severity === "error").length;
  const warnings = alerts.filter((alert) => alert.severity === "warning").length;
  const scoreTone = score >= 90 ? "text-emerald-600" : score >= 70 ? "text-amber-600" : "text-destructive";
  return <div className="border-b bg-card px-3 py-2"><div className="flex flex-wrap items-center gap-3"><div className="flex items-center gap-2 text-sm font-medium"><ShieldCheck className="h-4 w-4 text-primary" />Painel de qualidade</div><span className={cn("text-sm font-semibold", scoreTone)}>Score {score}</span><span className="text-xs text-destructive">{errors} erros</span><span className="text-xs text-amber-600">{warnings} alertas</span><span className="text-xs text-muted-foreground">{reducedMotion ? "Reduced motion ativo" : "Animações disponíveis"}</span><label className="ml-auto flex items-center gap-2 text-xs"><input type="checkbox" checked={safeArea} onChange={(event) => setSafeArea(event.target.checked)} />Mostrar área segura</label></div>{alerts.length > 0 && <div className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">{alerts.slice(0, 12).map((alert) => <button type="button" key={alert.id} onClick={() => onSelect(alert)} className={cn("flex items-start gap-2 rounded-md border px-2 py-1.5 text-left text-xs transition-colors hover:border-primary", alert.severity === "error" ? "border-destructive/30 bg-destructive/5" : alert.severity === "warning" ? "border-amber-500/30 bg-amber-500/5" : "border-primary/20 bg-primary/5")}>{alert.severity === "error" ? <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" /> : alert.severity === "warning" ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" /> : <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />}<span><strong>{alert.title}:</strong> {alert.message}{alert.elementId && <span className="mt-0.5 block text-[10px] text-muted-foreground">Clique para selecionar o elemento</span>}</span></button>)}</div>}</div>;
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
  const animation = normalizeAnimation(selected.animation);
  return <div className="space-y-4"><div><p className="text-sm font-semibold">Propriedades</p><p className="text-xs text-muted-foreground">{count} selecionado(s)</p></div><div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3"><div><p className="text-sm font-medium">Animação experimental</p><p className="text-xs text-muted-foreground">Aplicada somente no preview. A edição permanece estática.</p></div><label className="block space-y-1 text-xs text-muted-foreground">Preset<select value={animation.preset} onChange={(event) => update({ animation: { ...animation, preset: event.target.value } })} className="h-9 w-full rounded-md border bg-background px-2 text-foreground">{ANIMATION_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}</select></label><div className="grid grid-cols-2 gap-2"><label className="space-y-1 text-xs text-muted-foreground">Duração<Input type="number" min={100} max={4000} value={animation.duration} onChange={(event) => update({ animation: { ...animation, duration: Number(event.target.value) } })} /></label><label className="space-y-1 text-xs text-muted-foreground">Atraso<Input type="number" min={0} max={3000} value={animation.delay} onChange={(event) => update({ animation: { ...animation, delay: Number(event.target.value) } })} /></label></div><div className="grid grid-cols-2 gap-2"><label className="space-y-1 text-xs text-muted-foreground">Stagger<Input type="number" min={0} max={1000} value={animation.stagger} onChange={(event) => update({ animation: { ...animation, stagger: Number(event.target.value) } })} /></label><label className="space-y-1 text-xs text-muted-foreground">Parallax<Input type="number" min={-32} max={32} value={animation.parallax} onChange={(event) => update({ animation: { ...animation, parallax: Number(event.target.value) } })} /></label></div><div className="flex items-center justify-between gap-2 text-xs"><span>{animation.enabled ? "Animação ativa" : "Animação desativada"}</span><Button size="sm" variant="outline" onClick={() => update({ animation: { ...animation, enabled: !animation.enabled } })}>{animation.enabled ? "Desativar" : "Ativar"}</Button></div></div>{smartDefinition && <div className="space-y-3 rounded-xl border border-primary/20 bg-primary/5 p-3"><div><p className="text-sm font-medium">{smartDefinition.label}</p><p className="text-xs text-muted-foreground">Configuração funcional do componente experimental.</p></div>{Object.entries(props).filter(([key]) => key !== "style").slice(0, 5).map(([key, value]) => <label key={key} className="block space-y-1 text-xs text-muted-foreground"><span>{key === "url" ? "Link" : key === "phone" ? "Telefone" : key === "target" ? "Destino" : key}</span><Input value={String(value ?? "")} onChange={(event) => updateSmartProp(key, event.target.value)} className="h-8 text-foreground" /></label>)}</div>}<div className="grid grid-cols-2 gap-2">{["x", "y", "width", "height", "rotation", "zIndex"].map((key) => <label key={key} className="space-y-1 text-xs text-muted-foreground">{key}<Input type="number" value={number(key)} onChange={(event) => update({ [key]: Number(event.target.value) })} className="h-8 text-foreground" /></label>)}</div>{selected.type === "text" && <><label className="block space-y-1 text-xs text-muted-foreground">Texto<Input value={selected.content.text || ""} onChange={(event) => update({ content: { ...selected.content, text: event.target.value } })} /></label><div className="grid grid-cols-2 gap-2"><label className="space-y-1 text-xs text-muted-foreground">Fonte<select value={styles.fontFamily || "Manrope"} onChange={(event) => style("fontFamily", event.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-foreground"><option>Manrope</option><option>Sora</option><option>Georgia</option><option>Arial</option></select></label><label className="space-y-1 text-xs text-muted-foreground">Tamanho<Input type="number" value={styles.fontSize || 28} onChange={(event) => style("fontSize", Number(event.target.value))} /></label></div></>}{(selected.type === "image" || selected.type === "gif") && <><label className="space-y-1 text-xs text-muted-foreground">Ajuste<select value={styles.objectFit || "cover"} onChange={(event) => style("objectFit", event.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-foreground"><option value="cover">Crop / Cobrir</option><option value="contain">Conter</option><option value="fill">Preencher</option></select></label><label className="space-y-1 text-xs text-muted-foreground">Posição do crop<Input value={styles.objectPosition || "center"} onChange={(event) => style("objectPosition", event.target.value)} /></label></>}{selected.type !== "block" && <label className="space-y-1 text-xs text-muted-foreground">Cor / gradiente<Input value={styles.background || styles.color || ""} placeholder="#7c3aed ou linear-gradient(...)" onChange={(event) => { style("background", event.target.value); style("color", event.target.value); }} /></label>}<div className="flex flex-wrap gap-1"><Button size="sm" variant="outline" onClick={() => update({ visible: !selected.visible })}>{selected.visible ? <EyeOff className="mr-1 h-3.5 w-3.5" /> : <Eye className="mr-1 h-3.5 w-3.5" />}{selected.visible ? "Ocultar" : "Mostrar"}</Button><Button size="sm" variant="outline" onClick={() => update({ locked: !selected.locked })}>{selected.locked ? <Unlock className="mr-1 h-3.5 w-3.5" /> : <Lock className="mr-1 h-3.5 w-3.5" />}{selected.locked ? "Desbloquear" : "Bloquear"}</Button><Button size="sm" variant="outline" onClick={() => update({ rotation: selected.rotation + 15 })}><RotateCw className="mr-1 h-3.5 w-3.5" />Girar</Button></div><div className="grid grid-cols-2 gap-2"><Button size="sm" variant="outline" onClick={duplicate}><Copy className="mr-1 h-3.5 w-3.5" />Duplicar</Button><Button size="sm" variant="outline" onClick={group}>Agrupar</Button><Button size="sm" variant="outline" onClick={ungroup}>Desagrupar</Button><Button size="sm" variant="outline" onClick={() => update({ zIndex: selected.zIndex + 1 })}><ArrowUp className="mr-1 h-3.5 w-3.5" />Subir</Button><Button size="sm" variant="outline" onClick={() => update({ zIndex: Math.max(0, selected.zIndex - 1) })}><ArrowDown className="mr-1 h-3.5 w-3.5" />Descer</Button></div><Button size="sm" variant="outline" className="w-full text-destructive" onClick={remove}><Trash2 className="mr-1 h-3.5 w-3.5" />Excluir</Button></div>;
}
