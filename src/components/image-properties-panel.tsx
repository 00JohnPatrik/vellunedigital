import { useEffect, useMemo, useState } from "react";
import { Image as ImageIcon, RotateCcw } from "lucide-react";
import { ImageUpload } from "@/components/image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AssetScope } from "@/lib/assets";
import type { Block } from "@/lib/templates";

type ImagePanelProps = {
  selected: Block[];
  assets?: AssetScope;
  onChange: (update: (blocks: Block[]) => Block[], group?: string) => void;
};

const IMAGE_KEYS = [
  "url",
  "alt",
  "objectFit",
  "objectPosition",
  "imageZoom",
  "imageBrightness",
  "imageContrast",
  "imageSaturate",
];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const photoPresets = [
  { id: "natural", label: "Natural", values: { imageBrightness: "100", imageContrast: "100", imageSaturate: "100" } },
  { id: "soft", label: "Suave", values: { imageBrightness: "104", imageContrast: "96", imageSaturate: "90" } },
  { id: "mono", label: "P&B", values: { imageBrightness: "105", imageContrast: "112", imageSaturate: "0" } },
  { id: "vivid", label: "Vibrante", values: { imageBrightness: "102", imageContrast: "108", imageSaturate: "125" } },
] as const;

function numberValue(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function ImagePropertiesPanel({ selected, assets, onChange }: ImagePanelProps) {
  const primary = selected[0];
  const props = primary?.props ?? {};
  const [urlDraft, setUrlDraft] = useState(props.url ?? "");

  useEffect(() => {
    setUrlDraft(props.url ?? "");
  }, [primary?.id, props.url]);

  const multiple = selected.length > 1;
  const imageCount = useMemo(() => selected.filter((block) => block.type === "image").length, [selected]);

  const update = (key: string, value: string, group = `image:${key}`) => {
    onChange(
      (items) => items.map((item) => selected.some((chosen) => chosen.id === item.id) && item.type === "image"
        ? { ...item, props: { ...item.props, [key]: value } }
        : item),
      group,
    );
  };

  const updateNumber = (key: string, value: number, min: number, max: number) => {
    if (!Number.isFinite(value)) return;
    update(key, String(clamp(value, min, max)));
  };

  const reset = () => {
    onChange(
      (items) => items.map((item) => {
        if (!selected.some((chosen) => chosen.id === item.id) || item.type !== "image") return item;
        return { ...item, props: Object.fromEntries(Object.entries(item.props).filter(([key]) => !IMAGE_KEYS.includes(key))) };
      }),
      "image:reset",
    );
  };

  if (!primary || primary.type !== "image") return null;

  const fit = props.objectFit || "cover";
  const position = props.objectPosition || props.position || "center";
  const zoom = numberValue(props.imageZoom, 100);
  const brightness = numberValue(props.imageBrightness, 100);
  const contrast = numberValue(props.imageContrast, 100);
  const saturate = numberValue(props.imageSaturate, 100);

  return (
    <section className="space-y-3 rounded-xl border bg-muted/15 p-3" aria-label="Imagem">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-primary" />
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Imagem</p>
        </div>
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={reset}>
          <RotateCcw className="mr-1 h-3 w-3" />Restaurar
        </Button>
      </div>

      {multiple && (
        <p className="rounded-md border border-primary/20 bg-primary/5 p-2 text-[11px] leading-4 text-primary">
          Os ajustes serão aplicados às {imageCount} imagens selecionadas.
        </p>
      )}

      <div className="space-y-2 rounded-lg border bg-background/40 p-2">
        <Label className="text-[11px] text-muted-foreground">Trocar imagem</Label>
        <ImageUpload scope={assets} value={props.url ?? ""} onChange={(value) => { setUrlDraft(value); update("url", value, "image:url"); }} />
        <Input
          type="url"
          value={urlDraft}
          placeholder="Ou cole uma URL https://..."
          onChange={(event) => { setUrlDraft(event.target.value); update("url", event.target.value, "image:url"); }}
          className="h-8 text-xs"
          aria-label="URL da imagem"
        />
        <div className="space-y-1">
          <Label htmlFor="image-alt" className="text-[11px] text-muted-foreground">Descrição acessível</Label>
          <Input id="image-alt" value={props.alt ?? ""} onChange={(event) => update("alt", event.target.value)} className="h-8 text-xs" />
        </div>
      </div>

      <div className="space-y-2 rounded-lg border bg-background/40 p-2">
        <p className="text-[11px] font-semibold text-foreground">Enquadramento</p>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Ajuste</Label>
            <select value={fit} onChange={(event) => update("objectFit", event.target.value)} className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground">
              <option value="cover">Preencher</option>
              <option value="contain">Mostrar inteira</option>
              <option value="original">Original</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px] text-muted-foreground">Foco</Label>
            <p className="flex h-8 items-center rounded-md border border-input bg-background px-2 text-[10px] text-muted-foreground">{position.replace(" ", " · ")}</p>
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] text-muted-foreground">Enquadramento</Label>
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-border/70 bg-background/45 p-1.5" role="group" aria-label="Foco da imagem">
            {([
              ["left top", "↖"], ["center top", "↑"], ["right top", "↗"],
              ["left center", "←"], ["center", "●"], ["right center", "→"],
              ["left bottom", "↙"], ["center bottom", "↓"], ["right bottom", "↘"],
            ] as Array<[string, string]>).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-label={`Foco ${value}`}
                title={`Foco ${value}`}
                aria-pressed={position === value}
                onClick={() => update("objectPosition", value)}
                className={`flex h-8 items-center justify-center rounded-md text-sm transition ${position === value ? "bg-primary/15 text-primary ring-1 ring-primary/30" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <label className="block space-y-1 text-[11px] text-muted-foreground">
          Zoom do crop: {zoom}%
          <input type="range" min="100" max="300" step="5" value={zoom} onChange={(event) => updateNumber("imageZoom", Number(event.target.value), 100, 300)} className="w-full accent-primary" />
        </label>
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-foreground">Acabamento rápido</p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {photoPresets.map((preset) => {
              const active = brightness === Number(preset.values.imageBrightness) && contrast === Number(preset.values.imageContrast) && saturate === Number(preset.values.imageSaturate);
              return (
                <Button
                  key={preset.id}
                  type="button"
                  size="sm"
                  variant={active ? "default" : "outline"}
                  className="h-8 rounded-lg px-2 text-[10px]"
                  onClick={() => onChange(
                    (items) => items.map((item) => selected.some((chosen) => chosen.id === item.id) && item.type === "image"
                      ? { ...item, props: { ...item.props, ...preset.values } }
                      : item),
                    `image:preset:${preset.id}`,
                  )}
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>
        </div>
      </div>

      <details className="group rounded-lg border border-primary/10 bg-background/35">
        <summary className="flex cursor-pointer list-none items-center justify-between p-2.5 text-[11px] font-semibold text-foreground [&::-webkit-details-marker]:hidden">
          Mais ajustes da imagem
          <span className="text-muted-foreground transition-transform group-open:rotate-180">⌄</span>
        </summary>
        <div className="space-y-2 border-t border-border/60 p-2">
        <label className="block space-y-1 text-[11px] text-muted-foreground">
          Brilho: {brightness}%
          <input type="range" min="0" max="200" value={brightness} onChange={(event) => updateNumber("imageBrightness", Number(event.target.value), 0, 200)} className="w-full accent-primary" />
        </label>
        <label className="block space-y-1 text-[11px] text-muted-foreground">
          Contraste: {contrast}%
          <input type="range" min="0" max="200" value={contrast} onChange={(event) => updateNumber("imageContrast", Number(event.target.value), 0, 200)} className="w-full accent-primary" />
        </label>
        <label className="block space-y-1 text-[11px] text-muted-foreground">
          Saturação: {saturate}%
          <input type="range" min="0" max="200" value={saturate} onChange={(event) => updateNumber("imageSaturate", Number(event.target.value), 0, 200)} className="w-full accent-primary" />
        </label>
        </div>
      </details>
    </section>
  );
}
