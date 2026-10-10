import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { FileText, LayoutTemplate, Search, UserRound, X, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { VelluneTopBar } from "@/components/vellune-top-bar";
import { VelluneCreativeDock } from "@/components/vellune-creative-dock";
import { NotificationCenter } from "@/components/phase7-ui";
import type { AppUser } from "@/lib/app-user";
import { companyNav } from "@/lib/nav";
import { searchWorkspaceContent } from "@/lib/global-search";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { applyTheme } from "@/lib/app-user";

type Props = {
  appUser: AppUser;
  children: ReactNode;
  activeItem?: "home" | "projects" | "templates" | "settings";
  className?: string;
};

const MODULES = companyNav.filter((item) => Boolean(item.to)).map((item) => ({ label: item.label, to: item.to ?? "/dashboard", icon: item.icon }));



function PlusGlyph() { return <span className="text-base font-semibold">+</span>; }

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.slice(0, 2).map((word) => word[0]).join("") || "VD").toUpperCase();
}

export function VelluneCompanyShell({ appUser, children, activeItem = "home", className }: Props) {
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isShortcut) {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term
      ? MODULES.filter((item) => item.label.toLowerCase().includes(term))
      : MODULES;
  }, [search]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(search.trim().toLowerCase()), 220);
    return () => window.clearTimeout(timer);
  }, [search]);

  const contentSearch = useQuery({
    queryKey: ["global-search", appUser.role, appUser.id, searchTerm],
    queryFn: () => searchWorkspaceContent(searchTerm, appUser.role),
    enabled: searchOpen && searchTerm.length >= 2,
    staleTime: 30_000,
    retry: 1,
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    applyTheme(null);
    void navigate({ to: "/login", replace: true });
  }

  return (
    <div className={cn("vellune-platform-root dark min-h-[100dvh] bg-background text-foreground", className)}>
      <VelluneTopBar
        navigationAction={<DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="shrink-0 rounded-full text-muted-foreground" aria-label="Todas as áreas"><Menu className="size-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="start" className="w-56"><DropdownMenuLabel>Seu espaço</DropdownMenuLabel>{MODULES.map(item => <DropdownMenuItem key={item.to} asChild><Link to={item.to}><item.icon className="size-4" />{item.label}</Link></DropdownMenuItem>)}</DropdownMenuContent></DropdownMenu>}
        avatarFallback={initials(appUser.name)}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar convites, clientes ou áreas"
        onSearchActivate={() => setSearchOpen(true)}
        onAvatarClick={() => navigate({ to: "/settings" })}
        onSignOut={signOut}
        showNotifications={false}
        trailingActions={<NotificationCenter appUser={appUser} />}
      />

      <main className="mx-auto w-full max-w-[1440px] px-4 pb-[calc(8rem+env(safe-area-inset-bottom))] pt-20 sm:px-6 sm:pt-24 lg:px-10">
        {children}
      </main>

      <VelluneCreativeDock
        activeItem={activeItem}
        onCreate={() => setCreateOpen(true)}
        onNavigate={(item) => {
          if (item === "home") { void navigate({ to: "/dashboard" }); return; }
          if (item === "projects") { void navigate({ to: "/invitations" }); return; }
          if (item === "templates") { void navigate({ to: "/templates" }); return; }
          void navigate({ to: "/settings" });
        }}
      />

      {createOpen && (
        <div className="fixed inset-0 z-[235] flex items-end justify-center bg-background/76 p-3 pb-24 backdrop-blur-sm sm:items-center sm:p-6" role="presentation" onMouseDown={() => setCreateOpen(false)}>
          <section className="w-full max-w-lg rounded-[28px] border border-border bg-card p-4 shadow-vellune sm:p-5" role="dialog" aria-modal="true" aria-label="Criar novo" onMouseDown={(event) => event.stopPropagation()}>
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-border" aria-hidden="true" />
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[10px] font-semibold uppercase tracking-normal text-muted-foreground">Criação rápida</p><h2 className="mt-1 font-display text-xl font-semibold text-foreground">O que vamos criar?</h2></div>
              <Button variant="ghost" type="button" onClick={() => setCreateOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground" aria-label="Fechar">×</Button>
            </div>
            <div className="mt-5 grid gap-2.5 sm:grid-cols-3">
              {[
                ["/invitations/new", "Novo convite", "Começar uma criação"],
                ["/templates", "Usar modelo", "Escolher uma composição pronta"],
                ["/invitations", "Ver projetos", "Abrir seus convites"],
              ].map(([to, title, description]) => (
                <Link key={to} to={to as any} onClick={() => setCreateOpen(false)} className="rounded-2xl border border-border bg-background/55 p-4 transition hover:-translate-y-0.5 hover:border-primary/45">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"><PlusGlyph /></span>
                  <p className="mt-3 text-sm font-semibold text-foreground">{title}</p>
                  <p className="mt-1 text-[10px] leading-4 text-muted-foreground">{description}</p>
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}

      {searchOpen && (
        <div
          className="fixed inset-0 z-[240] flex items-start justify-center bg-background/76 p-3 pt-20 backdrop-blur-sm sm:pt-28"
          role="presentation"
          onMouseDown={() => setSearchOpen(false)}
        >
          <section
            className="w-full max-w-xl overflow-hidden rounded-[26px] border border-border bg-card shadow-vellune"
            role="dialog"
            aria-modal="true"
            aria-label="Busca global da Vellune"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar convites, clientes, modelos ou áreas..."
                className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                aria-label="Buscar convites, clientes, modelos ou áreas"
              />
              <Button variant="ghost"
                type="button"
                onClick={() => setSearchOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-card hover:text-foreground"
                aria-label="Fechar busca"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="max-h-[min(68vh,36rem)] overflow-y-auto p-2">
              {filtered.length > 0 && (
                <div className="mb-2 px-3 pt-1 text-[9px] font-semibold uppercase tracking-normal text-muted-foreground">Áreas</div>
              )}
              {filtered.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to as any}
                    onClick={() => { setSearchOpen(false); setSearch(""); }}
                    className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-muted-foreground transition hover:bg-card hover:text-foreground"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}

              {search.trim().length < 2 ? (
                <div className="px-4 py-10 text-center">
                  <Search className="mx-auto h-5 w-5 text-primary/70" />
                  <p className="mt-2 text-sm font-medium text-foreground">Busque dentro da Vellune</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Procure convites, clientes, modelos ou qualquer conteúdo salvo.</p>
                </div>
              ) : contentSearch.isLoading ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">Pesquisando seus conteúdos...</div>
              ) : contentSearch.isError ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                  Não foi possível pesquisar agora. As áreas do menu continuam disponíveis.
                </div>
              ) : contentSearch.data?.length ? (
                <div className="mt-2">
                  <div className="mb-2 px-3 pt-1 text-[9px] font-semibold uppercase tracking-normal text-muted-foreground">Resultados</div>
                  {contentSearch.data.map((item) => {
                    const Icon = item.type === "invitation" ? FileText : item.type === "customer" ? UserRound : LayoutTemplate;
                    return (
                      <Link
                        key={`${item.type}-${item.id}`}
                        to={item.to as any}
                        onClick={() => { setSearchOpen(false); setSearch(""); }}
                        className="group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-muted-foreground transition hover:bg-card hover:text-foreground"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background text-primary transition group-hover:bg-primary/10">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-foreground">{item.title}</span>
                          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{item.subtitle}</span>
                        </span>
                        {item.meta && <span className="shrink-0 rounded-full border border-border px-2 py-1 text-[9px] text-muted-foreground">{item.meta}</span>}
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhum conteúdo encontrado para “{search.trim()}”.</div>
              )}

              {filtered.length === 0 && search.trim().length >= 2 && !contentSearch.data?.length && !contentSearch.isLoading && (
                <div className="px-4 pb-4 text-center text-[10px] text-muted-foreground">Tente nome do convite, cliente, telefone, e-mail, local ou texto dentro do design.</div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
