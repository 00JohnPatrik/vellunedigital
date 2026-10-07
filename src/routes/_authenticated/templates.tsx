import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { companyNav } from "@/lib/nav";

// PermissionGuard + CompanyScopeGuard: company_admin with active company only.
export const Route = createFileRoute("/_authenticated/templates")({
  beforeLoad: ({ context }) => {
    const u = context.appUser!;
    if (u.role === "super_admin") throw redirect({ to: "/admin/templates" });
    if (!u.company) throw redirect({ to: "/login", search: { error: "inactive" } });
  },
  head: () => ({ meta: [{ title: "Modelos — Vellune Digital" }, { name: "robots", content: "noindex" }] }),
  component: () => {
    const { appUser: routeAppUser } = Route.useRouteContext();
  const appUser = routeAppUser!;
    return <AppShell base="/dashboard" nav={companyNav} appUser={appUser}><Outlet /></AppShell>;
  },
});
