import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

const HEARTBEAT_MS = 60_000;
const ACTIVITY_THROTTLE_MS = 30_000;

/** Mantém a presença do usuário autenticado sem criar consultas contínuas pesadas. */
export function PresenceTracker() {
  const lastWrite = useRef(0);
  const initialized = useRef(false);

  useEffect(() => {
    let disposed = false;
    let timer: number | undefined;
    let userId: string | null = null;

    const writePresence = async (login = false) => {
      if (!userId || disposed) return;
      const now = Date.now();
      if (!login && now - lastWrite.current < ACTIVITY_THROTTLE_MS) return;
      const payload: { last_seen_at: string; last_login_at?: string } = {
        last_seen_at: new Date(now).toISOString(),
      };
      if (login) payload.last_login_at = payload.last_seen_at;
      const { error } = await supabase.from("users").update(payload).eq("auth_user_id", userId);
      if (!error) lastWrite.current = now;
    };

    const start = async () => {
      const { data } = await supabase.auth.getSession();
      userId = data.session?.user.id ?? null;
      if (!userId || disposed) return;
      if (!initialized.current) {
        initialized.current = true;
        // A page reload is not a new login. Only the SIGNED_IN auth event
        // should advance last_login_at; startup merely refreshes presence.
        await writePresence();
      } else {
        await writePresence();
      }
      timer = window.setInterval(() => void writePresence(), HEARTBEAT_MS);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") void writePresence();
    };
    const onActivity = () => void writePresence();

    void start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pointerdown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity, { passive: true });

    const { data: subscription } = supabase.auth.onAuthStateChange((event, session) => {
      userId = session?.user.id ?? null;
      if (event === "SIGNED_IN" && session) void writePresence(true);
      else if (session) void writePresence();
    });

    return () => {
      disposed = true;
      if (timer) window.clearInterval(timer);
      subscription.subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
    };
  }, []);

  return null;
}

export type PresenceStatus = "online" | "away" | "offline";

export function getPresenceStatus(lastSeenAt: string | null | undefined, now = Date.now()): PresenceStatus {
  if (!lastSeenAt) return "offline";
  const age = now - new Date(lastSeenAt).getTime();
  if (age <= 2 * 60_000) return "online";
  if (age <= 10 * 60_000) return "away";
  return "offline";
}

export function presenceLabel(status: PresenceStatus) {
  return status === "online" ? "Online" : status === "away" ? "Ausente" : "Offline";
}

export function presenceClass(status: PresenceStatus) {
  return status === "online" ? "bg-emerald-500" : status === "away" ? "bg-amber-500" : "bg-slate-400";
}
