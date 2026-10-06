import type { AppUser } from "@/lib/app-user";
import type { Customer } from "@/lib/customers-data";
import type { Invitation } from "@/lib/invitations";
import type { Template } from "@/lib/templates";

export const DEMO_HOST = "vellunedigital.lovable.app";
export const DEMO_COMPANY_ID = "demo-company-vellune";
export const DEMO_USER_ID = "demo-user-vellune";
export const DEMO_CUSTOMER_ID = "demo-customer-ana-lucas";
export const DEMO_INVITATION_ID = "demo-invitation-ana-lucas";
export const DEMO_TEMPLATE_ID = "demo-template-romantic";
export const DEMO_GUEST_ID = "demo-guest-marina";

const STORAGE_KEY = "vellune-demo-state";
const now = "2026-01-15T12:00:00.000Z";

export function isDemoMode() {
  return typeof window !== "undefined" && window.location.hostname.toLowerCase() === DEMO_HOST;
}

const defaultContent = {
  version: 1 as const,
  settings: { background: { color: "#fffaf5", gradient: "linear-gradient(145deg, #fffaf5 0%, #f2e8dc 100%)" } },
  blocks: [
    { id: "demo-title", type: "text" as const, props: { text: "Ana & Lucas", size: "2xl", font: "Sora", bold: "1", align: "center", width: "full", color: "#4a3028" }, x: 48, y: 72, width: 672, height: 76 },
    { id: "demo-message", type: "text" as const, props: { text: "Uma noite especial para celebrar o amor", size: "lg", font: "Manrope", align: "center", width: "full", color: "#765c52" }, x: 48, y: 170, width: 672, height: 64 },
    { id: "demo-date", type: "date" as const, props: { source: "event", format: "long", label: "Reserve esta data", align: "center" }, x: 104, y: 290, width: 560, height: 86 },
    { id: "demo-location", type: "location" as const, props: { source: "event", show_name: "1", show_address: "1", show_city: "1", show_directions: "1", align: "center" }, x: 104, y: 410, width: 560, height: 126 },
    { id: "demo-rsvp", type: "button" as const, props: { label: "Confirmar presença", url: "#", style: "solid", width: "partial", align: "center" }, x: 184, y: 574, width: 400, height: 72 },
  ],
};

const demoUser: AppUser = { id: DEMO_USER_ID, name: "Marina Vellune", email: "demo@vellunedigital.local", role: "company_admin", status: "active", theme: "light", company: { id: DEMO_COMPANY_ID, name: "Vellune Digital Demo", status: "active" } };
const demoCustomer: Customer = { id: DEMO_CUSTOMER_ID, company_id: DEMO_COMPANY_ID, name: "Ana e Lucas", phone: "11999990000", email: "ana.lucas@example.com", observation: "Casamento demonstrativo", status: "active", created_at: now, updated_at: now, company: { id: DEMO_COMPANY_ID, name: "Vellune Digital Demo" } };

export type DemoGuest = { id: string; company_id: string; invitation_id: string; guest_id: string; name: string; phone: string | null; email: string | null; people_count: number; status: string; qr_token: string; deleted_at: string | null; deleted_by: string | null; created_at: string; updated_at: string };
export type DemoRsvpConfig = { enabled: boolean; deadline: string | null; max_people: number | null; allow_phone: boolean; allow_email: boolean };
export type DemoRsvpResponse = { id: string; invitation_id: string; name: string; phone: string | null; email: string | null; people_count: number; status: "confirmed" | "declined"; created_at: string; updated_at: string; guest_id: string | null };

const defaultGuest: DemoGuest = { id: DEMO_GUEST_ID, company_id: DEMO_COMPANY_ID, invitation_id: DEMO_INVITATION_ID, guest_id: "demo-guest-person-marina", name: "Marina Oliveira", phone: "11988887777", email: "marina@example.com", people_count: 2, status: "active", qr_token: "demo-qr-marina", deleted_at: null, deleted_by: null, created_at: now, updated_at: now };
const defaultRsvpConfig: DemoRsvpConfig = { enabled: true, deadline: "2026-10-01T23:59:00.000Z", max_people: 4, allow_phone: true, allow_email: true };
const defaultRsvp: DemoRsvpResponse = { id: "demo-rsvp-marina", invitation_id: DEMO_INVITATION_ID, name: "Marina Oliveira", phone: "11988887777", email: "marina@example.com", people_count: 2, status: "confirmed", created_at: now, updated_at: now, guest_id: defaultGuest.guest_id };

function readState() {
  if (typeof window === "undefined") return {} as Record<string, unknown>;
  try { return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, unknown>; } catch { return {}; }
}
function writeState(patch: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...readState(), ...patch }));
}
function readContent() { return (readState().content as typeof defaultContent | undefined) ?? structuredClone(defaultContent); }
function invitationStatus(): Invitation["status"] { return (readState().invitationStatus as Invitation["status"] | undefined) ?? "draft"; }

export function getDemoUser() { return structuredClone(demoUser); }
export function listDemoCustomers() { return [structuredClone(demoCustomer)]; }
export function getDemoCustomer(id: string) { return id === DEMO_CUSTOMER_ID ? structuredClone(demoCustomer) : null; }

function makeInvitation(): Invitation {
  return { id: DEMO_INVITATION_ID, company_id: DEMO_COMPANY_ID, customer_id: DEMO_CUSTOMER_ID, template_id: DEMO_TEMPLATE_ID, name: "Celebração de Ana e Lucas", slug: "demo-ana-e-lucas", access_token: "demo-access-token", status: invitationStatus(), event_date: "2026-10-15", event_time: "19:30:00", venue_name: "Casa das Palmeiras", address: "Rua das Flores, 120", city: "São Paulo", state: "SP", message: "Uma noite especial para celebrar o amor.", content: readContent(), published_at: invitationStatus() === "published" ? now : null, created_at: now, updated_at: now, customer: { id: demoCustomer.id, name: demoCustomer.name } };
}
export function getDemoInvitation(id: string) { return id === DEMO_INVITATION_ID || id === "demo" || id === "editor-preview-demo" ? structuredClone(makeInvitation()) : null; }
export function listDemoInvitations() { return readState().invitationDeleted ? [] : [makeInvitation()]; }
export function updateDemoInvitation(id: string, customerId: string, values: Record<string, string>, content: unknown) { if (id !== DEMO_INVITATION_ID && id !== "demo" && id !== "editor-preview-demo") return; writeState({ content, customerId, values }); }
export function publishDemoInvitation(id: string) { if (id !== DEMO_INVITATION_ID && id !== "demo" && id !== "editor-preview-demo") return false; writeState({ invitationStatus: "published" }); return true; }
export function deleteDemoInvitation(id: string) { if (id !== DEMO_INVITATION_ID) return false; writeState({ invitationDeleted: true }); return true; }
export function restoreDemoInvitation() { writeState({ invitationDeleted: false }); }

export function getDemoTemplate(id: string) { return id === DEMO_TEMPLATE_ID ? { id: DEMO_TEMPLATE_ID, company_id: null, name: "Romance Editorial", category: "casamento", type: "official", preview_image: null, content: structuredClone(defaultContent), status: "active", created_at: now, updated_at: now } as Template : null; }
export function listDemoTemplates() { return [getDemoTemplate(DEMO_TEMPLATE_ID)!]; }
export function listDemoGuests(invitationId: string) { return invitationId === DEMO_INVITATION_ID ? [structuredClone(defaultGuest)] : []; }
export function getDemoGuest(invitationId: string, id: string) { return invitationId === DEMO_INVITATION_ID && id === DEMO_GUEST_ID ? structuredClone(defaultGuest) : null; }
export function getDemoGuestByToken(invitationId: string, token: string) { return invitationId === DEMO_INVITATION_ID && token === defaultGuest.qr_token ? structuredClone(defaultGuest) : null; }
export function getDemoRsvpConfig(invitationId: string) { return invitationId === DEMO_INVITATION_ID ? structuredClone(defaultRsvpConfig) : { enabled: false, deadline: null, max_people: null, allow_phone: false, allow_email: false }; }
export function listDemoRsvpResponses(invitationId: string) { return invitationId === DEMO_INVITATION_ID ? [structuredClone(defaultRsvp)] : []; }
export function saveDemoRsvpConfig() { return; }
export function getDemoCheckin() { return null; }
export function setDemoCheckin() { return null; }
export type DemoTrashItem = {
  kind: "customer" | "template" | "invitation" | "company" | "admin";
  id: string;
  name: string;
  company: string | null;
  customer: string | null;
  category: string | null;
  email: string | null;
  deleted_at: string;
  deleted_by: string | null;
};

export type DemoBranding = {
  brand_name: string;
  logo_url: string | null;
  favicon_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  show_vellune_branding: boolean;
  whatsapp_number: string | null;
  contact_email: string | null;
  website_url: string | null;
};

const defaultBranding: DemoBranding = {
  brand_name: "Vellune Digital Demo",
  logo_url: null,
  favicon_url: null,
  primary_color: "#8b5cf6",
  secondary_color: "#c4b5fd",
  accent_color: "#f59e0b",
  show_vellune_branding: true,
  whatsapp_number: "5511999999999",
  contact_email: "demo@vellunedigital.local",
  website_url: "https://vellunedigital.lovable.app",
};

export function getDemoBranding(): DemoBranding {
  return { ...defaultBranding, ...(readState().branding as Partial<DemoBranding> | undefined) };
}

export function saveDemoBranding(values: DemoBranding) {
  writeState({ branding: values });
}

export function listDemoTrash(): DemoTrashItem[] {
  const state = readState();
  if (!state.invitationDeleted) return [];
  const deletedAt = typeof state.invitationDeletedAt === "string" ? state.invitationDeletedAt : now;
  return [
    { kind: "invitation", id: DEMO_INVITATION_ID, name: "Celebração de Ana e Lucas", company: "Vellune Digital Demo", customer: "Ana e Lucas", category: null, email: null, deleted_at: deletedAt, deleted_by: "Marina Vellune" },
    { kind: "customer", id: DEMO_CUSTOMER_ID, name: "Ana e Lucas", company: "Vellune Digital Demo", customer: null, category: null, email: "ana.lucas@example.com", deleted_at: deletedAt, deleted_by: "Marina Vellune" },
    { kind: "template", id: DEMO_TEMPLATE_ID, name: "Romance Editorial", company: "Oficial", customer: null, category: "casamento", email: null, deleted_at: deletedAt, deleted_by: "Marina Vellune" },
  ];
}

export function restoreDemoTrash(kind: DemoTrashItem["kind"], id: string) {
  if (kind === "invitation" && id === DEMO_INVITATION_ID) restoreDemoInvitation();
}

export function demoTrash() { return listDemoTrash(); }
export function resetDemoState() { if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY); }
