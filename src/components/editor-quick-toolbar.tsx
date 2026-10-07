import { AlignCenter, AlignLeft, AlignRight, Bold, Copy, Crop, Italic, MoreHorizontal, SlidersHorizontal, Trash2, Image as ImageIcon, Lock, Unlock } from "lucide-react";
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
}) {
  const primary = selected[0];
  if (!primary) return null;
  const p = primary.props;
  const text = selected.every((block) => block.type === "text");
  const locked = selected.some((block) => block.locked);
  const bold = p.fontWeight === "bold" || Number(p.fontWeight) >= 600 || (!p.fontWeight && p.bold === "1");
  return <div className="editor-quick-toolbar flex max-w-full flex-wrap items-center gap-1 rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-elevated" role="toolbar" aria-label="Ações do elemento selecionado" onPointerDown={(event) => event.stopPropagation()}>
    {text && <fieldset disabled={locked} className="flex min-w-0 flex-wrap items-center gap-1">
      <select aria-label="Fonte do texto" value={p.font || "display"} onChange={(event) => onProp("font", event.target.value)} className="h-8 w-28 rounded-md border border-input bg-background px-2 text-xs">{FONTS.map((font) => <option key={font.value} value={font.value}>{font.label.replace(" (padrão)", "")}</option>)}</select>
      <Input type="number" aria-label="Tamanho do texto" min={1} max={240} className="h-8 w-16 px-2 text-xs" value={p.fontSize ?? ({ sm: 14, md: 16, lg: 20, xl: 30, "2xl": 36 } as Record<string, number>)[p.size] ?? 20} onChange={(event) => { const size = Number(event.target.value); if (size >= 1 && size <= 240) onProp("fontSize", String(size)); }} />
      <Button size="icon" variant={bold ? "secondary" : "ghost"} className="h-8 w-8" title="Negrito" aria-label="Negrito" aria-pressed={bold} onClick={() => onProp("fontWeight", bold ? "normal" : "bold")}><Bold /></Button>
      <Button size="icon" variant={p.fontStyle === "italic" ? "secondary" : "ghost"} className="h-8 w-8" title="Itálico" aria-label="Itálico" aria-pressed={p.fontStyle === "italic"} onClick={() => onProp("fontStyle", p.fontStyle === "italic" ? "normal" : "italic")}><Italic /></Button>
      <input type="color" aria-label="Cor do texto" title="Cor do texto" value={/^#[0-9a-f]{6}$/i.test(p.color || "") ? p.color : "#000000"} onChange={(event) => onProp("color", event.target.value)} className="h-8 w-8 cursor-pointer rounded border border-input bg-background p-1" />
      {([{ value: "left", label: "Alinhar texto à esquerda", icon: AlignLeft }, { value: "center", label: "Centralizar texto", icon: AlignCenter }, { value: "right", label: "Alinhar texto à direita", icon: AlignRight }]).map(({ value, label, icon: Icon }) => <Button key={value} size="icon" variant={p.align === value ? "secondary" : "ghost"} className="h-8 w-8" aria-label={label} title={label} onClick={() => onProp("align", value)}><Icon /></Button>)}
    </fieldset>}
    {primary.type === "image" && selected.length === 1 && <>
      <Button size="sm" variant="ghost" disabled={locked} onClick={() => onImage("replace")}><ImageIcon />Trocar</Button>
      <Button size="sm" variant="ghost" disabled={locked} onClick={() => onImage("crop")}><Crop />Recortar</Button>
      <Button size="sm" variant="ghost" disabled={locked} onClick={() => onImage("adjust")}><SlidersHorizontal />Ajustar</Button>
    </>}
    {selected.length > 1 && !text && <span className="px-2 text-xs text-muted-foreground">{selected.length} elementos</span>}
    <span className="mx-1 h-5 w-px bg-border" />
    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={locked || selected.every((block) => block.type === "rsvp")} aria-label="Duplicar seleção" title="Duplicar" onClick={onDuplicate}><Copy /></Button>
    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={locked ? "Desbloquear seleção" : "Bloquear seleção"} title={locked ? "Desbloquear" : "Bloquear"} onClick={onLock}>{locked ? <Unlock /> : <Lock />}</Button>
    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" disabled={locked} aria-label="Excluir seleção" title="Excluir" onClick={onDelete}><Trash2 /></Button>
    <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Mais ajustes" title="Mais ajustes" onClick={onAdvanced}><MoreHorizontal /></Button>
  </div>;
}