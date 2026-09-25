import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { adminNav } from "@/lib/nav";

// PermissionGuard: only super_admin.
export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: ({ context }) => {
    if (context.appUser.role !== "super_admin") throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Administração — Convitely" }, { name: "robots", content: "noindex" }] }),
  component: AdminLayout,
});

function AdminLayout() {
  const { appUser } = Route.useRouteContext();
  return (
    <AppShell base="/admin" nav={adminNav} appUser={appUser}>
      <Outlet />
    </AppShell>
  );
}
