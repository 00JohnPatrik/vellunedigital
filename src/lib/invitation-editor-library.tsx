import { useEffect, useMemo, useState } from "react";
import { Check, Clock3, Heart, LayoutTemplate, Palette, Plus, Search, Sparkles, WandSparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { EditorElementType, InvitationEditorDocument } from "@/lib/invitation-editor-foundation";

export type LibraryMode = "add" | "replace";
export type LibraryItemType = "text" | "shape" | "smart";

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
  elements: Array<{ type: LibraryItemType; smartType?: EditorElementType; text?: string; shape?: "rectangle" | "circle" | "line" }>;
};

const FAVORITES_KEY = "vellune:experimental-editor:favorites";
const RECENTS_KEY = "vellune:experimental-editor:recents";

export const EXPERIMENTAL_LIBRARY: ExperimentalLibraryItem[] = [
  {
    id: "editorial-wedding",
    name: "Editorial romântico",
    description: "Composição elegante para casamentos e celebrações clássicas.",
    category: "Casamento",
    tags: ["elegante", "romântico", "clássico"],
    style: "Editorial",
    theme: "Romântico",
    palette: ["#7c3aed", "#f5e9df", "#172033"],
    type: "template",
    preview: "linear-gradient(145deg,#f5e9df,#ffffff 58%,#eadcff)",
    elements: [
      { type: "text", text: "Você está convidado" },
      { type: "smart", smartType: "special_text", text: "Uma celebração para guardar no coração" },
      { type: "smart", smartType: "date" },
      { type: "smart", smartType: "location" },
      { type: "smart", smartType: "rsvp" },
    ],
  },
  {
    id: "minimal-birthday",
    name: "Minimal aniversário",
    description: "Layout limpo, vibrante e direto para aniversários.",
    category: "Aniversário",
    tags: ["minimalista", "vibrante", "moderno"],
    style: "Minimalista",
    theme: "Celebração",
    palette: ["#f97316", "#fff7ed", "#431407"],
    type: "template",
    preview: "linear-gradient(145deg,#fff7ed,#ffedd5 55%,#fed7aa)",
    elements: [
      { type: "shape", shape: "circle" },
      { type: "text", text: "Vamos celebrar!" },
      { type: "smart", smartType: "countdown" },
      { type: "smart", smartType: "calendar" },
      { type: "smart", smartType: "whatsapp" },
    ],
  },
  {
    id: "baby-soft",
    name: "Chá de bebê suave",
    description: "Uma base delicada para revelar, celebrar e compartilhar.",
    category: "Chá de bebê",
    tags: ["suave", "delicado", "família"],
    style: "Orgânico",
    theme: "Aconchego",
    palette: ["#0f766e", "#ccfbf1", "#134e4a"],
    type: "template",
    preview: "linear-gradient(145deg,#ccfbf1,#f0fdfa 56%,#99f6e4)",
    elements: [
      { type: "text", text: "Um novo amor está chegando" },
      { type: "smart", smartType: "special_text", text: "Prepare-se para um momento muito especial" },
      { type: "smart", smartType: "gallery" },
      { type: "smart", smartType: "location" },
    ],
  },
  {
    id: "hero-section",
    name: "Hero com destaque",
    description: "Seção de abertura com título, mensagem e ação principal.",
    category: "Abertura",
    tags: ["hero", "destaque", "conversão"],
    style: "Impacto",
    theme: "Versátil",
    palette: ["#4f46e5", "#eef2ff", "#1e1b4b"],
    type: "section",
    preview: "linear-gradient(145deg,#eef2ff,#e0e7ff 55%,#c7d2fe)",
    elements: [
      { type: "text", text: "Um momento para recordar" },
      { type: "smart", smartType: "special_text", text: "Estamos preparando tudo com carinho" },
      { type: "smart", smartType: "button" },
    ],
  },
  {
    id: "schedule-section",
    name: "Programação do evento",
    description: "Seção organizada para apresentar horários e etapas.",
    category: "Informação",
    tags: ["timeline", "agenda", "evento"],
    style: "Editorial",
    theme: "Organização",
    palette: ["#be123c", "#fff1f2", "#881337"],
    type: "section",
    preview: "linear-gradient(145deg,#fff1f2,#ffe4e6 55%,#fecdd3)",
    elements: [
      { type: "text", text: "Programação" },
      { type: "smart", smartType: "timeline" },
      { type: "smart", smartType: "calendar" },
    ],
  },
  {
    id: "memories-section",
    name: "Memórias e galeria",
    description: "Uma seção visual para fotos, mensagens e lembranças.",
    category: "Conteúdo",
    tags: ["fotos", "galeria", "memórias"],
    style: "Visual",
    theme: "Afeto",
    palette: ["#92400e", "#fffbeb", "#78350f"],
    type: "section",
    preview: "linear-gradient(145deg,#fffbeb,#fef3c7 55%,#fde68a)",
    elements: [
      { type: "text", text: "Momentos especiais" },
      { type: "smart", smartType: "gallery" },
      { type: "smart", smartType: "social" },
    ],
  },
];

function readList(key: string): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeList(key: string, value: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(value.slice(0, 20)));
  } catch {
    // A biblioteca continua funcional quando o armazenamento local está indisponível.
  }
}

export function rememberLibraryItem(id: string) {
  const next = [id, ...readList(RECENTS_KEY).filter((item) => item !== id)];
  writeList(RECENTS_KEY, next);
}

export function ExperimentalTemplateLibrary({
  open,
  document,
  onClose,
  onApply,
}: {
  open: boolean;
  document: InvitationEditorDocument;
  onClose: () => void;
  onApply: (item: ExperimentalLibraryItem, mode: LibraryMode) => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [style, setStyle] = useState("Todos");
  const [theme, setTheme] = useState("Todos");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [visibleCount, setVisibleCount] = useState(6);
  const [selected, setSelected] = useState<ExperimentalLibraryItem | null>(null);
  const [confirmReplace, setConfirmReplace] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFavorites(readList(FAVORITES_KEY));
    setRecents(readList(RECENTS_KEY));
  }, [open]);

  const categories = useMemo(() => ["Todos", ...new Set(EXPERIMENTAL_LIBRARY.map((item) => item.category))], []);
  const styles = useMemo(() => ["Todos", ...new Set(EXPERIMENTAL_LIBRARY.map((item) => item.style))], []);
  const themes = useMemo(() => ["Todos", ...new Set(EXPERIMENTAL_LIBRARY.map((item) => item.theme))], []);
  const filtered = useMemo(() => EXPERIMENTAL_LIBRARY.filter((item) => {
    const text = `${item.name} ${item.description} ${item.tags.join(" ")}`.toLowerCase();
    return (!search || text.includes(search.toLowerCase())) && (category === "Todos" || item.category === category) && (style === "Todos" || item.style === style) && (theme === "Todos" || item.theme === theme);
  }), [category, search, style, theme]);
  const visible = filtered.slice(0, visibleCount);
  const hasContent = document.elements.length > 0;

  if (!open) return null;

  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id) ? favorites.filter((item) => item !== id) : [id, ...favorites];
    setFavorites(next);
    writeList(FAVORITES_KEY, next);
  };

  const apply = (mode: LibraryMode) => {
    if (!selected) return;
    if (mode === "replace" && hasContent && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }
    rememberLibraryItem(selected.id);
    onApply(selected, mode);
    setRecents([selected.id, ...recents.filter((id) => id !== selected.id)]);
    setSelected(null);
    setConfirmReplace(false);
    onClose();
  };

  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-2 sm:items-center sm:p-6">
    <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
      <header className="flex flex-wrap items-center gap-3 border-b bg-card p-4">
        <div className="flex min-w-0 flex-1 items-center gap-2"><WandSparkles className="h-5 w-5 shrink-0 text-primary" /><div><h2 className="font-semibold">Biblioteca experimental</h2><p className="text-xs text-muted-foreground">Templates e seções prontos para personalizar</p></div></div>
        <Button variant="outline" size="sm" onClick={onClose}>Fechar</Button>
      </header>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[240px_minmax(0,1fr)_280px]">
        <aside className="hidden overflow-y-auto border-r bg-card/60 p-4 lg:block"><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Filtros</p><div className="space-y-3"><label className="block space-y-1 text-xs text-muted-foreground">Categoria<select value={category} onChange={(event) => setCategory(event.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-foreground">{categories.map((item) => <option key={item}>{item}</option>)}</select></label><label className="block space-y-1 text-xs text-muted-foreground">Estilo<select value={style} onChange={(event) => setStyle(event.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-foreground">{styles.map((item) => <option key={item}>{item}</option>)}</select></label><label className="block space-y-1 text-xs text-muted-foreground">Tema<select value={theme} onChange={(event) => setTheme(event.target.value)} className="h-9 w-full rounded-md border bg-background px-2 text-foreground">{themes.map((item) => <option key={item}>{item}</option>)}</select></label><div className="rounded-lg border bg-background p-3 text-xs text-muted-foreground"><div className="mb-2 flex items-center gap-2 font-medium text-foreground"><Palette className="h-4 w-4 text-primary" />Paletas prontas</div>As cores da biblioteca são aplicadas como referência visual e podem ser ajustadas no painel de propriedades.</div></div></aside>
        <main className="min-h-0 overflow-y-auto p-4"><div className="mb-4 flex flex-wrap gap-2"><div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, tag ou descrição" className="pl-9" /></div><div className="flex gap-1 overflow-x-auto lg:hidden">{categories.slice(0, 5).map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={cn("whitespace-nowrap rounded-md border px-2 py-1 text-xs", category === item && "border-primary bg-primary/10 text-primary")}>{item}</button>)}</div></div><div className="mb-4 flex items-center gap-3 text-xs text-muted-foreground"><span>{filtered.length} opções</span>{recents.length > 0 && <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{recents.length} recentes</span>}{favorites.length > 0 && <span className="inline-flex items-center gap-1"><Heart className="h-3.5 w-3.5" />{favorites.length} favoritos</span>}</div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visible.map((item) => <button key={item.id} type="button" onClick={() => setSelected(item)} className={cn("group overflow-hidden rounded-xl border bg-card text-left transition hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md", selected?.id === item.id && "border-primary ring-2 ring-primary/20")}><div className="relative flex h-28 items-center justify-center p-4" style={{ background: item.preview }}><LayoutTemplate className="h-10 w-10 text-foreground/40 transition group-hover:scale-110" /><span className="absolute left-2 top-2 rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium">{item.type === "template" ? "Template" : "Seção"}</span><button type="button" aria-label="Favoritar item" onClick={(event) => { event.stopPropagation(); toggleFavorite(item.id); }} className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 text-muted-foreground hover:text-primary">{favorites.includes(item.id) ? <Heart className="h-3.5 w-3.5 fill-current text-primary" /> : <Heart className="h-3.5 w-3.5" />}</button></div><div className="space-y-2 p-3"><div className="flex items-start justify-between gap-2"><p className="text-sm font-semibold">{item.name}</p>{recents.includes(item.id) && <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />}</div><p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p><div className="flex flex-wrap gap-1">{item.tags.slice(0, 3).map((tag) => <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">#{tag}</span>)}</div></div></button>)}</div>{visible.length < filtered.length && <div className="mt-4 flex justify-center"><Button variant="outline" onClick={() => setVisibleCount((count) => count + 6)}><Plus className="mr-1 h-4 w-4" />Carregar mais</Button></div>}{filtered.length === 0 && <div className="flex min-h-40 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">Nenhum item encontrado com esses filtros.</div>}</main>
        <aside className="border-t bg-card/60 p-4 lg:border-l lg:border-t-0">{selected ? <div className="space-y-4"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><p className="font-semibold">Prévia selecionada</p></div><div className="flex h-32 items-center justify-center rounded-xl border" style={{ background: selected.preview }}><LayoutTemplate className="h-12 w-12 text-foreground/40" /></div><div><h3 className="font-medium">{selected.name}</h3><p className="mt-1 text-xs text-muted-foreground">{selected.description}</p></div><div className="flex flex-wrap gap-1">{selected.palette.map((color) => <span key={color} className="h-5 w-5 rounded-full border" style={{ background: color }} title={color} />)}</div><div className="grid gap-2"><Button onClick={() => apply("add")}><Plus className="mr-1 h-4 w-4" />{selected.type === "section" ? "Inserir seção" : "Adicionar ao canvas"}</Button><Button variant="outline" onClick={() => apply("replace")}><LayoutTemplate className="mr-1 h-4 w-4" />Usar como base</Button></div><p className="text-[11px] text-muted-foreground">A aplicação cria cópias independentes. Nada é gravado em invitations.content.</p></div> : <div className="flex min-h-40 items-center justify-center text-center text-xs text-muted-foreground">Selecione um template ou seção para visualizar e aplicar.</div>}</aside>
      </div>
      {confirmReplace && <div className="border-t bg-amber-50 p-4 dark:bg-amber-950/30"><div className="flex flex-wrap items-center gap-3"><div className="min-w-0 flex-1"><p className="text-sm font-medium">Substituir o conteúdo experimental?</p><p className="text-xs text-muted-foreground">O estado atual continuará disponível pelo undo, mas a nova base substituirá os elementos do canvas experimental.</p></div><Button variant="outline" size="sm" onClick={() => setConfirmReplace(false)}>Cancelar</Button><Button size="sm" onClick={() => apply("replace")}><Check className="mr-1 h-4 w-4" />Confirmar substituição</Button></div></div>}
    </div>
  </div>;
}
