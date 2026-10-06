import { supabase } from "@/integrations/supabase/client";

// Admin side of RSVP: browser client under RLS (company scoped via invitation_company()).
// Guests never touch these tables; they go through the `submitRsvp` server fn.

export type RsvpConfig = { enabled: boolean; deadline: string | null; max_people: number | null; allow_phone: boolean; allow_email: boolean };
export const defaultRsvpConfig: RsvpConfig = { enabled: false, deadline: null, max_people: null, allow_phone: false, allow_email: false };

export type RsvpResponse = { id: string; name: string; phone: string | null; email: string | null; people_count: number; status: "confirmed" | "declined"; created_at: string; updated_at: string };

export const rsvpKey = (id: string) => ["rsvp", id] as const;

export async function getRsvpConfig(invitationId: string): Promise<RsvpConfig> {
  const { isDemoMode, getDemoRsvpConfig } = await import("@/lib/demo-mode");
  if (isDemoMode()) return getDemoRsvpConfig(invitationId);
  const { data, error } = await supabase.from("rsvp_configs").select("enabled, deadline, max_people, allow_phone, allow_email").eq("invitation_id", invitationId).maybeSingle();
  if (error) throw error;
  return (data as RsvpConfig | null) ?? defaultRsvpConfig;
}

export async function saveRsvpConfig(invitationId: string, c: RsvpConfig) {
  const { isDemoMode, saveDemoRsvpConfig } = await import("@/lib/demo-mode");
  if (isDemoMode()) { saveDemoRsvpConfig(); return; }
  const { error } = await supabase.from("rsvp_configs").upsert({ invitation_id: invitationId, ...c }, { onConflict: "invitation_id" });
  if (error) throw error;
}

export async function listRsvpResponses(invitationId: string): Promise<RsvpResponse[]> {
  const { isDemoMode, listDemoRsvpResponses } = await import("@/lib/demo-mode");
  if (isDemoMode()) return listDemoRsvpResponses(invitationId) as RsvpResponse[];
  const { data, error } = await supabase.from("rsvp_responses").select("id, name, phone, email, people_count, status, created_at, updated_at").eq("invitation_id", invitationId).order("updated_at", { ascending: false });
  if (error) throw error;
  return data as RsvpResponse[];
}

/** Counters are always derived from the real responses (never stored). */
export function rsvpStats(list: RsvpResponse[]) {
  const confirmed = list.filter((r) => r.status === "confirmed");
  return { confirmed: confirmed.length, declined: list.length - confirmed.length, people: confirmed.reduce((s, r) => s + r.people_count, 0) };
}
