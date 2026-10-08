import { createFileRoute, Outlet, redirect, useMatchRoute, useRouteContext } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { adminNav, companyNav } from "@/lib/nav";

// PermissionGuard + CompanyScopeGuard: company_admin with active company, or super_admin (global).
export const Route = createFileRoute("/_authenticated/invitations")({
  beforeLoad: ({ context }) => {
    const u = context.appUser!;
    if (u.role === "company_admin" && !u.company) throw redirect({ to: "/login", search: { error: "inactive" } });
  },
  head: () => ({ meta: [{ title: "Convites — Vellune Digital" }, { name: "robots", content: "noindex" }] }),
  component: InvitationsLayout,
});

function InvitationsLayout() {
  // Read the authenticated parent context explicitly. This keeps the editor
  // inside the same auth boundary while allowing it to escape the application shell.
  const { appUser } = useRouteContext({ from: "/_authenticated" });
  const matchRoute = useMatchRoute();
  if (!appUser) return null;

  const isEditor = Boolean(matchRoute({ to: "/invitations/$id/editor", fuzzy: false }));
  if (isEditor) {
    return (
      <div className="min-h-[100dvh] w-full overflow-hidden bg-[#08090d]">
        <Outlet />
      </div>
    );
  }

  const isSuper = appUser.role === "super_admin";
  return (
    <AppShell base={isSuper ? "/admin" : "/dashboard"} nav={isSuper ? adminNav : companyNav} appUser={appUser}>
      <Outlet />
    </AppShell>
  );
}
