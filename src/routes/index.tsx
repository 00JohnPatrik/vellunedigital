import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { canUseAdminArea, homeFor, loadAppUser } from "@/lib/app-user";
import { isDemoMode, getDemoUser } from "@/lib/demo-mode";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({ meta: [{ title: "Vellune Digital — Convites digitais" }, { name: "description", content: "Plataforma para criar e gerenciar convites digitais." }] }),
  beforeLoad: async () => {
    if (isDemoMode()) throw redirect({ to: "/dashboard" });
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const appUser = await loadAppUser(data.user.id);
    if (!canUseAdminArea(appUser)) throw redirect({ to: "/login" });
    throw redirect({ to: homeFor(appUser) });
  },
  component: () => null,
});

void getDemoUser;
