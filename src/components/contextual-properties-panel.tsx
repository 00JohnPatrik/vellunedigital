import { useEffect, useMemo, useState } from "react";
import { AlignCenter, AlignHorizontalDistributeCenter, AlignHorizontalJustifyCenter, AlignLeft, AlignRight, AlignVerticalDistributeCenter, ArrowDown, ArrowUp, Copy, Eye, EyeOff, Layers3, Lock, Move, RotateCcw, Trash2, Type, Unlock } from "lucide-react";
import type { Block } from "@/lib/templates";
import { FONTS } from "@/lib/blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

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
const textDefaults: Record<string, string> = {
  font: "display",
  fontSize: "",
  fontWeight: "normal",
  fontStyle: "normal",
  textDecoration: "none",
  align: "center",
  color: "",
  letterSpacing: "",
  lineHeight: "",
};

function TextTypography({
  selected,
  onChange,
}: {
  selected: Block[];
  onChange: PanelProps["onChange"];
}) {
  const primary = selected[0];
  const props = primary?.props ?? {};
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  useEffect(() => {
    setDrafts({
      fontSize: props.fontSize ?? "",
      letterSpacing: props.letterSpacing ?? "",
      lineHeight: props.lineHeight ?? "",
    });
  }, [primary?.id, props.fontSize, props.letterSpacing, props.lineHeight]);

  const applyProp = (key: string, value: string, group = `typography:${key}`) => {
    onChange((items) => items.map((item) => selected.some((chosen) => chosen.id === item.id)
      ? { ...item, props: { ...item.props, [key]: value } }
      : item), group);
  };

  const commitNumber = (key: "fontSize" | "letterSpacing" | "lineHeight") => {
    const raw = drafts[key]?.trim() ?? "";
    if (!raw) {
      applyProp(key, "");
      return;
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) {
      setDrafts((current) => ({ ...current, [key]: props[key] ?? "" }));
      return;
    }
    const safe = key === "lineHeight" ? clamp(value, 0.5, 4) : key === "fontSize" ? clamp(value, 1, 240) : clamp(value, -20, 40);
    const formatted = String(Number(safe.toFixed(2)));
    setDrafts((current) => ({ ...current, [key]: formatted }));
    applyProp(key, formatted);
  };

  const textField = (key: "fontSize" | "letterSpacing" | "lineHeight", label: string, placeholder: string, min: number, max: number, step = 1) => (
    <div className="space-y-1">
      <Label htmlFor={`typography-${key}`} className="text-[11px] text-muted-foreground">{label}</Label>
      <Input
        id={`typography-${key}`}
        type="number"
        min={min}
        max={max}
        step={step}
        placeholder={placeholder}
        value={drafts[key] ?? ""}
        onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))}
        onBlur={() => commitNumber(key)}
        onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commitNumber(key); event.currentTarget.blur(); } }}
        className="h-8 text-xs"
      />
    </div>
  );

  const color = props.color ?? "";
  const validColor = !color || /^#[0-9a-f]{6}$/i.test(color);

  const reset = () => {
    onChange((items) => items.map((item) => selected.some((chosen) => chosen.id === item.id)
      ? { ...item, props: Object.fromEntries(Object.entries(item.props).filter(([key]) => !Object.hasOwn(textDefaults, key))) }
      : item), "typography:reset");
    setDrafts({ fontSize: "", letterSpacing: "", lineHeight: "" });
  };

  return (
    <section className="space-y-3 rounded-xl border bg-muted/15 p-3" aria-label="Tipografia">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2"><Type className="h-4 w-4 text-primary" /><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipografia</p></div>
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={reset}>Restaurar</Button>
      </div>
      {selected.length > 1 && <p className="rounded-md border border-primary/20 bg-primary/5 p-2 text-[11px] leading-4 text-primary">As propriedades tipográficas serão aplicadas a todos os textos selecionados.</p>}
      <div className="space-y-1">
        <Label htmlFor="typography-font" className="text-[11px] text-muted-foreground">Fonte</Label>
        <select id="typography-font" value={props.font || "display"} onChange={(event) => applyProp("font", event.target.value)} className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring">
          {FONTS.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {textField("fontSize", "Tamanho (px)", "Automático", 1, 240)}
        <div className="space-y-1"><Label htmlFor="typography-weight" className="text-[11px] text-muted-foreground">Peso</Label><select id="typography-weight" value={props.fontWeight || "normal"} onChange={(event) => applyProp("fontWeight", event.target.value)} className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"><option value="normal">Normal</option><option value="500">Médio</option><option value="600">Semibold</option><option value="bold">Negrito</option></select></div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1"><Label htmlFor="typography-style" className="text-[11px] text-muted-foreground">Estilo</Label><select id="typography-style" value={props.fontStyle || "normal"} onChange={(event) => applyProp("fontStyle", event.target.value)} className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"><option value="normal">Normal</option><option value="italic">Itálico</option></select></div>
        <div className="space-y-1"><Label htmlFor="typography-decoration" className="text-[11px] text-muted-foreground">Decoração</Label><select id="typography-decoration" value={props.textDecoration || "none"} onChange={(event) => applyProp("textDecoration", event.target.value)} className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"><option value="none">Nenhuma</option><option value="underline">Sublinhado</option><option value="line-through">Riscado</option></select></div>
      </div>
      <div className="space-y-1"><Label htmlFor="typography-align" className="text-[11px] text-muted-foreground">Alinhamento</Label><select id="typography-align" value={props.align || "center"} onChange={(event) => applyProp("align", event.target.value)} className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option></select></div>
      <div className="space-y-1"><Label htmlFor="typography-color" className="text-[11px] text-muted-foreground">Cor HEX</Label><div className="flex gap-2"><Input id="typography-color" type="text" maxLength={7} placeholder="#000000" value={color} onChange={(event) => applyProp("color", event.target.value)} className={`h-8 text-xs ${!validColor ? "border-destructive" : ""}`} /><input type="color" aria-label="Selecionar cor do texto" value={validColor && color ? color : "#000000"} onChange={(event) => applyProp("color", event.target.value)} className="h-8 w-10 cursor-pointer rounded border bg-transparent p-1" /></div>{!validColor && <p className="text-[10px] text-destructive">Use uma cor no formato #RRGGBB.</p>}</div>
      <div className="grid grid-cols-2 gap-2">{textField("letterSpacing", "Letras (px)", "Padrão", -20, 40, 0.1)}{textField("lineHeight", "Linhas", "Padrão", 0.5, 4, 0.1)}</div>
      <p className="text-[10px] leading-4 text-muted-foreground">O tamanho, espaçamento e altura da linha são confirmados ao sair do campo ou pressionar Enter.</p>
    </section>
  );
}

export function ContextualPropertiesPanel({ blocks, selectedIds, onChange, onDuplicate, onDelete }: PanelProps) {
  const [keepRatio, setKeepRatio] = useState(true);
  const selected = useMemo(() => blocks.filter((block) => selectedIds.includes(block.id)), [blocks, selectedIds]);
  const primary = selected[0] as BlockWithLayout | undefined;
  const multiple = selected.length > 1;
  const textSelected = selected.length > 0 && selected.every((block) => block.type === "text");

  const apply = (patch: Partial<BlockWithLayout>, group = "properties:update") => onChange((items) => items.map((item) => selectedIds.includes(item.id) ? { ...item, ...patch } : item), group);
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
    const values = selected.map((item) => { const block = item as BlockWithLayout; const start = numberValue(block[axis]); const size = numberValue(block[axis === "x" ? "width" : "height"], axis === "x" ? 720 : 72); return { item, start, size }; });
    const min = Math.min(...values.map((value) => value.start)); const max = Math.max(...values.map((value) => value.start + value.size)); const center = (min + max) / 2;
    onChange((items) => items.map((item) => { const value = values.find((entry) => entry.item.id === item.id); if (!value) return item; const next = mode === "start" ? min : mode === "end" ? max - value.size : center - value.size / 2; return { ...item, [axis]: Math.round(next) }; }), `properties:align-${axis}-${mode}`);
  };
  const distribute = (axis: "x" | "y") => {
    if (selected.length < 3) return;
    const sizeKey = axis === "x" ? "width" : "height"; const ordered = [...selected].sort((a, b) => numberValue((a as BlockWithLayout)[axis]) - numberValue((b as BlockWithLayout)[axis])); const first = ordered[0] as BlockWithLayout; const last = ordered[ordered.length - 1] as BlockWithLayout; const start = numberValue(first[axis]); const end = numberValue(last[axis]); const total = ordered.reduce((sum, item) => sum + numberValue((item as BlockWithLayout)[sizeKey], axis === "x" ? 720 : 72), 0); const gap = (end + numberValue(last[sizeKey], axis === "x" ? 720 : 72) - start - total) / (ordered.length - 1); let cursor = start; const positions = new Map(ordered.map((item) => { const result = [item.id, Math.round(cursor)] as const; cursor += numberValue((item as BlockWithLayout)[sizeKey], axis === "x" ? 720 : 72) + gap; return result; }));
    onChange((items) => items.map((item) => positions.has(item.id) ? { ...item, [axis]: positions.get(item.id) } : item), `properties:distribute-${axis}`);
  };
  if (!selected.length) return <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-5 py-8 text-center"><Move className="mb-3 h-7 w-7 text-muted-foreground" /><p className="text-sm font-medium text-foreground">Nenhum elemento selecionado</p><p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">Selecione um elemento no canvas para editar posição, tamanho, estilo e camadas.</p></div>;
  const field = (key: "x" | "y" | "width" | "height" | "rotation" | "opacity" | "zIndex" | "scale", label: string, options?: { min?: number; max?: number; step?: number }) => <div className="space-y-1"><Label className="text-[11px] text-muted-foreground">{label}</Label><Input type="number" value={numberValue(primary?.[key], key === "opacity" ? 1 : key === "scale" ? 1 : 0)} min={options?.min} max={options?.max} step={options?.step ?? 1} disabled={multiple && key === "scale"} onChange={(event) => applyLayout(key, Number(event.target.value))} className="h-8 text-xs" /></div>;
  const anyLocked = selected.some((item) => (item as BlockWithLayout).locked); const allHidden = selected.every((item) => (item as BlockWithLayout).hidden === true || (item as BlockWithLayout).visibility === false);
  return <div className="space-y-4" aria-label="Painel de propriedades contextual"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-foreground">Propriedades</p><p className="mt-1 text-xs text-muted-foreground">{multiple ? `${selected.length} elementos selecionados` : `Elemento: ${String(primary?.type ?? "")}`}</p></div><div className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">{multiple ? "MÚLTIPLA" : "INDIVIDUAL"}</div></div>{multiple && <p className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs leading-5 text-primary">Os controles compatíveis serão aplicados a todos os elementos selecionados.</p>}{textSelected && <TextTypography selected={selected} onChange={onChange} />}<section className="space-y-3 rounded-xl border bg-muted/15 p-3"><div className="flex items-center gap-2"><Move className="h-4 w-4 text-primary" /><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Transformação</p></div><div className="grid grid-cols-2 gap-2">{field("x", "Posição X")}{field("y", "Posição Y")}{field("width", "Largura", { min: 1 })}{field("height", "Altura", { min: 1 })}{field("rotation", "Rotação")}{field("opacity", "Opacidade", { min: 0, max: 1, step: 0.05 })}</div><label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={keepRatio} onChange={(event) => setKeepRatio(event.target.checked)} className="accent-primary" />Manter proporção</label></section><section className="space-y-3 rounded-xl border bg-muted/15 p-3"><div className="flex items-center gap-2"><AlignHorizontalJustifyCenter className="h-4 w-4 text-primary" /><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Alinhamento</p></div><div className="grid grid-cols-3 gap-1"><Button type="button" size="sm" variant="outline" title="Alinhar à esquerda" onClick={() => align("x", "start")}><AlignLeft className="h-3.5 w-3.5" /></Button><Button type="button" size="sm" variant="outline" title="Centralizar horizontalmente" onClick={() => align("x", "center")}><AlignCenter className="h-3.5 w-3.5" /></Button><Button type="button" size="sm" variant="outline" title="Alinhar à direita" onClick={() => align("x", "end")}><AlignRight className="h-3.5 w-3.5" /></Button></div><div className="grid grid-cols-2 gap-1"><Button type="button" size="sm" variant="outline" disabled={selected.length < 3} onClick={() => distribute("x")}><AlignHorizontalDistributeCenter className="mr-1 h-3.5 w-3.5" />Distribuir X</Button><Button type="button" size="sm" variant="outline" disabled={selected.length < 3} onClick={() => distribute("y")}><AlignVerticalDistributeCenter className="mr-1 h-3.5 w-3.5" />Distribuir Y</Button></div></section><section className="space-y-2 rounded-xl border bg-muted/15 p-3"><div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-primary" /><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Camadas</p></div><div className="grid grid-cols-2 gap-2">{field("zIndex", "Ordem")}{field("scale", "Escala", { min: 0.1, step: 0.1 })}</div><div className="grid grid-cols-2 gap-1"><Button type="button" size="sm" variant="outline" onClick={() => apply({ zIndex: numberValue(primary?.zIndex) + 1 }, "properties:layer-up")}><ArrowUp className="mr-1 h-3.5 w-3.5" />Subir</Button><Button type="button" size="sm" variant="outline" onClick={() => apply({ zIndex: Math.max(0, numberValue(primary?.zIndex) - 1) }, "properties:layer-down")}><ArrowDown className="mr-1 h-3.5 w-3.5" />Descer</Button></div></section><Separator /><div className="grid grid-cols-2 gap-2"><Button type="button" size="sm" variant="outline" onClick={() => apply({ locked: !anyLocked }, "properties:lock")}>{anyLocked ? <Unlock className="mr-1 h-3.5 w-3.5" /> : <Lock className="mr-1 h-3.5 w-3.5" />}{anyLocked ? "Desbloquear" : "Bloquear"}</Button><Button type="button" size="sm" variant="outline" onClick={() => apply({ hidden: !allHidden, visibility: allHidden }, "properties:visibility")}>{allHidden ? <Eye className="mr-1 h-3.5 w-3.5" /> : <EyeOff className="mr-1 h-3.5 w-3.5" />}{allHidden ? "Mostrar" : "Ocultar"}</Button></div><div className="grid grid-cols-2 gap-2"><Button type="button" size="sm" variant="outline" onClick={() => onDuplicate(selectedIds)}><Copy className="mr-1 h-3.5 w-3.5" />Duplicar</Button><Button type="button" size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => onDelete(selectedIds)}><Trash2 className="mr-1 h-3.5 w-3.5" />Excluir</Button></div><Button type="button" size="sm" variant="ghost" className="w-full text-xs" onClick={() => apply({ rotation: 0 }, "properties:reset-rotation")}><RotateCcw className="mr-1 h-3.5 w-3.5" />Redefinir rotação</Button></div>;
}
