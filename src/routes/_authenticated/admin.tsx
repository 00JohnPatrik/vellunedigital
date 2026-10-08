import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { VelluneAdminShell } from "@/components/vellune-admin-shell";
import { isDemoMode } from "@/lib/demo-mode";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: ({ context }) => {
    if (!isDemoMode() && context.appUser!.role !== "super_admin") throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Administração — Vellune Digital" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const { appUser: routeAppUser } = Route.useRouteContext();
  const appUser = routeAppUser!;
  return (
    <VelluneAdminShell appUser={appUser}>
      <Outlet />
    </VelluneAdminShell>
  );
}
