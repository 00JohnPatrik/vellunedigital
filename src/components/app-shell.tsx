import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bell,
  Check,
  Command,
  LogOut,
  Mail,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  User,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeDialog } from "@/components/theme-dialog";
import { NotificationCenter } from "@/components/phase7-ui";
import { applyTheme, type AppUser } from "@/lib/app-user";
import type { NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";
import Logo from "@/components/Logo";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type Props = { base: "/admin" | "/dashboard"; nav: NavItem[]; appUser: AppUser; children: ReactNode };
type ThemeChoice = "light" | "dark" | null;

export function AppShell({ base, nav, appUser, children }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState<ThemeChoice>(appUser.theme);
  const [density, setDensity] = useState<"comfortable" | "compact">(() => {
    if (typeof window === "undefined") return "comfortable";
    return window.localStorage.getItem("vellune-density") === "compact" ? "compact" : "comfortable";
  });
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [isOnline, setIsOnline] = useState(() => typeof navigator === "undefined" || navigator.onLine);
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => applyTheme(theme), [theme]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    const channelName = appUser.company?.id ? `presence:company:${appUser.company.id}` : "presence:super-admin";
    const channel = supabase.channel(channelName, { config: { presence: { key: appUser.id } } });

    const updateCount = () => {
      const state = channel.presenceState();
      setOnlineCount(Object.keys(state).length);
    };

    channel
      .on("presence", { event: "sync" }, updateCount)
      .on("presence", { event: "join" }, updateCount)
      .on("presence", { event: "leave" }, updateCount)
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ user_id: appUser.id, name: appUser.name, online_at: new Date().toISOString() });
          updateCount();
        }
      });

    return () => {
      void channel.untrack();
      void supabase.removeChannel(channel);
    };
  }, [appUser.company?.id, appUser.id, appUser.name]);

  function updateDensity(next: "comfortable" | "compact") {
    setDensity(next);
    window.localStorage.setItem("vellune-density", next);
  }

  async function selectTheme(next: ThemeChoice) {
    setTheme(next);
    applyTheme(next);
    const { error } = await supabase.from("users").update({ theme: next }).eq("id", appUser.id);
    if (error) applyTheme(next);
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    applyTheme(null);
    navigate({ to: "/login", replace: true });
  }

  const links = (compact: boolean) => (
    <TooltipProvider delayDuration={compact ? 150 : 500}>
      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden p-3">
        <div className="space-y-1">
          {nav.map((item) => {
            const to = item.to ?? (item.slug ? `${base}/${item.slug}` : base);
            const link = (
              <Link
                key={`${item.slug}-${item.label}`}
                to={to}
                activeOptions={{ exact: !item.slug }}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group relative flex h-10 items-center gap-3 overflow-hidden rounded-xl border border-transparent px-3 text-sm text-sidebar-foreground/65 transition-all duration-200 hover:border-cyan-400/10 hover:bg-cyan-400/[0.07] hover:text-sidebar-foreground",
                  compact && "justify-center px-0",
                )}
                activeProps={{ className: "border-cyan-400/15 bg-cyan-400/[0.12] font-medium text-sidebar-foreground shadow-[inset_3px_0_0_0_theme(colors.cyan.400)]" }}
                aria-label={compact ? item.label : undefined}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0 text-sidebar-foreground/55 transition-colors group-hover:text-cyan-300 group-data-[active=true]:text-cyan-300" />
                {!compact && <span className="truncate">{item.label}</span>}
                {!compact && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cyan-300 opacity-0 shadow-[0_0_10px_theme(colors.cyan.300)] transition-opacity group-data-[active=true]:opacity-100" />}
              </Link>
            );

            if (!compact) return link;

            return (
              <Tooltip key={`${item.slug}-${item.label}-tooltip`}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={12} className="border border-cyan-300/15 bg-[#10243e] text-slate-100 shadow-xl">
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={signOut}
              aria-label="Sair"
              className={cn(
                "mt-auto flex h-10 items-center gap-3 rounded-xl border border-transparent px-3 text-sm text-sidebar-foreground/55 transition-all hover:border-rose-300/10 hover:bg-rose-400/[0.08] hover:text-rose-200",
                compact && "justify-center px-0",
              )}
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              {!compact && <span>Sair</span>}
            </button>
          </TooltipTrigger>
          {compact && <TooltipContent side="right" sideOffset={12} className="border border-rose-300/15 bg-[#10243e] text-slate-100 shadow-xl">Sair</TooltipContent>}
        </Tooltip>
      </nav>
    </TooltipProvider>
  );

  const brand = (compact: boolean) => (
    <div className={cn("flex h-[5.5rem] items-center border-b border-sidebar-border/70 px-4 text-sidebar-foreground", compact && "justify-center px-0")}>
      <Logo
        markOnly={compact}
        className={cn(
          "shrink-0",
          compact ? "h-10 w-10" : "h-14 w-[255px] max-w-full",
        )}
      />
    </div>
  );

  const filteredNav = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return nav;
    return nav.filter((item) => item.label.toLowerCase().includes(term));
  }, [nav, search]);

  return (
    <div className={cn("min-h-screen bg-background", density === "compact" && "[& main]:p-3 [& main]:sm:p-4 [& main]:lg:p-6")}>
      <aside
        aria-label="Navegação principal"
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-sidebar-border/70 bg-sidebar shadow-[12px_0_40px_-28px_rgba(34,211,238,0.45)] transition-[width] duration-300 md:flex dark:bg-[#071426]",
          collapsed ? "w-[4.5rem]" : "w-[4.5rem] lg:w-64",
        )}
      >
        <div className="hidden lg:block">{brand(collapsed)}</div>
        <div className="lg:hidden">{brand(true)}</div>
        <div className="hidden flex-1 lg:flex">{links(collapsed)}</div>
        <div className="flex flex-1 lg:hidden">{links(true)}</div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent id="mobile-navigation" side="left" className="flex w-[min(18rem,calc(100vw-1rem))] max-w-[calc(100vw-1rem)] flex-col overflow-hidden border-r border-cyan-300/10 bg-sidebar p-0 shadow-2xl dark:bg-[#071426]">
          <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
          {brand(false)}
          {links(false)}
        </SheetContent>
      </Sheet>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="top-[20%] translate-y-0 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Busca global</DialogTitle>
            <DialogDescription>Encontre rapidamente uma área disponível para sua conta.</DialogDescription>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar módulo..." className="pl-9" />
          </div>
          <div className="max-h-72 space-y-1 overflow-y-auto">
            {filteredNav.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Nenhum módulo encontrado.</p>
            ) : (
              filteredNav.map((item) => {
                const to = item.to ?? (item.slug ? `${base}/${item.slug}` : base);
                return (
                  <Link key={`${item.slug}-search`} to={to} onClick={() => setSearchOpen(false)} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted">
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span>{item.label}</span>
                  </Link>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <div className={cn("flex min-h-screen min-w-0 flex-col transition-[padding] duration-300 dark:bg-[#071426]", collapsed ? "md:pl-[4.5rem]" : "md:pl-[4.5rem] lg:pl-64")}>
        <header className="sticky top-0 z-20 flex h-[4.5rem] min-w-0 items-center gap-3 border-b border-border/60 bg-background/80 px-4 shadow-[0_8px_30px_-24px_rgba(34,211,238,0.45)] backdrop-blur-xl dark:border-white/[0.07] dark:bg-[#071426]/80 sm:px-6">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menu" aria-expanded={mobileOpen} aria-controls="mobile-navigation">
            <Menu className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={() => setCollapsed((current) => !current)} aria-label="Recolher menu">
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </Button>
          <button onClick={() => setSearchOpen(true)} className="group hidden min-w-0 flex-1 items-center gap-3 text-left text-sm text-muted-foreground sm:flex" aria-label="Abrir busca global">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/40 transition-colors group-hover:border-cyan-300/30 group-hover:bg-cyan-300/10">
              <Search className="h-4 w-4 transition-colors group-hover:text-cyan-300" />
            </span>
            <span className="truncate transition-colors group-hover:text-foreground">Buscar no painel...</span>
            <kbd className="ml-auto hidden rounded-lg border border-border/70 bg-muted/60 px-2 py-1 text-[10px] font-medium text-muted-foreground lg:inline-flex">Ctrl K</kbd>
          </button>
          <div className="min-w-0 flex-1 truncate text-sm text-muted-foreground sm:hidden">{appUser.company?.name ?? "Administração global"}</div>
          <div
            className={cn("hidden items-center gap-2 text-xs lg:flex", isOnline ? "text-muted-foreground" : "text-destructive")}
            title={!isOnline ? "Sem conexão com a internet" : onlineCount === null ? "Conectando à presença" : `${onlineCount} usuário(s) online`}
            role="status"
            aria-live="polite"
          >
            {isOnline ? <Wifi className="h-3.5 w-3.5" aria-hidden="true" /> : <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />}
            {isOnline ? (
              <>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{onlineCount === null ? "Conectando…" : `${onlineCount} online`}</span>
              </>
            ) : (
              <span>Offline</span>
            )}
          </div>
          {!isOnline && <span className="sr-only" role="alert">Você está sem conexão. Algumas ações podem aguardar a reconexão.</span>}
          <NotificationCenter appUser={appUser} />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 gap-2 px-2" aria-label="Abrir menu do usuário">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary"><User className="h-4 w-4" /></span>
                <span className="hidden max-w-32 text-right sm:block"><span className="block truncate text-sm font-medium">{appUser.name}</span><span className="block text-xs text-muted-foreground">{appUser.role === "super_admin" ? "Super admin" : "Admin da empresa"}</span></span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel className="font-normal"><span className="block truncate font-medium">{appUser.email}</span><span className="mt-1 flex items-center gap-1 text-xs font-normal text-muted-foreground"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Conta ativa</span></DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}><Settings className="mr-2 h-4 w-4" />Configurações</DropdownMenuItem>
              <DropdownMenuLabel className="text-xs text-muted-foreground">Tema</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => void selectTheme("light")}><Check className={cn("mr-2 h-4 w-4", theme !== "light" && "invisible")} />Claro</DropdownMenuItem>
              <DropdownMenuItem onClick={() => void selectTheme("dark")}><Check className={cn("mr-2 h-4 w-4", theme !== "dark" && "invisible")} />Escuro</DropdownMenuItem>
              <DropdownMenuLabel className="text-xs text-muted-foreground">Densidade</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => updateDensity("comfortable")}><Check className={cn("mr-2 h-4 w-4", density !== "comfortable" && "invisible")} />Confortável</DropdownMenuItem>
              <DropdownMenuItem onClick={() => updateDensity("compact")}><Check className={cn("mr-2 h-4 w-4", density !== "compact" && "invisible")} />Compacta</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut}><LogOut className="mr-2 h-4 w-4" />Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="min-w-0 flex-1 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.045),transparent_30%)] p-4 sm:p-6 lg:p-8">{children}</main>
      </div>

      <ThemeDialog open={theme === null} userId={appUser.id} onSaved={setTheme} />
    </div>
  );
}

export function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-6 rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Este módulo será implementado em uma próxima fase.</div>
    </div>
  );
}
