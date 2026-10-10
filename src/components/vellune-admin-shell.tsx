import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { FileText, LayoutTemplate, Search, UserRound, X } from "lucide-react";
import { VelluneTopBar } from "@/components/vellune-top-bar";
import { NotificationCenter } from "@/components/phase7-ui";
import type { AppUser } from "@/lib/app-user";
import { adminNav } from "@/lib/nav";
import { searchWorkspaceContent } from "@/lib/global-search";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { applyTheme } from "@/lib/app-user";

const MODULES = adminNav.map((item) => ({
  label: item.label,
  to: item.to ?? (item.slug ? `/admin/${item.slug}` : "/admin"),
  icon: item.icon,
}));

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.slice(0, 2).map((word) => word[0]).join("") || "VA").toUpperCase();
}

export function VelluneAdminShell({ appUser, children, className }: { appUser: AppUser; children: ReactNode; className?: string }) {
  const [search, setSearch] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const matchRoute = useMatchRoute();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const isShortcut = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (isShortcut) {
        event.preventDefault();
        setSearchOpen(true);
      }
      if (event.key === "Escape") {
        setSearchOpen(false);
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return term ? MODULES.filter((item) => item.label.toLowerCase().includes(term)) : MODULES;
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

  const go = (to: string) => {
    setMenuOpen(false);
    void navigate({ to });
  };

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
        avatarFallback={initials(appUser.name)}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar empresas, clientes, convites ou áreas"
        onSearchActivate={() => setSearchOpen(true)}
        onAvatarClick={() => go("/admin/configuracoes")}
        onSignOut={signOut}
        showNotifications={false}
        trailingActions={<NotificationCenter appUser={appUser} />}
      />

      <main className="mx-auto w-full max-w-[1540px] px-4 pb-32 pt-20 sm:px-6 sm:pt-24 lg:px-8">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-[max(14px,env(safe-area-inset-bottom))] z-[170] flex justify-center px-3 sm:px-5 pointer-events-none" aria-label="Creative Dock administrativo">
        <div className="pointer-events-auto flex min-h-[66px] items-center gap-1 rounded-full border border-border bg-card/88 px-2.5 py-2 shadow-vellune backdrop-blur-lg backdrop-saturate-150 sm:min-h-[72px] sm:gap-1.5 sm:px-3">
          <AdminDockButton label="Início" active={Boolean(matchRoute({ to: "/admin", fuzzy: false }))} onClick={() => go("/admin")} icon={adminNav[0]!.icon} />
          <AdminDockButton label="Empresas" active={Boolean(matchRoute({ to: "/admin/companies", fuzzy: true }))} onClick={() => go("/admin/companies")} icon={adminNav[1]!.icon} />
          <AdminDockButton label="Usuários" active={Boolean(matchRoute({ to: "/admin/users", fuzzy: true }))} onClick={() => go("/admin/users")} icon={adminNav[2]!.icon} />
          <button
            type="button"
            onClick={() => go("/admin/companies/new")}
            className="group relative mx-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-vellune ring-4 ring-card transition duration-200 hover:bg-primary-hover active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-card sm:h-16 sm:w-16"
            aria-label="Cadastrar empresa"
            title="Cadastrar empresa"
          >
            <span className="text-xl font-medium sm:text-2xl">+</span>
          </button>
          <AdminDockButton label="Planos" active={Boolean(matchRoute({ to: "/admin/plans", fuzzy: true }))} onClick={() => go("/admin/plans")} icon={adminNav[3]!.icon} />
          <AdminDockButton label="Relatórios" active={Boolean(matchRoute({ to: "/admin/reports", fuzzy: true }))} onClick={() => go("/admin/reports")} icon={adminNav[7]!.icon} />
          <div className="relative">
            {menuOpen && (
              <div className="absolute bottom-[calc(100%+12px)] right-0 w-[min(320px,calc(100vw-24px))] rounded-[22px] border border-border bg-card/98 p-2 shadow-vellune backdrop-blur-xl">
                <div className="flex items-center justify-between px-2.5 pb-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-normal text-muted-foreground">Administração</p>
                    <p className="mt-0.5 text-[11px] text-foreground">Todas as áreas do Super Admin</p>
                  </div>
                  <button type="button" onClick={() => setMenuOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-card hover:text-foreground" aria-label="Fechar menu">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-1">
                  {MODULES.map((item) => (
                    <Link key={item.to} to={item.to as any} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-xs font-medium text-muted-foreground transition hover:border-primary/18 hover:bg-card hover:text-foreground">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card text-primary">
                        <item.icon className="h-4 w-4" />
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <button type="button" onClick={() => setMenuOpen((value) => !value)} className={cn("flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-full transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55 sm:h-14 sm:w-14", menuOpen ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-card hover:text-foreground")} aria-expanded={menuOpen} aria-haspopup="menu" title="Todas as áreas">
              {menuOpen ? <X className="h-[18px] w-[18px]" /> : <span className="text-base font-semibold">•••</span>}
              <span className="max-w-[54px] truncate text-[9px] font-medium leading-none sm:text-[10px]">Menu</span>
            </button>
          </div>
        </div>
      </nav>

      {searchOpen && (
        <div className="fixed inset-0 z-[240] flex items-start justify-center bg-background/76 p-3 pt-20 backdrop-blur-sm sm:pt-28" role="presentation" onMouseDown={() => setSearchOpen(false)}>
          <section className="w-full max-w-xl overflow-hidden rounded-[26px] border border-border bg-card shadow-vellune" role="dialog" aria-modal="true" aria-label="Busca global administrativa" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar empresas, clientes, convites, modelos ou áreas..." className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" aria-label="Buscar empresas, clientes, convites, modelos ou áreas" />
              <button type="button" onClick={() => setSearchOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-card hover:text-foreground" aria-label="Fechar busca">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[min(68vh,36rem)] overflow-y-auto p-2">
              {filtered.length > 0 && <div className="mb-2 px-3 pt-1 text-[9px] font-semibold uppercase tracking-normal text-muted-foreground">Áreas administrativas</div>}
              {filtered.map((item) => (
                <Link key={item.to} to={item.to as any} onClick={() => { setSearchOpen(false); setSearch(""); }} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-muted-foreground transition hover:bg-card hover:text-foreground">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><item.icon className="h-4 w-4" /></span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}

              {search.trim().length < 2 ? (
                <div className="px-4 py-10 text-center">
                  <Search className="mx-auto h-5 w-5 text-primary/70" />
                  <p className="mt-2 text-sm font-medium text-foreground">Busque em toda a plataforma</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Encontre empresas, clientes, convites e modelos usando os dados disponíveis para sua conta.</p>
                </div>
              ) : contentSearch.isLoading ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">Pesquisando...</div>
              ) : contentSearch.isError ? (
                <div className="px-4 py-10 text-center text-sm text-muted-foreground">Não foi possível pesquisar agora.</div>
              ) : contentSearch.data?.length ? (
                <div className="mt-2">
                  <div className="mb-2 px-3 pt-1 text-[9px] font-semibold uppercase tracking-normal text-muted-foreground">Resultados de conteúdo</div>
                  {contentSearch.data.map((item) => {
                    const Icon = item.type === "invitation" ? FileText : item.type === "customer" ? UserRound : LayoutTemplate;
                    return (
                      <Link key={`${item.type}-${item.id}`} to={item.to as any} onClick={() => { setSearchOpen(false); setSearch(""); }} className="group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-muted-foreground transition hover:bg-card hover:text-foreground">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background text-primary transition group-hover:bg-primary/10"><Icon className="h-4 w-4" /></span>
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
                <div className="px-4 pb-4 text-center text-[10px] text-muted-foreground">Tente nome da empresa, cliente, convite, modelo ou texto do design.</div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function AdminDockButton({ label, active, onClick, icon: Icon }: { label: string; active: boolean; onClick: () => void; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <button type="button" onClick={onClick} aria-current={active ? "page" : undefined} className={cn("flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-full transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/55 sm:h-14 sm:w-14", active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-card hover:text-foreground")}>
      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      <span className="max-w-[54px] truncate text-[9px] font-medium leading-none sm:text-[10px]">{label}</span>
    </button>
  );
}
