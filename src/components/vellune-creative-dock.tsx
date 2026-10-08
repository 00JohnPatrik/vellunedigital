import { FolderOpen, Home, LayoutTemplate, Plus, Settings2, MoreHorizontal, LayoutDashboard, Users, BarChart3, CreditCard, Palette, Mail, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  type Item = { id: CreativeDockItem; label: string; Icon: typeof Home };
  const defaultMenuItems = [
    { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    { label: "Convites", to: "/invitations", icon: Mail },
    { label: "Clientes", to: "/customers", icon: Users },
    { label: "Modelos", to: "/templates", icon: LayoutTemplate },
    { label: "Resultados", to: "/reports", icon: BarChart3 },
    { label: "Plano", to: "/dashboard/assinatura", icon: CreditCard },
    { label: "Sua marca", to: "/settings/brand", icon: Palette },
    { label: "Configurações", to: "/dashboard/configuracoes", icon: Settings2 },
  ] as const;
  const completeMenu = defaultMenuItems;
  const items: [Item, Item, Item, Item] = [
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
        className="pointer-events-auto flex min-h-[66px] items-center gap-1 rounded-full border border-[#2a2b31] bg-[#111318]/88 px-2.5 py-2 shadow-[0_24px_70px_-28px_rgba(11,13,18,0.98)] backdrop-blur-lg backdrop-saturate-150 sm:min-h-[72px] sm:gap-1.5 sm:px-3"
        role="toolbar"
      >
        <DockButton item={items[0]} active={activeItem === items[0].id} onClick={() => onNavigate?.(items[0].id)} />
        <DockButton item={items[1]} active={activeItem === items[1].id} onClick={() => onNavigate?.(items[1].id)} />

        <button
          type="button"
          onClick={onCreate}
          className="group relative mx-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#d4af37] text-[#16130b] shadow-[0_18px_42px_-12px_rgba(212,175,55,0.72)] ring-4 ring-[#111318] transition duration-200 hover:bg-[#e5c66b] hover:shadow-[0_22px_48px_-10px_rgba(212,175,55,0.82)] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F7FA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111318] sm:h-16 sm:w-16"
          aria-label="Criar novo convite"
          title="Criar novo"
        >
          <Plus className="h-6 w-6 transition-transform duration-200 group-hover:rotate-90 sm:h-7 sm:w-7" strokeWidth={2.2} />
          <span className="pointer-events-none absolute inset-1 rounded-full border border-[#16130b]/14" aria-hidden="true" />
        </button>

        <DockButton item={items[2]} active={activeItem === items[2].id} onClick={() => onNavigate?.(items[2].id)} />
        <DockButton item={items[3]} active={activeItem === items[3].id} onClick={() => onNavigate?.(items[3].id)} />
        <div className="relative">
          {menuOpen && (
            <div className="absolute bottom-[calc(100%+12px)] right-0 w-[min(320px,calc(100vw-24px))] rounded-[22px] border border-[#2a2b31] bg-[#111318]/98 p-2 shadow-[0_28px_80px_-28px_rgba(8,9,13,0.98)] backdrop-blur-xl">
              <div className="flex items-center justify-between px-2.5 pb-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A9B1BF]">Navegação</p>
                  <p className="mt-0.5 text-[11px] text-[#F5F7FA]">Todas as áreas da Vellune</p>
                </div>
                <button type="button" onClick={() => setMenuOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#A9B1BF] hover:bg-[#111318] hover:text-[#F5F7FA]" aria-label="Fechar menu">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid gap-1">
                {completeMenu.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to as any}
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-xs font-medium text-[#A9B1BF] transition hover:border-[#d4af37]/18 hover:bg-[#111318] hover:text-[#F5F7FA]"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#111318] text-[#d4af37]">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className={cn(
              "flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-full transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/55 sm:h-14 sm:w-14",
              menuOpen ? "bg-[#d4af37]/10 text-[#d4af37]" : "text-[#A9B1BF] hover:bg-[#111318] hover:text-[#F5F7FA]",
            )}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            title="Todas as áreas"
          >
            {menuOpen ? <X className="h-[18px] w-[18px] sm:h-5 sm:w-5" /> : <MoreHorizontal className="h-[18px] w-[18px] sm:h-5 sm:w-5" />}
            <span className="max-w-[54px] truncate text-[9px] font-medium leading-none sm:text-[10px]">Menu</span>
          </button>
        </div>
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
        "flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-full transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/55 sm:h-14 sm:w-14",
        active
          ? "bg-[#d4af37]/10 text-[#d4af37]"
          : "text-[#A9B1BF] hover:bg-[#111318] hover:text-[#F5F7FA]",
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
