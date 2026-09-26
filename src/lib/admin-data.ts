import { supabase } from "@/integrations/supabase/client";
import type { Status } from "@/components/admin-ui";

// Super admin data access through the browser client — RLS (is_super_admin) enforces access.

export type Company = { id: string; name: string; type: string | null; status: Status; created_at: string; updated_at: string };
export type CompanyRow = Company & { users: { id: string; name: string; role: string; status: Status }[] };
export type CompanyAdmin = {
  id: string; name: string; email: string; phone: string | null; role: "company_admin"; status: Status;
  company_id: string; auth_user_id: string | null; created_at: string; updated_at: string;
  company: { id: string; name: string; status: Status } | null;
};

export const companiesKey = ["admin", "companies"] as const;
export const usersKey = ["admin", "users"] as const;

export async function listCompanies(): Promise<CompanyRow[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("id, name, type, status, created_at, updated_at, users(id, name, role, status)")
    .is("deleted_at", null).order("name");
  if (error) throw error;
  return data as unknown as CompanyRow[];
}

export async function getCompany(id: string): Promise<Company | null> {
  const { data, error } = await supabase.from("companies").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as Company | null;
}

const userCols = "id, name, email, phone, role, status, company_id, auth_user_id, created_at, updated_at, company:companies(id, name, status)";

export async function listCompanyAdmins(companyId?: string): Promise<CompanyAdmin[]> {
  let q = supabase.from("users").select(userCols).eq("role", "company_admin").is("deleted_at", null).order("name");
  if (companyId) q = q.eq("company_id", companyId);
  const { data, error } = await q;
  if (error) throw error;
  return data as unknown as CompanyAdmin[];
}

export async function getCompanyAdmin(id: string): Promise<CompanyAdmin | null> {
  const { data, error } = await supabase.from("users").select(userCols).eq("id", id).eq("role", "company_admin").maybeSingle();
  if (error) throw error;
  return data as unknown as CompanyAdmin | null;
}

export const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);

async function setStatus(table: "companies" | "users", id: string, status: Status, label: string) {
  const { toast } = await import("sonner");
  const { error } = await supabase.from(table).update({ status }).eq("id", id);
  if (error) { toast.error("Não foi possível alterar o status."); throw error; }
  toast.success(`${label} ${status === "active" ? "ativado(a)" : "inativado(a)"}.`);
}
export const setCompanyStatus = (id: string, s: Status) => setStatus("companies", id, s, "Empresa");
export const setUserStatus = (id: string, s: Status) => setStatus("users", id, s, "Usuário");

/** Soft delete / restore of companies and company admins (super admin only — enforced by DB triggers). */
export async function setDeleted(table: "companies" | "users", id: string, deleted: boolean) {
  const { error } = await supabase.from(table).update({ deleted_at: deleted ? new Date().toISOString() : null }).eq("id", id);
  if (error) throw error;
}
