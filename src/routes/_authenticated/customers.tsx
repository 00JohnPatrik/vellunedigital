import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { VelluneCompanyShell } from "@/components/vellune-company-shell";
import { VelluneAdminShell } from "@/components/vellune-admin-shell";

// PermissionGuard + CompanyScopeGuard: company_admin with active company, or super_admin (global).
export const Route = createFileRoute("/_authenticated/customers")({
  beforeLoad: ({ context }) => {
    const u = context.appUser!;
    if (u.role === "company_admin" && !u.company) throw redirect({ to: "/login", search: { error: "inactive" } });
  },
  head: () => ({ meta: [{ title: "Clientes — Vellune Digital" }, { name: "robots", content: "noindex" }] }),
  component: CustomersLayout,
});

function CustomersLayout() {
  const { appUser: routeAppUser } = Route.useRouteContext();
  const appUser = routeAppUser!;
  const isSuper = appUser.role === "super_admin";
  if (!isSuper) {
    return <VelluneCompanyShell appUser={appUser} activeItem="projects"><Outlet /></VelluneCompanyShell>;
  }
  return (
    <VelluneAdminShell appUser={appUser}>
      <Outlet />
    </VelluneAdminShell>
  );
}
