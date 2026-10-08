import { supabase } from "@/integrations/supabase/client";
import { cloneContent, type TemplateContent } from "@/lib/templates";

// Invitations go through the browser client under RLS. The DB trigger `invitations_guard` sets company_id,
// generates the stable slug, copies template content and validates customer/template ownership.

export type InvitationStatus = "draft" | "published" | "closed" | "deleted";
export const STATUS_LABEL: Record<InvitationStatus, string> = { draft: "Rascunho", published: "Publicado", closed: "Fechado", deleted: "Excluído" };

export type Invitation = {
  id: string; company_id: string; customer_id: string; template_id: string | null; name: string; slug: string;
  access_token: string | null;
  status: InvitationStatus; event_date: string; event_time: string; venue_name: string | null; address: string | null;
  city: string | null; state: string | null; message: string | null; content: TemplateContent; published_at: string | null;
  created_at: string; updated_at: string;
  customer?: { id: string; name: string } | null;
};

export type EventValues = { name: string; event_date: string; event_time: string; venue_name: string; address: string; city: string; state: string; message: string };
export const emptyEvent: EventValues = { name: "", event_date: "", event_time: "", venue_name: "", address: "", city: "", state: "", message: "" };

export const invitationsKey = ["invitations"] as const;
const cols = "*, customer:customers(id, name)";

export async function listInvitations(): Promise<Invitation[]> {
  const { isDemoMode, listDemoInvitations } = await import("@/lib/demo-mode");
  if (isDemoMode()) return listDemoInvitations();
  const { data, error } = await supabase.from("invitations").select(cols).neq("status", "deleted").order("updated_at", { ascending: false });
  if (error) throw error;
  return data as unknown as Invitation[];
}

export async function getInvitation(id: string): Promise<Invitation | null> {
  const { isDemoMode, getDemoInvitation } = await import("@/lib/demo-mode");
  if (isDemoMode()) return getDemoInvitation(id);
  const { data, error } = await supabase.from("invitations").select(cols).eq("id", id).neq("status", "deleted").maybeSingle();
  if (error) throw error;
  return data as unknown as Invitation | null;
}

export const eventRow = (v: EventValues) => ({
  name: v.name.trim(), event_date: v.event_date, event_time: v.event_time,
  venue_name: v.venue_name.trim() || null, address: v.address.trim() || null, city: v.city.trim() || null,
  state: v.state.trim().toUpperCase() || null, message: v.message.trim() || null,
});

export const toEventValues = (i: Invitation): EventValues => ({
  name: i.name, event_date: i.event_date, event_time: i.event_time.slice(0, 5), venue_name: i.venue_name ?? "",
  address: i.address ?? "", city: i.city ?? "", state: i.state ?? "", message: i.message ?? "",
});

/** Creates a draft. company_id, slug, status and (when templateId is set) content are defined by the database. */
export async function createInvitation(customerId: string, templateId: string | null, v: EventValues) {
  const { data, error } = await supabase.from("invitations").insert({
    ...eventRow(v), customer_id: customerId, template_id: templateId,
    content: { version: 1, blocks: [] } as never, company_id: "00000000-0000-0000-0000-000000000000", slug: "pending",
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

/** Creates a new draft from the current invitation content and event data. */
export async function duplicateInvitation(id: string) {
  const source = await getInvitation(id);
  if (!source) throw new Error("Convite não encontrado.");

  const copyName = (source.name.trim() ? `${source.name.trim()} — cópia` : "Novo convite").slice(0, 150);
  const content = cloneContent(source.content ?? { version: 1, blocks: [] });

  const { data, error } = await supabase.from("invitations").insert({
    ...eventRow({ ...toEventValues(source), name: copyName }),
    customer_id: source.customer_id,
    template_id: null,
    content: content as never,
    company_id: "00000000-0000-0000-0000-000000000000",
    slug: "pending",
  }).select("id").single();

  if (error) throw error;
  return data.id as string;
}

export async function updateInvitation(id: string, customerId: string, v: EventValues, content: TemplateContent) {
  const { isDemoMode, updateDemoInvitation } = await import("@/lib/demo-mode");
  if (isDemoMode()) {
    updateDemoInvitation(id, customerId, eventRow(v), content);
    return;
  }
  const { error } = await supabase.from("invitations").update({ ...eventRow(v), customer_id: customerId, content: content as never }).eq("id", id);
  if (error) throw error;
}

/** Publishes (status=published). published_at and minimum-data checks are enforced by the DB trigger; slug never changes. */
export async function publishInvitation(id: string) {
  const { isDemoMode, publishDemoInvitation } = await import("@/lib/demo-mode");
  if (isDemoMode()) {
    publishDemoInvitation(id);
    return;
  }
  const { error } = await supabase.from("invitations").update({ status: "published" }).eq("id", id);
  if (error) throw error;
}

export const whatsappShareUrl = (slug: string) => `https://wa.me/?text=${encodeURIComponent(`Confira meu convite: ${publicUrl(slug)}`)}`;

/** Logical delete. */
export async function deleteInvitation(id: string) {
  const { isDemoMode, deleteDemoInvitation } = await import("@/lib/demo-mode");
  if (isDemoMode()) {
    deleteDemoInvitation(id);
    return;
  }
  const { error } = await supabase.from("invitations").update({ status: "deleted" }).eq("id", id);
  if (error) throw error;
}

export const publicUrl = (slug: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/convite/${slug}`;

export function validateEvent(v: EventValues) {
  const e: Partial<Record<keyof EventValues, string>> = {};
  if (!v.name.trim()) e.name = "Informe o nome do evento.";
  if (!v.event_date) e.event_date = "Informe a data.";
  if (!v.event_time) e.event_time = "Informe a hora.";
  if (v.state.trim() && !/^[A-Za-z]{2}$/.test(v.state.trim())) e.state = "Use a sigla com 2 letras.";
  return e;
}

export const fmtEventDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR");

export function invitationError(e: unknown) {
  const err = e as { code?: string; message?: string };
  if (/Cliente/.test(err?.message ?? "")) return "Cliente inválido para esta empresa.";
  if (/Modelo/.test(err?.message ?? "")) return "Modelo indisponível para esta empresa.";
  if (/Publicação incompleta/.test(err?.message ?? "")) return "Preencha nome, data, hora e adicione ao menos um bloco antes de publicar.";
  if (err?.code === "23514") return "Dados inválidos. Verifique os campos.";
  return "Não foi possível salvar. Tente novamente.";
}
