import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { canUseAdminArea, loadAppUser } from "@/lib/app-user";
import { isDemoMode } from "@/lib/demo-mode";

export function AuthSessionGuard() {
  const navigate = useNavigate();
  const redirectingRef = useRef(false);

  useEffect(() => {
    if (isDemoMode()) return;

    const enforceSession = async () => {
      if (redirectingRef.current) return;

      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) {
          redirectingRef.current = true;
          await supabase.auth.signOut().catch(() => undefined);
          navigate({ to: "/login", replace: true });
          return;
        }

        const appUser = await loadAppUser(data.user.id);
        if (!canUseAdminArea(appUser)) {
          redirectingRef.current = true;
          await supabase.auth.signOut().catch(() => undefined);
          navigate({ to: "/login", search: { error: "inactive" }, replace: true });
        }
      } catch {
        // Keep the current session alive on transient checks; the next
        // visibility event or interval will retry.
      }
    };

    const runDeferred = () => {
      window.setTimeout(() => void enforceSession(), 0);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" || event === "USER_UPDATED") {
        runDeferred();
      }
    });

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") runDeferred();
    };

    document.addEventListener("visibilitychange", onVisibilityChange);
    const interval = window.setInterval(() => void enforceSession(), 5 * 60 * 1000);
    runDeferred();

    return () => {
      authListener.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(interval);
    };
  }, [navigate]);

  return null;
}
