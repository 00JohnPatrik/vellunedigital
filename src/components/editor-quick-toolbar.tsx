import { AlignCenter, AlignCenterHorizontal, AlignCenterVertical, AlignLeft, AlignRight, AlignStartVertical, AlignVerticalJustifyCenter, AlignEndVertical, Bold, BringToFront, Copy, Crop, Italic, MoreHorizontal, RotateCcw, RotateCw, SendToBack, SlidersHorizontal, Trash2, Image as ImageIcon, Lock, Unlock, Underline, Strikethrough } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FONTS } from "@/lib/blocks";
import type { Block } from "@/lib/templates";

export type ImageAction = "replace" | "crop" | "adjust";

export function EditorQuickToolbar({ selected, onProp, onDuplicate, onDelete, onAdvanced, onImage, onLock, onLayer, onAlign, onOpacity, onRotate }: {
  selected: Block[];
  onProp: (key: string, value: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onAdvanced: () => void;
  onImage: (action: ImageAction) => void;
  onLock: () => void;
  onLayer?: (direction: "front" | "back") => void;
  onAlign?: (mode: "left" | "center" | "right" | "top" | "middle" | "bottom" | "distributeX" | "distributeY" | "canvasCenterX" | "canvasCenterY") => void;
  onOpacity?: (value: number) => void;
  onRotate?: (amount: number) => void;
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
              className="h-8 w-[min(13rem,38vw)] border-primary/10 bg-background/80 text-sm"
            />
          )}
          <select
            aria-label="Fonte do texto"
            value={p.font || "display"}
            onChange={(event) => onProp("font", event.target.value)}
            className="h-8 w-28 rounded-md border border-input bg-background px-2 text-sm"
          >
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
          {([
            { value: "left", label: "Alinhar à esquerda", icon: AlignLeft },
            { value: "center", label: "Centralizar", icon: AlignCenter },
            { value: "right", label: "Alinhar à direita", icon: AlignRight },
          ] as const).map(({ value, label, icon: Icon }) => (
            <Button key={value} size="icon" variant={p.align === value ? "secondary" : "ghost"} className="h-8 w-8" aria-label={label} title={label} onClick={() => onProp("align", value)}>
              <Icon className="h-4 w-4" />
            </Button>
          ))}
          <input
            type="color"
            aria-label="Cor do texto"
            title="Cor do texto"
            value={/^#[0-9a-f]{6}$/i.test(p.color || "") ? p.color : "#000000"}
            onChange={(event) => onProp("color", event.target.value)}
            className="h-8 w-8 cursor-pointer rounded-md border border-input bg-background p-1"
          />
          <details className="relative">
            <summary className="inline-flex h-8 cursor-pointer list-none items-center gap-1 rounded-md border border-input bg-background px-2 text-xs font-medium text-foreground hover:bg-accent [&::-webkit-details-marker]:hidden">
              <MoreHorizontal className="h-4 w-4" />Mais
            </summary>
            <div className="absolute left-0 top-10 z-[120] grid min-w-[220px] gap-2 rounded-xl border border-border/80 bg-popover p-2 text-popover-foreground shadow-2xl">
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
        <>
          <Button size="sm" variant="secondary" disabled={locked} onClick={() => onImage("replace")}><ImageIcon className="h-3.5 w-3.5" />Trocar</Button>
          <Button size="sm" variant="ghost" disabled={locked} onClick={() => onImage("crop")}><Crop className="h-3.5 w-3.5" />Enquadrar</Button>
          <select aria-label="Modo de enquadramento" title="Modo de enquadramento" value={p.objectFit || "cover"} onChange={(event) => onProp("objectFit", event.target.value)} disabled={locked} className="h-8 w-24 rounded-md border border-input bg-background px-1.5 text-xs">
            <option value="cover">Preencher</option>
            <option value="contain">Inteira</option>
            <option value="original">Original</option>
          </select>
          <Button size="sm" variant="ghost" disabled={locked} onClick={() => onImage("adjust")}><SlidersHorizontal className="h-3.5 w-3.5" />Ajustes</Button>
        </>
      )}

      {selected.length > 1 && !text && onAlign && (
        <div className="flex items-center rounded-md border border-input bg-background" role="group" aria-label="Alinhamento da seleção">
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Alinhar à esquerda" title="Alinhar à esquerda" onClick={() => onAlign("left")}><AlignLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 border-l rounded-none" aria-label="Centralizar horizontalmente" title="Centralizar horizontalmente" onClick={() => onAlign("center")}><AlignCenter className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 border-l rounded-none" aria-label="Alinhar ao topo" title="Alinhar ao topo" onClick={() => onAlign("top")}><AlignStartVertical className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 border-l rounded-none" aria-label="Centralizar verticalmente" title="Centralizar verticalmente" onClick={() => onAlign("middle")}><AlignVerticalJustifyCenter className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 border-l rounded-none" aria-label="Alinhar à base" title="Alinhar à base" onClick={() => onAlign("bottom")}><AlignEndVertical className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 border-l rounded-l-none" aria-label="Alinhar à direita" title="Alinhar à direita" onClick={() => onAlign("right")}><AlignRight className="h-4 w-4" /></Button>
        </div>
      )}

      {selected.length > 0 && onAlign && (
        <div className="hidden items-center rounded-md border border-input bg-background sm:flex" role="group" aria-label="Centralizar no convite">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none" title="Centralizar horizontalmente no convite" aria-label="Centralizar horizontalmente no convite" onClick={() => onAlign("canvasCenterX")}><AlignCenterHorizontal className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-none border-l" title="Centralizar verticalmente no convite" aria-label="Centralizar verticalmente no convite" onClick={() => onAlign("canvasCenterY")}><AlignCenterVertical className="h-4 w-4" /></Button>
        </div>
      )}

      {selected.length > 2 && !text && onAlign && (
        <div className="hidden items-center rounded-md border border-input bg-background sm:flex" role="group" aria-label="Distribuição da seleção">
          <Button variant="ghost" size="sm" className="h-8 px-2 text-[10px]" title="Distribuir horizontalmente" onClick={() => onAlign("distributeX")} aria-label="Distribuir horizontalmente">Distribuir X</Button>
          <Button variant="ghost" size="sm" className="h-8 rounded-l-none border-l px-2 text-[10px]" title="Distribuir verticalmente" onClick={() => onAlign("distributeY")} aria-label="Distribuir verticalmente">Distribuir Y</Button>
        </div>
      )}

      <span className="mx-1 h-5 w-px bg-primary/10" aria-hidden="true" />

      {onLayer && (
        <div className="flex items-center rounded-md border border-input bg-background" role="group" aria-label="Ordem das camadas">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none" disabled={locked} aria-label="Enviar seleção para trás" title="Enviar para trás" onClick={() => onLayer("back")}><SendToBack className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-none border-l" disabled={locked} aria-label="Trazer seleção para frente" title="Trazer para frente" onClick={() => onLayer("front")}><BringToFront className="h-4 w-4" /></Button>
        </div>
      )}

      <Button variant="ghost" size="icon" className="h-8 w-8" disabled={locked || selected.every((block) => block.type === "rsvp")} aria-label="Duplicar seleção" title="Duplicar" onClick={onDuplicate}><Copy className="h-4 w-4" /></Button>

      {onRotate && (
        <div className="hidden items-center rounded-md border border-input bg-background sm:flex" role="group" aria-label="Rotação rápida">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none" disabled={locked} aria-label="Girar 15 graus para a esquerda" title="Girar -15°" onClick={() => onRotate(-15)}><RotateCcw className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-none border-l" disabled={locked} aria-label="Girar 15 graus para a direita" title="Girar +15°" onClick={() => onRotate(15)}><RotateCw className="h-4 w-4" /></Button>
        </div>
      )}

      {onOpacity && (
        <div className="hidden h-8 items-center gap-1 rounded-md border border-input bg-background px-2 sm:flex" title="Opacidade da seleção" role="group" aria-label="Opacidade da seleção">
          <span className="text-[10px] text-muted-foreground">Opacidade</span>
          <input type="range" min="0" max="100" step="5" value={Math.round((Number.isFinite(Number(primary.opacity)) ? Number(primary.opacity) : 1) * 100)} disabled={locked} aria-label="Opacidade" onChange={(event) => onOpacity(Number(event.target.value) / 100)} className="w-16 accent-primary sm:w-20" />
          <span className="min-w-8 text-right text-[10px] tabular-nums text-muted-foreground">{Math.round((Number.isFinite(Number(primary.opacity)) ? Number(primary.opacity) : 1) * 100)}%</span>
        </div>
      )}

      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={locked ? "Desbloquear seleção" : "Bloquear seleção"} title={locked ? "Desbloquear" : "Bloquear"} onClick={onLock}>{locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}</Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:bg-destructive/10" disabled={locked} aria-label="Excluir seleção" title="Excluir" onClick={onDelete}><Trash2 className="h-4 w-4" /></Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais ajustes" title="Mais ajustes" onClick={onAdvanced}><SlidersHorizontal className="h-4 w-4" /></Button>
    </div>
  );}