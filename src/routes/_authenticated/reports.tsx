import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { VelluneCompanyShell } from "@/components/vellune-company-shell";

// Company reports: company_admin with active company only (super admin uses /admin/reports).
export const Route = createFileRoute("/_authenticated/reports")({
  beforeLoad: ({ context }) => {
    const u = context.appUser!;
    if (u.role === "super_admin") throw redirect({ to: "/admin/reports" });
    if (!u.company) throw redirect({ to: "/login", search: { error: "inactive" } });
  },
  head: () => ({ meta: [{ title: "Relatórios — Vellune Digital" }, { name: "robots", content: "noindex" }] }),
  component: ReportsLayout,
});

function ReportsLayout() {
  const { appUser: routeAppUser } = Route.useRouteContext();
  const appUser = routeAppUser!;
  return (
    <VelluneCompanyShell appUser={appUser} activeItem="projects">
      <Outlet />
    </VelluneCompanyShell>
  );
}
