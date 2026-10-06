// @ts-nocheck
import { useEffect, useMemo, useState } from "react";
import { Check, Clock3, Eye, Heart, LayoutTemplate, Monitor, Palette, Plus, Search, Smartphone, Tablet, Type, WandSparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { EditorElementType, InvitationEditorDocument, SmartElementType } from "@/lib/invitation-editor-foundation";

export type ExperimentalTextPreset = {
  id: string;
  name: string;
  description: string;
  category: string;
  text: string;
  styles: Record<string, string | number | boolean>;
};

export type ExperimentalTextInsert = (preset: ExperimentalTextPreset) => void;

export const EXPERIMENTAL_TEXT_PRESETS: ExperimentalTextPreset[] = [
  {
    id: "hero-title",
    name: "Título principal",
    description: "Título de abertura com alto impacto visual.",
    category: "Hierarquia",
    text: "Um momento para recordar",
    styles: { fontFamily: "Sora", fontSize: 42, fontWeight: 700, lineHeight: 1.08, letterSpacing: -0.8, textAlign: "center", color: "#172033", background: "transparent" },
  },
  {
    id: "section-title",
    name: "Título de seção",
    description: "Título equilibrado para dividir o convite.",
    category: "Hierarquia",
    text: "Será uma alegria ter você conosco",
    styles: { fontFamily: "Sora", fontSize: 30, fontWeight: 650, lineHeight: 1.16, letterSpacing: -0.3, textAlign: "center", color: "#172033", background: "transparent" },
  },
  {
    id: "subtitle",
    name: "Subtítulo",
    description: "Complemento curto para o título principal.",
    category: "Hierarquia",
    text: "Celebre este dia especial ao nosso lado",
    styles: { fontFamily: "Manrope", fontSize: 22, fontWeight: 600, lineHeight: 1.3, letterSpacing: 0, textAlign: "center", color: "#475569", background: "transparent" },
  },
  {
    id: "body",
    name: "Texto corrido",
    description: "Mensagem confortável para leitura em qualquer tela.",
    category: "Conteúdo",
    text: "Preparamos cada detalhe com carinho para compartilhar este momento com você.",
    styles: { fontFamily: "Manrope", fontSize: 17, fontWeight: 400, lineHeight: 1.6, letterSpacing: 0, textAlign: "left", color: "#334155", background: "transparent" },
  },
  {
    id: "highlight",
    name: "Destaque",
    description: "Mensagem curta para chamar atenção.",
    category: "Conteúdo",
    text: "Reserve esta data",
    styles: { fontFamily: "Sora", fontSize: 26, fontWeight: 700, lineHeight: 1.2, letterSpacing: 0.2, textAlign: "center", color: "#7c3aed", background: "transparent" },
  },
  {
    id: "quote",
    name: "Citação",
    description: "Texto afetivo com aparência editorial.",
    category: "Estilo",
    text: "Os melhores momentos ficam ainda mais especiais quando compartilhados.",
    styles: { fontFamily: "Georgia", fontSize: 23, fontWeight: 400, lineHeight: 1.45, letterSpacing: 0, textAlign: "center", color: "#475569", background: "transparent", fontStyle: "italic" },
  },
  {
    id: "caption",
    name: "Legenda",
    description: "Texto auxiliar para fotos e informações secundárias.",
    category: "Acessibilidade",
    text: "Uma lembrança para guardar",
    styles: { fontFamily: "Manrope", fontSize: 14, fontWeight: 500, lineHeight: 1.4, letterSpacing: 0.2, textAlign: "center", color: "#64748b", background: "transparent" },
  },
  {
    id: "text-button",
    name: "Chamada textual",
    description: "Texto curto para orientar uma ação.",
    category: "Ação",
    text: "Confirmar presença",
    styles: { fontFamily: "Manrope", fontSize: 16, fontWeight: 700, lineHeight: 1.2, letterSpacing: 0.2, textAlign: "center", color: "#ffffff", background: "#7c3aed", borderRadius: 14, padding: 14 },
  },
];

export type LibraryMode = "add" | "replace";
export type LibraryItemType = "text" | "shape" | "smart" | "image";
export type PreviewDevice = "desktop" | "tablet" | "mobile";

export type ExperimentalTemplateElement = {
  id: string;
  type: LibraryItemType;
  smartType?: EditorElementType;
  text?: string;
  shape?: "rectangle" | "circle" | "line" | "star" | "heart";
  sectionId: string;
  componentId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  styles?: Record<string, string | number | boolean>;
};

export type ExperimentalTemplateComponent = {
  id: string;
  type: SmartElementType;
  sectionId: string;
  elementId: string;
  functionalConfig: Record<string, unknown>;
  visualConfig: Record<string, unknown>;
};

export type ExperimentalTemplateSection = {
  id: string;
  name: string;
  height: number;
  background: Record<string, unknown>;
  elementIds: string[];
  componentIds: string[];
};

export type ExperimentalTemplateTheme = {
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  fonts: { heading: string; body: string };
};

export type ExperimentalLibraryItem = {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  style: string;
  theme: string;
  palette: string[];
  type: "template" | "section";
  preview: string;
  themeConfig: ExperimentalTemplateTheme;
  sections: ExperimentalTemplateSection[];
  elements: ExperimentalTemplateElement[];
  components: ExperimentalTemplateComponent[];
};

const FAVORITES_KEY = "vellune:experimental-editor:template-favorites";
const RECENTS_KEY = "vellune:experimental-editor:template-recents";

const id = (prefix: string) => {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `${prefix}-${crypto.randomUUID()}`;
    }
  } catch {
    // Usa o fallback quando a API de criptografia não estiver disponível.
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

function createTemplate(config: Omit<ExperimentalLibraryItem, "sections" | "elements" | "components"> & {
  sections: Array<Omit<ExperimentalTemplateSection, "id" | "elementIds" | "componentIds"> & { elements: Array<Omit<ExperimentalTemplateElement, "id" | "sectionId" | "componentId"> & { componentType?: SmartElementType; functionalConfig?: Record<string, unknown>; visualConfig?: Record<string, unknown> }> }>;
}): ExperimentalLibraryItem {
  const sections: ExperimentalTemplateSection[] = [];
  const elements: ExperimentalTemplateElement[] = [];
  const components: ExperimentalTemplateComponent[] = [];

  for (const sourceSection of config.sections) {
    const sectionId = id("section");
    const section: ExperimentalTemplateSection = { id: sectionId, name: sourceSection.name, height: sourceSection.height, background: structuredClone(sourceSection.background), elementIds: [], componentIds: [] };
    for (const sourceElement of sourceSection.elements) {
      const elementId = id("element");
      const componentId = sourceElement.componentType ? id("component") : undefined;
      const element: ExperimentalTemplateElement = { ...structuredClone(sourceElement), id: elementId, sectionId, ...(componentId ? { componentId } : {}) };
      delete element.componentType;
      delete element.functionalConfig;
      delete element.visualConfig;
      elements.push(element);
      section.elementIds.push(elementId);
      if (componentId && sourceElement.componentType) {
        components.push({ id: componentId, type: sourceElement.componentType, sectionId, elementId, functionalConfig: structuredClone(sourceElement.functionalConfig ?? {}), visualConfig: structuredClone(sourceElement.visualConfig ?? {}) });
        section.componentIds.push(componentId);
      }
    }
    sections.push(section);
  }

  return { ...config, sections, elements, components };
}

const text = (value: string, x: number, y: number, width = 620, height = 70, styles = {}) => ({ type: "text", text: value, x, y, width, height, styles }) as any;
const shape = (shapeName: "circle" | "rectangle" | "line", x: number, y: number, width: number, height: number, styles = {}) => ({ type: "shape", shape: shapeName, x, y, width, height, styles }) as any;
const smart = (smartType: SmartElementType, x: number, y: number, width: number, height: number, functionalConfig = {}, visualConfig = {}) => ({ type: "smart", smartType, x, y, width, height, componentType: smartType, functionalConfig, visualConfig }) as any;

export const EXPERIMENTAL_LIBRARY: ExperimentalLibraryItem[] = [
  createTemplate({
    id: "editorial-wedding", name: "Editorial romântico", description: "Convite elegante com abertura editorial, confirmação e localização.", category: "Casamento", tags: ["elegante", "romântico", "clássico"], style: "Editorial", theme: "Romântico", palette: ["#7c3aed", "#f5e9df", "#172033"], type: "template", preview: "linear-gradient(145deg,#f5e9df,#ffffff 58%,#eadcff)", themeConfig: { name: "Romântico", primary: "#7c3aed", secondary: "#f5e9df", accent: "#c084fc", background: "#fffaf7", foreground: "#172033", fonts: { heading: "Sora", body: "Manrope" } },
    sections: [{ name: "Abertura", height: 700, background: { color: "#fffaf7" }, elements: [text("Você está convidado", 48, 80, 672, 90, { fontFamily: "Sora", fontSize: 42, color: "#172033", textAlign: "center" }), smart("special_text", 80, 190, 608, 100, { story: "Uma celebração para guardar no coração" }), smart("countdown", 80, 330, 608, 130, {}, { accent: "#7c3aed", background: "#f5e9df" }), smart("location", 80, 500, 608, 150)] }, { name: "Confirmação", height: 460, background: { color: "#f5e9df" }, elements: [text("Será uma alegria ter você conosco", 60, 55, 648, 75, { fontFamily: "Sora", fontSize: 28, textAlign: "center" }), smart("rsvp", 110, 170, 548, 180)] }]
  }),
  createTemplate({
    id: "minimal-birthday", name: "Minimal aniversário", description: "Composição vibrante, limpa e direta para celebrar uma nova fase.", category: "Aniversário", tags: ["minimalista", "vibrante", "moderno"], style: "Minimalista", theme: "Celebração", palette: ["#f97316", "#fff7ed", "#431407"], type: "template", preview: "linear-gradient(145deg,#fff7ed,#ffedd5 55%,#fed7aa)", themeConfig: { name: "Celebração", primary: "#f97316", secondary: "#fff7ed", accent: "#fb923c", background: "#fff7ed", foreground: "#431407", fonts: { heading: "Sora", body: "Manrope" } },
    sections: [{ name: "Convite", height: 680, background: { color: "#fff7ed" }, elements: [shape("circle", 250, 45, 270, 270, { background: "#fed7aa" }), text("Vamos celebrar!", 48, 170, 672, 86, { fontFamily: "Sora", fontSize: 44, color: "#431407", textAlign: "center" }), smart("countdown", 100, 330, 568, 130), smart("calendar", 170, 510, 428, 70)] }, { name: "Contato", height: 360, background: { color: "#ffedd5" }, elements: [text("Ficou com alguma dúvida?", 70, 55, 628, 60, { fontSize: 26, textAlign: "center" }), smart("whatsapp", 150, 170, 468, 72)] }]
  }),
  createTemplate({
    id: "baby-soft", name: "Chá de bebê suave", description: "Atmosfera delicada para compartilhar a chegada de um novo amor.", category: "Chá de bebê", tags: ["suave", "delicado", "família"], style: "Orgânico", theme: "Aconchego", palette: ["#0f766e", "#ccfbf1", "#134e4a"], type: "template", preview: "linear-gradient(145deg,#ccfbf1,#f0fdfa 56%,#99f6e4)", themeConfig: { name: "Aconchego", primary: "#0f766e", secondary: "#ccfbf1", accent: "#5eead4", background: "#f0fdfa", foreground: "#134e4a", fonts: { heading: "Sora", body: "Manrope" } },
    sections: [{ name: "Revelação", height: 700, background: { color: "#f0fdfa" }, elements: [text("Um novo amor está chegando", 55, 100, 658, 100, { fontFamily: "Sora", fontSize: 38, color: "#134e4a", textAlign: "center" }), smart("special_text", 90, 250, 588, 110, { story: "Prepare-se para um momento muito especial" }), smart("gallery", 100, 420, 568, 210, {}, { columns: 3, accent: "#0f766e" })] }, { name: "Local", height: 380, background: { color: "#ccfbf1" }, elements: [text("Esperamos por você", 80, 55, 608, 65, { fontSize: 30, textAlign: "center" }), smart("location", 100, 170, 568, 150)] }]
  }),
  createTemplate({
    id: "hero-section", name: "Hero com destaque", description: "Abertura de alto impacto com título, mensagem e chamada para ação.", category: "Abertura", tags: ["hero", "destaque", "conversão"], style: "Impacto", theme: "Versátil", palette: ["#4f46e5", "#eef2ff", "#1e1b4b"], type: "section", preview: "linear-gradient(145deg,#eef2ff,#e0e7ff 55%,#c7d2fe)", themeConfig: { name: "Versátil", primary: "#4f46e5", secondary: "#eef2ff", accent: "#818cf8", background: "#eef2ff", foreground: "#1e1b4b", fonts: { heading: "Sora", body: "Manrope" } },
    sections: [{ name: "Hero", height: 620, background: { gradient: "linear-gradient(145deg,#eef2ff,#c7d2fe)" }, elements: [text("Um momento para recordar", 48, 110, 672, 95, { fontFamily: "Sora", fontSize: 42, color: "#1e1b4b", textAlign: "center" }), smart("special_text", 80, 250, 608, 100, { story: "Estamos preparando tudo com carinho" }), smart("button", 220, 430, 328, 72, { rsvpLabel: "Saiba mais", url: "#" }, { accent: "#4f46e5" })] }]
  }),
  createTemplate({
    id: "schedule-section", name: "Programação do evento", description: "Seção organizada para apresentar horários e etapas da celebração.", category: "Informação", tags: ["agenda", "evento", "programação"], style: "Editorial", theme: "Organização", palette: ["#be123c", "#fff1f2", "#881337"], type: "section", preview: "linear-gradient(145deg,#fff1f2,#ffe4e6 55%,#fecdd3)", themeConfig: { name: "Organização", primary: "#be123c", secondary: "#fff1f2", accent: "#fb7185", background: "#fff1f2", foreground: "#881337", fonts: { heading: "Sora", body: "Manrope" } },
    sections: [{ name: "Programação", height: 680, background: { color: "#fff1f2" }, elements: [text("Programação", 70, 70, 628, 80, { fontFamily: "Sora", fontSize: 36, color: "#881337", textAlign: "center" }), smart("timeline", 90, 200, 588, 230), smart("calendar", 160, 500, 448, 70)] }]
  }),
  createTemplate({
    id: "memories-section", name: "Memórias e galeria", description: "Seção visual para fotos, mensagens e lembranças especiais.", category: "Conteúdo", tags: ["fotos", "galeria", "memórias"], style: "Visual", theme: "Afeto", palette: ["#92400e", "#fffbeb", "#78350f"], type: "section", preview: "linear-gradient(145deg,#fffbeb,#fef3c7 55%,#fde68a)", themeConfig: { name: "Afeto", primary: "#92400e", secondary: "#fffbeb", accent: "#f59e0b", background: "#fffbeb", foreground: "#78350f", fonts: { heading: "Sora", body: "Manrope" } },
    sections: [{ name: "Memórias", height: 720, background: { color: "#fffbeb" }, elements: [text("Momentos especiais", 60, 65, 648, 80, { fontFamily: "Sora", fontSize: 34, color: "#78350f", textAlign: "center" }), smart("gallery", 80, 190, 608, 300, {}, { columns: 3, accent: "#92400e" }), smart("social", 120, 560, 528, 80)] }]
  })
];

const BLANK_TEMPLATE: ExperimentalLibraryItem = createTemplate({
  id: "blank-canvas", name: "Começar em branco", description: "Um canvas limpo para criar sua composição do zero.", category: "Em branco", tags: ["vazio", "personalizado", "do zero"], style: "Livre", theme: "Neutro", palette: ["#0f172a", "#ffffff", "#64748b"], type: "template", preview: "linear-gradient(145deg,#ffffff,#f8fafc)", themeConfig: { name: "Neutro", primary: "#0f172a", secondary: "#f8fafc", accent: "#64748b", background: "#ffffff", foreground: "#0f172a", fonts: { heading: "Sora", body: "Manrope" } }, sections: [{ name: "Seção principal", height: 640, background: { color: "#ffffff" }, elements: [] }]
});

function readList(key: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch { return []; }
}

function writeList(key: string, value: string[]) {
  try { localStorage.setItem(key, JSON.stringify(value.slice(0, 30))); } catch { /* armazenamento local opcional */ }
}

export function rememberLibraryItem(idValue: string) {
  writeList(RECENTS_KEY, [idValue, ...readList(RECENTS_KEY).filter((item) => item !== idValue)]);
}

function copyWithFreshIds(item: ExperimentalLibraryItem): ExperimentalLibraryItem {
  const copy = structuredClone(item);
  const sectionMap = new Map(copy.sections.map((section) => [section.id, id("section")]));
  const elementMap = new Map(copy.elements.map((element) => [element.id, id("element")]));
  const componentMap = new Map(copy.components.map((component) => [component.id, id("component")]));
  copy.sections = copy.sections.map((section) => ({ ...section, id: sectionMap.get(section.id), elementIds: section.elementIds.map((value) => elementMap.get(value) ?? id("element")), componentIds: section.componentIds.map((value) => componentMap.get(value) ?? id("component")) }));
  copy.elements = copy.elements.map((element) => ({ ...element, id: elementMap.get(element.id), sectionId: sectionMap.get(element.sectionId), componentId: element.componentId ? componentMap.get(element.componentId) : undefined }));
  copy.components = copy.components.map((component) => ({ ...component, id: componentMap.get(component.id), sectionId: sectionMap.get(component.sectionId), elementId: elementMap.get(component.elementId) }));
  return copy;
}

const TEXT_FAVORITES_KEY = "vellune:experimental-editor:text-favorites";
const TEXT_RECENTS_KEY = "vellune:experimental-editor:text-recents";

function readTextList(key: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeTextList(key: string, value: string[]) {
  try { localStorage.setItem(key, JSON.stringify(value.slice(0, 30))); } catch { /* armazenamento local opcional */ }
}

export function ExperimentalTextLibrary({ onInsert }: { onInsert: ExperimentalTextInsert }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const categories = ["Todos", ...new Set(EXPERIMENTAL_TEXT_PRESETS.map((preset) => preset.category))];
  const filtered = EXPERIMENTAL_TEXT_PRESETS.filter((preset) => {
    const haystack = `${preset.name} ${preset.description} ${preset.category} ${preset.text}`.toLowerCase();
    return (!search || haystack.includes(search.toLowerCase())) && (category === "Todos" || preset.category === category);
  });

  useEffect(() => {
    setFavorites(readTextList(TEXT_FAVORITES_KEY));
    setRecents(readTextList(TEXT_RECENTS_KEY));
  }, []);

  const insert = (preset: ExperimentalTextPreset) => {
    const next = [preset.id, ...recents.filter((item) => item !== preset.id)];
    setRecents(next);
    writeTextList(TEXT_RECENTS_KEY, next);
    onInsert(preset);
  };

  const toggleFavorite = (idValue: string) => {
    const next = favorites.includes(idValue) ? favorites.filter((item) => item !== idValue) : [idValue, ...favorites];
    setFavorites(next);
    writeTextList(TEXT_FAVORITES_KEY, next);
  };

  return <div className="space-y-3" aria-label="Biblioteca experimental de textos">
    <div className="flex flex-wrap gap-2">
      <div className="relative min-w-[180px] flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar textos e presets" className="pl-9" aria-label="Buscar textos" /></div>
      <div className="flex gap-1 overflow-x-auto">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={cn("whitespace-nowrap rounded-md border px-2 py-1.5 text-xs", category === item ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>{item}</button>)}</div>
    </div>
    <div className="grid gap-2 sm:grid-cols-2">
      {filtered.map((preset) => <div key={preset.id} className="rounded-lg border bg-background p-3 transition-colors hover:border-primary/50">
        <div className="flex items-start gap-2"><button type="button" onClick={() => insert(preset)} className="min-w-0 flex-1 text-left" aria-label={`Inserir preset ${preset.name}`}><span className="block truncate text-sm font-medium">{preset.name}</span><span className="mt-1 block line-clamp-2 text-xs text-muted-foreground">{preset.description}</span><span className="mt-2 block truncate rounded-md bg-muted/50 px-2 py-1 text-xs" style={{ fontFamily: String(preset.styles.fontFamily), fontSize: `${Math.min(Number(preset.styles.fontSize) || 16, 22)}px`, fontWeight: Number(preset.styles.fontWeight) || 400, color: String(preset.styles.color) }}>{preset.text}</span></button><button type="button" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-primary" aria-label={favorites.includes(preset.id) ? `Remover ${preset.name} dos favoritos` : `Favoritar ${preset.name}`} onClick={() => toggleFavorite(preset.id)}>{favorites.includes(preset.id) ? <Heart className="h-4 w-4 fill-current text-primary" /> : <Heart className="h-4 w-4" />}</button></div>
        {recents.includes(preset.id) && <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground"><Clock3 className="h-3 w-3" />Usado recentemente</p>}
      </div>)}
    </div>
    {filtered.length === 0 && <div className="rounded-lg border border-dashed p-6 text-center text-xs text-muted-foreground">Nenhum preset de texto encontrado.</div>}
  </div>;
}

export function ExperimentalTemplateLibrary({ open, document, onClose, onApply }: { open: boolean; document: InvitationEditorDocument; onClose: () => void; onApply: (item: ExperimentalLibraryItem, mode: LibraryMode) => void }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [style, setStyle] = useState("Todos");
  const [theme, setTheme] = useState("Todos");
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [selected, setSelected] = useState<ExperimentalLibraryItem | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);

  useEffect(() => { if (open) { setFavorites(readList(FAVORITES_KEY)); setRecents(readList(RECENTS_KEY)); setSelected(null); setConfirmReplace(false); } }, [open]);
  const allItems = useMemo(() => [BLANK_TEMPLATE, ...EXPERIMENTAL_LIBRARY], []);
  const categories = useMemo(() => ["Todos", ...new Set(allItems.map((item) => item.category))], [allItems]);
  const styles = useMemo(() => ["Todos", ...new Set(allItems.map((item) => item.style))], [allItems]);
  const themes = useMemo(() => ["Todos", ...new Set(allItems.map((item) => item.theme))], [allItems]);
  const filtered = useMemo(() => allItems.filter((item) => { const haystack = `${item.name} ${item.description} ${item.tags.join(" ")} ${item.category} ${item.style} ${item.theme}`.toLowerCase(); return (!search || haystack.includes(search.toLowerCase())) && (category === "Todos" || item.category === category) && (style === "Todos" || item.style === style) && (theme === "Todos" || item.theme === theme); }), [allItems, category, search, style, theme]);
  if (!open) return null;

  const toggleFavorite = (idValue: string) => { const next = favorites.includes(idValue) ? favorites.filter((item) => item !== idValue) : [idValue, ...favorites]; setFavorites(next); writeList(FAVORITES_KEY, next); };
  const apply = (mode: LibraryMode) => { if (!selected) return; if (mode === "replace" && document.elements.length > 0 && !confirmReplace) { setConfirmReplace(true); return; } const freshCopy = copyWithFreshIds(selected); rememberLibraryItem(selected.id); onApply(freshCopy, mode); setSelected(null); setConfirmReplace(false); onClose(); };
  const previewWidth = device === "mobile" ? "max-w-[310px]" : device === "tablet" ? "max-w-[500px]" : "max-w-full";

  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-2 sm:items-center sm:p-6"><div className="flex max-h-[94vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
    <header className="flex flex-wrap items-center gap-3 border-b bg-card p-4"><div className="flex min-w-0 flex-1 items-center gap-2"><WandSparkles className="h-5 w-5 shrink-0 text-primary" /><div><h2 className="font-semibold">Biblioteca de templates experimentais</h2><p className="text-xs text-muted-foreground">Sections, Elements e Components prontos para personalizar</p></div></div><Button variant="outline" size="sm" onClick={onClose}><X className="mr-1 h-4 w-4" />Fechar</Button></header>
    <div className="grid min-h-0 flex-1 lg:grid-cols-[230px_minmax(0,1fr)_330px]">
      <aside className="hidden overflow-y-auto border-r bg-card/60 p-4 lg:block"><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filtros</p><div className="space-y-3"><label className="block space-y-1 text-xs text-muted-foreground">Categoria<select value={category} onChange={(event) => setCategory(event.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-foreground">{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label className="block space-y-1 text-xs text-muted-foreground">Estilo<select value={style} onChange={(event) => setStyle(event.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-foreground">{styles.map((item) => <option key={item}>{item}</option>)}</select></label><label className="block space-y-1 text-xs text-muted-foreground">Tema<select value={theme} onChange={(event) => setTheme(event.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-foreground">{themes.map((item) => <option key={item}>{item}</option>)}</select></label><div className="rounded-lg border bg-background p-3 text-xs text-muted-foreground"><div className="mb-2 flex items-center gap-2 font-medium text-foreground"><Palette className="h-4 w-4 text-primary" />Temas e fontes</div>Os temas são aplicados somente ao documento experimental local. Cada modelo traz fontes de título e corpo extensíveis.</div></div></aside>
      <main className="min-h-0 overflow-y-auto p-4"><div className="mb-4 flex flex-wrap gap-2"><div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, categoria, tag ou estilo" className="pl-9" /></div><div className="flex gap-1 overflow-x-auto lg:hidden">{categories.slice(0, 5).map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={cn("whitespace-nowrap rounded-md border px-2 py-1 text-xs", category === item && "border-primary bg-primary/10 text-primary")}>{item}</button>)}</div></div><div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><span>{filtered.length} opções</span>{recents.length > 0 && <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{recents.length} recentes</span>}{favorites.length > 0 && <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{favorites.length} favoritos</span>}</div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((item) => <div key={item.id} className={cn("group overflow-hidden rounded-xl border bg-card text-left transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md", selected?.id === item.id && "border-primary ring-2 ring-primary/20")}><button type="button" onClick={() => setSelected(item)} className="block w-full text-left"><div className="relative flex h-28 items-center justify-center p-4" style={{ background: item.preview }}><LayoutTemplate className="h-10 w-10 text-foreground/40 transition group-hover:scale-110" /><span className="absolute left-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium">{item.id === "blank-canvas" ? "Em branco" : item.type === "template" ? "Template" : "Seção"}</span></div><div className="space-y-2 p-3"><div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold">{item.name}</p>{recents.includes(item.id) && <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}</div><p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p><div className="flex flex-wrap gap-1">{item.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">#{tag}</span>)}</div></div></button><button type="button" aria-label="Favoritar template" onClick={() => toggleFavorite(item.id)} className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 text-muted-foreground hover:text-primary">{favorites.includes(item.id) ? <Heart className="h-3.5 w-3.5 fill-current text-primary" /> : <Heart className="h-3.5 w-3.5" />}</button></div>)}</div>{filtered.length === 0 && <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">Nenhum item encontrado com esses filtros.</div>}</main>
      <aside className="border-t bg-card/60 p-4 lg:border-l lg:border-t-0">{selected ? <div className="space-y-4"><div className="flex items-center gap-2"><Eye className="h-4 w-4 text-primary" /><p className="font-semibold">Prévia responsiva</p></div><div className="flex flex-wrap gap-1 rounded-lg border bg-background p-1"><Button size="sm" variant={device === "desktop" ? "secondary" : "ghost"} onClick={() => setDevice("desktop")}><Monitor className="mr-1 h-4 w-4" />Desktop</Button><Button size="sm" variant={device === "tablet" ? "secondary" : "ghost"} onClick={() => setDevice("tablet")}><Tablet className="mr-1 h-4 w-4" />Tablet</Button><Button size="sm" variant={device === "mobile" ? "secondary" : "ghost"} onClick={() => setDevice("mobile")}><Smartphone className="mr-1 h-4 w-4" />Mobile</Button></div><div className={cn("mx-auto overflow-hidden rounded-xl border shadow-inner transition-all", previewWidth)}><div className="min-h-44 p-4" style={{ background: selected.themeConfig.background, color: selected.themeConfig.foreground, fontFamily: selected.themeConfig.fonts.body }}><div className="mb-4 text-center" style={{ color: selected.themeConfig.primary, fontFamily: selected.themeConfig.fonts.heading }}><Type className="mx-auto mb-2 h-6 w-6" /><p className="text-lg font-semibold">{selected.name}</p></div>{selected.sections.slice(0, 2).map((section) => <div key={section.id} className="mb-2 rounded-lg p-3 text-center text-[10px]" style={{ background: String(section.background.color || selected.themeConfig.secondary) }}><p className="font-semibold">{section.name}</p><p className="mt-1 text-muted-foreground">{section.elements.length} elementos · {section.componentIds.length} componentes</p></div>)}</div></div><div><h3 className="font-medium">{selected.name}</h3><p className="mt-1 text-xs text-muted-foreground">{selected.description}</p></div><div className="flex flex-wrap items-center gap-2"><div className="flex gap-1">{selected.palette.map((color) => <span key={color} className="h-5 w-5 rounded-full border" style={{ background: color }} title={color} />)}</div><span className="text-[11px] text-muted-foreground">{selected.themeConfig.fonts.heading} + {selected.themeConfig.fonts.body}</span></div><div className="grid gap-2"><Button onClick={() => apply("add")}><Plus className="mr-1 h-4 w-4" />{selected.id === "blank-canvas" ? "Começar em branco" : selected.type === "section" ? "Inserir seção" : "Adicionar ao canvas"}</Button>{selected.id !== "blank-canvas" && <Button variant="outline" onClick={() => apply("replace")}><LayoutTemplate className="mr-1 h-4 w-4" />Usar como base</Button>}</div><p className="text-[11px] text-muted-foreground">A aplicação usa cópia profunda, novos IDs e referências preservadas. Nada é gravado em invitations.content.</p></div> : <div className="flex min-h-40 items-center justify-center text-center text-xs text-muted-foreground">Selecione um template para visualizar sua estrutura e aplicar.</div>}</aside>
    </div>{confirmReplace && <div className="border-t bg-amber-50 p-4 dark:bg-amber-950/30"><div className="flex flex-wrap items-center gap-3"><div className="min-w-0 flex-1"><p className="text-sm font-medium">Substituir o conteúdo experimental?</p><p className="text-xs text-muted-foreground">A nova base substituirá o canvas experimental atual e poderá ser desfeita pelo undo.</p></div><Button variant="outline" size="sm" onClick={() => setConfirmReplace(false)}>Cancelar</Button><Button size="sm" onClick={() => apply("replace")}><Check className="mr-1 h-4 w-4" />Confirmar substituição</Button></div></div>}
  </div></div>;
}

export function ExperimentalElementLibrary({
  library = [],
  search = "",
  setSearch,
  category = "Todos",
  setCategory,
  favorite = [],
  setFavorite,
  error = "",
}: any) {
  const items = Array.isArray(library) ? library : [];
  const categories = ["Todos", "Elementos", "Componentes inteligentes", "Formas", "Decorações", "Mídia do convite", "Assets Vellune", "Assets da empresa"];
  const filtered = items.filter((item: any) => {
    const haystack = `${item?.label ?? ""} ${item?.description ?? ""} ${item?.category ?? ""} ${item?.type ?? ""}`.toLowerCase();
    return (!search || haystack.includes(String(search).toLowerCase())) && (!category || category === "Todos" || item?.category === category);
  });
  const updateFavorite = (idValue: string) => {
    if (typeof setFavorite !== "function") return;
    setFavorite((current: string[]) => current.includes(idValue) ? current.filter((value) => value !== idValue) : [...current, idValue]);
  };

  return <div className="space-y-3" aria-label="Biblioteca experimental de elementos">
    <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch?.(event.target.value)} placeholder="Buscar elementos" className="pl-9" aria-label="Buscar elementos" /></div>
    <div className="flex gap-1 overflow-x-auto pb-1">{categories.map((item) => <button key={item} type="button" onClick={() => setCategory?.(item)} className={cn("whitespace-nowrap rounded-md border px-2 py-1 text-xs", category === item ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>{item}</button>)}</div>
    {error && <p className="text-xs text-destructive">{error}</p>}
    <div className="grid grid-cols-2 gap-2">{filtered.map((item: any) => <div key={item.id} className="relative"><Button type="button" variant="outline" className="h-auto min-h-16 w-full flex-col gap-1 p-2 text-xs" onClick={item.action}>{item.icon}<span>{item.label}</span></Button><button type="button" className="absolute right-1 top-1 text-muted-foreground" aria-label={favorite.includes(item.id) ? "Remover dos favoritos" : "Favoritar elemento"} onClick={() => updateFavorite(item.id)}>{favorite.includes(item.id) ? "★" : "☆"}</button></div>)}</div>
    {filtered.length === 0 && <div className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">Nenhum elemento encontrado.</div>}
  </div>;
}
