import { useMemo, useState } from "react";
import { AlignCenter, AlignHorizontalDistributeCenter, AlignHorizontalJustifyCenter, AlignLeft, AlignRight, AlignVerticalDistributeCenter, ArrowDown, ArrowUp, Copy, Eye, EyeOff, Layers3, Lock, Move, RotateCcw, Trash2, Unlock } from "lucide-react";
import type { Block } from "@/lib/templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type BlockWithLayout = Block & {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  opacity?: number;
  zIndex?: number;
  scale?: number;
  locked?: boolean;
  hidden?: boolean;
  visibility?: boolean;
};

type PanelProps = {
  blocks: Block[];
  selectedIds: string[];
  onChange: (update: (blocks: Block[]) => Block[], group?: string) => void;
  onDuplicate: (ids: string[]) => void;
  onDelete: (ids: string[]) => void;
};

const numberValue = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function ContextualPropertiesPanel({ blocks, selectedIds, onChange, onDuplicate, onDelete }: PanelProps) {
  const [keepRatio, setKeepRatio] = useState(true);
  const selected = useMemo(() => blocks.filter((block) => selectedIds.includes(block.id)), [blocks, selectedIds]);
  const primary = selected[0] as BlockWithLayout | undefined;
  const multiple = selected.length > 1;

  const apply = (patch: Partial<BlockWithLayout>, group = "properties:update") => {
    onChange((items) => items.map((item) => selectedIds.includes(item.id) ? { ...item, ...patch } : item), group);
  };

  const applyLayout = (key: "x" | "y" | "width" | "height" | "rotation" | "opacity" | "zIndex" | "scale", value: number) => {
    if (!Number.isFinite(value)) return;
    if (key === "opacity") value = clamp(value, 0, 1);
    if (key === "width" || key === "height") value = Math.max(1, value);
    if (key === "scale") value = Math.max(0.1, value);

    const patch: Partial<BlockWithLayout> = { [key]: value } as Partial<BlockWithLayout>;
    if (keepRatio && selected.length === 1 && (key === "width" || key === "height")) {
      const sourceWidth = Math.max(1, numberValue(primary?.width, 720));
      const sourceHeight = Math.max(1, numberValue(primary?.height, 72));
      const ratio = sourceWidth / sourceHeight;
      if (key === "width") patch.height = Math.max(1, Math.round(value / ratio));
      if (key === "height") patch.width = Math.max(1, Math.round(value * ratio));
    }

    apply(patch, `properties:${key}`);
  };

  const align = (axis: "x" | "y", mode: "start" | "center" | "end") => {
    if (!selected.length) return;
    const values = selected.map((item) => {
      const block = item as BlockWithLayout;
      const start = numberValue(block[axis]);
      const size = numberValue(block[axis === "x" ? "width" : "height"], axis === "x" ? 720 : 72);
      return { item, start, size };
    });
    const min = Math.min(...values.map((value) => value.start));
    const max = Math.max(...values.map((value) => value.start + value.size));
    const center = (min + max) / 2;
    onChange((items) => items.map((item) => {
      const value = values.find((entry) => entry.item.id === item.id);
      if (!value) return item;
      const next = mode === "start" ? min : mode === "end" ? max - value.size : center - value.size / 2;
      return { ...item, [axis]: Math.round(next) };
    }), `properties:align-${axis}-${mode}`);
  };

  const distribute = (axis: "x" | "y") => {
    if (selected.length < 3) return;
    const sizeKey = axis === "x" ? "width" : "height";
    const ordered = [...selected].sort((a, b) => numberValue((a as BlockWithLayout)[axis]) - numberValue((b as BlockWithLayout)[axis]));
    const first = ordered[0] as BlockWithLayout;
    const last = ordered[ordered.length - 1] as BlockWithLayout;
    const start = numberValue(first[axis]);
    const end = numberValue(last[axis]);
    const total = ordered.reduce((sum, item) => sum + numberValue((item as BlockWithLayout)[sizeKey], axis === "x" ? 720 : 72), 0);
    const gap = (end + numberValue(last[sizeKey], axis === "x" ? 720 : 72) - start - total) / (ordered.length - 1);
    let cursor = start;
    const positions = new Map(ordered.map((item) => {
      const result = [item.id, Math.round(cursor)] as const;
      cursor += numberValue((item as BlockWithLayout)[sizeKey], axis === "x" ? 720 : 72) + gap;
      return result;
    }));
    onChange((items) => items.map((item) => positions.has(item.id) ? { ...item, [axis]: positions.get(item.id) } : item), `properties:distribute-${axis}`);
  };

  if (!selected.length) {
    return <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-5 py-8 text-center">
      <Move className="mb-3 h-7 w-7 text-muted-foreground" />
      <p className="text-sm font-medium text-foreground">Nenhum elemento selecionado</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">Selecione um elemento no canvas para editar posição, tamanho, estilo e camadas.</p>
    </div>;
  }

  const field = (key: "x" | "y" | "width" | "height" | "rotation" | "opacity" | "zIndex" | "scale", label: string, options?: { min?: number; max?: number; step?: number }) => (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <Input type="number" value={numberValue(primary?.[key], key === "opacity" ? 1 : key === "scale" ? 1 : 0)} min={options?.min} max={options?.max} step={options?.step ?? 1} disabled={multiple && key === "scale"} onChange={(event) => applyLayout(key, Number(event.target.value))} className="h-8 text-xs" />
    </div>
  );

  const anyLocked = selected.some((item) => (item as BlockWithLayout).locked);
  const allHidden = selected.every((item) => (item as BlockWithLayout).hidden === true || (item as BlockWithLayout).visibility === false);

  return <div className="space-y-4" aria-label="Painel de propriedades contextual">
    <div className="flex items-start justify-between gap-3">
      <div><p className="text-sm font-semibold text-foreground">Propriedades</p><p className="mt-1 text-xs text-muted-foreground">{multiple ? `${selected.length} elementos selecionados` : `Elemento: ${String(primary?.type ?? "")}`}</p></div>
      <div className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">{multiple ? "MÚLTIPLA" : "INDIVIDUAL"}</div>
    </div>

    {multiple && <p className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs leading-5 text-primary">Os controles compatíveis serão aplicados a todos os elementos selecionados.</p>}

    <section className="space-y-3 rounded-xl border bg-muted/15 p-3">
      <div className="flex items-center gap-2"><Move className="h-4 w-4 text-primary" /><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transformação</p></div>
      <div className="grid grid-cols-2 gap-2">{field("x", "Posição X")}{field("y", "Posição Y")}{field("width", "Largura", { min: 1 })}{field("height", "Altura", { min: 1 })}{field("rotation", "Rotação")}{field("opacity", "Opacidade", { min: 0, max: 1, step: 0.05 })}</div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={keepRatio} onChange={(event) => setKeepRatio(event.target.checked)} className="accent-primary" />Manter proporção</label>
    </section>

    <section className="space-y-3 rounded-xl border bg-muted/15 p-3">
      <div className="flex items-center gap-2"><AlignHorizontalJustifyCenter className="h-4 w-4 text-primary" /><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Alinhamento</p></div>
      <div className="grid grid-cols-3 gap-1"><Button type="button" size="sm" variant="outline" title="Alinhar à esquerda" onClick={() => align("x", "start")}><AlignLeft className="h-3.5 w-3.5" /></Button><Button type="button" size="sm" variant="outline" title="Centralizar horizontalmente" onClick={() => align("x", "center")}><AlignCenter className="h-3.5 w-3.5" /></Button><Button type="button" size="sm" variant="outline" title="Alinhar à direita" onClick={() => align("x", "end")}><AlignRight className="h-3.5 w-3.5" /></Button></div>
      <div className="grid grid-cols-2 gap-1"><Button type="button" size="sm" variant="outline" disabled={selected.length < 3} onClick={() => distribute("x")}><AlignHorizontalDistributeCenter className="mr-1 h-3.5 w-3.5" />Distribuir X</Button><Button type="button" size="sm" variant="outline" disabled={selected.length < 3} onClick={() => distribute("y")}><AlignVerticalDistributeCenter className="mr-1 h-3.5 w-3.5" />Distribuir Y</Button></div>
    </section>

    <section className="space-y-2 rounded-xl border bg-muted/15 p-3">
      <div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-primary" /><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Camadas</p></div>
      <div className="grid grid-cols-2 gap-2">{field("zIndex", "Ordem")}{field("scale", "Escala", { min: 0.1, step: 0.1 })}</div>
      <div className="grid grid-cols-2 gap-1"><Button type="button" size="sm" variant="outline" onClick={() => apply({ zIndex: numberValue(primary?.zIndex) + 1 }, "properties:layer-up")}><ArrowUp className="mr-1 h-3.5 w-3.5" />Subir</Button><Button type="button" size="sm" variant="outline" onClick={() => apply({ zIndex: Math.max(0, numberValue(primary?.zIndex) - 1) }, "properties:layer-down")}><ArrowDown className="mr-1 h-3.5 w-3.5" />Descer</Button></div>
    </section>

    <Separator />
    <div className="grid grid-cols-2 gap-2"><Button type="button" size="sm" variant="outline" onClick={() => apply({ locked: !anyLocked }, "properties:lock")}><{anyLocked ? Unlock : Lock} className="mr-1 h-3.5 w-3.5" />{anyLocked ? "Desbloquear" : "Bloquear"}</Button><Button type="button" size="sm" variant="outline" onClick={() => apply({ hidden: !allHidden, visibility: allHidden }, "properties:visibility")} >{allHidden ? <Eye className="mr-1 h-3.5 w-3.5" /> : <EyeOff className="mr-1 h-3.5 w-3.5" />}{allHidden ? "Mostrar" : "Ocultar"}</Button></div>
    <div className="grid grid-cols-2 gap-2"><Button type="button" size="sm" variant="outline" onClick={() => onDuplicate(selectedIds)}><Copy className="mr-1 h-3.5 w-3.5" />Duplicar</Button><Button type="button" size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => onDelete(selectedIds)}><Trash2 className="mr-1 h-3.5 w-3.5" />Excluir</Button></div>
    <Button type="button" size="sm" variant="ghost" className="w-full text-xs" onClick={() => apply({ rotation: 0 }, "properties:reset-rotation")}><RotateCcw className="mr-1 h-3.5 w-3.5" />Redefinir rotação</Button>
  </div>;
}
