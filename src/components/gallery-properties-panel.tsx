import { useMemo } from "react";
import { ChevronDown, GripVertical, Image as ImageIcon, RotateCcw, Trash2, Upload } from "lucide-react";
import { ImageUpload } from "@/components/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AssetScope } from "@/lib/assets";
import { useAssetUrl } from "@/lib/assets";
import type { Block } from "@/lib/templates";

type GalleryImage = { url: string; alt?: string; caption?: string };

type GalleryPanelProps = {
  selected: Block[];
  assets?: AssetScope;
  onChange: (update: (blocks: Block[]) => Block[], group?: string) => void;
};

function parseImages(value: string | undefined): GalleryImage[] {
  try {
    const parsed = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is GalleryImage =>
      Boolean(item) &&
      typeof item === "object" &&
      typeof (item as { url?: unknown }).url === "string" &&
      (item as { url: string }).url.length > 0,
    );
  } catch {
    return [];
  }
}

function GalleryThumb({ image, index, total, onRemove, onMove }: { image: GalleryImage; index: number; total: number; onRemove: () => void; onMove: (direction: -1 | 1) => void }) {
  const src = useAssetUrl(image.url);
  return (
    <div className="group rounded-xl border border-border/70 bg-background/40 p-2">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-muted">
          {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><ImageIcon className="h-5 w-5 text-muted-foreground" /></div>}
          <span className="absolute bottom-1 left-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[9px] font-medium text-white">{index + 1}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-medium text-foreground">{image.alt || image.caption || "Imagem da galeria"}</p>
          <p className="mt-0.5 truncate text-[9px] text-muted-foreground">{image.url.startsWith("storage:") ? "Biblioteca Vellune" : "URL externa"}</p>
        </div>
        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={onRemove} aria-label="Remover imagem da galeria" title="Remover imagem">
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[10px]" disabled={index === 0} onClick={() => onMove(-1)}>← Subir</Button>
        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-[10px]" disabled={index === total - 1} onClick={() => onMove(1)}>Descer →</Button>
      </div>
    </div>
  );
}

export function GalleryPropertiesPanel({ selected, assets, onChange }: GalleryPanelProps) {
  const primary = selected[0];
  const images = useMemo(() => parseImages(primary?.props?.images), [primary?.id, primary?.props?.images]);
  if (!primary || selected.length !== 1 || primary.type !== "gallery") return null;

  const updateProps = (patch: Record<string, string>, group = "gallery:props") => {
    onChange((items) => items.map((item) =>
      selected.some((chosen) => chosen.id === item.id) && item.type === "gallery"
        ? { ...item, props: { ...item.props, ...patch } }
        : item,
    ), group);
  };

  const updateImages = (next: GalleryImage[], group = "gallery:images") => {
    onChange((items) => items.map((item) =>
      selected.some((chosen) => chosen.id === item.id) && item.type === "gallery"
        ? { ...item, props: { ...item.props, images: JSON.stringify(next) } }
        : item,
    ), group);
  };

  const addImage = (url: string) => {
    if (!url) return;
    if (images.some((image) => image.url === url)) return;
    updateImages([...images, { url }], "gallery:add-image");
  };

  const updateImage = (index: number, patch: Partial<GalleryImage>) => {
    const next = images.map((image, itemIndex) => itemIndex === index ? { ...image, ...patch } : image);
    updateImages(next, "gallery:update-image");
  };

  const removeImage = (index: number) => {
    updateImages(images.filter((_, itemIndex) => itemIndex !== index), "gallery:remove-image");
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    const next = [...images];
    const current = next[index]!;
    next[index] = next[target]!;
    next[target] = current;
    updateImages(next, "gallery:reorder");
  };

  const resetImages = () => updateProps({ images: "[]" }, "gallery:reset");
  const mode = primary.props?.mode === "carousel" ? "carousel" : "grid";
  const columns = ["2", "3", "4"].includes(primary.props?.columns ?? "") ? primary.props?.columns ?? "2" : "2";
  const height = primary.props?.height && ["auto", "square", "wide", "portrait"].includes(primary.props.height) ? primary.props.height : "square";
  const captions = primary.props?.captions !== "0";

  return (
    <section className="space-y-3 rounded-xl border bg-muted/15 p-3" aria-label="Galeria">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-primary" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Galeria de fotos</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">{images.length} {images.length === 1 ? "imagem" : "imagens"}</p>
          </div>
        </div>
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={resetImages} disabled={!images.length}>
          <RotateCcw className="mr-1 h-3 w-3" />Limpar
        </Button>
      </div>

      <div className="space-y-2 rounded-lg border bg-background/40 p-2">
        <div className="flex items-start gap-2">
          <Upload className="mt-0.5 h-4 w-4 text-primary" />
          <div>
            <p className="text-[11px] font-semibold text-foreground">Adicionar fotos</p>
            <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">Você pode adicionar JPG, PNG, WebP ou GIF pela biblioteca do convite.</p>
          </div>
        </div>
        <ImageUpload scope={assets} value="" onChange={addImage} />
      </div>

      {images.length > 0 ? (
        <div className="space-y-2">
          {images.map((image, index) => (
            <div key={`${image.url}-${index}`} className="space-y-2">
              <GalleryThumb image={image} index={index} total={images.length} onRemove={() => removeImage(index)} onMove={(direction) => moveImage(index, direction)} />
              <div className="grid grid-cols-1 gap-2">
                <div className="space-y-1">
                  <Label htmlFor={`gallery-alt-${index}`} className="text-[10px] text-muted-foreground">Descrição acessível</Label>
                  <Input id={`gallery-alt-${index}`} value={image.alt ?? ""} onChange={(event) => updateImage(index, { alt: event.target.value })} className="h-8 text-xs" placeholder="Ex.: Foto do casal" />
                </div>
                {captions && (
                  <div className="space-y-1">
                    <Label htmlFor={`gallery-caption-${index}`} className="text-[10px] text-muted-foreground">Legenda</Label>
                    <Input id={`gallery-caption-${index}`} value={image.caption ?? ""} onChange={(event) => updateImage(index, { caption: event.target.value })} className="h-8 text-xs" placeholder="Opcional" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-5 text-center">
          <ImageIcon className="mx-auto h-5 w-5 text-muted-foreground" />
          <p className="mt-2 text-xs font-medium text-foreground">Sua galeria está vazia</p>
          <p className="mt-1 text-[10px] leading-4 text-muted-foreground">Adicione a primeira foto acima para começar.</p>
        </div>
      )}

      <details className="group rounded-lg border border-primary/10 bg-background/35">
        <summary className="flex cursor-pointer list-none items-center justify-between p-2.5 text-[11px] font-semibold text-foreground [&::-webkit-details-marker]:hidden">
          Layout da galeria
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-2 border-t border-border/60 p-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Formato</Label>
              <select value={mode} onChange={(event) => updateProps({ mode: event.target.value })} className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground">
                <option value="grid">Grade</option>
                <option value="carousel">Carrossel</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Colunas</Label>
              <select value={columns} onChange={(event) => updateProps({ columns: event.target.value })} className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground">
                <option value="2">2 colunas</option>
                <option value="3">3 colunas</option>
                <option value="4">4 colunas</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] text-muted-foreground">Proporção</Label>
              <select value={height} onChange={(event) => updateProps({ height: event.target.value })} className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground">
                <option value="square">Quadrada</option>
                <option value="wide">Horizontal</option>
                <option value="portrait">Retrato</option>
                <option value="auto">Automática</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button type="button" size="sm" variant={captions ? "default" : "outline"} className="h-8 w-full text-[10px]" onClick={() => updateProps({ captions: captions ? "0" : "1" })}>
                {captions ? "Legendas visíveis" : "Ocultar legendas"}
              </Button>
            </div>
          </div>
        </div>
      </details>
    </section>
  );
}
