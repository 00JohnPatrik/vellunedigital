import {
  AlignCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignLeft,
  AlignRight,
  AlignStartVertical,
  AlignVerticalJustifyCenter,
  AlignEndVertical,
  Bold,
  BringToFront,
  Copy,
  Crop,
  Italic,
  MoreHorizontal,
  RotateCcw,
  RotateCw,
  SendToBack,
  SlidersHorizontal,
  Trash2,
  Image as ImageIcon,
  Lock,
  Unlock,
  Underline,
  Strikethrough,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FONTS } from "@/lib/blocks";
import type { Block } from "@/lib/templates";

export type ImageAction = "replace" | "crop" | "adjust";

export function EditorQuickToolbar({
  selected,
  onProp,
  onDuplicate,
  onDelete,
  onAdvanced,
  onImage,
  onLock,
  onLayer,
  onAlign,
  onOpacity,
  onRotate,
  onAutoArrange,
}: {
  selected: Block[];
  onProp: (key: string, value: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAdvanced: () => void;
  onImage: (action: ImageAction) => void;
  onLock: () => void;
  onLayer?: (direction: "front" | "back") => void;
  onAlign?: (
    mode:
      | "left"
      | "center"
      | "right"
      | "top"
      | "middle"
      | "bottom"
      | "distributeX"
      | "distributeY"
      | "canvasCenterX"
      | "canvasCenterY",
  ) => void;
  onOpacity?: (value: number) => void;
  onRotate?: (amount: number) => void;
  onAutoArrange?: () => void;
}) {
  const primary = selected[0];
  if (!primary) return null;

  const p = primary.props;
  const text = selected.every((block) => block.type === "text");
  const locked = selected.some((block) => block.locked);
  const bold = p.fontWeight === "bold" || Number(p.fontWeight) >= 600 || (!p.fontWeight && p.bold === "1");

  return (
    <div
      className="editor-quick-toolbar flex max-w-[min(92vw,760px)] flex-wrap items-center gap-1 rounded-2xl border border-primary/15 bg-popover/95 p-1.5 text-popover-foreground shadow-2xl shadow-black/20 backdrop-blur-xl ring-1 ring-black/5"
      role="toolbar"
      aria-label="Ações do elemento selecionado"
      onPointerDown={(event) => event.stopPropagation()}
    >
      {text && (
        <fieldset disabled={locked} className="flex min-w-0 flex-wrap items-center gap-1">
          {selected.length === 1 && (
            <Input
              aria-label="Conteúdo do texto"
              title="Editar texto"
              value={p.text ?? ""}
              onChange={(event) => onProp("text", event.target.value)}
              placeholder="Digite o texto..."
              className="h-8 w-[min(13rem,34vw)] border-primary/10 bg-background/80 text-sm"
            />
          )}
          <select aria-label="Fonte do texto" value={p.font || "display"} onChange={(event) => onProp("font", event.target.value)} className="h-8 w-28 rounded-md border border-input bg-background px-2 text-sm">
            {FONTS.map((font) => <option key={font.value} value={font.value}>{font.label.replace(" (padrão)", "")}</option>)}
          </select>
          <Input
            type="number"
            aria-label="Tamanho do texto"
            min={1}
            max={240}
            className="h-8 w-16 px-2 text-sm"
            value={p.fontSize ?? ({ sm: 14, md: 16, lg: 20, xl: 30, "2xl": 36 } as Record<string, number>)[p.size ?? "lg"] ?? 20}
            onChange={(event) => {
              const size = Number(event.target.value);
              if (size >= 1 && size <= 240) onProp("fontSize", String(size));
            }}
          />
          <Button size="icon" variant={bold ? "secondary" : "ghost"} className="h-8 w-8" title="Negrito" aria-label="Negrito" aria-pressed={bold} onClick={() => onProp("fontWeight", bold ? "normal" : "bold")}><Bold className="h-4 w-4" /></Button>
          <Button size="icon" variant={p.fontStyle === "italic" ? "secondary" : "ghost"} className="h-8 w-8" title="Itálico" aria-label="Itálico" aria-pressed={p.fontStyle === "italic"} onClick={() => onProp("fontStyle", p.fontStyle === "italic" ? "normal" : "italic")}><Italic className="h-4 w-4" /></Button>
          <select aria-label="Alinhamento do texto" title="Alinhamento do texto" value={p.align || "center"} onChange={(event) => onProp("align", event.target.value)} className="h-8 w-24 rounded-md border border-input bg-background px-2 text-xs">
            <option value="left">Esquerda</option>
            <option value="center">Centro</option>
            <option value="right">Direita</option>
          </select>
          <input type="color" aria-label="Cor do texto" title="Cor do texto" value={/^#[0-9a-f]{6}$/i.test(p.color || "") ? p.color : "#000000"} onChange={(event) => onProp("color", event.target.value)} className="h-8 w-8 cursor-pointer rounded-md border border-input bg-background p-1" />
          <details className="relative">
            <summary className="inline-flex h-8 cursor-pointer list-none items-center gap-1 rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground hover:bg-accent [&::-webkit-details-marker]:hidden">
              <MoreHorizontal className="h-4 w-4" />Texto
            </summary>
            <div className="absolute left-0 top-10 z-[130] grid min-w-[230px] gap-2 rounded-xl border border-border/80 bg-popover p-2 text-popover-foreground shadow-2xl">
              <div className="grid grid-cols-2 gap-2">
                <Button size="sm" variant={p.textDecoration === "underline" ? "secondary" : "outline"} className="justify-start text-xs" onClick={() => onProp("textDecoration", p.textDecoration === "underline" ? "none" : "underline")}><Underline className="mr-1.5 h-3.5 w-3.5" />Sublinhado</Button>
                <Button size="sm" variant={p.textDecoration === "line-through" ? "secondary" : "outline"} className="justify-start text-xs" onClick={() => onProp("textDecoration", p.textDecoration === "line-through" ? "none" : "line-through")}><Strikethrough className="mr-1.5 h-3.5 w-3.5" />Riscado</Button>
              </div>
              <label className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-border/70 px-2 py-1.5">
                <span className="text-[11px] text-muted-foreground">Espaçamento</span>
                <Input type="number" aria-label="Espaçamento entre letras" min={-20} max={40} step={0.1} className="h-7 w-20 px-2 text-xs" value={p.letterSpacing ?? 0} onChange={(event) => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= -20 && value <= 40) onProp("letterSpacing", String(value)); }} />
              </label>
              <label className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-border/70 px-2 py-1.5">
                <span className="text-[11px] text-muted-foreground">Altura da linha</span>
                <Input type="number" aria-label="Altura da linha" min={0.5} max={4} step={0.1} className="h-7 w-20 px-2 text-xs" value={p.lineHeight ?? 1.2} onChange={(event) => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= 0.5 && value <= 4) onProp("lineHeight", String(value)); }} />
              </label>
              <select aria-label="Transformação do texto" title="Transformação do texto" value={p.textTransform || "none"} onChange={(event) => onProp("textTransform", event.target.value)} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                <option value="none">Texto normal</option>
                <option value="uppercase">MAIÚSCULAS</option>
                <option value="capitalize">Inicial maiúscula</option>
              </select>
            </div>
          </details>
        </fieldset>
      )}

      {primary.type === "image" && selected.length === 1 && (
        <fieldset disabled={locked} className="flex items-center gap-1">
          <Button size="sm" variant="secondary" onClick={() => onImage("replace")}><ImageIcon className="h-3.5 w-3.5" />Trocar</Button>
          <Button size="sm" variant="ghost" onClick={() => onImage("crop")}><Crop className="h-3.5 w-3.5" />Enquadrar</Button>
          <select aria-label="Modo de enquadramento" title="Modo de enquadramento" value={p.objectFit || "cover"} onChange={(event) => onProp("objectFit", event.target.value)} className="h-8 w-24 rounded-md border border-input bg-background px-1.5 text-xs">
            <option value="cover">Preencher</option>
            <option value="contain">Inteira</option>
            <option value="original">Original</option>
          </select>
          <Button size="sm" variant="ghost" onClick={() => onImage("adjust")}><SlidersHorizontal className="h-3.5 w-3.5" />Ajustar</Button>
        </fieldset>
      )}

      {selected.length > 1 && !text && onAutoArrange && (
        <Button variant="secondary" size="sm" className="h-8 px-2 text-[10px]" title="Organizar seleção automaticamente" aria-label="Organizar seleção automaticamente" onClick={onAutoArrange}>
          <Sparkles className="mr-1.5 h-3.5 w-3.5" />Organizar
        </Button>
      )}

      {selected.length > 1 && !text && onAlign && (
        <details className="relative">
          <summary className="inline-flex h-8 cursor-pointer list-none items-center gap-1 rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground hover:bg-accent [&::-webkit-details-marker]:hidden">
            <AlignCenterHorizontal className="h-3.5 w-3.5" />Alinhar
          </summary>
          <div className="absolute left-0 top-10 z-[130] grid min-w-[250px] gap-2 rounded-xl border border-border/80 bg-popover p-2 shadow-2xl">
            <div className="grid grid-cols-3 gap-1">
              <Button variant="outline" size="icon" title="Alinhar à esquerda" aria-label="Alinhar à esquerda" onClick={() => onAlign("left")}><AlignLeft className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" title="Centralizar horizontalmente" aria-label="Centralizar horizontalmente" onClick={() => onAlign("center")}><AlignCenter className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" title="Alinhar à direita" aria-label="Alinhar à direita" onClick={() => onAlign("right")}><AlignRight className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" title="Alinhar ao topo" aria-label="Alinhar ao topo" onClick={() => onAlign("top")}><AlignStartVertical className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" title="Centralizar verticalmente" aria-label="Centralizar verticalmente" onClick={() => onAlign("middle")}><AlignVerticalJustifyCenter className="h-4 w-4" /></Button>
              <Button variant="outline" size="icon" title="Alinhar à base" aria-label="Alinhar à base" onClick={() => onAlign("bottom")}><AlignEndVertical className="h-4 w-4" /></Button>
            </div>
            <div className="grid grid-cols-2 gap-1">
              <Button variant="outline" size="sm" className="text-xs" onClick={() => onAlign("canvasCenterX")}><AlignCenterHorizontal className="mr-1.5 h-3.5 w-3.5" />No centro X</Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => onAlign("canvasCenterY")}><AlignCenterVertical className="mr-1.5 h-3.5 w-3.5" />No centro Y</Button>
            </div>
            {selected.length > 2 && (
              <div className="grid grid-cols-2 gap-1">
                <Button variant="outline" size="sm" className="text-xs" onClick={() => onAlign("distributeX")}>Distribuir X</Button>
                <Button variant="outline" size="sm" className="text-xs" onClick={() => onAlign("distributeY")}>Distribuir Y</Button>
              </div>
            )}
          </div>
        </details>
      )}

      <details className="relative">
        <summary className="inline-flex h-8 cursor-pointer list-none items-center gap-1 rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground hover:bg-accent [&::-webkit-details-marker]:hidden">
          <MoreHorizontal className="h-4 w-4" />Ações
        </summary>
        <div className="absolute right-0 top-10 z-[130] grid min-w-[240px] gap-2 rounded-xl border border-border/80 bg-popover p-2 shadow-2xl">
          <div className="grid grid-cols-2 gap-2">
            {onLayer && (
              <>
                <Button size="sm" variant="outline" className="justify-start text-xs" disabled={locked} onClick={() => onLayer("back")}><SendToBack className="mr-1.5 h-3.5 w-3.5" />Enviar para trás</Button>
                <Button size="sm" variant="outline" className="justify-start text-xs" disabled={locked} onClick={() => onLayer("front")}><BringToFront className="mr-1.5 h-3.5 w-3.5" />Trazer para frente</Button>
              </>
            )}
            <Button size="sm" variant="outline" className="justify-start text-xs" disabled={locked || selected.every((block) => block.type === "rsvp")} onClick={onDuplicate}><Copy className="mr-1.5 h-3.5 w-3.5" />Duplicar</Button>
            <Button size="sm" variant="outline" className="justify-start text-xs" disabled={locked} onClick={() => onRotate?.(-15)}><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Girar −15°</Button>
            <Button size="sm" variant="outline" className="justify-start text-xs" disabled={locked} onClick={() => onRotate?.(15)}><RotateCw className="mr-1.5 h-3.5 w-3.5" />Girar +15°</Button>
            {onOpacity && (
              <label className="col-span-2 grid grid-cols-[1fr_auto] items-center gap-2 rounded-lg border border-border/70 px-2 py-1.5">
                <span className="text-[11px] text-muted-foreground">Opacidade</span>
                <span className="flex items-center gap-2">
                  <input type="range" min="0" max="100" step="5" value={Math.round((Number.isFinite(Number(primary.opacity)) ? Number(primary.opacity) : 1) * 100)} disabled={locked} aria-label="Opacidade" onChange={(event) => onOpacity(Number(event.target.value) / 100)} className="w-24 accent-primary" />
                  <span className="min-w-8 text-right text-[10px] tabular-nums text-muted-foreground">{Math.round((Number.isFinite(Number(primary.opacity)) ? Number(primary.opacity) : 1) * 100)}%</span>
                </span>
              </label>
            )}
            <Button size="sm" variant="outline" className="justify-start text-xs" onClick={onLock}>{locked ? <Unlock className="mr-1.5 h-3.5 w-3.5" /> : <Lock className="mr-1.5 h-3.5 w-3.5" />}{locked ? "Desbloquear" : "Bloquear"}</Button>
            <Button size="sm" variant="outline" className="justify-start text-xs text-destructive hover:text-destructive" disabled={locked} onClick={onDelete}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Excluir</Button>
          </div>
        </div>
      </details>

      <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs" aria-label="Mais ajustes" title="Mais ajustes" onClick={onAdvanced}>
        <SlidersHorizontal className="h-3.5 w-3.5" />Ajustes
      </Button>
    </div>
  );
}
