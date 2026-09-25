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
  const { data, error } = await supabase
    .from("users")
    .select("id, name, email, role, status, theme, company:companies(id, name, status)")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error || !data) return null;
  return data as unknown as AppUser;
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

export function friendlyAuthError(msg?: string) {
  if (!msg) return "Algo deu errado. Tente novamente.";
  if (/invalid login/i.test(msg)) return "E-mail ou senha inválidos.";
  if (/rate|too many/i.test(msg)) return "Muitas tentativas. Aguarde alguns minutos.";
  if (/weak|pwned|leaked/i.test(msg)) return "Senha fraca ou já exposta em vazamentos. Escolha outra.";
  if (/same.*password|different from the old/i.test(msg)) return "A nova senha deve ser diferente da anterior.";
  return "Algo deu errado. Tente novamente.";
}
