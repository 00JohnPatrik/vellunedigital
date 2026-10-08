import { AlignCenterHorizontal, ArrowDown, ArrowUp, Copy, Group, Link2, Lock, Pencil, RotateCcw, RotateCw, Trash2, Unlock, Ungroup, WandSparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Block } from "@/lib/templates";

export function EditorProToolbar({
  selected,
  onEditText,
  onDuplicate,
  onGroup,
  onUngroup,
  onCopyStyle,
  onPasteStyle,
  canPasteStyle,
  onCenter,
  onBringFront,
  onSendBack,
  onRotate,
  onToggleLock,
  onDelete,
}: {
  selected: Block[];
  onEditText?: () => void;
  onDuplicate: () => void;
  onGroup: () => void;
  onUngroup: () => void;
  onCopyStyle: () => void;
  onPasteStyle: () => void;
  canPasteStyle: boolean;
  onCenter: () => void;
  onBringFront: () => void;
  onSendBack: () => void;
  onRotate: (amount: number) => void;
  onToggleLock: () => void;
  onDelete: () => void;
}) {
  if (!selected.length) return null;
  const locked = selected.every((block) => Boolean((block as Block & { locked?: boolean }).locked));
  const canGroup = selected.length >= 2;
  const hasGroup = selected.some((block) => Boolean((block as Block & { groupId?: string }).groupId));

  const Action = ({ label, onClick, disabled, children, tone = "neutral" }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode; tone?: "neutral" | "danger" }) => (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className={cn(
      "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.025] text-white/60 transition hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-30",
      tone === "danger" && "hover:border-red-400/25 hover:bg-red-400/10 hover:text-red-200",
    )}>{children}</button>
  );

  return (
    <div className="pointer-events-auto absolute left-1/2 top-3 z-[135] flex max-w-[calc(100%-24px)] -translate-x-1/2 items-center gap-1 overflow-x-auto rounded-2xl border border-white/[0.10] bg-[#111318]/94 p-1.5 shadow-[0_18px_55px_-24px_rgba(0,0,0,0.96)] backdrop-blur-xl" role="toolbar" aria-label="Ferramentas rápidas do Editor Pro">
      {selected.length === 1 && selected[0]?.type === "text" && onEditText && <Action label="Editar texto" onClick={onEditText}><Pencil className="h-3.5 w-3.5" /></Action>}
      <Action label="Duplicar" onClick={onDuplicate}><Copy className="h-3.5 w-3.5" /></Action>
      <span className="mx-0.5 h-5 w-px bg-white/[0.08]" aria-hidden="true" />
      <Action label="Centralizar horizontalmente" onClick={onCenter}><AlignCenterHorizontal className="h-3.5 w-3.5" /></Action>
      <Action label="Trazer para frente" onClick={onBringFront}><ArrowUp className="h-3.5 w-3.5" /></Action>
      <Action label="Enviar para trás" onClick={onSendBack}><ArrowDown className="h-3.5 w-3.5" /></Action>
      <Action label="Girar 15° para a esquerda" onClick={() => onRotate(-15)}><RotateCcw className="h-3.5 w-3.5" /></Action>
      <Action label="Girar 15° para a direita" onClick={() => onRotate(15)}><RotateCw className="h-3.5 w-3.5" /></Action>
      <span className="mx-0.5 h-5 w-px bg-white/[0.08]" aria-hidden="true" />
      {canGroup && !hasGroup && <Action label="Agrupar elementos selecionados" onClick={onGroup}><Group className="h-3.5 w-3.5" /></Action>}
      {hasGroup && <Action label="Desagrupar seleção" onClick={onUngroup}><Ungroup className="h-3.5 w-3.5" /></Action>}
      <Action label="Copiar estilo" onClick={onCopyStyle}><WandSparkles className="h-3.5 w-3.5" /></Action>
      <Action label="Colar estilo" onClick={onPasteStyle} disabled={!canPasteStyle}><Link2 className="h-3.5 w-3.5" /></Action>
      <Action label={locked ? "Desbloquear seleção" : "Bloquear seleção"} onClick={onToggleLock}>{locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}</Action>
      <Action label="Excluir seleção" onClick={onDelete} tone="danger"><Trash2 className="h-3.5 w-3.5" /></Action>
      <span className="ml-1 hidden rounded-full bg-white/[0.05] px-2 py-1 text-[9px] font-semibold text-white/45 sm:inline-flex">{selected.length} selecionado{selected.length > 1 ? "s" : ""}</span>
    </div>
  );
}
