import { supabase } from "@/integrations/supabase/client";

export type InvitationGuest = {
  id: string;
  company_id: string;
  invitation_id: string;
  guest_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  people_count: number;
  status: string;
  qr_token: string;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
};

export type GuestValues = {
  name: string;
  phone: string;
  email: string;
  people_count: string;
};

export const emptyGuest: GuestValues = {
  name: "",
  phone: "",
  email: "",
  people_count: "1",
};

export const guestsKey = (invitationId: string) => ["invitation-guests", invitationId] as const;

const guestColumns = "id, company_id, invitation_id, guest_id, name, phone, email, people_count, status, qr_token, deleted_at, deleted_by, created_at, updated_at";

export async function getInvitationForGuests(invitationId: string) {
  const { data, error } = await supabase
    .from("invitations")
    .select("id, company_id, name, status")
    .eq("id", invitationId)
    .neq("status", "deleted")
    .maybeSingle();
  if (error) throw error;
  return data as { id: string; company_id: string; name: string; status: string } | null;
}

export async function listInvitationGuests(invitationId: string, search = "", page = 1, pageSize = 20) {
  let query = supabase
    .from("invitation_guests")
    .select(guestColumns, { count: "exact" })
    .eq("invitation_id", invitationId)
    .neq("status", "deleted")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (search.trim()) query = query.ilike("name", `%${search.trim()}%`);

  const from = (page - 1) * pageSize;
  const { data, error, count } = await query.range(from, from + pageSize - 1);
  if (error) throw error;
  return { rows: (data ?? []) as unknown as InvitationGuest[], total: count ?? 0 };
}

export async function getGuestByToken(invitationId: string, token: string) {
  const { data, error } = await supabase
    .from("invitation_guests")
    .select(guestColumns)
    .eq("invitation_id", invitationId)
    .eq("qr_token", token.trim())
    .neq("status", "deleted")
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as InvitationGuest | null;
}

export async function getGuest(invitationId: string, id: string) {
  const { data, error } = await supabase
    .from("invitation_guests")
    .select(guestColumns)
    .eq("invitation_id", invitationId)
    .eq("id", id)
    .neq("status", "deleted")
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as InvitationGuest | null;
}

function guestRow(values: GuestValues) {
  const peopleCount = Number(values.people_count);
  if (!values.name.trim()) throw new Error("Informe o nome do convidado.");
  if (!Number.isInteger(peopleCount) || peopleCount < 1 || peopleCount > 1000) throw new Error("O número de pessoas deve ser um inteiro entre 1 e 1000.");
  if (values.email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(values.email.trim())) throw new Error("Informe um e-mail válido.");
  return {
    name: values.name.trim(),
    phone: values.phone.trim() || null,
    email: values.email.trim() || null,
    people_count: peopleCount,
  };
}

export async function createGuest(invitationId: string, values: GuestValues) {
  const { data, error } = await supabase.from("invitation_guests").insert({ invitation_id: invitationId, ...guestRow(values) }).select(guestColumns).single();
  if (error) throw error;
  return data as unknown as InvitationGuest;
}

export async function updateGuest(invitationId: string, id: string, values: GuestValues) {
  const { data, error } = await supabase
    .from("invitation_guests")
    .update(guestRow(values))
    .eq("invitation_id", invitationId)
    .eq("id", id)
    .neq("status", "deleted")
    .select(guestColumns)
    .single();
  if (error) throw error;
  return data as unknown as InvitationGuest;
}

export async function deleteGuest(invitationId: string, id: string) {
  const { data: auth } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("invitation_guests")
    .update({ status: "deleted", deleted_at: new Date().toISOString(), deleted_by: auth.user?.id ?? null })
    .eq("invitation_id", invitationId)
    .eq("id", id)
    .neq("status", "deleted");
  if (error) throw error;
}

export type Checkin = {
  id: string;
  invitation_id: string;
  guest_id: string;
  status: string;
  checked_in_at: string;
  created_at: string;
  updated_at: string;
};

export async function getGuestCheckin(invitationId: string, guestId: string) {
  const { data, error } = await supabase
    .from("guest_checkins")
    .select("id, invitation_id, guest_id, status, checked_in_at, created_at, updated_at")
    .eq("invitation_id", invitationId)
    .eq("guest_id", guestId)
    .maybeSingle();
  if (error) throw error;
  return data as Checkin | null;
}

export async function setGuestCheckin(invitationId: string, guestId: string, checkedIn: boolean) {
  const current = await getGuestCheckin(invitationId, guestId);
  const values = checkedIn
    ? { status: "active", checked_in_at: new Date().toISOString(), updated_at: new Date().toISOString() }
    : { status: "deleted", updated_at: new Date().toISOString() };

  if (current) {
    const { data, error } = await supabase.from("guest_checkins").update(values).eq("id", current.id).select("id, invitation_id, guest_id, status, checked_in_at, created_at, updated_at").single();
    if (error) throw error;
    return data as Checkin;
  }

  if (!checkedIn) return null;
  const { data, error } = await supabase.from("guest_checkins").insert({ invitation_id: invitationId, guest_id: guestId, status: "active" }).select("id, invitation_id, guest_id, status, checked_in_at, created_at, updated_at").single();
  if (error) throw error;
  return data as Checkin;
}

export function guestToValues(guest: InvitationGuest): GuestValues {
  return { name: guest.name, phone: guest.phone ?? "", email: guest.email ?? "", people_count: String(guest.people_count) };
}

export function csvEscape(value: unknown) {
  return `"${String(value ?? "").replaceAll("\"", "\"\"")}"`;
}

export function guestsToCsv(rows: InvitationGuest[]) {
  const header = ["guest_id", "name", "phone", "email", "people_count", "qr_token"].map(csvEscape).join(",");
  const body = rows.map((guest) => [guest.guest_id, guest.name, guest.phone, guest.email, guest.people_count, guest.qr_token].map(csvEscape).join(","));
  return `${header}\n${body.join("\n")}`;
}

export function parseGuestsCsv(text: string): GuestValues[] {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const parse = (line: string) => {
    const cells: string[] = [];
    let value = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === "\"" && line[i + 1] === "\"" && quoted) { value += "\""; i += 1; }
      else if (char === "\"") quoted = !quoted;
      else if (char === "," && !quoted) { cells.push(value.trim()); value = ""; }
      else value += char;
    }
    cells.push(value.trim());
    return cells;
  };
  const header = parse(lines[0]).map((cell) => cell.toLowerCase());
  const index = (name: string) => header.indexOf(name);
  const nameIndex = index("name");
  if (nameIndex < 0) throw new Error("O CSV precisa conter a coluna name.");
  return lines.slice(1).map((line) => {
    const cells = parse(line);
    return {
      name: cells[nameIndex] ?? "",
      phone: index("phone") >= 0 ? cells[index("phone")] ?? "" : "",
      email: index("email") >= 0 ? cells[index("email")] ?? "" : "",
      people_count: index("people_count") >= 0 ? cells[index("people_count")] ?? "1" : "1",
    };
  }).filter((guest) => guest.name.trim());
}
