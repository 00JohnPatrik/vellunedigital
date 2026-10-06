import { supabase } from "@/integrations/supabase/client";
import { isDemoMode, listDemoTrash, restoreDemoTrash, type DemoTrashItem } from "@/lib/demo-mode";

export type TrashKind = "customer" | "template" | "invitation" | "company" | "admin";
export const TRASH_LABEL: Record<TrashKind, string> = { customer: "Cliente", template: "Modelo", invitation: "Convite", company: "Empresa", admin: "Administrador" };
export type TrashItem = {
  kind: TrashKind; id: string; name: string; company: string | null; customer: string | null; category: string | null; email: string | null;
  deleted_at: string; deleted_by: string | null;
};

type Row = {
  id: string; name: string; deleted_at: string | null; updated_at: string; category?: string; email?: string;
  company: { name: string } | null; deleter: { name: string } | null; customer?: { name: string } | null;
};

export const trashKey = ["admin", "trash"] as const;

function mapDemoItem(item: DemoTrashItem): TrashItem {
  return item;
}

export async function listTrash(): Promise<TrashItem[]> {
  if (isDemoMode()) return listDemoTrash().map(mapDemoItem);
  const [c, t, i, co, ad] = await Promise.all([
    supabase.from("customers").select("id, name, deleted_at, updated_at, company:companies(name), deleter:users!customers_deleted_by_fkey(name)").not("deleted_at", "is", null),
    supabase.from("templates").select("id, name, category, deleted_at, updated_at, company:companies(name), deleter:users!templates_deleted_by_fkey(name)").not("deleted_at", "is", null),
    supabase.from("invitations").select("id, name, deleted_at, updated_at, company:companies(name), customer:customers(name), deleter:users!invitations_deleted_by_fkey(name)").eq("status", "deleted"),
    supabase.from("companies").select("id, name, deleted_at, updated_at, deleter:users!companies_deleted_by_fkey(name)").not("deleted_at", "is", null),
    supabase.from("users").select("id, name, email, deleted_at, updated_at, company:companies!users_company_id_fkey(name), deleter:users!deleted_by(name)").eq("role", "company_admin").not("deleted_at", "is", null),
  ]);
  const err = c.error ?? t.error ?? i.error ?? co.error ?? ad.error;
  if (err) throw err;
  const map = (kind: TrashKind, rows: unknown) => (rows as Row[]).map((r): TrashItem => ({
    kind, id: r.id, name: r.name, company: (r as Partial<Row>).company?.name ?? null, customer: r.customer?.name ?? null, category: r.category ?? null, email: r.email ?? null,
    deleted_at: r.deleted_at ?? r.updated_at, deleted_by: r.deleter?.name ?? null,
  }));
  return [...map("customer", c.data), ...map("template", t.data), ...map("invitation", i.data), ...map("company", co.data), ...map("admin", ad.data)]
    .sort((a, b) => b.deleted_at.localeCompare(a.deleted_at));
}

export async function softDelete(kind: TrashKind, id: string) {
  if (isDemoMode()) return;
  if (kind === "company" || kind === "admin") throw new Error("use setDeleted");
  const q = kind === "invitation"
    ? supabase.from("invitations").update({ status: "deleted" }).eq("id", id)
    : supabase.from(kind === "customer" ? "customers" : "templates").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  const { error } = await q;
  if (error) throw error;
}

export async function restore(kind: TrashKind, id: string) {
  if (isDemoMode()) {
    restoreDemoTrash(kind, id);
    return;
  }
  if (kind === "company" || kind === "admin") {
    const { error } = await supabase.from(kind === "company" ? "companies" : "users").update({ deleted_at: null }).eq("id", id);
    if (error) throw error;
    return;
  }
  const q = kind === "invitation"
    ? supabase.from("invitations").update({ status: "draft" }).eq("id", id)
    : supabase.from(kind === "customer" ? "customers" : "templates").update({ deleted_at: null }).eq("id", id);
  const { error } = await q;
  if (error) throw error;
}
