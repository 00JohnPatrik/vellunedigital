import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { LogOut, Mail, Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { ThemeDialog } from "@/components/theme-dialog";
import { applyTheme, type AppUser } from "@/lib/app-user";
import type { NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

type Props = { base: "/admin" | "/dashboard"; nav: NavItem[]; appUser: AppUser; children: ReactNode };

export function AppShell({ base, nav, appUser, children }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState(appUser.theme);
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => applyTheme(theme), [theme]);

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
          <Link key={item.slug} to={to} activeOptions={{ exact: !item.slug }} onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            activeProps={{ className: "bg-sidebar-accent text-sidebar-accent-foreground font-medium" }}
            title={item.label}>
            <item.icon className="h-4 w-4 shrink-0" />
            {!compact && <span className="truncate">{item.label}</span>}
          </Link>
        );
      })}
      <button onClick={signOut} title="Sair"
        className="mt-auto flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent">
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

  return (
    <div className="min-h-screen bg-background">
      <aside aria-label="Navegação principal" className={cn("fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-sidebar-border bg-sidebar transition-[width] md:flex",
        collapsed ? "w-16" : "w-16 lg:w-60")}>
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

      <div className={cn("flex min-h-screen flex-col transition-[padding]", collapsed ? "md:pl-16" : "md:pl-16 lg:pl-60")}>
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menu" aria-expanded={mobileOpen} aria-controls="mobile-navigation">
            <Menu className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="hidden lg:inline-flex" onClick={() => setCollapsed((c) => !c)} aria-label="Recolher menu">
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </Button>
          <div className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            {appUser.company?.name ?? "Administração global"}
          </div>
          <div className="text-right">
            <div className="text-sm font-medium leading-tight">{appUser.name}</div>
            <div className="text-xs text-muted-foreground">{appUser.role === "super_admin" ? "Super admin" : "Admin da empresa"}</div>
          </div>
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
      <div className="mt-6 rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        Este módulo será implementado em uma próxima fase.
      </div>
    </div>
  );
}
