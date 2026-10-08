import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, CheckCircle2, Image as ImageIcon, Link2, MapPin, Palette, Search, Shapes, Sparkles, Type, X } from "lucide-react";
import type { BlockType } from "@/lib/templates";

type PaletteAction = {
  id: string;
  label: string;
  description: string;
  type?: BlockType;
  kind: "element" | "template" | "background";
  Icon: typeof Sparkles;
};

const ACTIONS: PaletteAction[] = [
  { id: "template", label: "Modelos prontos", description: "Abrir a galeria de composições editáveis", kind: "template", Icon: Sparkles },
  { id: "text", label: "Texto", description: "Adicionar um título, subtítulo ou mensagem", kind: "element", type: "text", Icon: Type },
  { id: "image", label: "Foto", description: "Adicionar uma imagem ao convite", kind: "element", type: "image", Icon: ImageIcon },
  { id: "gallery", label: "Galeria", description: "Adicionar uma galeria de fotos", kind: "element", type: "gallery", Icon: ImageIcon },
  { id: "shape", label: "Forma", description: "Adicionar uma forma decorativa", kind: "element", type: "shape", Icon: Shapes },
  { id: "date", label: "Data", description: "Mostrar a data do evento", kind: "element", type: "date", Icon: CalendarDays },
  { id: "time", label: "Horário", description: "Mostrar o horário do evento", kind: "element", type: "time", Icon: CalendarDays },
  { id: "location", label: "Local", description: "Mostrar local e endereço do evento", kind: "element", type: "location", Icon: MapPin },
  { id: "rsvp", label: "Confirmação de presença", description: "Adicionar RSVP ao convite", kind: "element", type: "rsvp", Icon: CheckCircle2 },
  { id: "button", label: "Botão", description: "Adicionar um botão com link", kind: "element", type: "button", Icon: Link2 },
  { id: "background", label: "Fundo", description: "Abrir os ajustes do fundo do convite", kind: "background", Icon: Palette },
];

export function EditorCommandPalette({
  open,
  selectedCount,
  onClose,
  onAdd,
  onOpenTemplates,
  onOpenBackground,
}: {
  open: boolean;
  selectedCount: number;
  onClose: () => void;
  onAdd: (type: BlockType) => void;
  onOpenTemplates: () => void;
  onOpenBackground: () => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return ACTIONS;
    return ACTIONS.filter((item) => `${item.label} ${item.description}`.toLowerCase().includes(normalized));
  }, [query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActive(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActive((value) => Math.min(value + 1, Math.max(0, filtered.length - 1)));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActive((value) => Math.max(value - 1, 0));
        return;
      }
      if (event.key === "Enter" && filtered[active]) {
        event.preventDefault();
        const item = filtered[active]!;
        if (item.kind === "template") onOpenTemplates();
        else if (item.kind === "background") onOpenBackground();
        else if (item.type) onAdd(item.type);
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active, filtered, onAdd, onClose, onOpenBackground, onOpenTemplates, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-start justify-center bg-black/55 p-4 pt-[10vh] backdrop-blur-[4px]" role="presentation" onMouseDown={onClose}>
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/[0.10] bg-[#111318]/98 text-white shadow-[0_30px_100px_-24px_rgba(0,0,0,0.8)] ring-1 ring-white/[0.04]"
        role="dialog"
        aria-modal="true"
        aria-label="Buscar e adicionar"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-white/[0.07] px-4 py-3.5">
          <Search className="h-4 w-4 shrink-0 text-white/35" />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => { setQuery(event.target.value); setActive(0); }}
            placeholder="Buscar elemento, modelo ou ajuste..."
            aria-label="Buscar no editor"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-white/30"
          />
          <kbd className="hidden rounded-md border border-white/[0.08] bg-white/[0.04] px-1.5 py-1 text-[10px] text-white/35 sm:inline">ESC</kbd>
          <button type="button" onClick={onClose} aria-label="Fechar busca" className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-white/45 transition hover:bg-white/[0.06] hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[56vh] overflow-y-auto p-2.5">
          {filtered.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm font-medium text-white/80">Nada encontrado</p>
              <p className="mt-1 text-xs text-white/35">Tente buscar por texto, foto, botão, data ou modelo.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((item, index) => {
                const Icon = item.Icon;
                const selected = index === active;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onClick={() => {
                      if (item.kind === "template") onOpenTemplates();
                      else if (item.kind === "background") onOpenBackground();
                      else if (item.type) onAdd(item.type);
                      onClose();
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${selected ? "bg-primary/12 ring-1 ring-primary/20" : "hover:bg-white/[0.04]"}`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${selected ? "border-primary/30 bg-primary/10 text-primary" : "border-white/[0.08] bg-white/[0.025] text-white/45"}`}>
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-white/85">{item.label}</span>
                      <span className="mt-0.5 block truncate text-[11px] leading-4 text-white/35">{item.description}</span>
                    </span>
                    {selected && <span className="text-[10px] font-medium text-primary">Enter</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/[0.07] bg-black/10 px-4 py-2.5 text-[10px] text-white/30">
          <span>Use ↑ ↓ para navegar · Enter para adicionar</span>
          <span>{selectedCount ? `${selectedCount} selecionado(s)` : "Nada selecionado"}</span>
        </div>
      </div>
    </div>
  );
}
