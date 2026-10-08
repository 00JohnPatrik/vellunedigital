import { useMemo, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, Eye, LayoutTemplate, Search, Sparkles, X } from "lucide-react";
import { BlockView, BackgroundLayers } from "@/components/block-render";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES, STARTERS, cloneContent, listTemplates, resolveBlockGeometry, type Block, type Category, type Template, type TemplateContent } from "@/lib/templates";
import { cn } from "@/lib/utils";

type TemplateGalleryProps = {
  open: boolean;
  onClose: () => void;
  onApply: (content: TemplateContent) => void;
  hasContent: boolean;
};

type GalleryItem = {
  id: string;
  label: string;
  category: Category;
  content: TemplateContent;
  source: "curated" | "official" | "company";
  sourceLabel: string;
};

const STARTER_CATEGORIES: Record<string, Category> = {
  editorial: "casamento",
  wedding: "casamento",
  birthday: "aniversario",
  baby_shower: "cha_de_bebe",
  quince: "15_anos",
  basic: "outros",
  complete: "outros",
  blank: "outros",
  minimal: "outros",
  floral: "outros",
  party: "aniversario",
};

function starterItems(): GalleryItem[] {
  return Object.entries(STARTERS).map(([id, starter]) => ({
    id,
    label: starter.label,
    category: STARTER_CATEGORIES[id] ?? "outros",
    content: starter.build(),
    source: "curated",
    sourceLabel: "Vellune",
  }));
}

function databaseTemplateItems(templates: Template[] | undefined): GalleryItem[] {
  return (templates ?? [])
    .filter((template) => template.status === "active")
    .map((template) => ({
      id: template.id,
      label: template.name,
      category: template.category,
      content: template.content,
      source: template.type === "company" ? "company" : "official",
      sourceLabel: template.type === "company" ? "Meu modelo" : "Oficial",
    }));
}

function galleryFont(font?: string) {
  return font === "display" ? "Georgia, 'Times New Roman', serif" : "Inter, ui-sans-serif, system-ui, sans-serif";
}

function GalleryBlockPreview({ block, geometry }: { block: Block; geometry: ReturnType<typeof resolveBlockGeometry> }) {
  const p = block.props ?? {};
  const base: CSSProperties = {
    position: "absolute",
    left: geometry.x,
    top: geometry.y,
    width: geometry.width,
    height: geometry.height,
    zIndex: geometry.zIndex,
    opacity: geometry.opacity,
    transform: `rotate(${geometry.rotation}deg) scale(${geometry.scale})`,
    transformOrigin: "center",
    overflow: "hidden",
  };

  if (block.type === "image") {
    return (
      <div style={base} className="rounded-xl bg-muted">
        {p.url ? (
          <img src={p.url} alt="" className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">Imagem</div>
        )}
      </div>
    );
  }

  if (block.type === "gallery") {
    let images: Array<{ url?: string; alt?: string }> = [];
    try { images = JSON.parse(p.images || "[]"); } catch { images = []; }
    const columns = Math.max(1, Math.min(4, Number(p.columns) || 2));
    return (
      <div style={{ ...base, display: "grid", gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))`, gap: 4 }} className="rounded-xl bg-muted p-1">
        {images.slice(0, 4).map((item, index) => item.url ? (
          <img key={index} src={item.url} alt="" className="h-full min-h-0 w-full rounded-lg object-cover" loading="lazy" />
        ) : (
          <div key={index} className="rounded-lg bg-muted-foreground/10" />
        ))}
      </div>
    );
  }

  if (block.type === "text") {
    return (
      <div
        style={{
          ...base,
          display: "flex", alignItems: "center",
          justifyContent: p.align === "left" ? "flex-start" : p.align === "right" ? "flex-end" : "center",
          padding: "4px 8px", textAlign: (p.align as CSSProperties["textAlign"]) || "center",
          fontFamily: galleryFont(p.font),
          fontSize: `${Math.max(9, Math.min(48, Number(p.fontSize) || 16))}px`,
          fontWeight: p.fontWeight || (p.bold === "1" ? 700 : 500),
          lineHeight: Number(p.lineHeight) || 1.15,
          letterSpacing: `${Number(p.letterSpacing) || 0}px`,
          color: p.color || "currentColor",
          textTransform: p.textTransform as CSSProperties["textTransform"] || undefined,
        }}
      >
        {p.text || "Seu texto aqui"}
      </div>
    );
  }

  const accent = p.backgroundColor || p.borderColor || "#a78bfa";
  const color = p.textColor || p.color || "currentColor";
  const labels: Record<string, string> = {
    date: "DATA • evento", time: "HORÁRIO • evento", location: "LOCAL • evento",
    countdown: "FALTAM • contagem", rsvp: p.label || "CONFIRMAR PRESENÇA",
    whatsapp: p.label || "WHATSAPP", button: p.label || "BOTÃO",
  };

  if (block.type === "divider") {
    return <div style={{ ...base, display: "flex", alignItems: "center", padding: "0 12px" }}><div className="w-full border-t border-current opacity-40" /></div>;
  }
  if (block.type === "shape" || block.type === "decoration") {
    const shape = p.shape || "rectangle";
    return (
      <div style={{
        ...base,
        background: p.fill === "none" ? "transparent" : (p.fillColor || accent),
        border: `${Math.max(0, Number(p.borderWidth) || 0)}px solid ${p.borderColor || accent}`,
        borderRadius: shape === "circle" ? "999px" : `${Number(p.borderRadius) || 12}px`,
      }} />
    );
  }
  if (block.type === "qr_code") {
    return <div style={{ ...base, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: 8 }}><div className="aspect-square w-2/3 rounded-md border-4 border-foreground bg-background" /><span className="text-[8px] text-muted-foreground">QR Code</span></div>;
  }

  return (
    <div style={{ ...base, display: "flex", alignItems: "center", justifyContent: "center", padding: 6 }}>
      <span
        className="rounded-full border px-3 py-2 text-[9px] font-semibold shadow-sm"
        style={{ color, borderColor: p.borderColor || accent, background: p.backgroundColor || "rgba(255,255,255,.62)" }}
      >
        {labels[block.type] || "Elemento"}
      </span>
    </div>
  );
}

function PreviewCanvas({ content }: { content: TemplateContent }) {
  const blocks = content.blocks ?? [];
  const background = content.settings?.background;
  const geometries = blocks.map((block, index) => resolveBlockGeometry(block, index));
  const height = Math.max(420, ...geometries.map((geometry) => geometry.y + geometry.height + 24));
  const canvasWidth = 390;
  const scale = 240 / canvasWidth;

  return (
    <div className="relative mx-auto w-full max-w-[240px] overflow-hidden rounded-xl border border-border/70 bg-card shadow-inner" style={{ minHeight: Math.max(180, height * scale) }}>
      <div className="absolute inset-0 origin-top-left" style={{ width: canvasWidth, minHeight: height, transform: `scale(${scale})` }}>
        <div className="relative isolate h-full w-[390px] overflow-hidden bg-card" style={{ minHeight: height }}>
          <BackgroundLayers bg={background} />
          {blocks.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">Canvas em branco</div>
          ) : (
            blocks.map((block, index) => <GalleryBlockPreview key={block.id} block={block} geometry={geometries[index] ?? resolveBlockGeometry(block, index)} />)
          )}
        </div>
      </div>
      <span className="pointer-events-none absolute right-2 top-2 rounded-full border border-white/20 bg-black/35 px-2 py-1 text-[8px] font-medium uppercase tracking-wide text-white/80 backdrop-blur-sm">Prévia</span>
    </div>
  );
}

export function TemplateGallery({ open, onClose, onApply, hasContent }: TemplateGalleryProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"Todos" | Category>("Todos");
  const [selectedId, setSelectedId] = useState<string>("editorial");
  const [confirmReplace, setConfirmReplace] = useState(false);
  const curatedItems = useMemo(() => starterItems(), []);
  const templatesQuery = useQuery({
    queryKey: ["templates", "editor-gallery"],
    queryFn: listTemplates,
    enabled: open,
    staleTime: 60_000,
  });
  const items = useMemo(
    () => [...curatedItems, ...databaseTemplateItems(templatesQuery.data)],
    [curatedItems, templatesQuery.data],
  );
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = category === "Todos" || item.category === category;
      const matchesSearch = !term || `${item.label} ${item.id} ${item.category} ${item.sourceLabel}`.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [category, items, search]);

  if (!open) return null;

  const selected = items.find((item) => item.id === selectedId) ?? filtered[0] ?? items[0];
  const select = (id: string) => {
    setSelectedId(id);
    setConfirmReplace(false);
  };
  const apply = () => {
    if (!selected) return;
    if (hasContent && !confirmReplace) {
      setConfirmReplace(true);
      return;
    }
    onApply(cloneContent(selected.content));
    setConfirmReplace(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/60 p-2 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="template-gallery-title">
      <div className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border/70 bg-background shadow-2xl">
        <header className="flex items-center gap-3 border-b border-border/70 bg-card/95 p-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="template-gallery-title" className="truncate text-base font-semibold text-foreground sm:text-lg">Escolha um modelo</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Comece com uma composição pronta e personalize todos os elementos no editor.</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Fechar galeria de modelos">
            <X className="h-4 w-4" />
          </Button>
        </header>

        <div className="grid min-h-0 flex-1 lg:grid-cols-[220px_minmax(0,1fr)_300px]">
          <aside className="hidden overflow-y-auto border-r border-border/70 bg-card/50 p-4 lg:block">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Categorias</p>
            <div className="space-y-1">
              <button type="button" onClick={() => setCategory("Todos")} className={cn("w-full rounded-lg px-3 py-2 text-left text-xs transition-colors", category === "Todos" ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>Todos os modelos</button>
              {CATEGORIES.map((item) => (
                <button key={item.value} type="button" onClick={() => setCategory(item.value)} className={cn("w-full rounded-lg px-3 py-2 text-left text-xs transition-colors", category === item.value ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground")}>
                  {item.label}
                </button>
              ))}
            </div>
            <div className="mt-6 rounded-xl border border-primary/15 bg-primary/5 p-3 text-[11px] leading-5 text-muted-foreground">
              Os modelos preservam blocos, posicionamento, camadas, estilos e fundo. Depois de aplicar, tudo continua editável no canvas.
            </div>
          </aside>

          <main className="min-h-0 overflow-y-auto p-4 sm:p-5">
            <div className="mb-4 space-y-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar modelos" className="h-10 pl-9 text-base sm:text-xs" aria-label="Buscar modelos" />
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1 lg:hidden">
                {[{ value: "Todos", label: "Todos" }, ...CATEGORIES].map((item) => (
                  <button key={item.value} type="button" onClick={() => setCategory(item.value as "Todos" | Category)} className={cn("shrink-0 rounded-md border px-2.5 py-1.5 text-[11px]", category === item.value ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent")}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {templatesQuery.error && (
              <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
                Seus modelos cadastrados não puderam ser carregados agora. Os modelos Vellune prontos continuam disponíveis.
              </div>
            )}

            {filtered.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((item) => (
                  <button key={item.id} type="button" onClick={() => select(item.id)} className={cn("group touch-manipulation rounded-xl border bg-card p-2 text-left shadow-sm transition-all active:scale-[.99] hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-lg", selected?.id === item.id && "border-primary ring-2 ring-primary/20 shadow-md shadow-primary/10")}>
                    <PreviewCanvas content={item.content} />
                    <div className="p-1.5">
                      <div className="flex items-start gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{item.label}</p>
                        {selected?.id === item.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <p className="text-[10px] uppercase tracking-wide text-primary">{CATEGORIES.find((categoryItem) => categoryItem.value === item.category)?.label ?? "Modelo"}</p>
                        <span className="rounded-full border border-border/70 bg-muted/50 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">{item.sourceLabel}</span>
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{item.content.blocks.length} elementos editáveis</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed text-center text-sm text-muted-foreground">
                <div>
                  <p>Nenhum modelo encontrado.</p>
                  {search.trim() && <p className="mt-1 text-xs">Tente outro termo ou escolha “Todos”.</p>}
                </div>
              </div>
            )}
          </main>

          <aside className="hidden border-t border-border/70 bg-card/60 p-4 lg:block lg:border-l lg:border-t-0">
            {selected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Prévia do modelo</p>
                </div>
                <PreviewCanvas content={selected.content} />
                <div>
                  <p className="font-medium text-foreground">{selected.label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{selected.source === "company" ? "Modelo da sua empresa. Você pode ajustar o conteúdo, estilo e posição no editor." : "A composição será aplicada ao convite e poderá ser ajustada bloco a bloco no editor."}</p>
                </div>
                <Button type="button" className="w-full" onClick={apply}>
                  <LayoutTemplate className="mr-2 h-4 w-4" />
                  {selected.id === "blank" ? "Começar em branco" : "Aplicar modelo"}
                </Button>
                {confirmReplace && (
                  <div className="space-y-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                    <p className="text-xs leading-5 text-foreground">Este convite já possui conteúdo. Aplicar este modelo substituirá os blocos atuais. Essa ação poderá ser desfeita pelo botão Desfazer.</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" size="sm" variant="outline" onClick={() => setConfirmReplace(false)}>Cancelar</Button>
                      <Button type="button" size="sm" onClick={() => { onApply(cloneContent(selected.content)); setConfirmReplace(false); onClose(); }}><Check className="mr-1 h-3.5 w-3.5" />Confirmar</Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex min-h-48 items-center justify-center text-center text-xs text-muted-foreground">Selecione um modelo para visualizar.</div>
            )}
          </aside>
        </div>
        <div className="flex items-center gap-3 border-t border-border/70 bg-card/95 p-3 shadow-[0_-10px_30px_-20px_hsl(var(--foreground)/.35)] backdrop-blur-xl lg:hidden" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
          <div className="min-w-0 flex-1">
            {selected ? (
              <>
                <p className="truncate text-xs font-semibold text-foreground">{selected.label}</p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">{selected.content.blocks.length} elementos editáveis</p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">Selecione um modelo</p>
            )}
          </div>
          <Button type="button" size="sm" disabled={!selected} onClick={apply} className="shrink-0 rounded-xl px-4">
            <LayoutTemplate className="mr-1.5 h-4 w-4" />
            {selected?.id === "blank" ? "Em branco" : "Aplicar"}
          </Button>
        </div>
        {confirmReplace && selected && (
          <div className="absolute inset-x-3 bottom-[4.75rem] z-10 rounded-2xl border border-amber-500/30 bg-background p-3 shadow-2xl lg:hidden">
            <p className="text-xs leading-5 text-foreground">Este convite já possui conteúdo. Aplicar o modelo substituirá os blocos atuais.</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setConfirmReplace(false)}>Cancelar</Button>
              <Button type="button" size="sm" onClick={() => { onApply(cloneContent(selected.content)); setConfirmReplace(false); onClose(); }}><Check className="mr-1 h-3.5 w-3.5" />Confirmar</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
