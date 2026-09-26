import { supabase } from "@/integrations/supabase/client";

// Logical delete / restore — super admin only (enforced by DB triggers + RLS). Nothing is physically deleted.

export type TrashKind = "customer" | "template" | "invitation";
export const TRASH_LABEL: Record<TrashKind, string> = { customer: "Cliente", template: "Modelo", invitation: "Convite" };
export type TrashItem = {
  kind: TrashKind; id: string; name: string; company: string | null; customer: string | null; category: string | null;
  deleted_at: string; deleted_by: string | null;
};

type Row = {
  id: string; name: string; deleted_at: string | null; updated_at: string; category?: string;
  company: { name: string } | null; deleter: { name: string } | null; customer?: { name: string } | null;
};

export const trashKey = ["admin", "trash"] as const;

export async function listTrash(): Promise<TrashItem[]> {
  const [c, t, i] = await Promise.all([
    supabase.from("customers").select("id, name, deleted_at, updated_at, company:companies(name), deleter:users!customers_deleted_by_fkey(name)").not("deleted_at", "is", null),
    supabase.from("templates").select("id, name, category, deleted_at, updated_at, company:companies(name), deleter:users!templates_deleted_by_fkey(name)").not("deleted_at", "is", null),
    supabase.from("invitations").select("id, name, deleted_at, updated_at, company:companies(name), customer:customers(name), deleter:users!invitations_deleted_by_fkey(name)").eq("status", "deleted"),
  ]);
  const err = c.error ?? t.error ?? i.error;
  if (err) throw err;
  const map = (kind: TrashKind, rows: unknown) => (rows as Row[]).map((r): TrashItem => ({
    kind, id: r.id, name: r.name, company: r.company?.name ?? null, customer: r.customer?.name ?? null, category: r.category ?? null,
    deleted_at: r.deleted_at ?? r.updated_at, deleted_by: r.deleter?.name ?? null,
  }));
  return [...map("customer", c.data), ...map("template", t.data), ...map("invitation", i.data)]
    .sort((a, b) => b.deleted_at.localeCompare(a.deleted_at));
}

export async function softDelete(kind: TrashKind, id: string) {
  const q = kind === "invitation"
    ? supabase.from("invitations").update({ status: "deleted" }).eq("id", id)
    : supabase.from(kind === "customer" ? "customers" : "templates").update({ deleted_at: new Date().toISOString() }).eq("id", id);
  const { error } = await q;
  if (error) throw error;
}

/** Restores the item. Invitations come back as draft (previous state is not stored). */
export async function restore(kind: TrashKind, id: string) {
  const q = kind === "invitation"
    ? supabase.from("invitations").update({ status: "draft" }).eq("id", id)
    : supabase.from(kind === "customer" ? "customers" : "templates").update({ deleted_at: null }).eq("id", id);
  const { error } = await q;
  if (error) throw error;
}
