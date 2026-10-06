import { useEffect, useMemo, useState } from "react";
import { Clock3, Minus, Search, Sparkles, Square, Type } from "lucide-react";
import type { BlockType } from "@/lib/templates";
import { BLOCKS } from "@/lib/templates";

type ElementsLibraryProps = {
  availableTypes: BlockType[];
  onAdd: (type: BlockType) => void;
};

type LibraryItem = {
  id: string;
  label: string;
  description: string;
  category: string;
  type: BlockType;
  preview: "text" | "circle" | "rectangle" | "line" | "card";
};

const RECENTS_KEY = "vellune:invitation-editor:elements-recents";

function readRecents() {
  try {
    const value = JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeRecents(value: string[]) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(value.slice(0, 12)));
  } catch {
    // O histórico local é opcional e não deve impedir a inserção do elemento.
  }
}

function Preview({ kind }: { kind: LibraryItem["preview"] }) {
  if (kind === "text") {
    return <div className="flex h-12 items-center justify-center rounded-md bg-primary/10 px-2 text-center text-[11px] font-semibold text-primary">Texto</div>;
  }
  if (kind === "circle") {
    return <div className="flex h-12 items-center justify-center rounded-md bg-muted/50"><span className="h-8 w-8 rounded-full bg-primary/70 shadow-sm" /></div>;
  }
  if (kind === "rectangle") {
    return <div className="flex h-12 items-center justify-center rounded-md bg-muted/50"><span className="h-7 w-14 rounded-md border-2 border-primary bg-primary/15" /></div>;
  }
  if (kind === "line") {
    return <div className="flex h-12 items-center justify-center rounded-md bg-muted/50"><span className="h-0.5 w-14 bg-primary" /></div>;
  }
  return <div className="flex h-12 items-center justify-center rounded-md bg-gradient-to-br from-primary/20 via-background to-accent/30"><Sparkles className="h-5 w-5 text-primary" /></div>;
}

export function ElementsLibrary({ availableTypes, onAdd }: ElementsLibraryProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [recents, setRecents] = useState<string[]>([]);

  useEffect(() => {
    setRecents(readRecents());
  }, []);

  const items = useMemo<LibraryItem[]>(() => {
    const has = (type: BlockType) => availableTypes.includes(type);
    const result: LibraryItem[] = [];

    if (has("text")) result.push({ id: "text", label: "Texto", description: "Título, mensagem ou informação livre.", category: "Conteúdo", type: "text", preview: "text" });
    if (has("divider")) result.push({ id: "line", label: "Linha decorativa", description: "Separador visual leve para organizar o convite.", category: "Formas", type: "divider", preview: "line" });
    if (has("text")) {
      result.push({ id: "circle", label: "Círculo", description: "Preset visual para criar uma forma circular com aparência.", category: "Formas", type: "text", preview: "circle" });
      result.push({ id: "rectangle", label: "Retângulo", description: "Preset visual para criar uma superfície decorativa.", category: "Formas", type: "text", preview: "rectangle" });
      result.push({ id: "sparkle", label: "Destaque suave", description: "Elemento leve para valorizar uma área do convite.", category: "Decorações", type: "text", preview: "card" });
    }

    const known = availableTypes.filter((type) => !["text", "divider"].includes(type));
    known.forEach((type) => {
      const label = BLOCKS[type]?.label || type;
      result.push({
        id: `block-${type}`,
        label,
        description: "Bloco nativo compatível com o editor visual.",
        category: type === "image" || type === "gallery" ? "Mídia" : "Elementos",
        type,
        preview: type === "image" || type === "gallery" ? "card" : "text",
      });
    });

    return result;
  }, [availableTypes]);

  const categories = useMemo(() => ["Todos", ...Array.from(new Set(items.map((item) => item.category)))], [items]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items
      .filter((item) => category === "Todos" || item.category === category)
      .filter((item) => !term || `${item.label} ${item.description} ${item.category}`.toLowerCase().includes(term));
  }, [category, items, search]);

  const add = (item: LibraryItem) => {
    const next = [item.id, ...recents.filter((id) => id !== item.id)];
    setRecents(next);
    writeRecents(next);
    onAdd(item.type);
  };

  return (
    <div className="space-y-3" aria-label="Biblioteca de elementos">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar elementos"
          aria-label="Buscar elementos"
          className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-xs text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1" role="tablist" aria-label="Categorias de elementos">
        {categories.map((item) => (
          <button
            key={item}
            type="button"
            role="tab"
            aria-selected={category === item}
            onClick={() => setCategory(item)}
            className={`shrink-0 rounded-md border px-2 py-1.5 text-[11px] transition-colors ${category === item ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"}`}
          >
            {item}
          </button>
        ))}
      </div>

      {recents.length > 0 && !search && category === "Todos" && (
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock3 className="h-3 w-3" />
          Elementos recentes disponíveis na biblioteca
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {filtered.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => add(item)}
            className="group rounded-lg border bg-background p-2 text-left transition-colors hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title={item.description}
          >
            <Preview kind={item.preview} />
            <span className="mt-2 flex items-center gap-1 text-xs font-medium text-foreground">
              {item.preview === "text" ? <Type className="h-3 w-3 text-primary" /> : item.preview === "line" ? <Minus className="h-3 w-3 text-primary" /> : item.preview === "circle" || item.preview === "rectangle" ? <Square className="h-3 w-3 text-primary" /> : <Sparkles className="h-3 w-3 text-primary" />}
              <span className="truncate">{item.label}</span>
            </span>
            <span className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted-foreground">{item.description}</span>
            {recents.includes(item.id) && <span className="mt-1 block text-[9px] text-primary">Recente</span>}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <div className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground">Nenhum elemento encontrado.</div>}
    </div>
  );
}
