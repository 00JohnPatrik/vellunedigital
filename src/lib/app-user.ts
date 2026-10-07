import { supabase } from "@/integrations/supabase/client";

export type AppRole = "super_admin" | "company_admin";
export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  status: "active" | "inactive";
  theme: "light" | "dark" | null;
  company: { id: string; name: string; status: "active" | "inactive" } | null;
};

/** Loads the signed-in user's profile, company and role (RLS-scoped). */
export async function loadAppUser(authUserId: string): Promise<AppUser | null> {
  if (typeof window !== "undefined") {
    const { isDemoMode, getDemoUser } = await import("@/lib/demo-mode");
    if (isDemoMode()) return getDemoUser();
  }
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, role, status, deleted_at, theme, company:companies!users_company_id_fkey(id, name, status, deleted_at)")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error || !data) return null;
  const d = data as unknown as AppUser & { deleted_at: string | null; company: (AppUser["company"] & { deleted_at: string | null }) | null };
  // Items in the trash lose access immediately (treated as inactive).
  return { ...d, status: d.deleted_at ? "inactive" : d.status, company: d.company ? { ...d.company, status: d.company.deleted_at ? "inactive" : d.company.status } : null };
}

/** Account can use the admin area (active user; company admins need an active company). */
export function canUseAdminArea(u: AppUser | null): u is AppUser {
  if (!u || u.status !== "active") return false;
  if (u.role === "company_admin") return !!u.company && u.company.status === "active";
  return u.role === "super_admin";
}

export const homeFor = (u: AppUser) => (u.role === "super_admin" ? "/admin" : "/dashboard");

export function applyTheme(theme: "light" | "dark" | null) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function isAuthServiceUnavailable(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /failed to fetch|fetch failed|networkerror|network error|timeout|timed out|service unavailable|temporarily unavailable|bad gateway|gateway timeout|502|503|504/i.test(message);
}

export function friendlyAuthError(msg?: string) {
  if (!msg) return "Algo deu errado. Tente novamente.";
  if (/invalid login/i.test(msg)) return "E-mail ou senha inválidos.";
  if (/rate|too many/i.test(msg)) return "Muitas tentativas. Aguarde alguns minutos.";
  if (/weak|pwned|leaked/i.test(msg)) return "Senha fraca ou já exposta em vazamentos. Escolha outra.";
  if (/same.*password|different from the old/i.test(msg)) return "A nova senha deve ser diferente da anterior.";
  return "Algo deu errado. Tente novamente.";
}
