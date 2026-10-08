import { useEffect, useMemo, useState } from "react";
import { AlignCenter, AlignHorizontalDistributeCenter, AlignHorizontalJustifyCenter, AlignLeft, AlignRight, AlignVerticalDistributeCenter, ArrowDown, ArrowUp, ChevronDown, Copy, Eye, EyeOff, Layers3, Loader2, Lock, Move, Palette, RotateCcw, Sparkles, Trash2, Type, Unlock, Upload, MoreHorizontal } from "lucide-react";
import type { AssetScope } from "@/lib/assets";
import { ImagePropertiesPanel } from "@/components/image-properties-panel";
import { GalleryPropertiesPanel } from "@/components/gallery-properties-panel";
import { ImageUpload } from "@/components/image-upload";
import type { Block } from "@/lib/templates";
import { FONTS } from "@/lib/blocks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { ANIMATION_PRESETS, DEFAULT_ANIMATION, normalizeAnimation, requestMotionPermission, type AnimationPreset, type AnimationTrigger } from "@/lib/invitation-editor-animation";

type BlockWithLayout = Block & {
  x?: number; y?: number; width?: number; height?: number; rotation?: number;
  opacity?: number; zIndex?: number; scale?: number; locked?: boolean; hidden?: boolean; visibility?: boolean;
};
type PanelProps = { blocks: Block[]; selectedIds: string[]; assets?: AssetScope; onChange: (update: (blocks: Block[]) => Block[], group?: string) => void; onDuplicate: (ids: string[]) => void; onDelete: (ids: string[]) => void };
const numberValue = (value: unknown, fallback = 0) => { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : fallback; };
const friendlyTypeLabel = (type: string) => ({
  text: "Texto", image: "Imagem", gallery: "Galeria", date: "Data", time: "Horário",
  location: "Local", countdown: "Contagem regressiva", rsvp: "RSVP", whatsapp: "WhatsApp",
  button: "Botão", qr_code: "QR Code", divider: "Divisor", shape: "Forma", decoration: "Decoração",
} as Record<string, string>)[type] ?? "Elemento";
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const textDefaults: Record<string, string> = { font: "display", fontSize: "", fontWeight: "normal", fontStyle: "normal", textDecoration: "none", align: "center", color: "", letterSpacing: "", lineHeight: "" };
const appearanceKeys = ["fill", "fillColor", "fillGradient", "borderColor", "borderWidth", "borderStyle", "borderRadius", "radiusTopLeft", "radiusTopRight", "radiusBottomRight", "radiusBottomLeft", "shadow", "shadowColor", "shadowX", "shadowY", "shadowBlur", "shadowSpread", "filterBlur", "filterBrightness"];
const appearancePresets = [
  { id: "clean", label: "Limpo", props: { fill: "none", borderWidth: "0", shadow: "none", borderRadius: "0" } },
  { id: "soft", label: "Suave", props: { fill: "solid", fillColor: "#ffffff", borderWidth: "1", borderStyle: "solid", borderColor: "#e7e1d8", borderRadius: "22", shadow: "soft" } },
  { id: "premium", label: "Premium", props: { fill: "gradient", fillGradient: "linear-gradient(135deg, #ffffff 0%, #f3eee7 55%, #e8dfd3 100%)", borderWidth: "1", borderStyle: "solid", borderColor: "#d8cdbc", borderRadius: "26", shadow: "medium" } },
  { id: "outline", label: "Contorno", props: { fill: "none", borderWidth: "1", borderStyle: "solid", borderColor: "#8f8173", borderRadius: "18", shadow: "none" } },
] as const;

const selectionStylePresets = [
  { id: "editorial", label: "Editorial", caption: "Quente e sofisticado", accent: "#9a7a58", ink: "#342d27", muted: "#6d6258", font: "display" },
  { id: "romantic", label: "Romântico", caption: "Suave e delicado", accent: "#a66f73", ink: "#3d3032", muted: "#6e5d60", font: "display" },
  { id: "natural", label: "Natural", caption: "Leve e orgânico", accent: "#6f8d82", ink: "#354740", muted: "#627069", font: "sans" },
  { id: "midnight", label: "Noturno", caption: "Escuro e elegante", accent: "#d4ba83", ink: "#f5f0e5", muted: "#d4cbbb", font: "display" },
] as const;

function SelectionStylePresets({ selected, onChange }: { selected: Block[]; onChange: PanelProps["onChange"] }) {
  if (selected.length < 2) return null;

  const applyStyle = (style: typeof selectionStylePresets[number]) => onChange(
    (items) => items.map((item) => {
      if (!selected.some((chosen) => chosen.id === item.id) || item.locked) return item;
      const props = { ...item.props };
      const isMidnight = style.id === "midnight";

      if (item.type === "text") {
        props.color = style.ink;
        props.font = style.font;
      } else if (["date", "time", "location", "countdown"].includes(item.type)) {
        props.color = style.ink;
      }

      if (item.type === "divider" || item.type === "decoration") {
        props.color = style.accent;
        props.borderColor = style.accent;
        if (item.type === "decoration" && props.fill && props.fill !== "none") props.fillColor = style.accent;
      }

      if (item.type === "shape") {
        if (props.fill && props.fill !== "none") props.fillColor = style.accent;
        if (Number(props.borderWidth) > 0) props.borderColor = style.accent;
      }

      if (["rsvp", "whatsapp", "button"].includes(item.type)) {
        const outline = props.style === "outline";
        props.borderColor = style.accent;
        props.backgroundColor = outline ? "transparent" : style.accent;
        props.textColor = outline ? style.accent : (isMidnight ? "#17130c" : "#ffffff");
      }

      if (item.type === "qr_code") {
        props.foregroundColor = isMidnight ? "#11141c" : style.ink;
        props.backgroundColor = "#ffffff";
      }

      return { ...item, props };
    }),
    "selection:style",
  );

  return (
    <section className="space-y-3 rounded-xl border border-primary/15 bg-primary/5 p-3" aria-label="Estilos da seleção">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground">Estilo da seleção</p>
          <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">Cria unidade visual sem alterar posição, tamanho ou imagens.</p>
        </div>
        <Palette className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {selectionStylePresets.map((style) => (
          <Button key={style.id} type="button" size="sm" variant="outline" className="h-auto items-start justify-start rounded-lg px-3 py-2 text-left" onClick={() => applyStyle(style)}>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold text-foreground">{style.label}</span>
              <span className="mt-0.5 block text-[9px] leading-4 text-muted-foreground">{style.caption}</span>
            </span>
            <span className="ml-auto mt-0.5 h-3 w-3 shrink-0 rounded-full border border-black/10" style={{ background: style.accent }} aria-hidden="true" />
          </Button>
        ))}
      </div>
    </section>
  );
}

function TextTypography({ selected, onChange }: { selected: Block[]; onChange: PanelProps["onChange"] }) {
  const primary = selected[0]; const props = primary?.props ?? {}; const [drafts, setDrafts] = useState<Record<string, string>>({});
  useEffect(() => { setDrafts({ fontSize: props.fontSize ?? "", letterSpacing: props.letterSpacing ?? "", lineHeight: props.lineHeight ?? "" }); }, [primary?.id, props.fontSize, props.letterSpacing, props.lineHeight]);
  const applyProp = (key: string, value: string, group = `typography:${key}`) => onChange((items) => items.map((item) => selected.some((chosen) => chosen.id === item.id) ? { ...item, props: { ...item.props, [key]: value } } : item), group);
  const commitNumber = (key: "fontSize" | "letterSpacing" | "lineHeight") => { const raw = drafts[key]?.trim() ?? ""; if (!raw) { applyProp(key, ""); return; } const value = Number(raw); if (!Number.isFinite(value)) { setDrafts((current) => ({ ...current, [key]: props[key] ?? "" })); return; } const safe = key === "lineHeight" ? clamp(value, 0.5, 4) : key === "fontSize" ? clamp(value, 1, 240) : clamp(value, -20, 40); const formatted = String(Number(safe.toFixed(2))); setDrafts((current) => ({ ...current, [key]: formatted })); applyProp(key, formatted); };
  const textField = (key: "fontSize" | "letterSpacing" | "lineHeight", label: string, placeholder: string, min: number, max: number, step = 1) => <div className="space-y-1"><Label htmlFor={`typography-${key}`} className="text-[11px] text-muted-foreground">{label}</Label><Input id={`typography-${key}`} type="number" min={min} max={max} step={step} placeholder={placeholder} value={drafts[key] ?? ""} onChange={(event) => setDrafts((current) => ({ ...current, [key]: event.target.value }))} onBlur={() => commitNumber(key)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commitNumber(key); event.currentTarget.blur(); } }} className="h-8 text-xs" /></div>;
  const color = props.color ?? ""; const validColor = !color || /^#[0-9a-f]{6}$/i.test(color);
  const textStyles = [
    { id: "elegant", label: "Elegante", font: "display", fontWeight: "normal", letterSpacing: "0", lineHeight: "1.15" },
    { id: "modern", label: "Moderno", font: "sans", fontWeight: "600", letterSpacing: "0.2", lineHeight: "1.2" },
    { id: "delicate", label: "Delicado", font: "script", fontWeight: "normal", letterSpacing: "0", lineHeight: "1.15" },
    { id: "classic", label: "Clássico", font: "serif", fontWeight: "normal", letterSpacing: "0", lineHeight: "1.2" },
  ] as const;
  const applyTextStyle = (style: typeof textStyles[number]) => onChange(
    (items) => items.map((item) => selected.some((chosen) => chosen.id === item.id)
      ? { ...item, props: { ...item.props, font: style.font, fontWeight: style.fontWeight, letterSpacing: style.letterSpacing, lineHeight: style.lineHeight } }
      : item),
    "typography:style-preset",
  );
  const reset = () => { onChange((items) => items.map((item) => selected.some((chosen) => chosen.id === item.id) ? { ...item, props: Object.fromEntries(Object.entries(item.props).filter(([key]) => !Object.hasOwn(textDefaults, key))) } : item), "typography:reset"); setDrafts({ fontSize: "", letterSpacing: "", lineHeight: "" }); };
  return <section className="space-y-3 rounded-xl border bg-muted/15 p-3" aria-label="Tipografia"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Type className="h-4 w-4 text-primary" /><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipografia</p></div><Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={reset}>Restaurar</Button></div>{selected.length > 1 && <p className="rounded-md border border-primary/20 bg-primary/5 p-2 text-[11px] leading-4 text-primary">As propriedades tipográficas serão aplicadas a todos os textos selecionados.</p>}{selected.length === 1 && <div className="space-y-1"><Label htmlFor="typography-content" className="text-[11px] text-muted-foreground">Conteúdo do texto</Label><textarea id="typography-content" value={props.text ?? ""} onChange={(event) => applyProp("text", event.target.value, "text:edit")} rows={4} className="w-full resize-y rounded-md border border-input bg-background px-2 py-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring" placeholder="Digite o texto do convite..." /></div>}<div className="space-y-2">
  <div><p className="text-[11px] font-semibold text-foreground">Estilo rápido</p><p className="mt-0.5 text-[10px] text-muted-foreground">Uma escolha pronta para combinar fonte e espaçamento.</p></div>
  <div className="grid grid-cols-2 gap-2">
    {textStyles.map((style) => (
      <Button key={style.id} type="button" size="sm" variant={props.font === style.font && props.fontWeight === style.fontWeight ? "default" : "outline"} className="h-9 justify-start rounded-lg px-3 text-[11px]" onClick={() => applyTextStyle(style)}>
        {style.label}
      </Button>
    ))}
  </div>
</div><div className="space-y-1"><Label htmlFor="typography-font" className="text-[11px] text-muted-foreground">Fonte</Label><select id="typography-font" value={props.font || "display"} onChange={(event) => applyProp("font", event.target.value)} className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring">{FONTS.map((font) => <option key={font.value} value={font.value}>{font.label}</option>)}</select></div><div className="grid grid-cols-2 gap-2">{textField("fontSize", "Tamanho (px)", "Automático", 1, 240)}<div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Peso</Label><select value={props.fontWeight || "normal"} onChange={(event) => applyProp("fontWeight", event.target.value)} className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"><option value="normal">Normal</option><option value="500">Médio</option><option value="600">Semibold</option><option value="bold">Negrito</option></select></div></div><div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Estilo</Label><select value={props.fontStyle || "normal"} onChange={(event) => applyProp("fontStyle", event.target.value)} className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"><option value="normal">Normal</option><option value="italic">Itálico</option></select></div><div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Decoração</Label><select value={props.textDecoration || "none"} onChange={(event) => applyProp("textDecoration", event.target.value)} className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"><option value="none">Nenhuma</option><option value="underline">Sublinhado</option><option value="line-through">Riscado</option></select></div></div><div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Alinhamento</Label><select value={props.align || "center"} onChange={(event) => applyProp("align", event.target.value)} className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"><option value="left">Esquerda</option><option value="center">Centro</option><option value="right">Direita</option></select></div><div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Cor HEX</Label><div className="flex gap-2"><Input type="text" maxLength={7} placeholder="#000000" value={color} onChange={(event) => applyProp("color", event.target.value)} className={`h-8 text-xs ${!validColor ? "border-destructive" : ""}`} /><input type="color" aria-label="Selecionar cor do texto" value={validColor && color ? color : "#000000"} onChange={(event) => applyProp("color", event.target.value)} className="h-8 w-10 cursor-pointer rounded border bg-transparent p-1" /></div>{!validColor && <p className="text-[10px] text-destructive">Use uma cor no formato #RRGGBB.</p>}</div><div className="grid grid-cols-2 gap-2">{textField("letterSpacing", "Letras (px)", "Padrão", -20, 40, 0.1)}{textField("lineHeight", "Linhas", "Padrão", 0.5, 4, 0.1)}</div></section>;
}

function AnimationProperties({ selected, onChange }: { selected: Block[]; onChange: PanelProps["onChange"] }) {
  const primary = selected[0];
  const animation = normalizeAnimation(primary?.animation);
  const update = (patch: Record<string, unknown>) => onChange((items) => items.map((item) => selected.some((chosen) => chosen.id === item.id) ? { ...item, animation: { ...normalizeAnimation(item.animation), ...patch } } : item), "animation:update");
  const reset = () => onChange((items) => items.map((item) => selected.some((chosen) => chosen.id === item.id) ? { ...item, animation: undefined } : item), "animation:reset");
  return <section className="space-y-3 rounded-xl border bg-muted/15 p-3" aria-label="Animação">
    <div className="flex items-center justify-between gap-2"><div><p className="text-xs font-semibold uppercase tracking-wide text-foreground">Animação</p><p className="mt-0.5 text-[11px] text-muted-foreground">Movimento seguro para o editor e a página pública.</p></div><Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={reset}>Restaurar</Button></div>
    <div className="flex items-center justify-between rounded-lg border bg-background/40 px-2.5 py-2"><Label htmlFor="animation-enabled" className="text-xs">Ativar animação</Label><Switch id="animation-enabled" checked={animation.enabled} onCheckedChange={(checked) => update({ enabled: checked })} /></div>
    <div className="flex items-center justify-between rounded-lg border border-primary/10 bg-primary/5 px-2.5 py-2">
      <div className="min-w-0 pr-3"><Label htmlFor="animation-sensor" className="text-xs">Reagir ao movimento do celular</Label><p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">Cria um efeito sutil quando o convidado movimenta o aparelho.</p></div>
      <Switch id="animation-sensor" checked={animation.sensor} onCheckedChange={async (checked) => {
        if (!checked) { update({ sensor: false }); return; }
        const granted = await requestMotionPermission();
        if (granted) update({ sensor: true, parallax: animation.parallax || 10, depth: animation.depth || 2 });
      }} />
    </div>
    <div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Efeito</Label><select value={animation.preset} onChange={(event) => update({ preset: event.target.value as AnimationPreset })} className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground">{ANIMATION_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}</select></div><div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Quando acontece</Label><select value={animation.trigger} onChange={(event) => update({ trigger: event.target.value as AnimationTrigger })} className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"><option value="on_load">Ao abrir</option><option value="on_scroll">Ao rolar</option><option value="on_hover">Ao passar o mouse</option><option value="on_click">Ao clicar</option></select></div></div>
    <details className="group rounded-lg border border-primary/10 bg-background/35">
      <summary className="flex cursor-pointer list-none items-center justify-between p-2.5 text-[11px] font-semibold text-foreground [&::-webkit-details-marker]:hidden">
        Ajuste fino
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-2 border-t border-border/60 p-2">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Velocidade</Label><Input type="number" min={100} max={4000} value={animation.duration} onChange={(event) => update({ duration: Math.min(4000, Math.max(100, Number(event.target.value) || DEFAULT_ANIMATION.duration)) })} className="h-8 text-xs" /></div>
          <div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Atraso</Label><Input type="number" min={0} max={3000} value={animation.delay} onChange={(event) => update({ delay: Math.min(3000, Math.max(0, Number(event.target.value) || 0)) })} className="h-8 text-xs" /></div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Sequência</Label><Input type="number" min={0} max={1000} value={animation.stagger} onChange={(event) => update({ stagger: Math.min(1000, Math.max(0, Number(event.target.value) || 0)) })} className="h-8 text-xs" /></div>
          <div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Movimento de profundidade</Label><Input type="number" min={-32} max={32} value={animation.parallax} onChange={(event) => update({ parallax: Math.min(32, Math.max(-32, Number(event.target.value) || 0)) })} className="h-8 text-xs" /></div>
        </div>
      </div>
    </details>
  </section>;
}

function Appearance({ selected, primary, onChange, apply }: { selected: Block[]; primary?: BlockWithLayout; onChange: PanelProps["onChange"]; apply: (patch: Partial<BlockWithLayout>, group?: string) => void }) {
  const props = primary?.props ?? {}; const fill = props.fill || "none"; const color = props.fillColor || ""; const borderColor = props.borderColor || ""; const validColor = !color || /^#[0-9a-f]{6}$/i.test(color); const validBorderColor = !borderColor || /^#[0-9a-f]{6}$/i.test(borderColor); const independent = props.radiusIndependent === "1"; const shadow = props.shadow || "none";
  const updateProp = (key: string, value: string) => onChange((items) => items.map((item) => selected.some((chosen) => chosen.id === item.id) ? { ...item, props: { ...item.props, [key]: value } } : item), `appearance:${key}`);
  const radiusField = (key: string, label: string) => <div className="space-y-1"><Label className="text-[11px] text-muted-foreground">{label}</Label><Input type="number" min={0} max={160} value={numberValue(props[key], numberValue(props.borderRadius, 0))} onChange={(event) => updateProp(key, String(clamp(Number(event.target.value), 0, 160)))} className="h-8 text-xs" /></div>;
  const reset = () => onChange((items) => items.map((item) => { if (!selected.some((chosen) => chosen.id === item.id)) return item; const next = { ...item, props: Object.fromEntries(Object.entries(item.props).filter(([key]) => !appearanceKeys.includes(key))) } as BlockWithLayout; delete next.opacity; return next; }), "appearance:reset");
  const applyPreset = (preset: typeof appearancePresets[number]) => updatePropBatch(preset.props as Record<string, string>, `appearance:preset:${preset.id}`);
  const updatePropBatch = (patch: Record<string, string>, group: string) => onChange((items) => items.map((item) => selected.some((chosen) => chosen.id === item.id) ? { ...item, props: { ...item.props, ...patch } } : item), group);
  return <section className="space-y-3 rounded-xl border bg-muted/15 p-3" aria-label="Aparência"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Palette className="h-4 w-4 text-primary" /><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Aparência</p></div><Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={reset}>Restaurar</Button></div>
  <div className="space-y-1.5">
    <p className="text-[11px] font-semibold text-foreground">Acabamento rápido</p>
    <div className="grid grid-cols-2 gap-2">
      {appearancePresets.map((preset) => (
        <Button key={preset.id} type="button" size="sm" variant="outline" className="h-9 justify-start rounded-lg px-3 text-[11px]" onClick={() => applyPreset(preset)}>
          <span className={cn("mr-2 h-3.5 w-3.5 rounded-sm border", preset.id === "clean" && "bg-background", preset.id === "soft" && "bg-white shadow-sm", preset.id === "premium" && "bg-gradient-to-br from-white to-stone-300", preset.id === "outline" && "bg-transparent")} />
          {preset.label}
        </Button>
      ))}
    </div>
  </div>{selected.length > 1 && <p className="rounded-md border border-primary/20 bg-primary/5 p-2 text-[11px] leading-4 text-primary">A aparência será aplicada a todos os elementos selecionados.</p>}<div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Preenchimento</Label><select value={fill} onChange={(event) => updateProp("fill", event.target.value)} className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"><option value="none">Nenhum</option><option value="solid">Sólido</option><option value="gradient">Gradiente</option></select></div><div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Opacidade</Label><div className="flex h-8 items-center gap-2"><input type="range" min="0" max="100" step="1" value={Math.round(numberValue(primary?.opacity, 1) * 100)} onChange={(event) => apply({ opacity: clamp(Number(event.target.value) / 100, 0, 1) }, "appearance:opacity")} className="min-w-0 flex-1 accent-primary" aria-label="Opacidade do elemento" /><span className="w-10 text-right text-xs tabular-nums text-foreground">{Math.round(numberValue(primary?.opacity, 1) * 100)}%</span></div></div></div>{fill === "solid" && <div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Cor HEX</Label><div className="flex gap-2"><Input maxLength={7} placeholder="#FFFFFF" value={color} onChange={(event) => updateProp("fillColor", event.target.value)} className={`h-8 text-xs ${!validColor ? "border-destructive" : ""}`} /><input type="color" aria-label="Selecionar cor do preenchimento" value={validColor && color ? color : "#ffffff"} onChange={(event) => updateProp("fillColor", event.target.value)} className="h-8 w-10 cursor-pointer rounded border bg-transparent p-1" /></div></div>}{fill === "gradient" && <div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Gradiente CSS</Label><Input placeholder="linear-gradient(135deg, #fff, #eadcff)" value={props.fillGradient || ""} onChange={(event) => updateProp("fillGradient", event.target.value)} className="h-8 text-xs" /></div>}<details className="group rounded-lg border border-primary/10 bg-background/35">
<summary className="flex cursor-pointer list-none items-center justify-between p-2.5 text-[11px] font-semibold text-foreground [&::-webkit-details-marker]:hidden">Mais opções de estilo<ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
<div className="space-y-2 border-t border-border/60 p-2">
<div className="space-y-2 rounded-lg border bg-background/40 p-2"><p className="text-[11px] font-semibold text-foreground">Borda</p><div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Estilo</Label><select value={numberValue(props.borderWidth, 0) > 0 ? props.borderStyle || "solid" : "none"} onChange={(event) => { updateProp("borderStyle", event.target.value); if (event.target.value === "none") updateProp("borderWidth", "0"); else if (!numberValue(props.borderWidth)) updateProp("borderWidth", "1"); }} className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"><option value="none">Nenhuma</option><option value="solid">Contínua</option><option value="dashed">Tracejada</option><option value="dotted">Pontilhada</option><option value="double">Dupla</option></select></div><div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Espessura</Label><Input type="number" min={0} max={20} value={numberValue(props.borderWidth, 0)} onChange={(event) => updateProp("borderWidth", String(clamp(Number(event.target.value), 0, 20)))} className="h-8 text-xs" /></div></div>{numberValue(props.borderWidth, 0) > 0 && <div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Cor HEX</Label><div className="flex gap-2"><Input maxLength={7} placeholder="#000000" value={borderColor} onChange={(event) => updateProp("borderColor", event.target.value)} className={`h-8 text-xs ${!validBorderColor ? "border-destructive" : ""}`} /><input type="color" aria-label="Selecionar cor da borda" value={validBorderColor && borderColor ? borderColor : "#000000"} onChange={(event) => updateProp("borderColor", event.target.value)} className="h-8 w-10 cursor-pointer rounded border bg-transparent p-1" /></div></div>}</div><div className="space-y-2 rounded-lg border bg-background/40 p-2"><div className="flex items-center justify-between"><p className="text-[11px] font-semibold text-foreground">Raio dos cantos</p><label className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><input type="checkbox" checked={independent} onChange={(event) => updateProp("radiusIndependent", event.target.checked ? "1" : "0")} className="accent-primary" />Independentes</label></div>{independent ? <div className="grid grid-cols-2 gap-2">{radiusField("radiusTopLeft", "Superior esquerdo")}{radiusField("radiusTopRight", "Superior direito")}{radiusField("radiusBottomRight", "Inferior direito")}{radiusField("radiusBottomLeft", "Inferior esquerdo")}</div> : radiusField("borderRadius", "Todos os cantos")}</div><div className="space-y-2 rounded-lg border bg-background/40 p-2"><p className="text-[11px] font-semibold text-foreground">Sombra</p><select value={shadow} onChange={(event) => updateProp("shadow", event.target.value)} className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground"><option value="none">Nenhuma</option><option value="soft">Suave</option><option value="medium">Média</option><option value="strong">Intensa</option><option value="custom">Personalizada</option></select>{shadow === "custom" && <div className="grid grid-cols-2 gap-2">{([["shadowX", "Deslocamento X"], ["shadowY", "Deslocamento Y"], ["shadowBlur", "Desfoque"], ["shadowSpread", "Expansão"]] as const).map(([key, label]) => <div key={key} className="space-y-1"><Label className="text-[11px] text-muted-foreground">{label}</Label><Input type="number" min={-50} max={100} value={numberValue(props[key], 0)} onChange={(event) => updateProp(key, String(clamp(Number(event.target.value), -50, 100)))} className="h-8 text-xs" /></div>)}</div>}{shadow !== "none" && <div className="flex items-center gap-2"><Input maxLength={7} placeholder="#000000" value={props.shadowColor || "#000000"} onChange={(event) => updateProp("shadowColor", event.target.value)} className="h-8 text-xs" /><input type="color" aria-label="Selecionar cor da sombra" value={/^#[0-9a-f]{6}$/i.test(props.shadowColor || "") ? props.shadowColor : "#000000"} onChange={(event) => updateProp("shadowColor", event.target.value)} className="h-8 w-10 cursor-pointer rounded border bg-transparent p-1" /></div>}</div><div className="space-y-2 rounded-lg border bg-background/40 p-2"><p className="text-[11px] font-semibold text-foreground">Efeitos compatíveis</p><div className="grid grid-cols-2 gap-2"><div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Desfoque (px)</Label><Input type="number" min={0} max={20} value={numberValue(props.filterBlur, 0)} onChange={(event) => updateProp("filterBlur", String(clamp(Number(event.target.value), 0, 20)))} className="h-8 text-xs" /></div><div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Brilho (%)</Label><Input type="number" min={0} max={200} value={numberValue(props.filterBrightness, 100)} onChange={(event) => updateProp("filterBrightness", String(clamp(Number(event.target.value), 0, 200)))} className="h-8 text-xs" /></div></div></div></div></details></section>;
}
type BackgroundPanelProps = {
  background?: Record<string, unknown>;
  assets?: AssetScope;
  onChange: (background: Record<string, unknown>) => void;
};

const backgroundPresets = [
  { id: "clean", label: "Limpo", color: "#ffffff", gradient: "" },
  { id: "lavender", label: "Lavanda", color: "#f7f3ff", gradient: "linear-gradient(135deg, #ffffff 0%, #eadcff 100%)" },
  { id: "sunset", label: "Pôr do sol", color: "#fff7ed", gradient: "linear-gradient(135deg, #fff7ed 0%, #fed7aa 52%, #fbcfe8 100%)" },
  { id: "night", label: "Noite", color: "#111827", gradient: "linear-gradient(135deg, #111827 0%, #312e81 100%)" },
];

function BackgroundSelect({ label, value, options, onChange }: { label: string; value: string; options: [string, string][]; onChange: (value: string) => void }) {
  return <div className="space-y-1"><Label className="text-[11px] text-muted-foreground">{label}</Label><select value={value} onChange={(event) => onChange(event.target.value)} className="flex h-8 w-full rounded-md border border-input bg-background px-2 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring">{options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}</select></div>;
}

export function BackgroundPropertiesPanel({ background = {}, assets, onChange }: BackgroundPanelProps) {
  const bg = background;
  const update = (patch: Record<string, unknown>) => onChange({ ...bg, ...patch });
  const image = typeof bg.image === "string" ? bg.image : "";
  const color = typeof bg.color === "string" && /^#[0-9a-f]{6}$/i.test(bg.color) ? bg.color : "#ffffff";
  const overlay = Math.max(0, Math.min(80, Number(bg.overlay) || 0));
  const overlayColor = typeof bg.overlayColor === "string" && /^#[0-9a-f]{6}$/i.test(bg.overlayColor) ? bg.overlayColor : "#000000";
  const scale = Math.max(25, Math.min(300, Number(bg.imageScale) || 100));
  const opacity = Math.max(0, Math.min(1, Number(bg.imageOpacity ?? 1)));
  const offsetX = Math.max(-300, Math.min(300, Number(bg.imageOffsetX) || 0));
  const offsetY = Math.max(-300, Math.min(300, Number(bg.imageOffsetY) || 0));
  const size = bg.size === "contain" ? "contain" : "cover";
  const preset = (value: typeof backgroundPresets[number]) => update({ color: value.color, gradient: value.gradient });

  return <section className="space-y-3 rounded-xl border bg-muted/15 p-3" aria-label="Fundo do convite">
    <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-semibold text-foreground">Fundo</p><p className="mt-0.5 text-[11px] text-muted-foreground">Ajuste o plano de fundo sem selecionar elementos.</p></div><Palette className="h-4 w-4 text-primary" /></div>
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">{backgroundPresets.map((item) => <Button key={item.id} type="button" size="sm" variant="outline" className="h-8 px-2 text-[11px]" onClick={() => preset(item)}>{item.label}</Button>)}</div>
    <div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Cor</Label><input type="color" value={color} onChange={(event) => update({ color: event.target.value })} className="h-9 w-full cursor-pointer rounded-lg border bg-background p-1.5" aria-label="Escolher cor do fundo" /></div>
    <details className="group rounded-lg border border-primary/10 bg-background/35">
      <summary className="flex cursor-pointer list-none items-center justify-between p-2.5 text-[11px] font-semibold text-foreground [&::-webkit-details-marker]:hidden">Personalizar<ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
      <div className="space-y-3 border-t border-border/60 p-2">
        <div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Código da cor</Label><Input value={typeof bg.color === "string" ? bg.color : ""} maxLength={7} placeholder="#FFFFFF" onChange={(event) => update({ color: event.target.value })} className="h-8 text-xs" /></div>
        <div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Gradiente personalizado</Label><Input value={typeof bg.gradient === "string" ? bg.gradient : ""} placeholder="Ex.: degradê suave" onChange={(event) => update({ gradient: event.target.value })} className="h-8 text-xs" /></div>
      </div>
    </details>
    <div className="space-y-2 rounded-lg border bg-background/40 p-2">
      <p className="text-[11px] font-semibold text-foreground">Imagem e enquadramento</p>
      <ImageUpload
        scope={assets}
        value={image}
        onChange={(value) => update({ image: value })}
      />
      <Input type="url" value={image.startsWith("storage:") ? "" : image} placeholder="Ou cole uma URL https://..." onChange={(event) => update({ image: event.target.value })} className="h-8 text-xs" />
      {image && <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-[11px]" onClick={() => update({ image: "" })}>Remover imagem</Button>}
      <div className="grid grid-cols-2 gap-2">
        <BackgroundSelect label="Preenchimento" value={size} options={[["cover", "Preencher tela"], ["contain", "Mostrar inteira"]]} onChange={(value) => update({ size: value })} />
        <BackgroundSelect label="Posição horizontal" value={String(bg.x || "center")} options={[["left", "Esquerda"], ["center", "Centro"], ["right", "Direita"]]} onChange={(value) => update({ x: value })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <BackgroundSelect label="Posição vertical" value={String(bg.y || "center")} options={[["top", "Topo"], ["center", "Centro"], ["bottom", "Base"]]} onChange={(value) => update({ y: value })} />
        <div className="flex items-end"><Button type="button" size="sm" variant="outline" className="h-8 w-full text-[11px]" onClick={() => update({ x: "center", y: "center", imageOffsetX: 0, imageOffsetY: 0 })}>Centralizar</Button></div>
      </div>
      <label className="block space-y-1 text-[11px] text-muted-foreground">Zoom: {scale}%<input type="range" min="25" max="300" step="5" value={scale} onChange={(event) => update({ imageScale: Number(event.target.value) })} className="w-full accent-primary" /></label>
      <div className="space-y-2 rounded-lg border border-primary/10 bg-background/35 p-2">
        <p className="text-[11px] font-semibold text-foreground">Ajuste fino da posição</p>
        <label className="block space-y-1 text-[11px] text-muted-foreground">Horizontal: {offsetX}px<input type="range" min="-300" max="300" step="1" value={offsetX} onChange={(event) => update({ imageOffsetX: Number(event.target.value) })} className="w-full accent-primary" aria-label="Deslocamento horizontal do fundo" /></label>
        <label className="block space-y-1 text-[11px] text-muted-foreground">Vertical: {offsetY}px<input type="range" min="-300" max="300" step="1" value={offsetY} onChange={(event) => update({ imageOffsetY: Number(event.target.value) })} className="w-full accent-primary" aria-label="Deslocamento vertical do fundo" /></label>
      </div>
      <label className="block space-y-1 text-[11px] text-muted-foreground">Opacidade: {Math.round(opacity * 100)}%<input type="range" min="0" max="1" step="0.05" value={opacity} onChange={(event) => update({ imageOpacity: Number(event.target.value) })} className="w-full accent-primary" /></label>
    </div>
    <div className="space-y-2 rounded-lg border bg-background/40 p-2"><BackgroundSelect label="Sobreposição" value={overlay > 0 ? "on" : "off"} options={[["off", "Nenhuma"], ["on", "Ativada"]]} onChange={(value) => update({ overlay: value === "on" ? Math.max(overlay, 20) : 0 })} />{overlay > 0 && <><label className="block space-y-1 text-[11px] text-muted-foreground">Intensidade: {overlay}%<input type="range" min="1" max="80" value={overlay} onChange={(event) => update({ overlay: Number(event.target.value) })} className="w-full accent-primary" /></label><div className="space-y-1"><Label className="text-[11px] text-muted-foreground">Cor da sobreposição</Label><div className="flex gap-1.5"><input type="color" aria-label="Selecionar cor da sobreposição" value={overlayColor} onChange={(event) => update({ overlayColor: event.target.value })} className="h-8 w-10 cursor-pointer rounded border bg-transparent p-1" /><Input value={typeof bg.overlayColor === "string" ? bg.overlayColor : ""} maxLength={7} placeholder="#000000" onChange={(event) => update({ overlayColor: event.target.value })} className="h-8 text-xs" /></div></div></>}</div>
    <Button type="button" size="sm" variant="ghost" className="w-full text-xs" onClick={() => onChange({})}>Restaurar fundo</Button>
  </section>;
}
export function ContextualPropertiesPanel({ blocks, selectedIds, assets, onChange, onDuplicate, onDelete }: PanelProps) {
  const [keepRatio, setKeepRatio] = useState(true); const selected = useMemo(() => blocks.filter((block) => selectedIds.includes(block.id)), [blocks, selectedIds]); const primary = selected[0] as BlockWithLayout | undefined; const multiple = selected.length > 1; const textSelected = selected.length > 0 && selected.every((block) => block.type === "text"); const [copiedStyle, setCopiedStyle] = useState<Record<string, string> | null>(null);
  const [layoutDrafts, setLayoutDrafts] = useState<Record<string, string>>({});
  useEffect(() => {
    if (!primary) { setLayoutDrafts({}); return; }
    setLayoutDrafts({
      x: String(numberValue(primary.x)),
      y: String(numberValue(primary.y)),
      width: String(numberValue(primary.width, 720)),
      height: String(numberValue(primary.height, 72)),
      rotation: String(numberValue(primary.rotation)),
      zIndex: String(numberValue(primary.zIndex)),
      scale: String(numberValue(primary.scale, 1)),
    });
  }, [primary?.id, primary?.x, primary?.y, primary?.width, primary?.height, primary?.rotation, primary?.zIndex, primary?.scale]);
  const apply = (patch: Partial<BlockWithLayout>, group = "properties:update") => onChange((items) => items.map((item) => {
    if (!selectedIds.includes(item.id)) return item;
    // A locked element may still be unlocked, but no other property can be changed while locked.
    if (item.locked && !Object.prototype.hasOwnProperty.call(patch, "locked")) return item;
    return { ...item, ...patch };
  }), group);
  const onChangeUnlocked = (update: (blocks: Block[]) => Block[], group?: string) => onChange((items) => {
    const next = update(items);
    return next.map((item, index) => {
      const original = items[index];
      return original?.locked ? original : item;
    });
  }, group);
  const applyTypography = (patch: Record<string, string>, group: string) => onChangeUnlocked((items) => items.map((item) => selectedIds.includes(item.id) && item.type === "text" ? { ...item, props: { ...item.props, ...patch } } : item), group);
  const copyTypography = () => { if (primary?.type !== "text") return; setCopiedStyle(Object.fromEntries(Object.entries(primary.props ?? {}).filter(([key]) => ["font", "fontSize", "fontWeight", "fontStyle", "textDecoration", "align", "color", "letterSpacing", "lineHeight"].includes(key)))); };
  const pasteTypography = () => { if (copiedStyle && textSelected) applyTypography(copiedStyle, "typography:paste-style"); };
  const applyLayout = (key: "x" | "y" | "width" | "height" | "rotation" | "opacity" | "zIndex" | "scale", value: number) => { if (!Number.isFinite(value)) return; if (key === "opacity") value = clamp(value, 0, 1); if (key === "width" || key === "height") value = Math.max(1, value); if (key === "scale") value = Math.max(0.1, value); const patch: Partial<BlockWithLayout> = { [key]: value }; if (keepRatio && selected.length === 1 && (key === "width" || key === "height")) { const width = Math.max(1, numberValue(primary?.width, 720)); const height = Math.max(1, numberValue(primary?.height, 72)); const ratio = width / height; if (key === "width") patch.height = Math.max(1, Math.round(value / ratio)); else patch.width = Math.max(1, Math.round(value * ratio)); } apply(patch, `properties:${key}`); };
  const align = (axis: "x" | "y", mode: "start" | "center" | "end") => { const values = selected.filter((item) => !(item as BlockWithLayout).locked).map((item) => { const block = item as BlockWithLayout; const start = numberValue(block[axis]); const size = numberValue(block[axis === "x" ? "width" : "height"], axis === "x" ? 720 : 72); return { item, start, size }; }); const min = Math.min(...values.map((value) => value.start)); const max = Math.max(...values.map((value) => value.start + value.size)); const center = (min + max) / 2; onChange((items) => items.map((item) => { const value = values.find((entry) => entry.item.id === item.id); if (!value) return item; const next = mode === "start" ? min : mode === "end" ? max - value.size : center - value.size / 2; return { ...item, [axis]: Math.round(next) }; }), `properties:align-${axis}-${mode}`); };
  const distribute = (axis: "x" | "y") => { const unlocked = selected.filter((item) => !(item as BlockWithLayout).locked); if (unlocked.length < 3) return; const sizeKey = axis === "x" ? "width" : "height"; const ordered = [...unlocked].sort((a, b) => numberValue((a as BlockWithLayout)[axis]) - numberValue((b as BlockWithLayout)[axis])); const first = ordered[0] as BlockWithLayout; const last = ordered[ordered.length - 1] as BlockWithLayout; const start = numberValue(first[axis]); const end = numberValue(last[axis]); const total = ordered.reduce((sum, item) => sum + numberValue((item as BlockWithLayout)[sizeKey], axis === "x" ? 720 : 72), 0); const gap = (end + numberValue(last[sizeKey], axis === "x" ? 720 : 72) - start - total) / (ordered.length - 1); let cursor = start; const positions = new Map(ordered.map((item) => { const result = [item.id, Math.round(cursor)] as const; cursor += numberValue((item as BlockWithLayout)[sizeKey], axis === "x" ? 720 : 72) + gap; return result; })); onChange((items) => items.map((item) => positions.has(item.id) ? { ...item, [axis]: positions.get(item.id) } : item), `properties:distribute-${axis}`); };
  if (!selected.length) return <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-5 py-8 text-center"><Move className="mb-3 h-7 w-7 text-muted-foreground" /><p className="text-sm font-medium text-foreground">Nenhum elemento selecionado</p><p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">Toque em um elemento para editar seu conteúdo, estilo e posição.</p></div>;
  const field = (key: "x" | "y" | "width" | "height" | "rotation" | "opacity" | "zIndex" | "scale", label: string, options?: { min?: number; max?: number; step?: number }) => {
    const fallback = key === "opacity" ? 1 : key === "scale" ? 1 : 0;
    const value = layoutDrafts[key] ?? String(numberValue(primary?.[key], fallback));
    const commit = () => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed)) {
        setLayoutDrafts((current) => ({ ...current, [key]: String(numberValue(primary?.[key], fallback)) }));
        return;
      }
      applyLayout(key, parsed);
      setLayoutDrafts((current) => ({ ...current, [key]: String(parsed) }));
    };
    return <div className="space-y-1"><Label htmlFor={`layout-${key}`} className="text-[11px] text-muted-foreground">{label}</Label><Input id={`layout-${key}`} type="number" value={value} min={options?.min} max={options?.max} step={options?.step ?? 1} disabled={multiple && key === "scale"} onChange={(event) => setLayoutDrafts((current) => ({ ...current, [key]: event.target.value }))} onBlur={commit} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); commit(); event.currentTarget.blur(); } }} className="h-8 text-xs" /></div>;
  };
  const anyLocked = selected.some((item) => (item as BlockWithLayout).locked); const allHidden = selected.every((item) => (item as BlockWithLayout).hidden === true || (item as BlockWithLayout).visibility === false);
  const grouped = selected.length > 1;
  const hasGroups = selected.some((item) => Boolean((item as BlockWithLayout).groupId));
  const groupSelected = () => {
    const unlocked = selected.filter((item) => !(item as BlockWithLayout).locked);
    if (unlocked.length < 2) return;
    const groupId = unlocked.find((item) => (item as BlockWithLayout).groupId)?.groupId || `group-${crypto.randomUUID()}`;
    const unlockedIds = new Set(unlocked.map((item) => item.id));
    onChangeUnlocked((items) => items.map((item) => unlockedIds.has(item.id) ? { ...item, groupId } : item), "properties:group");
  };
  const ungroupSelected = () => {
    if (!hasGroups) return;
    onChangeUnlocked((items) => items.map((item) => selectedIds.includes(item.id) ? { ...item, groupId: undefined } : item), "properties:ungroup");
  };
  return <div className="space-y-4" aria-label="Painel de propriedades contextual"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold text-foreground">Editar elemento</p><p className="mt-1 text-xs text-muted-foreground">{multiple ? `${selected.length} elementos selecionados` : `Edite o ${friendlyTypeLabel(String(primary?.type ?? "")).toLowerCase()} selecionado.`}</p></div><div className="rounded-md bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">{multiple ? "VÁRIOS" : "ELEMENTO"}</div></div>{multiple && <p className="rounded-lg border border-primary/20 bg-primary/5 p-2.5 text-xs leading-5 text-primary">Os controles compatíveis serão aplicados a todos os elementos selecionados.</p>}{textSelected && <TextTypography selected={selected} onChange={onChangeUnlocked} />}<details className="group rounded-xl border border-primary/10 bg-muted/10" open={false}>
  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
    <span className="inline-flex items-center gap-2"><Palette className="h-4 w-4 text-primary" />Aparência</span>
    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
  </summary>
  <div className="border-t border-border/60 p-3">
    <Appearance selected={selected} primary={primary} onChange={onChangeUnlocked} apply={apply} />
  </div>
</details><details className="group rounded-xl border border-primary/10 bg-muted/10" open={false}><summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden"><span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" />Animação</span><ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" /></summary><div className="border-t border-border/60 p-3"><AnimationProperties selected={selected} onChange={onChangeUnlocked} /></div></details><GalleryPropertiesPanel selected={selected} assets={assets} onChange={onChangeUnlocked} /><ImagePropertiesPanel selected={selected} assets={assets} onChange={onChangeUnlocked} /><details className="group rounded-xl border border-primary/10 bg-muted/10">
  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
    <span>Posição e organização</span>
    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
  </summary>
  <div className="space-y-3 border-t border-border/60 p-3">
  <section className="space-y-3 rounded-xl border bg-muted/15 p-3"><div className="flex items-center gap-2"><Move className="h-4 w-4 text-primary" /><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Posição e tamanho</p></div><div className="grid grid-cols-2 gap-2">{field("x", "Posição X")}{field("y", "Posição Y")}{field("width", "Largura", { min: 1 })}{field("height", "Altura", { min: 1 })}{field("rotation", "Rotação")}</div><label className="flex items-center gap-2 text-xs text-muted-foreground"><input type="checkbox" checked={keepRatio} onChange={(event) => setKeepRatio(event.target.checked)} className="accent-primary" />Manter proporção</label></section><section className="space-y-3 rounded-xl border bg-muted/15 p-3"><div className="flex items-center gap-2"><AlignHorizontalJustifyCenter className="h-4 w-4 text-primary" /><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Alinhamento</p></div><div className="grid grid-cols-3 gap-1"><Button type="button" size="sm" variant="outline" onClick={() => align("x", "start")}><AlignLeft className="h-3.5 w-3.5" /></Button><Button type="button" size="sm" variant="outline" onClick={() => align("x", "center")}><AlignCenter className="h-3.5 w-3.5" /></Button><Button type="button" size="sm" variant="outline" onClick={() => align("x", "end")}><AlignRight className="h-3.5 w-3.5" /></Button></div><div className="grid grid-cols-2 gap-1"><Button type="button" size="sm" variant="outline" disabled={selected.length < 3} onClick={() => distribute("x")}><AlignHorizontalDistributeCenter className="mr-1 h-3.5 w-3.5" />Distribuir X</Button><Button type="button" size="sm" variant="outline" disabled={selected.length < 3} onClick={() => distribute("y")}><AlignVerticalDistributeCenter className="mr-1 h-3.5 w-3.5" />Distribuir Y</Button></div></section><section className="space-y-2 rounded-xl border bg-muted/15 p-3"><div className="flex items-center gap-2"><Layers3 className="h-4 w-4 text-primary" /><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Organizar</p></div><div className="grid grid-cols-2 gap-2">{field("zIndex", "Ordem")}{field("scale", "Escala", { min: 0.1, step: 0.1 })}</div><div className="grid grid-cols-2 gap-1"><Button type="button" size="sm" variant="outline" onClick={() => apply({ zIndex: numberValue(primary?.zIndex) + 1 }, "properties:layer-up")}><ArrowUp className="mr-1 h-3.5 w-3.5" />Subir</Button><Button type="button" size="sm" variant="outline" onClick={() => apply({ zIndex: Math.max(0, numberValue(primary?.zIndex) - 1) }, "properties:layer-down")}><ArrowDown className="mr-1 h-3.5 w-3.5" />Descer</Button></div></section>
  </div>
</details>
<details className="group rounded-xl border border-primary/10 bg-muted/10" open={false}>
  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
    <span className="inline-flex items-center gap-2"><Palette className="h-4 w-4 text-primary" />Estilo da seleção</span>
    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
  </summary>
  <div className="border-t border-border/60 p-3">
    <SelectionStylePresets selected={selected} onChange={onChangeUnlocked} />
  </div>
</details>
<Separator />
<details className="group rounded-xl border border-primary/10 bg-muted/10" open={false}>
  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 p-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
    <span className="inline-flex items-center gap-2"><MoreHorizontal className="h-4 w-4 text-primary" />Mais ações</span>
    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
  </summary>
  <div className="space-y-2 border-t border-border/60 p-3">
    <div className="grid grid-cols-2 gap-2"><Button type="button" size="sm" variant="outline" onClick={() => apply({ locked: !anyLocked }, "properties:lock")}>{anyLocked ? <Unlock className="mr-1 h-3.5 w-3.5" /> : <Lock className="mr-1 h-3.5 w-3.5" />}{anyLocked ? "Desbloquear" : "Bloquear"}</Button><Button type="button" size="sm" variant="outline" onClick={() => apply({ hidden: !allHidden, visibility: allHidden }, "properties:visibility")}>{allHidden ? <Eye className="mr-1 h-3.5 w-3.5" /> : <EyeOff className="mr-1 h-3.5 w-3.5" />}{allHidden ? "Mostrar" : "Ocultar"}</Button></div>
    <div className="grid grid-cols-2 gap-2"><Button type="button" size="sm" variant="outline" onClick={() => onDuplicate(selectedIds)}><Copy className="mr-1 h-3.5 w-3.5" />Duplicar</Button><Button type="button" size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => onDelete(selectedIds)}><Trash2 className="mr-1 h-3.5 w-3.5" />Excluir</Button></div>
    <div className="grid grid-cols-2 gap-2"><Button type="button" size="sm" variant="outline" disabled={!grouped} onClick={groupSelected}><Layers3 className="mr-1 h-3.5 w-3.5" />Agrupar</Button><Button type="button" size="sm" variant="outline" disabled={!hasGroups} onClick={ungroupSelected}><Layers3 className="mr-1 h-3.5 w-3.5" />Desagrupar</Button></div>
    <Button type="button" size="sm" variant="ghost" className="w-full text-xs" onClick={() => apply({ rotation: 0 }, "properties:reset-rotation")}><RotateCcw className="mr-1 h-3.5 w-3.5" />Redefinir rotação</Button>
    {textSelected && <div className="grid grid-cols-2 gap-2"><Button type="button" size="sm" variant="outline" onClick={copyTypography}>Copiar estilo</Button><Button type="button" size="sm" variant="outline" disabled={!copiedStyle} onClick={pasteTypography}>Aplicar estilo</Button></div>}
  </div>
</details></div>;
}
