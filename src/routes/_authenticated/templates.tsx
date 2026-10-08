import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { VelluneCompanyShell } from "@/components/vellune-company-shell";

// PermissionGuard + CompanyScopeGuard: company_admin with active company only.
export const Route = createFileRoute("/_authenticated/templates")({
  beforeLoad: ({ context }) => {
    const u = context.appUser!;
    if (u.role === "super_admin") throw redirect({ to: "/admin/templates" });
    if (!u.company) throw redirect({ to: "/login", search: { error: "inactive" } });
  },
  head: () => ({ meta: [{ title: "Modelos — Vellune Digital" }, { name: "robots", content: "noindex" }] }),
  component: () => {
    const { appUser } = Route.useRouteContext();
    return <VelluneCompanyShell appUser={appUser!} activeItem="templates"><Outlet /></VelluneCompanyShell>;
  },
});
