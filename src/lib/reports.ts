import { supabase } from "@/integrations/supabase/client";
import type { InvitationStatus } from "@/lib/invitations";
import { getDemoInvitation, listDemoRsvpResponses, isDemoMode, DEMO_COMPANY_ID } from "@/lib/demo-mode";

export type ReportRow = {
  id: string; company_id: string; name: string; customer_name: string | null; event_date: string; event_time: string;
  status: InvitationStatus; updated_at: string; views: number; confirmed: number; declined: number; people: number;
};

function demoReport(): ReportRow[] {
  const invitation = getDemoInvitation("demo-invitation-ana-lucas");
  if (!invitation) return [];
  const responses = listDemoRsvpResponses(invitation.id);
  const confirmed = responses.filter((response) => response.status === "confirmed");
  const declined = responses.filter((response) => response.status === "declined");
  return [{
    id: invitation.id,
    company_id: DEMO_COMPANY_ID,
    name: invitation.name,
    customer_name: invitation.customer?.name ?? null,
    event_date: invitation.event_date,
    event_time: invitation.event_time,
    status: invitation.status,
    updated_at: invitation.updated_at,
    views: 128,
    confirmed: confirmed.length,
    declined: declined.length,
    people: confirmed.reduce((total, response) => total + response.people_count, 0),
  }];
}

export async function fetchReport(companyId?: string | null): Promise<ReportRow[]> {
  if (isDemoMode()) return companyId && companyId !== DEMO_COMPANY_ID ? [] : demoReport();
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
  if (isDemoMode()) {
    return listDemoRsvpResponses("demo-invitation-ana-lucas").slice(0, limit).map((response) => ({
      id: response.id,
      name: response.name,
      status: response.status,
      people_count: response.people_count,
      created_at: response.created_at,
      invitation: { name: "Celebração de Ana e Lucas" },
    }));
  }
  const { data, error } = await supabase.from("rsvp_responses")
    .select("id, name, status, people_count, created_at, invitation:invitations(name)")
    .order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data as unknown as RecentResponse[];
}

export async function globalCounts() {
  if (isDemoMode()) return { companies: 1, users: 1 };
  const [c, u] = await Promise.all([
    supabase.from("companies").select("id", { count: "exact", head: true }).eq("status", "active").is("deleted_at", null),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("status", "active").is("deleted_at", null),
  ]);
  if (c.error) throw c.error;
  if (u.error) throw u.error;
  return { companies: c.count ?? 0, users: u.count ?? 0 };
}

function csvValue(value: string | number | null) {
  const text = value === null ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function reportToCsv(rows: ReportRow[]) {
  const header = ["id", "company_id", "name", "customer_name", "event_date", "event_time", "status", "updated_at", "views", "confirmed", "declined", "people"];
  const lines = rows.map((row) => [
    row.id, row.company_id, row.name, row.customer_name, row.event_date, row.event_time, row.status, row.updated_at, row.views, row.confirmed, row.declined, row.people,
  ].map(csvValue).join(","));
  return [header.map(csvValue).join(","), ...lines].join("\n");
}
