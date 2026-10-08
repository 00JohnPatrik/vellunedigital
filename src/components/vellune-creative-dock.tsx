import { FolderOpen, Home, LayoutTemplate, Plus, Settings2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type CreativeDockItem = "home" | "projects" | "templates" | "settings";

export type VelluneCreativeDockProps = {
  activeItem?: CreativeDockItem;
  onNavigate?: (item: CreativeDockItem) => void;
  onCreate?: () => void;
  className?: string;
};

export function VelluneCreativeDock({
  activeItem = "projects",
  onNavigate,
  onCreate,
  className,
}: VelluneCreativeDockProps) {
  const items: Array<{
    id: CreativeDockItem;
    label: string;
    Icon: typeof Home;
  }> = [
    { id: "home", label: "Início", Icon: Home },
    { id: "projects", label: "Projetos", Icon: FolderOpen },
    { id: "templates", label: "Modelos", Icon: LayoutTemplate },
    { id: "settings", label: "Ajustes", Icon: Settings2 },
  ];

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-[170] flex justify-center px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-5",
        "pointer-events-none",
        className,
      )}
      aria-label="Creative Dock"
    >
      <div
        className="pointer-events-auto flex min-h-[66px] items-center gap-1 rounded-full border border-[#292F3A] bg-[#171B23]/88 px-2.5 py-2 shadow-[0_24px_70px_-28px_rgba(11,13,18,0.98)] backdrop-blur-lg backdrop-saturate-150 sm:min-h-[72px] sm:gap-1.5 sm:px-3"
        role="toolbar"
      >
        <DockButton item={items[0]} active={activeItem === items[0].id} onClick={() => onNavigate?.(items[0].id)} />
        <DockButton item={items[1]} active={activeItem === items[1].id} onClick={() => onNavigate?.(items[1].id)} />

        <button
          type="button"
          onClick={onCreate}
          className="group relative mx-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#8B5CF6] text-[#F5F7FA] shadow-[0_18px_42px_-12px_rgba(139,92,246,0.82)] ring-4 ring-[#171B23] transition duration-200 hover:bg-[#9D74F8] hover:shadow-[0_22px_48px_-10px_rgba(139,92,246,0.9)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F7FA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#171B23] sm:h-16 sm:w-16"
          aria-label="Criar novo convite"
          title="Criar novo"
        >
          <Plus className="h-6 w-6 transition-transform duration-200 group-hover:rotate-90 sm:h-7 sm:w-7" strokeWidth={2.2} />
          <span className="pointer-events-none absolute inset-1 rounded-full border border-[#F5F7FA]/14" aria-hidden="true" />
        </button>

        <DockButton item={items[2]} active={activeItem === items[2].id} onClick={() => onNavigate?.(items[2].id)} />
        <DockButton item={items[3]} active={activeItem === items[3].id} onClick={() => onNavigate?.(items[3].id)} />
      </div>
    </nav>
  );
}

function DockButton({
  item,
  active,
  onClick,
}: {
  item: { id: CreativeDockItem; label: string; Icon: typeof Home };
  active: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-full transition duration-180 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/55 sm:h-14 sm:w-14",
        active
          ? "bg-[#8B5CF6]/10 text-[#8B5CF6]"
          : "text-[#A9B1BF] hover:bg-[#171B23] hover:text-[#F5F7FA]",
      )}
      title={item.label}
    >
      <item.Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" aria-hidden="true" />
      <span className="max-w-[54px] truncate text-[9px] font-medium leading-none sm:text-[10px]">
        {item.label}
      </span>
    </button>
  );
}
