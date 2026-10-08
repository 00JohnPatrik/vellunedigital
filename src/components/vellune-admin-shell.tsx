import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { VelluneTopBar } from "@/components/vellune-top-bar";
import { NotificationCenter } from "@/components/phase7-ui";
import type { AppUser } from "@/lib/app-user";
import { adminNav } from "@/lib/nav";
import { searchWorkspaceContent } from "@/lib/global-search";
import { cn } from "@/lib/utils";

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
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
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

  const contentSearch = useQuery({
    queryKey: ["global-search", appUser.role, appUser.id, search.trim().toLowerCase()],
    queryFn: () => searchWorkspaceContent(search, appUser.role),
    enabled: searchOpen && search.trim().length >= 2,
    staleTime: 30_000,
    retry: 1,
  });

  const go = (to: string) => {
    setMenuOpen(false);
    void navigate({ to });
  };

  return (
    <div className={cn("vellune-platform-root dark min-h-[100dvh] bg-[#08090d] text-[#F5F7FA]", className)}>
      <VelluneTopBar
        avatarFallback={initials(appUser.name)}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar empresas, clientes, convites ou áreas"
        onSearchActivate={() => setSearchOpen(true)}
        onAvatarClick={() => go("/admin/configuracoes")}
        showNotifications={false}
        trailingActions={<NotificationCenter appUser={appUser} />}
      />

      <main className="mx-auto w-full max-w-[1540px] px-4 pb-32 pt-20 sm:px-6 sm:pt-24 lg:px-8">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-[170] flex justify-center px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 sm:px-5 sm:pb-5 pointer-events-none" aria-label="Creative Dock administrativo">
        <div className="pointer-events-auto flex min-h-[66px] items-center gap-1 rounded-full border border-[#2a2b31] bg-[#111318]/88 px-2.5 py-2 shadow-[0_24px_70px_-28px_rgba(11,13,18,0.98)] backdrop-blur-lg backdrop-saturate-150 sm:min-h-[72px] sm:gap-1.5 sm:px-3">
          <AdminDockButton label="Início" active={Boolean(matchRoute({ to: "/admin", fuzzy: false }))} onClick={() => go("/admin")} icon={adminNav[0]!.icon} />
          <AdminDockButton label="Empresas" active={Boolean(matchRoute({ to: "/admin/companies", fuzzy: true }))} onClick={() => go("/admin/companies")} icon={adminNav[1]!.icon} />
          <AdminDockButton label="Usuários" active={Boolean(matchRoute({ to: "/admin/users", fuzzy: true }))} onClick={() => go("/admin/users")} icon={adminNav[2]!.icon} />
          <button
            type="button"
            onClick={() => go("/admin/companies/new")}
            className="group relative mx-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[#d4af37] text-[#16130b] shadow-[0_18px_42px_-12px_rgba(212,175,55,0.72)] ring-4 ring-[#111318] transition duration-200 hover:bg-[#e5c66b] active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5F7FA] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111318] sm:h-16 sm:w-16"
            aria-label="Cadastrar empresa"
            title="Cadastrar empresa"
          >
            <span className="text-xl font-medium sm:text-2xl">+</span>
          </button>
          <AdminDockButton label="Planos" active={Boolean(matchRoute({ to: "/admin/plans", fuzzy: true }))} onClick={() => go("/admin/plans")} icon={adminNav[3]!.icon} />
          <AdminDockButton label="Relatórios" active={Boolean(matchRoute({ to: "/admin/reports", fuzzy: true }))} onClick={() => go("/admin/reports")} icon={adminNav[7]!.icon} />
          <div className="relative">
            {menuOpen && (
              <div className="absolute bottom-[calc(100%+12px)] right-0 w-[min(320px,calc(100vw-24px))] rounded-[22px] border border-[#2a2b31] bg-[#111318]/98 p-2 shadow-[0_28px_80px_-28px_rgba(8,9,13,0.98)] backdrop-blur-xl">
                <div className="flex items-center justify-between px-2.5 pb-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A9B1BF]">Administração</p>
                    <p className="mt-0.5 text-[11px] text-[#F5F7FA]">Todas as áreas do Super Admin</p>
                  </div>
                  <button type="button" onClick={() => setMenuOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#A9B1BF] hover:bg-[#17181e] hover:text-[#F5F7FA]" aria-label="Fechar menu">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-1">
                  {MODULES.map((item) => (
                    <Link key={item.to} to={item.to as any} onClick={() => setMenuOpen(false)} className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-left text-xs font-medium text-[#A9B1BF] transition hover:border-[#d4af37]/18 hover:bg-[#17181e] hover:text-[#F5F7FA]">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#17181e] text-[#d4af37]">
                        <item.icon className="h-4 w-4" />
                      </span>
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            <button type="button" onClick={() => setMenuOpen((value) => !value)} className={cn("flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-full transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/55 sm:h-14 sm:w-14", menuOpen ? "bg-[#d4af37]/10 text-[#d4af37]" : "text-[#A9B1BF] hover:bg-[#111318] hover:text-[#F5F7FA]")} aria-expanded={menuOpen} aria-haspopup="menu" title="Todas as áreas">
              {menuOpen ? <X className="h-[18px] w-[18px]" /> : <span className="text-base font-semibold">•••</span>}
              <span className="max-w-[54px] truncate text-[9px] font-medium leading-none sm:text-[10px]">Menu</span>
            </button>
          </div>
        </div>
      </nav>

      {searchOpen && (
        <div className="fixed inset-0 z-[240] flex items-start justify-center bg-[#08090d]/76 p-3 pt-20 backdrop-blur-sm sm:pt-28" role="presentation" onMouseDown={() => setSearchOpen(false)}>
          <section className="w-full max-w-xl overflow-hidden rounded-[26px] border border-[#2a2b31] bg-[#111318] shadow-[0_32px_100px_-30px_rgba(0,0,0,0.98)]" role="dialog" aria-modal="true" aria-label="Busca global administrativa" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-[#2a2b31] px-4 py-3">
              <Search className="h-4 w-4 text-[#A9B1BF]" />
              <input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar empresas, clientes, convites, modelos ou áreas..." className="min-w-0 flex-1 bg-transparent text-sm text-[#F5F7FA] outline-none placeholder:text-[#A9B1BF]" aria-label="Buscar empresas, clientes, convites, modelos ou áreas" />
              <button type="button" onClick={() => setSearchOpen(false)} className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#A9B1BF] hover:bg-[#17181e] hover:text-[#F5F7FA]" aria-label="Fechar busca">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[min(68vh,36rem)] overflow-y-auto p-2">
              {filtered.length > 0 && <div className="mb-2 px-3 pt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#A9B1BF]">Áreas administrativas</div>}
              {filtered.map((item) => (
                <Link key={item.to} to={item.to as any} onClick={() => { setSearchOpen(false); setSearch(""); }} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-[#A9B1BF] transition hover:bg-[#17181e] hover:text-[#F5F7FA]">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d4af37]/10 text-[#d4af37]"><item.icon className="h-4 w-4" /></span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}

              {search.trim().length < 2 ? (
                <div className="px-4 py-10 text-center">
                  <Search className="mx-auto h-5 w-5 text-[#d4af37]/70" />
                  <p className="mt-2 text-sm font-medium text-[#F5F7FA]">Busque em toda a plataforma</p>
                  <p className="mt-1 text-xs leading-5 text-[#A9B1BF]">Encontre empresas, clientes, convites e modelos usando os dados disponíveis para sua conta.</p>
                </div>
              ) : contentSearch.isLoading ? (
                <div className="px-4 py-10 text-center text-sm text-[#A9B1BF]">Pesquisando...</div>
              ) : contentSearch.isError ? (
                <div className="px-4 py-10 text-center text-sm text-[#A9B1BF]">Não foi possível pesquisar agora.</div>
              ) : contentSearch.data?.length ? (
                <div className="mt-2">
                  <div className="mb-2 px-3 pt-1 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#A9B1BF]">Resultados de conteúdo</div>
                  {contentSearch.data.map((item) => {
                    const Icon = item.type === "invitation" ? FileText : item.type === "customer" ? UserRound : LayoutTemplate;
                    return (
                      <Link key={`${item.type}-${item.id}`} to={item.to as any} onClick={() => { setSearchOpen(false); setSearch(""); }} className="group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-[#A9B1BF] transition hover:bg-[#17181e] hover:text-[#F5F7FA]">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#08090d] text-[#d4af37] transition group-hover:bg-[#d4af37]/10"><Icon className="h-4 w-4" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-[#F5F7FA]">{item.title}</span>
                          <span className="mt-0.5 block truncate text-[11px] text-[#A9B1BF]">{item.subtitle}</span>
                        </span>
                        {item.meta && <span className="shrink-0 rounded-full border border-[#2a2b31] px-2 py-1 text-[9px] text-[#A9B1BF]">{item.meta}</span>}
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="px-4 py-10 text-center text-sm text-[#A9B1BF]">Nenhum conteúdo encontrado para “{search.trim()}”.</div>
              )}

              {filtered.length === 0 && search.trim().length >= 2 && !contentSearch.data?.length && !contentSearch.isLoading && (
                <div className="px-4 pb-4 text-center text-[10px] text-[#A9B1BF]">Tente nome da empresa, cliente, convite, modelo ou texto do design.</div>
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
    <button type="button" onClick={onClick} aria-current={active ? "page" : undefined} className={cn("flex h-12 w-12 flex-col items-center justify-center gap-0.5 rounded-full transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/55 sm:h-14 sm:w-14", active ? "bg-[#d4af37]/10 text-[#d4af37]" : "text-[#A9B1BF] hover:bg-[#111318] hover:text-[#F5F7FA]")}>
      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      <span className="max-w-[54px] truncate text-[9px] font-medium leading-none sm:text-[10px]">{label}</span>
    </button>
  );
}
