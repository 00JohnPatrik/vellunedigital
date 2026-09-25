import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { canUseAdminArea, homeFor, loadAppUser } from "@/lib/app-user";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Convitely — Convites digitais" },
      { name: "description", content: "Plataforma para criar e gerenciar convites digitais." },
      { property: "og:title", content: "Convitely — Convites digitais" },
      { property: "og:description", content: "Plataforma para criar e gerenciar convites digitais." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
    const appUser = await loadAppUser(data.user.id);
    if (!canUseAdminArea(appUser)) throw redirect({ to: "/login" });
    throw redirect({ to: homeFor(appUser) });
  },
  component: () => null,
});
