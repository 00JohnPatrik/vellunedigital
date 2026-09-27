import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { canUseAdminArea, loadAppUser } from "@/lib/app-user";
import { PresenceTracker } from "@/components/presence-tracker";

// AuthGuard: signed-in + active account, profile/company/role resolved automatically.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
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
      <PresenceTracker />
      <Outlet />
    </>
  ),
});
