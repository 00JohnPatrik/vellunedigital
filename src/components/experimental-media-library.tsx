import { useEffect, useMemo, useState } from "react";
import { Clock3, Heart, ImagePlus, Search, Sparkles, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type MediaKind = "image" | "gif" | "svg" | "decoration";

type LocalMediaItem = {
  id: string;
  name: string;
  src: string;
  kind: MediaKind;
  category: string;
  tags: string[];
  createdAt: number;
};

type Props = {
  onInsert: (item: { src: string; type: "image" | "gif"; name: string }) => void;
};

const ITEMS_KEY = "vellune:experimental-editor:local-media";
const FAVORITES_KEY = "vellune:experimental-editor:local-media-favorites";
const RECENTS_KEY = "vellune:experimental-editor:local-media-recents";

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "null");
    return value ?? fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // A biblioteca continua utilizável mesmo quando o armazenamento local está cheio.
  }
};

const createLocalId = () => {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `local-media-${crypto.randomUUID()}`;
    }
  } catch {
    // Usa o fallback abaixo quando a API de criptografia não estiver disponível.
  }
  return `local-media-${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const kindLabel: Record<MediaKind, string> = {
  image: "Imagens",
  gif: "GIFs",
  svg: "SVGs",
  decoration: "Decorações",
};

function fileKind(file: File): MediaKind | null {
  if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) return "svg";
  if (file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif")) return "gif";
  if (file.type.startsWith("image/")) return "image";
  return null;
}

export function ExperimentalMediaLibrary({ onInsert }: Props) {
  const [items, setItems] = useState<LocalMediaItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recents, setRecents] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Todos");
  const [error, setError] = useState("");

  useEffect(() => {
    setItems(readJson<LocalMediaItem[]>(ITEMS_KEY, []));
    setFavorites(readJson<string[]>(FAVORITES_KEY, []));
    setRecents(readJson<string[]>(RECENTS_KEY, []));
  }, []);

  const categories = ["Todos", ...Array.from(new Set(items.map((item) => item.category)))];
  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    return items.filter((item) => {
      const haystack = `${item.name} ${item.category} ${item.tags.join(" ")} ${kindLabel[item.kind]}`.toLowerCase();
      return (!query || haystack.includes(query)) && (category === "Todos" || item.category === category);
    });
  }, [category, items, search]);

  const addFiles = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    const kind = fileKind(file);
    if (!kind) {
      setError("Escolha uma imagem, GIF ou SVG.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setError("O arquivo deve ter no máximo 8 MB para permanecer no armazenamento local.");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setError("Não foi possível ler este arquivo. Tente selecionar a mídia novamente.");
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        setError("Não foi possível preparar este arquivo para o editor.");
        return;
      }
      const item: LocalMediaItem = {
        id: createLocalId(),
        name: file.name,
        src: reader.result,
        kind,
        category: kind === "svg" ? "SVGs" : kind === "gif" ? "GIFs" : "Imagens",
        tags: [kind, "local", "experimental"],
        createdAt: Date.now(),
      };
      const next = [item, ...items].slice(0, 80);
      setItems(next);
      writeJson(ITEMS_KEY, next);
      setError("");
      insert(item);
    };

    try {
      reader.readAsDataURL(file);
    } catch {
      setError("Não foi possível ler este arquivo. Tente selecionar a mídia novamente.");
    }
  };

  const insert = (item: LocalMediaItem) => {
    const nextRecents = [item.id, ...recents.filter((id) => id !== item.id)].slice(0, 30);
    setRecents(nextRecents);
    writeJson(RECENTS_KEY, nextRecents);
    onInsert({ src: item.src, type: item.kind === "gif" ? "gif" : "image", name: item.name });
  };

  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id) ? favorites.filter((value) => value !== id) : [id, ...favorites];
    setFavorites(next);
    writeJson(FAVORITES_KEY, next);
  };

  return (
    <div className="space-y-3" aria-label="Biblioteca local de mídia experimental">
      <div className="flex items-center gap-2">
        <ImagePlus className="h-4 w-4 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Mídia e decorações locais</p>
          <p className="text-[11px] text-muted-foreground">Imagens, GIFs e SVGs salvos somente neste navegador</p>
        </div>
        <label className="cursor-pointer">
          <input type="file" accept="image/*,.svg" className="sr-only" onChange={(event) => { addFiles(event.target.files); event.currentTarget.value = ""; }} />
          <span className="inline-flex h-9 items-center gap-1.5 rounded-md border bg-background px-3 text-xs font-medium hover:bg-muted"><Upload className="h-3.5 w-3.5" />Adicionar</span>
        </label>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, categoria ou tag" className="pl-9" />
      </div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={cn("whitespace-nowrap rounded-md border px-2 py-1 text-xs", category === item ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted")}>{item}</button>)}
      </div>
      {error && <p className="text-xs text-destructive" role="alert">{error}</p>}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-5 text-center text-xs text-muted-foreground"><Sparkles className="mx-auto mb-2 h-5 w-5" />Adicione uma mídia local para começar.</div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filtered.map((item) => <div key={item.id} className="relative overflow-hidden rounded-lg border bg-background">
            <button type="button" className="block w-full text-left" onClick={() => insert(item)} aria-label={`Inserir ${item.name}`}>
              <div className="flex h-24 items-center justify-center bg-muted/30 p-2 [background-image:linear-gradient(45deg,hsl(var(--muted))_25%,transparent_25%),linear-gradient(-45deg,hsl(var(--muted))_25%,transparent_25%),linear-gradient(45deg,transparent_75%,hsl(var(--muted))_75%),linear-gradient(-45deg,transparent_75%,hsl(var(--muted))_75%)] [background-position:0_0,0_6px,6px_-6px,-6px_0] [background-size:12px_12px]">
                <img src={item.src} alt="" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="p-2"><p className="truncate text-xs font-medium">{item.name}</p><p className="text-[10px] text-muted-foreground">{kindLabel[item.kind]}</p></div>
            </button>
            <button type="button" className="absolute right-1 top-1 rounded-md bg-background/90 p-1 text-muted-foreground hover:text-primary" onClick={() => toggleFavorite(item.id)} aria-label={favorites.includes(item.id) ? "Remover dos favoritos" : "Favoritar mídia"}><Heart className={cn("h-3.5 w-3.5", favorites.includes(item.id) && "fill-current text-primary")} /></button>
            {recents.includes(item.id) && <span className="absolute bottom-1 right-1 rounded bg-background/90 p-0.5 text-muted-foreground"><Clock3 className="h-3 w-3" /></span>}
          </div>)}
        </div>
      )}
    </div>
  );
}
