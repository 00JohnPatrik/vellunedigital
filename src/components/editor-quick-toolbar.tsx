import { AlignCenter, AlignLeft, AlignRight, Bold, BringToFront, Copy, Crop, Italic, MoreHorizontal, SendToBack, SlidersHorizontal, Trash2, Image as ImageIcon, Lock, Unlock, Underline, Strikethrough } from "lucide-react";
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
}) {
  const primary = selected[0];
  if (!primary) return null;
  const p = primary.props;
  const text = selected.every((block) => block.type === "text");
  const locked = selected.some((block) => block.locked);
  const bold = p.fontWeight === "bold" || Number(p.fontWeight) >= 600 || (!p.fontWeight && p.bold === "1");
  return <div className="editor-quick-toolbar flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-elevated" role="toolbar" aria-label="Ações do elemento selecionado" onPointerDown={(event) => event.stopPropagation()}>
    {text && <fieldset disabled={locked} className="flex min-w-0 flex-wrap items-center gap-1">
      {selected.length === 1 && <Input
        aria-label="Conteúdo do texto"
        title="Editar texto"
        value={p.text ?? ""}
        onChange={(event) => onProp("text", event.target.value)}
        placeholder="Digite o texto..."
        className="h-8 w-44 text-xs"
      />}
      <select aria-label="Fonte do texto" value={p.font || "display"} onChange={(event) => onProp("font", event.target.value)} className="h-8 w-28 rounded-md border border-input bg-background px-2 text-xs">{FONTS.map((font) => <option key={font.value} value={font.value}>{font.label.replace(" (padrão)", "")}</option>)}</select>
      <Input type="number" aria-label="Tamanho do texto" min={1} max={240} className="h-8 w-16 px-2 text-xs" value={p.fontSize ?? ({ sm: 14, md: 16, lg: 20, xl: 30, "2xl": 36 } as Record<string, number>)[p.size ?? "lg"] ?? 20} onChange={(event) => { const size = Number(event.target.value); if (size >= 1 && size <= 240) onProp("fontSize", String(size)); }} />
      <Button size="icon" variant={bold ? "secondary" : "ghost"} className="h-8 w-8" title="Negrito" aria-label="Negrito" aria-pressed={bold} onClick={() => onProp("fontWeight", bold ? "normal" : "bold")}><Bold /></Button>
      <Button size="icon" variant={p.fontStyle === "italic" ? "secondary" : "ghost"} className="h-8 w-8" title="Itálico" aria-label="Itálico" aria-pressed={p.fontStyle === "italic"} onClick={() => onProp("fontStyle", p.fontStyle === "italic" ? "normal" : "italic")}><Italic /></Button>
      <Button size="icon" variant={p.textDecoration === "underline" ? "secondary" : "ghost"} className="h-8 w-8" title="Sublinhado" aria-label="Sublinhado" aria-pressed={p.textDecoration === "underline"} onClick={() => onProp("textDecoration", p.textDecoration === "underline" ? "none" : "underline")}><Underline /></Button>
      <Button size="icon" variant={p.textDecoration === "line-through" ? "secondary" : "ghost"} className="h-8 w-8" title="Riscado" aria-label="Riscado" aria-pressed={p.textDecoration === "line-through"} onClick={() => onProp("textDecoration", p.textDecoration === "line-through" ? "none" : "line-through")}><Strikethrough /></Button>
      <Input type="number" aria-label="Espaçamento entre letras" title="Espaçamento entre letras (px)" min={-20} max={40} step={0.1} className="h-8 w-16 px-2 text-xs" value={p.letterSpacing ?? 0} onChange={(event) => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= -20 && value <= 40) onProp("letterSpacing", String(value)); }} />
      <Input type="number" aria-label="Altura da linha" title="Altura da linha" min={0.5} max={4} step={0.1} className="h-8 w-14 px-2 text-xs" value={p.lineHeight ?? 1.2} onChange={(event) => { const value = Number(event.target.value); if (Number.isFinite(value) && value >= 0.5 && value <= 4) onProp("lineHeight", String(value)); }} />
      <select aria-label="Transformação do texto" title="Transformação do texto" value={p.textTransform || "none"} onChange={(event) => onProp("textTransform", event.target.value)} className="h-8 w-24 rounded-md border border-input bg-background px-1.5 text-[10px]">
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
        className="h-8 w-24 rounded-md border border-input bg-background px-1.5 text-[10px]"
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
        className="h-8 w-24 rounded-md border border-input bg-background px-1.5 text-[10px]"
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
          className="h-7 w-14 border-0 bg-transparent px-1 text-[11px] shadow-none focus-visible:ring-0"
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
    {selected.length > 1 && !text && <span className="px-2 text-xs text-muted-foreground">{selected.length} elementos</span>}
    <span className="mx-1 h-5 w-px bg-border" />
    {onLayer && <div className="flex items-center rounded-md border border-input bg-background" role="group" aria-label="Ordem das camadas">
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-r-none" disabled={locked} aria-label="Enviar seleção para trás" title="Enviar para trás" onClick={() => onLayer("back")}><SendToBack /></Button>
      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-l-none border-l" disabled={locked} aria-label="Trazer seleção para frente" title="Trazer para frente" onClick={() => onLayer("front")}><BringToFront /></Button>
    </div>}
    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={locked || selected.every((block) => block.type === "rsvp")} aria-label="Duplicar seleção" title="Duplicar" onClick={onDuplicate}><Copy /></Button>
    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={locked ? "Desbloquear seleção" : "Bloquear seleção"} title={locked ? "Desbloquear" : "Bloquear"} onClick={onLock}>{locked ? <Unlock /> : <Lock />}</Button>
    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" disabled={locked} aria-label="Excluir seleção" title="Excluir" onClick={onDelete}><Trash2 /></Button>
    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais ajustes" title="Mais ajustes" onClick={onAdvanced}><MoreHorizontal /></Button>
  </div>;
}