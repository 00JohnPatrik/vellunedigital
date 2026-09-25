import { supabase } from "@/integrations/supabase/client";
import type { InvitationStatus } from "@/lib/invitations";

// All metrics are derived from real rows under RLS (company admins only ever see their own company).

export type ReportRow = {
  id: string; company_id: string; name: string; customer_name: string | null; event_date: string; event_time: string;
  status: InvitationStatus; updated_at: string; views: number; confirmed: number; declined: number; people: number;
};

export async function fetchReport(companyId?: string | null): Promise<ReportRow[]> {
  const { data, error } = await supabase.rpc("invitation_report" as never, { _company_id: companyId ?? null } as never);
  if (error) throw error;
  return ((data ?? []) as ReportRow[]).map((r) => ({
    ...r, views: Number(r.views), confirmed: Number(r.confirmed), declined: Number(r.declined), people: Number(r.people),
  }));
}

export function totals(rows: ReportRow[]) {
  return rows.reduce(
    (t, r) => ({ invitations: t.invitations + 1, views: t.views + r.views, confirmed: t.confirmed + r.confirmed, declined: t.declined + r.declined, people: t.people + r.people }),
    { invitations: 0, views: 0, confirmed: 0, declined: 0, people: 0 },
  );
}

export function upcoming(rows: ReportRow[], limit = 5) {
  const today = new Date().toISOString().slice(0, 10);
  return rows.filter((r) => r.event_date >= today)
    .sort((a, b) => (a.event_date + a.event_time).localeCompare(b.event_date + b.event_time))
    .slice(0, limit);
}

export type RecentResponse = { id: string; name: string; status: "confirmed" | "declined"; people_count: number; created_at: string; invitation: { name: string } | null };

export async function recentResponses(limit = 5): Promise<RecentResponse[]> {
  const { data, error } = await supabase.from("rsvp_responses")
    .select("id, name, status, people_count, created_at, invitation:invitations(name)")
    .order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data as unknown as RecentResponse[];
}

export async function globalCounts() {
  const [c, u] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);
  if (c.error) throw c.error;
  if (u.error) throw u.error;
  return { companies: c.count ?? 0, users: u.count ?? 0 };
}
