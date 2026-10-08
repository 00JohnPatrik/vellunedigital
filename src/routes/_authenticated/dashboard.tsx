import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { companyNav } from "@/lib/nav";

// PermissionGuard + CompanyScopeGuard: company_admin bound to an active company.
export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: ({ context }) => {
    if (context.appUser!.role === "super_admin") throw redirect({ to: "/admin" });
    if (!context.appUser!.company) throw redirect({ to: "/login", search: { error: "inactive" } });
    return { companyId: context.appUser!.company.id };
  },
  head: () => ({ meta: [{ title: "Painel — Vellune Digital" }, { name: "robots", content: "noindex" }] }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const { appUser: routeAppUser } = Route.useRouteContext();
  const appUser = routeAppUser!;
  const legacyLayout = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("legacy") === "1";

  if (!legacyLayout && typeof window !== "undefined" && window.location.pathname === "/dashboard") {
    return (
      <div className="dark min-h-[100dvh] w-full bg-[#0B0D12] text-[#F5F7FA]">
        <Outlet />
      </div>
    );
  }

  return (
    <AppShell base="/dashboard" nav={companyNav} appUser={appUser}>
      <Outlet />
    </AppShell>
  );
}
