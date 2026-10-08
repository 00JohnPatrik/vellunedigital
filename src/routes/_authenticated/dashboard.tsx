import { createFileRoute, Outlet, redirect, useMatchRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { VelluneCompanyShell } from "@/components/vellune-company-shell";
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
  const matchRoute = useMatchRoute();
  const legacyLayout = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("legacy") === "1";
  const isDashboardHome = Boolean(matchRoute({ to: "/dashboard/", fuzzy: false }));

  if (legacyLayout) {
    return <AppShell base="/dashboard" nav={companyNav} appUser={appUser}><Outlet /></AppShell>;
  }

  return (
    <VelluneCompanyShell appUser={appUser} activeItem={isDashboardHome ? "home" : "projects"}>
      <Outlet />
    </VelluneCompanyShell>
  );
}
