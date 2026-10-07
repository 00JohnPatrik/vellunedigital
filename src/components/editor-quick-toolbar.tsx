import { AlignCenter, AlignCenterHorizontal, AlignCenterVertical, AlignLeft, AlignRight, AlignStartVertical, AlignEndVertical, Bold, BringToFront, Copy, Crop, Italic, MoreHorizontal, RotateCcw, RotateCw, SendToBack, SlidersHorizontal, Trash2, Image as ImageIcon, Lock, Unlock, Underline, Strikethrough } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FONTS } from "@/lib/blocks";
import type { Block } from "@/lib/templates";

export type ImageAction = "replace" | "crop" | "adjust";

export function EditorQuickToolbar({ selected, onProp, onDuplicate, onDelete, onAdvanced, onImage, onLock }: {
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
  return <div className="editor-quick-toolbar flex max-w-full flex-wrap items-center gap-1 rounded-xl border border-primary/15 bg-popover/95 p-1.5 text-popover-foreground shadow-2xl shadow-black/20 backdrop-blur-xl ring-1 ring-black/5" role="toolbar" aria-label="Ações do elemento selecionado" onPointerDown={(event) => event.stopPropagation()}>
    {text && <fieldset disabled={locked} className="flex min-w-0 flex-wrap items-center gap-1">
      {selected.length === 1 && <Input
        aria-label="Conteúdo do texto"
        title="Editar texto"
        value={p.text ?? ""}
        onChange={(event) => onProp("text", event.target.value)}
        placeholder="Digite o texto..."
        className="h-8 w-44 text-base sm:text-xs"
      />}
      <select aria-label="Fonte do texto" value={p.font || "display"} onChange={(event) => onProp("font", event.target.value)} className="h-8 w-28 rounded-md border border-input bg-background px-2 text-base sm:text-xs">{FONTS.map((font) => <option key={font.value} value={font.value}>{font.label.replace(" (padrão)", "")}</option>)}</select>
      <Input type="number" aria-label="Tamanho do texto" min={1} max={240} className="h-8 w-16 px-2 text-base sm:text-xs" value={p.fontSize ?? ({ sm: 14, md: 16, lg: 20, xl: 30, "2xl": 36 } as Record<string, number>)[p.size ?? "lg"] ?? 20} onChange={(event) => { const size = Number(event.target.value); if (size >= 1 && size <= 240) onProp("fontSize", String(size)); }} />
      <Button size="icon" variant={bold ? "secondary" : "ghost"} className="h-8 w-8" title="Negrito" aria-label="Negrito" aria-pressed={bold} onClick={() => onProp("fontWeight", bold ? "normal" : "bold")}><Bold /></Button>
      <Button size="icon" variant={p.fontStyle === "italic" ? "secondary" : "ghost"} className="h-8 w-8" title="Itálico" aria-label="Itálico" aria-pressed={p.fontStyle === "italic"} onClick={() => onProp("fontStyle", p.fontStyle === "italic" ? "normal" : "italic")}><Italic /></Button>
      <Button size="icon" variant={p.textDecoration === "underline" ? "secondary" : "ghost"} className="h-8 w-8" title="Sublinhado" aria-label="Sublinhado" aria-pressed={p.textDecoration === "underline"} onClick={() => onProp("textDecoration", p.textDecoration === "underline" ? "none" : "underline")}><Underline /></Button>
      <Button size="icon" variant={p.textDecoration === "line-through" ? "secondary" : "ghost"} className="h-8 w-8" title="Riscado" aria-label="Riscado" aria-pressed={p.textDecoration === "line-through"} onClick={() => onProp("textDecoration", p.textDecoration === "line-through" ? "none" : "line-through")}><Strikethrough /></Button>
      <Input type="number" aria-label="Espaçamento entre letras" title="Espaçamento entre letras (px)" min={-20} max={40} step={0.1} className="h-8 w-16 px-2 text-base sm:text-xs" value={p.letterSpacing ?? 0} onChange={(event) => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= -20 && value <= 40) onProp("letterSpacing", String(value)); }} />
      <Input type="number" aria-label="Altura da linha" title="Altura da linha" min={0.5} max={4} step={0.1} className="h-8 w-14 px-2 text-base sm:text-xs" value={p.lineHeight ?? 1.2} onChange={(event) => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= 0.5 && value <= 4) onProp("lineHeight", String(value)); }} />
      <select aria-label="Transformação do texto" title="Transformação do texto" value={p.textTransform || "none"} onChange={(event) => onProp("textTransform", event.target.value)} className="h-8 w-24 rounded-md border border-input bg-background px-1.5 text-sm sm:text-[10px]">
        <option value="none">Normal</option>
        <option value="uppercase">MAIÚSCULAS</option>
        <option value="capitalize">Inicial</option>
      </select>
      <input type="color" aria-label="Cor do texto" title="Cor do texto" value={/^#[0-9a-f]{6}$/i.test(p.color || "") ? p.color : "#000000"} onChange={(event) => onProp("color", event.target.value)} className="h-8 w-8 cursor-pointer rounded border border-input bg-background p-1" />
      {([{ value: "left", label: "Alinhar texto à esquerda", icon: AlignLeft }, { value: "center", label: "Centralizar texto", icon: AlignCenter }, { value: "right", label: "Alinhar texto à direita", icon: AlignRight }]).map(({ value, label, icon: Icon }) => <Button key={value} size="icon" variant={p.align === value ? "secondary" : "ghost"} className="h-8 w-8" aria-label={label} title={label} onClick={() => onProp("align", value)}><Icon /></Button>)}
    </fieldset>}
    {primary.type === "image" && selected.length === 1 && <>
      <Button size="sm" variant="ghost" disabled={locked} onClick={() => onImage("replace")}><ImageIcon />Trocar</Button>
      <Button size="sm" variant="ghost" disabled={locked} onClick={() => onImage("crop")}><Crop />Enquadrar</Button>
      <select
        aria-label="Modo de enquadramento"
        title="Modo de enquadramento"
        value={p.objectFit || "cover"}
        onChange={(event) => onProp("objectFit", event.target.value)}
        disabled={locked}
        className="h-8 w-24 rounded-md border border-input bg-background px-1.5 text-sm sm:text-[10px]"
      >
        <option value="cover">Cobrir</option>
        <option value="contain">Conter</option>
        <option value="original">Original</option>
      </select>
      <select
        aria-label="Posição do enquadramento"
        title="Posição do enquadramento"
        value={p.objectPosition || p.position || "center"}
        onChange={(event) => onProp("objectPosition", event.target.value)}
        disabled={locked}
        className="h-8 w-24 rounded-md border border-input bg-background px-1.5 text-sm sm:text-[10px]"
      >
        <option value="center">Centro</option>
        <option value="top">Topo</option>
        <option value="bottom">Base</option>
        <option value="left">Esquerda</option>
        <option value="right">Direita</option>
      </select>
      <div className="flex items-center gap-1 rounded-md border border-input bg-background px-1" role="group" aria-label="Zoom da imagem">
        <span className="px-1 text-[10px] text-muted-foreground">Zoom</span>
        <Input
          type="number"
          aria-label="Zoom da imagem"
          min={100}
          max={300}
          step={5}
          className="h-7 w-14 border-0 bg-transparent px-1 text-sm sm:text-[11px] shadow-none focus-visible:ring-0"
          value={p.imageZoom ?? 100}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (Number.isFinite(value) && value >= 100 && value <= 300) onProp("imageZoom", String(value));
          }}
          disabled={locked}
        />
        <span className="pr-1 text-[10px] text-muted-foreground">%</span>
      </div>
      <Button size="sm" variant="ghost" disabled={locked} onClick={() => onImage("adjust")}><SlidersHorizontal />Ajustes</Button>
    </>}
    {selected.length > 1 && !text && onAlign && <div className="flex items-center rounded-md border border-input bg-background" role="group" aria-label="Alinhamento da seleção">
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none" aria-label="Alinhar à esquerda" title="Alinhar à esquerda" onClick={() => onAlign("left")}><AlignLeft /></Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none border-l" aria-label="Centralizar horizontalmente" title="Centralizar horizontalmente" onClick={() => onAlign("center")}><AlignCenter /></Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none border-l" aria-label="Alinhar à direita" title="Alinhar à direita" onClick={() => onAlign("right")}><AlignRight /></Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none border-l" aria-label="Alinhar ao topo" title="Alinhar ao topo" onClick={() => onAlign("top")}><AlignStartVertical /></Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none border-l" aria-label="Centralizar verticalmente" title="Centralizar verticalmente" onClick={() => onAlign("middle")}><AlignVerticalJustifyCenter /></Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-none border-l" aria-label="Alinhar à base" title="Alinhar à base" onClick={() => onAlign("bottom")}><AlignEndVertical /></Button>
    </div>}
    {selected.length > 0 && onAlign && <div className="flex items-center rounded-md border border-input bg-background" role="group" aria-label="Centralizar no convite">
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none" title="Centralizar horizontalmente no convite" aria-label="Centralizar horizontalmente no convite" onClick={() => onAlign("canvasCenterX")}><AlignCenterHorizontal /></Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-none border-l" title="Centralizar verticalmente no convite" aria-label="Centralizar verticalmente no convite" onClick={() => onAlign("canvasCenterY")}><AlignCenterVertical /></Button>
    </div>}
    {selected.length > 2 && !text && onAlign && <div className="flex items-center rounded-md border border-input bg-background" role="group" aria-label="Distribuição da seleção">
      <Button variant="ghost" size="sm" className="h-8 px-2 text-[10px]" title="Distribuir horizontalmente" onClick={() => onAlign("distributeX")} aria-label="Distribuir horizontalmente">Distribuir X</Button>
      <Button variant="ghost" size="sm" className="h-8 rounded-l-none border-l px-2 text-[10px]" title="Distribuir verticalmente" onClick={() => onAlign("distributeY")} aria-label="Distribuir verticalmente">Distribuir Y</Button>
    </div>}
    <span className="mx-1 h-5 w-px bg-primary/10" aria-hidden="true" />
    {onLayer && <div className="flex items-center rounded-md border border-input bg-background" role="group" aria-label="Ordem das camadas">
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none" disabled={locked} aria-label="Enviar seleção para trás" title="Enviar para trás" onClick={() => onLayer("back")}><SendToBack /></Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-none border-l" disabled={locked} aria-label="Trazer seleção para frente" title="Trazer para frente" onClick={() => onLayer("front")}><BringToFront /></Button>
    </div>}
    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={locked || selected.every((block) => block.type === "rsvp")} aria-label="Duplicar seleção" title="Duplicar" onClick={onDuplicate}><Copy /></Button>
    {onRotate && <div className="flex items-center rounded-md border border-input bg-background" role="group" aria-label="Rotação rápida">
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none" disabled={locked} aria-label="Girar 15 graus para a esquerda" title="Girar -15°" onClick={() => onRotate(-15)}><RotateCcw /></Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-none border-l" disabled={locked} aria-label="Girar 15 graus para a direita" title="Girar +15°" onClick={() => onRotate(15)}><RotateCw /></Button>
    </div>}
    {onOpacity && <div className="flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2" title="Opacidade da seleção" role="group" aria-label="Opacidade da seleção">
      <span className="text-[10px] text-muted-foreground">Opacidade</span>
      <input type="range" min="0" max="100" step="5" value={Math.round((Number.isFinite(Number(primary.opacity)) ? Number(primary.opacity) : 1) * 100)} disabled={locked} aria-label="Opacidade" onChange={(event) => onOpacity(Number(event.target.value) / 100)} className="w-16 accent-primary sm:w-20" />
      <span className="min-w-8 text-right text-[10px] tabular-nums text-muted-foreground">{Math.round((Number.isFinite(Number(primary.opacity)) ? Number(primary.opacity) : 1) * 100)}%</span>
    </div>}
    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={locked ? "Desbloquear seleção" : "Bloquear seleção"} title={locked ? "Desbloquear" : "Bloquear"} onClick={onLock}>{locked ? <Unlock /> : <Lock />}</Button>
    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" disabled={locked} aria-label="Excluir seleção" title="Excluir" onClick={onDelete}><Trash2 /></Button>
    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais ajustes" title="Mais ajustes" onClick={onAdvanced}><MoreHorizontal /></Button>
  </div>;
}