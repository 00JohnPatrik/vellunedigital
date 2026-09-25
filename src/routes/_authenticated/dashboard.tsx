import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { companyNav } from "@/lib/nav";

// PermissionGuard + CompanyScopeGuard: company_admin bound to an active company.
export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: ({ context }) => {
    if (context.appUser.role === "super_admin") throw redirect({ to: "/admin" });
    if (!context.appUser.company) throw redirect({ to: "/login", search: { error: "inactive" } });
    return { companyId: context.appUser.company.id };
  },
  head: () => ({ meta: [{ title: "Painel — Vellune Digital" }, { name: "robots", content: "noindex" }] }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const { appUser } = Route.useRouteContext();
  return (
    <AppShell base="/dashboard" nav={companyNav} appUser={appUser}>
      <Outlet />
    </AppShell>
  );
}
