import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { adminNav, companyNav } from "@/lib/nav";

// PermissionGuard + CompanyScopeGuard: company_admin with active company, or super_admin (global).
export const Route = createFileRoute("/_authenticated/invitations")({
  beforeLoad: ({ context }) => {
    const u = context.appUser;
    if (u.role === "company_admin" && !u.company) throw redirect({ to: "/login", search: { error: "inactive" } });
  },
  head: () => ({ meta: [{ title: "Convites — Convitely" }, { name: "robots", content: "noindex" }] }),
  component: InvitationsLayout,
});

function InvitationsLayout() {
  const { appUser } = Route.useRouteContext();
  const isSuper = appUser.role === "super_admin";
  return (
    <AppShell base={isSuper ? "/admin" : "/dashboard"} nav={isSuper ? adminNav : companyNav} appUser={appUser}>
      <Outlet />
    </AppShell>
  );
}
