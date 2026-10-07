import { useMemo, useState } from "react";
import { Check, Eye, LayoutTemplate, Search, Sparkles, X } from "lucide-react";
import { BlockView, BackgroundLayers } from "@/components/block-render";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORIES, STARTERS, cloneContent, resolveBlockGeometry, type Category, type TemplateContent } from "@/lib/templates";
import { cn } from "@/lib/utils";

type TemplateGalleryProps = {
  open: boolean;
  onClose: () => void;
  onApply: (content: TemplateContent) => void;
  hasContent: boolean;
};

type StarterItem = {
  id: string;
  label: string;
  category: Category;
  content: TemplateContent;
};

const STARTER_CATEGORIES: Record<string, Category> = {
  editorial: "casamento",
  basic: "outros",
  complete: "outros",
  blank: "outros",
};

function starterItems(): StarterItem[] {
  return Object.entries(STARTERS).map(([id, starter]) => ({
    id,
    label: starter.label,
    category: STARTER_CATEGORIES[id] ?? "outros",
    content: starter.build(),
  }));
}

function PreviewCanvas({ content }: { content: TemplateContent }) {
  const blocks = content.blocks ?? [];
  const background = content.settings?.background;
  const geometries = blocks.map((block, index) => resolveBlockGeometry(block, index));
  const height = Math.max(420, ...geometries.map((geometry) => geometry.y + geometry.height + 24));

  return (
    <div className="relative mx-auto w-full max-w-[240px] overflow-hidden rounded-xl border border-border/70 bg-card shadow-inner" style={{ minHeight: height / 2.6 }}>
      <div className="absolute inset-0 origin-top-left" style={{ width: 260, minHeight: height, transform: "scale(0.385)" }}>
        <div className="relative isolate h-full w-[260px] overflow-hidden bg-card" style={{ minHeight: height }}>
          <BackgroundLayers bg={background} />
          {blocks.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
              Canvas em branco
            </div>
          ) : (
            blocks.map((block, index) => {
              const geometry = geometries[index] ?? resolveBlockGeometry(block, index);
              return (
                <div
                  key={block.id}
                  className="absolute"
                  style={{
                    left: geometry.x,
                    top: geometry.y,
                    width: geometry.width,
                    height: geometry.height,
                    zIndex: geometry.zIndex,
                    opacity: geometry.opacity,
                    transform: `rotate(${geometry.rotation}deg) scale(${geometry.scale})`,
                    transformOrigin: "center",
                  }}
                >
                  <BlockView block={block} interactive={false} />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export function TemplateGallery({ open, onClose, onApply, hasContent }: TemplateGalleryProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"Todos" | Category>("Todos");
  const [selectedId, setSelectedId] = useState<string>("editorial");
  const [confirmReplace, setConfirmReplace] = useState(false);

  const items = useMemo(() => starterItems(), []);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesCategory = category === "Todos" || item.category === category;
      const matchesSearch = !term || `${item.label} ${item.id} ${item.category}`.toLowerCase().includes(term);
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
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar modelos" className="h-10 pl-9 text-xs" aria-label="Buscar modelos" />
              </div>
              <div className="flex gap-1 overflow-x-auto pb-1 lg:hidden">
                {[{ value: "Todos", label: "Todos" }, ...CATEGORIES].map((item) => (
                  <button key={item.value} type="button" onClick={() => setCategory(item.value as "Todos" | Category)} className={cn("shrink-0 rounded-md border px-2.5 py-1.5 text-[11px]", category === item.value ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent")}>
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {filtered.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((item) => (
                  <button key={item.id} type="button" onClick={() => select(item.id)} className={cn("group rounded-xl border bg-card p-2 text-left transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:shadow-md", selected?.id === item.id && "border-primary ring-2 ring-primary/20")}>
                    <PreviewCanvas content={item.content} />
                    <div className="p-1.5">
                      <div className="flex items-start gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{item.label}</p>
                        {selected?.id === item.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
                      </div>
                      <p className="mt-1 text-[10px] uppercase tracking-wide text-primary">{CATEGORIES.find((categoryItem) => categoryItem.value === item.category)?.label ?? "Modelo"}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">{item.content.blocks.length} elementos editáveis</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex min-h-48 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">Nenhum modelo encontrado.</div>
            )}
          </main>

          <aside className="border-t border-border/70 bg-card/60 p-4 lg:border-l lg:border-t-0">
            {selected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-foreground">Prévia do modelo</p>
                </div>
                <PreviewCanvas content={selected.content} />
                <div>
                  <p className="font-medium text-foreground">{selected.label}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">A composição será aplicada ao convite e poderá ser ajustada bloco a bloco no editor.</p>
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
      </div>
    </div>
  );
}
