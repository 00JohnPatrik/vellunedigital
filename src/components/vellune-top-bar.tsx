import { Bell, ChevronDown, LogOut, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  onSignOut?: () => void;
  navigationAction?: ReactNode;
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
  onSignOut,
  navigationAction,
}: VelluneTopBarProps) {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return (
    <header
      className={cn(
        "vellune-topbar fixed inset-x-0 top-0 z-[180] grid h-14 grid-cols-[minmax(0,1fr)_auto] items-center border-b px-3 sm:h-16 sm:px-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)] lg:px-6",
        "bg-background/82 text-foreground backdrop-blur-md",
        "border-border shadow-vellune",
        className,
      )}
      aria-label="Menu superior da Vellune Digital"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
        {navigationAction}
        {leadingAction}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-display text-[14px] font-extrabold tracking-normal text-foreground sm:text-[15px]">
              VELLUNE
            </span>
            <span className="hidden items-center gap-1.5 text-[10px] font-medium text-success sm:inline-flex" title={online ? "Conexão ativa" : "Sem conexão com a internet"}>
              <span
                aria-hidden="true"
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  online
                    ? "bg-success shadow-vellune"
                    : "bg-warning shadow-vellune",
                )}
              />
              {online ? "Live Sync" : "Sem conexão"}
            </span>
          </div>
        </div>
      </div>

      <div className="hidden min-w-0 flex-[0.85] justify-center px-4 lg:flex">
        <label className="group flex h-10 w-full max-w-[560px] items-center gap-2 rounded-xl border border-border bg-card px-3.5 transition hover:border-primary-hover/50 focus-within:border-primary">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            value={searchValue}
            readOnly={readOnlySearch}
            onClick={onSearchActivate}
            onFocus={onSearchActivate}
            onChange={(event) => onSearchChange?.(event.target.value)}
            placeholder={searchPlaceholder}
            className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Buscar"
          />
          <kbd className="hidden rounded-md border border-border bg-background px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground xl:inline-block">
            ⌘K
          </kbd>
        </label>
      </div>

      <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
        <div className="flex items-center gap-1 lg:gap-1.5">{mobileActions}</div>
        {trailingActions}
        {showNotifications && <Button variant="ghost"
          type="button"
          onClick={onNotifications}
          className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-card hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55"
          aria-label={
            notificationCount > 0
              ? `Notificações (${notificationCount})`
              : "Notificações"
          }
          title="Notificações"
        >
          <Bell className="h-[18px] w-[18px]" />
          {notificationCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute right-2 top-2 h-2 w-2 rounded-full bg-warning ring-2 ring-background"
            />
          )}
        </Button>}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost"
              type="button"
              className="group inline-flex items-center gap-2 rounded-full p-0.5 transition hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55"
              aria-label="Abrir menu da conta"
              title="Conta — configurações e sair"
            >
              <span className="relative inline-flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-primary bg-card text-[10px] font-bold text-foreground shadow-vellune sm:h-10 sm:w-10">
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  avatarFallback.slice(0, 2).toUpperCase()
                )}
              </span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground transition group-hover:text-foreground md:block" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={10} className="w-52 border-border bg-card text-foreground shadow-vellune">
            <DropdownMenuLabel className="text-xs font-medium text-muted-foreground">Minha conta</DropdownMenuLabel>
            {onAvatarClick && (
              <>
                <DropdownMenuItem
                  onSelect={onAvatarClick}
                  className="cursor-pointer focus:bg-card focus:text-foreground"
                >
                  <Settings className="h-4 w-4" />
                  Configurações
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
              </>
            )}
            <DropdownMenuItem
              onSelect={() => onSignOut?.()}
              disabled={!onSignOut}
              className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sair da conta
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
