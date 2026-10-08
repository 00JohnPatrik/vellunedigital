import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { VelluneTopBar } from "@/components/vellune-top-bar";
import { VelluneCreativeDock } from "@/components/vellune-creative-dock";
import { NotificationCenter } from "@/components/phase7-ui";
import type { AppUser } from "@/lib/app-user";
import { companyNav } from "@/lib/nav";
import { cn } from "@/lib/utils";

type Props = {
  appUser: AppUser;
  children: ReactNode;
  activeItem?: "home" | "projects" | "templates" | "settings";
  className?: string;
};

const MODULES = companyNav.filter((item) => Boolean(item.to)).map((item) => ({ label: item.label, to: item.to!, icon: item.icon }));



function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return (words.slice(0, 2).map((word) => word[0]).join("") || "VD").toUpperCase();
}

export function VelluneCompanyShell({ appUser, children, activeItem = "home", className }: Props) {
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();

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

  return (
    <div className={cn("vellune-platform-root dark min-h-[100dvh] bg-[#08090d] text-[#F5F7FA]", className)}>
      <VelluneTopBar
        avatarFallback={initials(appUser.name)}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Buscar área ou módulo"
        onSearchActivate={() => setSearchOpen(true)}
        onAvatarClick={() => navigate({ to: "/settings" })}
        showNotifications={false}
        trailingActions={<NotificationCenter appUser={appUser} />}
      />

      <main className="mx-auto w-full max-w-[1540px] px-4 pb-32 pt-20 sm:px-6 sm:pt-24 lg:px-8">
        {children}
      </main>

      <VelluneCreativeDock
        activeItem={activeItem}
        onCreate={() => navigate({ to: "/invitations/new" })}
        onNavigate={(item) => {
          if (item === "home") { void navigate({ to: "/dashboard" }); return; }
          if (item === "projects") { void navigate({ to: "/invitations" }); return; }
          if (item === "templates") { void navigate({ to: "/templates" }); return; }
          void navigate({ to: "/settings" });
        }}
      />

      {searchOpen && (
        <div
          className="fixed inset-0 z-[240] flex items-start justify-center bg-[#08090d]/76 p-3 pt-20 backdrop-blur-sm sm:pt-28"
          role="presentation"
          onMouseDown={() => setSearchOpen(false)}
        >
          <section
            className="w-full max-w-xl overflow-hidden rounded-[26px] border border-[#2a2b31] bg-[#111318] shadow-[0_32px_100px_-30px_rgba(0,0,0,0.98)]"
            role="dialog"
            aria-modal="true"
            aria-label="Busca global"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-center gap-3 border-b border-[#2a2b31] px-4 py-3">
              <Search className="h-4 w-4 text-[#A9B1BF]" />
              <input
                autoFocus
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar área ou módulo..."
                className="min-w-0 flex-1 bg-transparent text-sm text-[#F5F7FA] outline-none placeholder:text-[#A9B1BF]"
                aria-label="Buscar área ou módulo"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#A9B1BF] hover:bg-[#17181e] hover:text-[#F5F7FA]"
                aria-label="Fechar busca"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[min(60vh,30rem)] overflow-y-auto p-2">
              {filtered.length ? filtered.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to as any}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm text-[#A9B1BF] transition hover:bg-[#17181e] hover:text-[#F5F7FA]"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d4af37]/10 text-[#d4af37]">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              }) : (
                <div className="px-4 py-8 text-center text-sm text-[#A9B1BF]">Nenhuma área encontrada.</div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
