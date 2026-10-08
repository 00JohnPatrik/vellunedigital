import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Check,
  Clock3,
  Image as ImageIcon,
  Layers3,
  MapPin,
  Minus,
  MousePointerClick,
  QrCode,
  Search,
  Sparkles,
  Star,
  Type,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageUpload } from "@/components/image-upload";
import type { AssetScope } from "@/lib/assets";
import type { BlockType, CompositionKind } from "@/lib/templates";
import { BLOCKS, EDITOR_STOCK_IMAGES, READY_COMPOSITIONS } from "@/lib/templates";
import { cn } from "@/lib/utils";

type ElementsLibraryProps = {
  availableTypes: BlockType[];
  onAdd: (type: BlockType) => void;
  assets?: AssetScope;
  onAddImage?: (value: string) => void;
  imageMode?: "add" | "replace";
  onSelectImage?: (value: string) => void;
  onCancelImageReplace?: () => void;
  onAddComposition?: (kind: CompositionKind) => void;
  initialCategory?: LibraryCategory;
  id?: string;
};

type LibraryCategory = "Todos" | "Recentes" | "Texto" | "Elementos" | "Mídia" | "Interações";
type PreviewKind = "text" | "circle" | "rectangle" | "line" | "image" | "event" | "action" | "qr" | "rsvp";

type LibraryItem = {
  id: string;
  label: string;
  description: string;
  category: Exclude<LibraryCategory, "Todos" | "Recentes">;
  type: BlockType;
  preview: PreviewKind;
  eyebrow?: string;
  tags: string[];
};

const RECENTS_KEY = "vellune:invitation-editor:elements-recents";
const MAX_RECENTS = 12;

function readRecents(): string[] {
  try {
    const value = JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeRecents(value: string[]) {
  try {
    localStorage.setItem(RECENTS_KEY, JSON.stringify(value.slice(0, MAX_RECENTS)));
  } catch {
    // O histórico local é opcional e nunca deve impedir a inserção de elementos.
  }
}

function Preview({ kind }: { kind: PreviewKind }) {
  if (kind === "text") {
    return (
      <div className="flex h-20 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 via-primary/5 to-background px-3 text-center">
        <div className="space-y-1">
          <p className="font-display text-lg font-semibold text-foreground">Seu texto</p>
          <span className="block text-[10px] uppercase tracking-[0.18em] text-primary">Presets editoriais</span>
        </div>
      </div>
    );
  }
  if (kind === "circle") {
    return <div className="flex h-20 items-center justify-center rounded-xl bg-muted/40"><span className="h-12 w-12 rounded-full bg-primary/75 shadow-lg shadow-primary/20" /> </div>;
  }
  if (kind === "rectangle") {
    return <div className="flex h-20 items-center justify-center rounded-xl bg-muted/40"><span className="h-10 w-20 rounded-lg border-2 border-primary bg-primary/15 shadow-sm" /> </div>;
  }
  if (kind === "line") {
    return <div className="flex h-20 items-center justify-center rounded-xl bg-muted/40 px-5"><span className="h-px w-full bg-gradient-to-r from-transparent via-primary to-transparent" /> </div>;
  }
  if (kind === "image") {
    return <div className="flex h-20 items-center justify-center rounded-xl bg-gradient-to-br from-primary/12 via-background to-primary/5"><ImageIcon className="h-8 w-8 text-primary" /> </div>;
  }
  if (kind === "event") {
    return <div className="flex h-20 items-center justify-center rounded-xl bg-muted/40"><div className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 shadow-sm"><CalendarDays className="h-4 w-4 text-primary" /><span className="text-xs font-medium text-foreground">15 de outubro</span></div></div>;
  }
  if (kind === "action") {
    return <div className="flex h-20 items-center justify-center rounded-xl bg-muted/40"><div className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20">Confirmar presença</div></div>;
  }
  if (kind === "qr") {
    return <div className="flex h-20 items-center justify-center rounded-xl bg-muted/40"><div className="rounded-lg border-4 border-foreground/80 p-1"><QrCode className="h-9 w-9 text-foreground" /></div></div>;
  }
  return <div className="flex h-20 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-background"><Users className="h-8 w-8 text-emerald-600" /></div>;
}

function typeLabel(type: BlockType) {
  return BLOCKS[type]?.label || type;
}

export function ElementsLibrary({ availableTypes, onAdd, assets, onAddImage, imageMode = "add", onSelectImage, onCancelImageReplace, onAddComposition, initialCategory = "Todos", id }: ElementsLibraryProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<LibraryCategory>(initialCategory);
  const [recents, setRecents] = useState<string[]>([]);
  const [uploadedImage, setUploadedImage] = useState("");

  useEffect(() => {
    setRecents(readRecents());
  }, []);

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    if (imageMode === "replace") {
      setCategory("Mídia");
      setSearch("");
    }
  }, [imageMode]);

  const items = useMemo<LibraryItem[]>(() => {
    const has = (type: BlockType) => availableTypes.includes(type);
    const result: LibraryItem[] = [];
    const add = (item: LibraryItem) => result.push(item);

    if (has("text")) {
      add({ id: "text-title", label: "Título principal", description: "Abertura marcante para apresentar o momento especial.", category: "Texto", type: "text", preview: "text", eyebrow: "Hierarquia", tags: ["título", "hero", "abertura"] });
      add({ id: "text-subtitle", label: "Subtítulo", description: "Complemento elegante para contextualizar o convite.", category: "Texto", type: "text", preview: "text", eyebrow: "Hierarquia", tags: ["subtítulo", "apoio"] });
      add({ id: "text-message", label: "Mensagem", description: "Texto corrido para compartilhar uma mensagem afetiva.", category: "Texto", type: "text", preview: "text", eyebrow: "Conteúdo", tags: ["mensagem", "parágrafo"] });
      add({ id: "text-highlight", label: "Destaque", description: "Frase curta para chamar atenção em uma área do convite.", category: "Texto", type: "text", preview: "text", eyebrow: "Ênfase", tags: ["destaque", "frase"] });
      add({ id: "text-shape-circle", label: "Círculo visual", description: "Insere um bloco de texto pronto para estilizar como forma circular no painel de aparência.", category: "Elementos", type: "text", preview: "circle", eyebrow: "Preset visual", tags: ["forma", "círculo"] });
      add({ id: "text-shape-rectangle", label: "Retângulo visual", description: "Insere um bloco de texto pronto para receber preenchimento, borda e cantos personalizados.", category: "Elementos", type: "text", preview: "rectangle", eyebrow: "Preset visual", tags: ["forma", "retângulo"] });
    }

    if (has("shape")) {
      add({ id: "shape-rectangle", label: "Retângulo", description: "Forma versátil para criar cartões, destaques e áreas de composição.", category: "Elementos", type: "shape", preview: "rectangle", eyebrow: "Forma", tags: ["forma", "retângulo", "cartão"] });
      add({ id: "shape-circle", label: "Círculo", description: "Forma circular para criar pontos de destaque e composições decorativas.", category: "Elementos", type: "shape", preview: "circle", eyebrow: "Forma", tags: ["forma", "círculo"] });
      add({ id: "shape-star", label: "Estrela", description: "Elemento decorativo para destacar momentos e chamadas visuais.", category: "Elementos", type: "shape", preview: "circle", eyebrow: "Forma", tags: ["forma", "estrela", "decoração"] });
    }
    if (has("decoration")) add({ id: "decoration-line", label: "Linha decorativa", description: "Decoração minimalista para separar e organizar a composição.", category: "Elementos", type: "decoration", preview: "line", eyebrow: "Decoração", tags: ["linha", "separador", "decoração"] });
    if (has("divider")) add({ id: "divider", label: "Divisor", description: "Separador visual para criar ritmo e organizar a composição.", category: "Elementos", type: "divider", preview: "line", eyebrow: "Decoração", tags: ["linha", "separador"] });
    if (has("image")) add({ id: "image", label: "Imagem", description: "Adicione uma foto com descrição acessível e enquadramento ajustável.", category: "Mídia", type: "image", preview: "image", eyebrow: "Fotografia", tags: ["foto", "imagem"] });
    if (has("gallery")) add({ id: "gallery", label: "Galeria de fotos", description: "Monte uma grade ou carrossel com as imagens do convite.", category: "Mídia", type: "gallery", preview: "image", eyebrow: "Fotografia", tags: ["galeria", "fotos"] });
    if (has("date")) add({ id: "date", label: typeLabel("date"), description: "Mostra a data do evento usando os dados cadastrados.", category: "Elementos", type: "date", preview: "event", eyebrow: "Evento", tags: ["data", "calendário"] });
    if (has("time")) add({ id: "time", label: typeLabel("time"), description: "Apresenta o horário do evento com formatação configurável.", category: "Elementos", type: "time", preview: "event", eyebrow: "Evento", tags: ["hora", "horário"] });
    if (has("location")) add({ id: "location", label: typeLabel("location"), description: "Exibe local, endereço e acesso ao mapa para os convidados.", category: "Elementos", type: "location", preview: "event", eyebrow: "Evento", tags: ["local", "endereço", "mapa"] });
    if (has("countdown")) add({ id: "countdown", label: typeLabel("countdown"), description: "Cria expectativa com uma contagem regressiva até o evento.", category: "Elementos", type: "countdown", preview: "event", eyebrow: "Evento", tags: ["contagem", "tempo"] });
    if (has("button")) add({ id: "button", label: typeLabel("button"), description: "Chamada para ação com link, estilo e aparência personalizáveis.", category: "Interações", type: "button", preview: "action", eyebrow: "Ação", tags: ["botão", "link", "ação"] });
    if (has("whatsapp")) add({ id: "whatsapp", label: typeLabel("whatsapp"), description: "Facilita o contato dos convidados pelo WhatsApp.", category: "Interações", type: "whatsapp", preview: "action", eyebrow: "Contato", tags: ["whatsapp", "contato"] });
    if (has("rsvp")) add({ id: "rsvp", label: typeLabel("rsvp"), description: "Insira a confirmação de presença no convite.", category: "Interações", type: "rsvp", preview: "rsvp", eyebrow: "Confirmação", tags: ["rsvp", "presença"] });
    if (has("qr_code")) add({ id: "qr_code", label: typeLabel("qr_code"), description: "Compartilhe o link do convite ou outro conteúdo por QR Code.", category: "Interações", type: "qr_code", preview: "qr", eyebrow: "Acesso", tags: ["qr", "código"] });

    return result;
  }, [availableTypes]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items
      .filter((item) => imageMode !== "replace" || !["image", "gallery"].includes(item.type))
      .filter((item) => category === "Todos" || (category === "Recentes" ? recents.includes(item.id) : item.category === category))
      .filter((item) => !term || `${item.label} ${item.description} ${item.category} ${item.eyebrow} ${item.tags.join(" ")}`.toLowerCase().includes(term))
      .sort((a, b) => {
        const recentA = recents.indexOf(a.id);
        const recentB = recents.indexOf(b.id);
        if (category === "Recentes" || (category === "Todos" && !term)) return (recentA < 0 ? 99 : recentA) - (recentB < 0 ? 99 : recentB);
        return 0;
      });
  }, [category, items, recents, search]);

  const add = (item: LibraryItem) => {
    const next = [item.id, ...recents.filter((id) => id !== item.id)].slice(0, MAX_RECENTS);
    setRecents(next);
    writeRecents(next);
    onAdd(item.type);
  };

  const handleImage = (value: string) => {
    setUploadedImage(value);
    if (!value) return;
    if (imageMode === "replace") {
      onSelectImage?.(value);
    } else if (onAddImage) {
      onAddImage(value);
      const next = ["image", ...recents.filter((id) => id !== "image")].slice(0, MAX_RECENTS);
      setRecents(next);
      writeRecents(next);
    }
  };

  const categories: { value: LibraryCategory; label: string; icon: typeof Sparkles }[] = [
    { value: "Todos", label: "Tudo", icon: Sparkles },
    { value: "Recentes", label: "Recentes", icon: Clock3 },
    { value: "Texto", label: "Texto", icon: Type },
    { value: "Elementos", label: "Elementos", icon: Layers3 },
    { value: "Mídia", label: "Mídia", icon: ImageIcon },
    { value: "Interações", label: "Interações", icon: MousePointerClick },
  ];

  return (
    <section id={id} className="space-y-4" aria-label="Biblioteca criativa de elementos">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" aria-hidden="true" /><h2 className="text-sm font-semibold text-foreground">{imageMode === "replace" ? "Substituir imagem" : "Biblioteca criativa"}</h2></div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{imageMode === "replace" ? "Escolha uma nova imagem sem perder o enquadramento e a posição do elemento atual." : "Monte seu convite com elementos prontos e totalmente editáveis."}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border bg-primary/5 px-2 py-1 text-[10px] font-medium text-primary">{items.length} opções</span>
          {imageMode === "replace" && <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[10px]" onClick={onCancelImageReplace}>Cancelar</Button>}
        </div>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, categoria ou função" aria-label="Buscar elementos na biblioteca" className="h-10 pl-9 pr-3 text-xs" />
      </div>

      <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Categorias da biblioteca">
        {categories.map(({ value, label, icon: Icon }) => <button key={value} type="button" role="tab" aria-selected={category === value} onClick={() => setCategory(value)} className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] transition-colors", category === value ? "border-primary bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}><Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}</button>)}
      </div>

      {onAddComposition && imageMode !== "replace" && !search.trim() && (category === "Todos" || category === "Elementos") && (
        <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/10 via-background to-background p-3" aria-label="Composições prontas">
          <div className="mb-3 flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold text-foreground">Composições prontas</p>
              <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">Um clique cria uma seção completa, já alinhada e pronta para personalizar.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {READY_COMPOSITIONS.map((composition) => {
              const icons = {
                hero: ImageIcon,
                details: CalendarDays,
                confirmation: MousePointerClick,
                gallery: Layers3,
                closing: Minus,
              } as const;
              const Icon = icons[composition.kind];
              return (
                <button
                  key={composition.kind}
                  type="button"
                  onClick={() => onAddComposition(composition.kind)}
                  className="group rounded-xl border bg-background/80 p-2.5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:bg-primary/[0.03] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={"Adicionar composição " + composition.label}
                  title={composition.description}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary/15">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <span className="mt-2 block truncate text-[11px] font-semibold text-foreground">{composition.label}</span>
                  <span className="mt-0.5 line-clamp-2 text-[9px] leading-4 text-muted-foreground">{composition.description}</span>
                  <span className="mt-1.5 inline-flex items-center gap-1 text-[9px] font-medium text-primary">
                    <Sparkles className="h-3 w-3" aria-hidden="true" />1 toque
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {category === "Mídia" && availableTypes.includes("image") && (
        <>
        <div className="rounded-xl border border-primary/15 bg-background/45 p-3" aria-label="Galeria Vellune de imagens">
          <div className="mb-3 flex items-start gap-2">
            <Sparkles className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
            <div>
              <p className="text-xs font-semibold text-foreground">Galeria Vellune</p>
              <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">Imagens de referência para testar layouts e substituir fotos rapidamente.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {Object.entries(EDITOR_STOCK_IMAGES).map(([key, url]) => {
              const labels: Record<string, string> = {
                wedding: "Casamento",
                birthday: "Aniversário",
                baby: "Bebê",
                reveal: "Chá revelação",
                quince: "15 anos",
                graduation: "Formatura",
                kids: "Festa infantil",
                event: "Evento",
              };
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => imageMode === "replace" ? onSelectImage?.(url) : onAddImage?.(url)}
                  className="group overflow-hidden rounded-xl border border-border/70 bg-card text-left transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={imageMode === "replace" ? `Usar imagem de ${labels[key] ?? key}` : `Adicionar imagem de ${labels[key] ?? key}`}
                >
                  <img src={url} alt="" loading="lazy" className="aspect-[4/5] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                  <span className="block truncate px-2 py-1.5 text-[10px] font-medium text-foreground">{labels[key] ?? key}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-3" aria-label="Biblioteca de imagens">
          <div className="mb-3 flex items-start gap-2"><ImageIcon className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" /><div><p className="text-xs font-semibold text-foreground">{imageMode === "replace" ? "Escolher substituta" : "Imagens do convite"}</p><p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">{imageMode === "replace" ? "Escolha uma imagem existente ou envie uma nova para substituir a imagem selecionada." : "Escolha uma imagem existente ou envie uma nova para usar no canvas."}</p></div></div>
          <ImageUpload scope={assets} value={uploadedImage} onChange={handleImage} />
          {imageMode === "replace" ? <p className="mt-2 rounded-md border border-primary/20 bg-primary/5 p-2 text-[10px] leading-4 text-primary">A escolha será aplicada imediatamente à imagem selecionada, preservando posição, tamanho, rotação e demais ajustes.</p> : !onAddImage && assets && <p className="mt-2 rounded-md border border-dashed p-2 text-[10px] leading-4 text-muted-foreground">A imagem ficará disponível na biblioteca. Selecione o card Imagem para inseri-la e ajuste a URL no painel de propriedades.</p>}
        </div>
        </>
      )}

      {filtered.length > 0 ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{filtered.map((item) => <button key={item.id} type="button" draggable={imageMode !== "replace"} onDragStart={(event) => { if (imageMode === "replace") return; event.dataTransfer.effectAllowed = "copy"; event.dataTransfer.setData("application/x-vellune-block-type", item.type); }} onClick={() => add(item)} className="group min-w-0 rounded-xl border bg-background p-2 text-left transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:bg-primary/[0.03] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" title={`${item.description} Você também pode arrastar este elemento para o canvas.`} aria-label={`Adicionar ${item.label}: ${item.description}`}><Preview kind={item.preview} /><span className="mt-2 flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-primary"><Check className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />{item.eyebrow}</span><span className="mt-1 block truncate text-xs font-semibold text-foreground">{item.label}</span><span className="mt-1 line-clamp-2 min-h-8 text-[10px] leading-4 text-muted-foreground">{item.description}</span>{recents.includes(item.id) && <span className="mt-2 inline-flex items-center gap-1 text-[9px] font-medium text-primary"><Clock3 className="h-3 w-3" aria-hidden="true" />Usado recentemente</span>}</button>)}</div> : <div className="rounded-xl border border-dashed bg-muted/20 p-7 text-center"><Star className="mx-auto h-5 w-5 text-muted-foreground" aria-hidden="true" /><p className="mt-2 text-xs font-medium text-foreground">Nenhum elemento encontrado</p><p className="mt-1 text-[11px] text-muted-foreground">Tente outra busca ou escolha uma categoria diferente.</p><Button type="button" variant="ghost" size="sm" className="mt-2 h-8 text-xs" onClick={() => { setSearch(""); setCategory("Todos"); }}>Limpar filtros</Button></div>}
    </section>
  );
}
