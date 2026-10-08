import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndVertical,
  AlignLeft,
  AlignRight,
  AlignStartVertical,
  AlignVerticalJustifyCenter,
  ArrowDown,
  ArrowUp,
  Copy,
  Group,
  Link2,
  Lock,
  Pencil,
  RotateCcw,
  RotateCw,
  Trash2,
  Unlock,
  Ungroup,
  WandSparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Block } from "@/lib/templates";

type AlignMode =
  | "left"
  | "center"
  | "right"
  | "top"
  | "middle"
  | "bottom"
  | "distributeX"
  | "distributeY"
  | "canvasCenterX"
  | "canvasCenterY";

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
  onAlign,
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
  onAlign?: (mode: AlignMode) => void;
}) {
  if (!selected.length) return null;

  const hasLocked = selected.some((block) => Boolean((block as Block & { locked?: boolean }).locked));
  const fullyLocked = selected.every((block) => Boolean((block as Block & { locked?: boolean }).locked));
  const canMutateSelection = !hasLocked;
  const canAlign = Boolean(onAlign) && selected.length >= 2 && canMutateSelection;
  const canGroup = selected.length >= 2 && canMutateSelection && selected.every((block) => !(block as Block & { groupId?: string }).groupId);
  const hasGroup = selected.some((block) => Boolean((block as Block & { groupId?: string }).groupId));

  const Action = ({
    label,
    onClick,
    disabled,
    children,
    tone = "neutral",
  }: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    children: React.ReactNode;
    tone?: "neutral" | "danger";
  }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.025] text-white/60 transition hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-white disabled:cursor-not-allowed disabled:opacity-30 sm:h-8 sm:w-8",
        tone === "danger" && "hover:border-red-400/25 hover:bg-red-400/10 hover:text-red-200",
      )}
    >
      {children}
    </button>
  );

  return (
    <div
      className="pointer-events-auto flex w-full max-w-full min-w-0 items-center gap-1 overflow-x-auto overscroll-contain rounded-2xl border border-white/[0.10] bg-[#111318]/94 p-1.5 shadow-[0_18px_55px_-24px_rgba(0,0,0,0.96)] backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="toolbar"
      aria-label="Ferramentas do elemento selecionado"
      onPointerDown={(event) => event.stopPropagation()}
    >
      {selected.length === 1 && selected[0]?.type === "text" && onEditText && (
        <Action label="Editar texto" onClick={onEditText} disabled={!canMutateSelection}>
          <Pencil className="h-4 w-4" />
        </Action>
      )}

      <Action label="Duplicar seleção" onClick={onDuplicate} disabled={!canMutateSelection || selected.every((block) => block.type === "rsvp")}>
        <Copy className="h-4 w-4" />
      </Action>

      <span className="mx-0.5 h-5 w-px shrink-0 bg-white/[0.08]" aria-hidden="true" />

      <Action label="Centralizar horizontalmente" onClick={onCenter} disabled={!canMutateSelection}>
        <AlignCenterHorizontal className="h-4 w-4" />
      </Action>

      {onAlign && (
        <details className="relative shrink-0">
          <summary
            className={cn(
              "inline-flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.025] text-white/60 transition hover:border-white/[0.14] hover:bg-white/[0.07] hover:text-white sm:h-8 sm:w-8",
              !canAlign && "cursor-not-allowed opacity-30",
              "[&::-webkit-details-marker]:hidden",
            )}
            aria-label="Alinhamento"
            title={selected.length >= 2 ? "Alinhamento" : "Alinhamento requer múltipla seleção"}
          >
            <AlignCenterVertical className="h-4 w-4" />
          </summary>
          <div className="absolute left-1/2 top-11 z-[160] w-[216px] -translate-x-1/2 rounded-xl border border-white/[0.10] bg-[#111318] p-2 text-white shadow-2xl backdrop-blur-xl">
            <p className="px-1 pb-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-white/35">Alinhar seleção</p>
            <div className="grid grid-cols-3 gap-1">
              <button type="button" disabled={!canAlign} onClick={() => onAlign("left")} className="inline-flex h-8 items-center justify-center rounded-lg border border-white/[0.08] text-white/60 hover:bg-white/[0.06] hover:text-white disabled:opacity-30" title="Alinhar à esquerda" aria-label="Alinhar à esquerda"><AlignLeft className="h-4 w-4" /></button>
              <button type="button" disabled={!canAlign} onClick={() => onAlign("center")} className="inline-flex h-8 items-center justify-center rounded-lg border border-white/[0.08] text-white/60 hover:bg-white/[0.06] hover:text-white disabled:opacity-30" title="Centralizar entre os elementos" aria-label="Centralizar entre os elementos"><AlignCenterHorizontal className="h-4 w-4" /></button>
              <button type="button" disabled={!canAlign} onClick={() => onAlign("right")} className="inline-flex h-8 items-center justify-center rounded-lg border border-white/[0.08] text-white/60 hover:bg-white/[0.06] hover:text-white disabled:opacity-30" title="Alinhar à direita" aria-label="Alinhar à direita"><AlignRight className="h-4 w-4" /></button>
              <button type="button" disabled={!canAlign} onClick={() => onAlign("top")} className="inline-flex h-8 items-center justify-center rounded-lg border border-white/[0.08] text-white/60 hover:bg-white/[0.06] hover:text-white disabled:opacity-30" title="Alinhar ao topo" aria-label="Alinhar ao topo"><AlignStartVertical className="h-4 w-4" /></button>
              <button type="button" disabled={!canAlign} onClick={() => onAlign("middle")} className="inline-flex h-8 items-center justify-center rounded-lg border border-white/[0.08] text-white/60 hover:bg-white/[0.06] hover:text-white disabled:opacity-30" title="Centralizar verticalmente" aria-label="Centralizar verticalmente"><AlignVerticalJustifyCenter className="h-4 w-4" /></button>
              <button type="button" disabled={!canAlign} onClick={() => onAlign("bottom")} className="inline-flex h-8 items-center justify-center rounded-lg border border-white/[0.08] text-white/60 hover:bg-white/[0.06] hover:text-white disabled:opacity-30" title="Alinhar à base" aria-label="Alinhar à base"><AlignEndVertical className="h-4 w-4" /></button>
            </div>
            <div className="mt-1 grid grid-cols-2 gap-1">
              <button type="button" disabled={!canAlign} onClick={() => onAlign("canvasCenterX")} className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-white/[0.08] px-2 text-[9px] text-white/60 hover:bg-white/[0.06] hover:text-white disabled:opacity-30" title="Centralizar no canvas, eixo X">Centro X</button>
              <button type="button" disabled={!canAlign} onClick={() => onAlign("canvasCenterY")} className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-white/[0.08] px-2 text-[9px] text-white/60 hover:bg-white/[0.06] hover:text-white disabled:opacity-30" title="Centralizar no canvas, eixo Y">Centro Y</button>
              <button type="button" disabled={!canAlign || selected.length < 3} onClick={() => onAlign("distributeX")} className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-white/[0.08] px-2 text-[9px] text-white/60 hover:bg-white/[0.06] hover:text-white disabled:opacity-30" title="Distribuir horizontalmente">Distribuir X</button>
              <button type="button" disabled={!canAlign || selected.length < 3} onClick={() => onAlign("distributeY")} className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-white/[0.08] px-2 text-[9px] text-white/60 hover:bg-white/[0.06] hover:text-white disabled:opacity-30" title="Distribuir verticalmente">Distribuir Y</button>
            </div>
          </div>
        </details>
      )}

      <Action label="Trazer para frente" onClick={onBringFront} disabled={!canMutateSelection}>
        <ArrowUp className="h-4 w-4" />
      </Action>
      <Action label="Enviar para trás" onClick={onSendBack} disabled={!canMutateSelection}>
        <ArrowDown className="h-4 w-4" />
      </Action>
      <Action label="Girar 15° para a esquerda" onClick={() => onRotate(-15)} disabled={!canMutateSelection}>
        <RotateCcw className="h-4 w-4" />
      </Action>
      <Action label="Girar 15° para a direita" onClick={() => onRotate(15)} disabled={!canMutateSelection}>
        <RotateCw className="h-4 w-4" />
      </Action>

      <span className="mx-0.5 h-5 w-px shrink-0 bg-white/[0.08]" aria-hidden="true" />

      {canGroup && <Action label="Agrupar elementos selecionados" onClick={onGroup}><Group className="h-4 w-4" /></Action>}
      {hasGroup && <Action label="Desagrupar seleção" onClick={onUngroup} disabled={!canMutateSelection}><Ungroup className="h-4 w-4" /></Action>}

      <Action label="Copiar estilo" onClick={onCopyStyle}>
        <WandSparkles className="h-4 w-4" />
      </Action>
      <Action label="Colar estilo" onClick={onPasteStyle} disabled={!canPasteStyle || hasLocked}>
        <Link2 className="h-4 w-4" />
      </Action>

      <Action label={fullyLocked ? "Desbloquear seleção" : "Bloquear seleção"} onClick={onToggleLock}>
        {fullyLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
      </Action>

      <Action label="Excluir seleção" onClick={onDelete} disabled={!canMutateSelection || selected.some((block) => block.type === "rsvp")} tone="danger">
        <Trash2 className="h-4 w-4" />
      </Action>

      <span className="ml-auto hidden shrink-0 rounded-full bg-white/[0.05] px-2 py-1 text-[9px] font-semibold text-white/45 sm:inline-flex">
        {selected.length} selecionado{selected.length > 1 ? "s" : ""}
      </span>
    </div>
  );
}
