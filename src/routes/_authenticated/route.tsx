import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { canUseAdminArea, loadAppUser } from "@/lib/app-user";
import { PresenceTracker } from "@/components/presence-tracker";
import { isDemoMode } from "@/lib/demo-mode";
import { AuthSessionGuard } from "@/components/auth-session-guard";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (isDemoMode()) {
      return { user: { id: "demo-auth-user" }, appUser: await loadAppUser("demo-auth-user") };
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    const appUser = await loadAppUser(data.user.id);
    if (!canUseAdminArea(appUser)) {
      await supabase.auth.signOut();
      throw redirect({ to: "/login", search: { error: "inactive" } });
    }
    return { user: data.user, appUser };
  },
  component: () => (
    <>
      {!isDemoMode() && <PresenceTracker />}
      {!isDemoMode() && <AuthSessionGuard />}
      <Outlet />
    </>
  ),
});
