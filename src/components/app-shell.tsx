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
import { applyTheme, type AppUser } from "@/lib/app-user";
import type { NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

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
  const [onlineCount, setOnlineCount] = useState(1);
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => applyTheme(theme), [theme]);

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
      setOnlineCount(Math.max(1, Object.keys(state).length));
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
    <nav className="flex flex-1 flex-col gap-1 p-3">
      {nav.map((item) => {
        const to = item.to ?? (item.slug ? `${base}/${item.slug}` : base);
        return (
          <Link
            key={`${item.slug}-${item.label}`}
            to={to}
            activeOptions={{ exact: !item.slug }}
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium" }}
            title={item.label}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!compact && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
      <button
        onClick={signOut}
        title="Sair"
        className="mt-auto flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {!compact && <span>Sair</span>}
      </button>
    </nav>
  );

  const brand = (compact: boolean) => (
    <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Mail className="h-4 w-4" />
      </span>
      {!compact && <span className="font-display font-semibold">Vellune Digital</span>}
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
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-sidebar-border bg-sidebar transition-[width] md:flex",
          collapsed ? "w-16" : "w-16 lg:w-60",
        )}
      >
        <div className="hidden lg:block">{brand(collapsed)}</div>
        <div className="lg:hidden">{brand(true)}</div>
        <div className="hidden flex-1 lg:flex">{links(collapsed)}</div>
        <div className="flex flex-1 lg:hidden">{links(true)}</div>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent id="mobile-navigation" side="left" className="flex w-64 flex-col bg-sidebar p-0">
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

      <div className={cn("flex min-h-screen flex-col transition-[padding]", collapsed ? "md:pl-16" : "md:pl-16 lg:pl-60")}>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menu" aria-expanded={mobileOpen} aria-controls="mobile-navigation">
            <Menu className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={() => setCollapsed((current) => !current)} aria-label="Recolher menu">
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </Button>
          <button onClick={() => setSearchOpen(true)} className="hidden min-w-0 flex-1 items-center gap-2 text-left text-sm text-muted-foreground sm:flex" aria-label="Abrir busca global">
            <Search className="h-4 w-4" />
            <span className="truncate">Buscar no painel...</span>
            <kbd className="ml-auto hidden rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium lg:inline-flex">Ctrl K</kbd>
          </button>
          <div className="min-w-0 flex-1 truncate text-sm text-muted-foreground sm:hidden">{appUser.company?.name ?? "Administração global"}</div>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground lg:flex" title={`${onlineCount} usuário(s) online`}>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <Users className="h-3.5 w-3.5" />
            <span>{onlineCount} online</span>
          </div>
          <Button variant="ghost" size="icon" aria-label="Notificações" title="Notificações">
            <Bell className="h-4 w-4" />
          </Button>
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
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
