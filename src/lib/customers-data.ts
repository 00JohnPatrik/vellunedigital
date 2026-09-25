import { supabase } from "@/integrations/supabase/client";
import type { Status } from "@/components/admin-ui";

// Customers access through the browser client — RLS scopes rows to the user's company (or global for super_admin).

export type Customer = {
  id: string; company_id: string; name: string; phone: string | null; email: string | null;
  observation: string | null; status: Status; created_at: string; updated_at: string;
  company?: { id: string; name: string } | null;
};
export type CustomerValues = { name: string; phone: string; email: string; observation: string; status: Status };

export const customersKey = ["customers"] as const;
const cols = "id, company_id, name, phone, email, observation, status, created_at, updated_at, company:companies(id, name)";

export async function listCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase.from("customers").select(cols).order("name");
  if (error) throw error;
  return data as unknown as Customer[];
}

export async function getCustomer(id: string): Promise<Customer | null> {
  const { data, error } = await supabase.from("customers").select(cols).eq("id", id).maybeSingle();
  if (error) throw error;
  return data as unknown as Customer | null;
}

/** Possible duplicate in the same company (same e-mail or phone). */
export async function findDuplicate(v: { email: string; phone: string }, companyId: string, excludeId?: string) {
  const ors = [v.email && `email.eq.${v.email}`, v.phone && `phone.eq.${v.phone}`].filter(Boolean).join(",");
  if (!ors) return null;
  let q = supabase.from("customers").select("id, name").eq("company_id", companyId).or(ors).limit(1);
  if (excludeId) q = q.neq("id", excludeId);
  const { data } = await q;
  return data?.[0] ?? null;
}

export const toRow = (v: CustomerValues) => ({
  name: v.name, phone: v.phone || null, email: v.email || null, observation: v.observation || null, status: v.status,
});
