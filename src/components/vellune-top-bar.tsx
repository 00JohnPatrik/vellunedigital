import { Bell, ChevronDown, Search } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type VelluneTopBarProps = {
  avatarSrc?: string;
  avatarFallback?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  onNotifications?: () => void;
  notificationCount?: number;
  leadingAction?: ReactNode;
  trailingActions?: ReactNode;
  mobileActions?: ReactNode;
  readOnlySearch?: boolean;
  onSearchActivate?: () => void;
  className?: string;
  showNotifications?: boolean;
  onAvatarClick?: () => void;
};

export function VelluneTopBar({
  avatarSrc,
  avatarFallback = "JP",
  searchValue = "",
  onSearchChange,
  searchPlaceholder = "Buscar no editor",
  onNotifications,
  notificationCount = 0,
  leadingAction,
  trailingActions,
  mobileActions,
  readOnlySearch = false,
  onSearchActivate,
  className,
  showNotifications = true,
  onAvatarClick,
}: VelluneTopBarProps) {
  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-[180] flex h-14 items-center border-b px-3 sm:h-16 sm:px-4 lg:px-6",
        "bg-[#0B0D12]/82 text-[#F5F7FA] backdrop-blur-lg backdrop-saturate-150",
        "border-[#292F3A] shadow-[0_12px_34px_-24px_rgba(11,13,18,0.95)]",
        className,
      )}
      aria-label="Menu superior da Vellune Digital"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        {leadingAction}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-[14px] font-extrabold tracking-[0.08em] text-[#F5F7FA] sm:text-[15px]">
              VELLUNE
            </span>
            <span className="hidden items-center gap-1.5 text-[10px] font-medium text-[#A9B1BF] sm:inline-flex">
              <span
                aria-hidden="true"
                className="h-1.5 w-1.5 rounded-full bg-[#22C55E] shadow-[0_0_10px_rgba(34,197,94,0.45)]"
              />
              Live Sync
            </span>
          </div>
        </div>
      </div>

      <div className="hidden min-w-0 flex-[0.85] justify-center px-4 lg:flex">
        <label className="group flex h-10 w-full max-w-[560px] items-center gap-2 rounded-xl border border-[#292F3A] bg-[#171B23] px-3.5 transition hover:border-[#9D74F8]/50 focus-within:border-[#8B5CF6]">
          <Search className="h-4 w-4 shrink-0 text-[#A9B1BF]" aria-hidden="true" />
          <input
            value={searchValue}
            readOnly={readOnlySearch}
            onClick={onSearchActivate}
            onFocus={onSearchActivate}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder={searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-xs text-[#F5F7FA] outline-none placeholder:text-[#A9B1BF]"
            aria-label="Buscar"
          />
          <kbd className="hidden rounded-md border border-[#292F3A] bg-[#0B0D12] px-1.5 py-0.5 text-[9px] font-medium text-[#A9B1BF] xl:inline-block">
            ⌘K
          </kbd>
        </label>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1 lg:gap-1.5">{mobileActions}</div>
        {trailingActions}
        {showNotifications && <button
          type="button"
          onClick={onNotifications}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-[#A9B1BF] transition hover:bg-[#171B23] hover:text-[#F5F7FA] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/55"
          aria-label={
            notificationCount > 0
              ? `Notificações (${notificationCount})`
              : "Notificações"
          }
          title="Notificações"
        >
          <Bell className="h-[18px] w-[18px]" />
          <span
            aria-hidden="true"
            className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[#F59E0B] ring-2 ring-[#0B0D12]"
          />
        </button>}

        <button
          type="button"
          onClick={onAvatarClick}
          className="group inline-flex items-center gap-2 rounded-full p-0.5 transition hover:bg-[#171B23] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/55"
          aria-label="Abrir conta"
          title="Conta"
        >
          <span className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-[#8B5CF6] bg-[#171B23] text-[10px] font-bold text-[#F5F7FA] shadow-[0_0_0_2px_rgba(139,92,246,0.16)] sm:h-10 sm:w-10">
            {avatarSrc ? (
              <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
            ) : (
              avatarFallback.slice(0, 2).toUpperCase()
            )}
          </span>
          <ChevronDown className="hidden h-3.5 w-3.5 text-[#A9B1BF] transition group-hover:text-[#F5F7FA] md:block" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
