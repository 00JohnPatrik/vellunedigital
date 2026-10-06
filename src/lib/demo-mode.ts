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

export function isDemoMode() {
  return typeof window !== "undefined" && window.location.hostname.toLowerCase() === DEMO_HOST;
}

const now = "2026-01-15T12:00:00.000Z";

const defaultContent = {
  version: 1 as const,
  settings: {
    background: {
      color: "#fffaf5",
      gradient: "linear-gradient(145deg, #fffaf5 0%, #f2e8dc 100%)",
    },
  },
  blocks: [
    {
      id: "demo-title",
      type: "text" as const,
      props: {
        text: "Ana & Lucas",
        size: "2xl",
        font: "Sora",
        bold: "1",
        align: "center",
        width: "full",
        color: "#4a3028",
      },
      x: 48,
      y: 72,
      width: 672,
      height: 76,
    },
    {
      id: "demo-message",
      type: "text" as const,
      props: {
        text: "Uma noite especial para celebrar o amor",
        size: "lg",
        font: "Manrope",
        align: "center",
        width: "full",
        color: "#765c52",
      },
      x: 48,
      y: 170,
      width: 672,
      height: 64,
    },
    {
      id: "demo-date",
      type: "date" as const,
      props: { source: "event", format: "long", label: "Reserve esta data", align: "center" },
      x: 104,
      y: 290,
      width: 560,
      height: 86,
    },
    {
      id: "demo-location",
      type: "location" as const,
      props: {
        source: "event",
        show_name: "1",
        show_address: "1",
        show_city: "1",
        show_directions: "1",
        align: "center",
      },
      x: 104,
      y: 410,
      width: 560,
      height: 126,
    },
    {
      id: "demo-rsvp",
      type: "button" as const,
      props: { label: "Confirmar presença", url: "#", style: "solid", width: "partial", align: "center" },
      x: 184,
      y: 574,
      width: 400,
      height: 72,
    },
  ],
};

const demoUser: AppUser = {
  id: DEMO_USER_ID,
  name: "Marina Vellune",
  email: "demo@vellunedigital.local",
  role: "company_admin",
  status: "active",
  theme: "light",
  company: { id: DEMO_COMPANY_ID, name: "Vellune Digital Demo", status: "active" },
};

const demoCustomer: Customer = {
  id: DEMO_CUSTOMER_ID,
  company_id: DEMO_COMPANY_ID,
  name: "Ana e Lucas",
  phone: "11999990000",
  email: "ana.lucas@example.com",
  observation: "Casamento demonstrativo",
  status: "active",
  created_at: now,
  updated_at: now,
  company: { id: DEMO_COMPANY_ID, name: "Vellune Digital Demo" },
};

function readContent() {
  if (typeof window === "undefined") return structuredClone(defaultContent);
  try {
    const stored = window.localStorage.getItem("vellune-demo-invitation-content");
    return stored ? JSON.parse(stored) : structuredClone(defaultContent);
  } catch {
    return structuredClone(defaultContent);
  }
}

const demoInvitation: Invitation = {
  id: DEMO_INVITATION_ID,
  company_id: DEMO_COMPANY_ID,
  customer_id: DEMO_CUSTOMER_ID,
  template_id: DEMO_TEMPLATE_ID,
  name: "Celebração de Ana e Lucas",
  slug: "demo-ana-e-lucas",
  access_token: "demo-access-token",
  status: "draft",
  event_date: "2026-10-15",
  event_time: "19:30:00",
  venue_name: "Casa das Palmeiras",
  address: "Rua das Flores, 120",
  city: "São Paulo",
  state: "SP",
  message: "Uma noite especial para celebrar o amor.",
  content: readContent(),
  published_at: null,
  created_at: now,
  updated_at: now,
  customer: { id: demoCustomer.id, name: demoCustomer.name },
};

export function getDemoUser() {
  return structuredClone(demoUser);
}

export function listDemoCustomers() {
  return [structuredClone(demoCustomer)];
}

export function getDemoCustomer(id: string) {
  return id === DEMO_CUSTOMER_ID ? structuredClone(demoCustomer) : null;
}

export function getDemoInvitation(id: string) {
  if (id !== DEMO_INVITATION_ID && id !== "demo" && id !== "editor-preview-demo") return null;
  return { ...structuredClone(demoInvitation), content: readContent() };
}

export function listDemoInvitations() {
  return [getDemoInvitation(DEMO_INVITATION_ID)!];
}

export function updateDemoInvitation(id: string, customerId: string, values: Record<string, string>, content: unknown) {
  if (id !== DEMO_INVITATION_ID && id !== "demo" && id !== "editor-preview-demo") return;
  if (typeof window !== "undefined") window.localStorage.setItem("vellune-demo-invitation-content", JSON.stringify(content));
  return { customerId, values };
}

export function publishDemoInvitation(id: string) {
  if (id !== DEMO_INVITATION_ID && id !== "demo" && id !== "editor-preview-demo") return;
  return true;
}

export function deleteDemoInvitation(id: string) {
  return id === DEMO_INVITATION_ID;
}

export function getDemoTemplate(id: string) {
  if (id !== DEMO_TEMPLATE_ID) return null;
  return {
    id: DEMO_TEMPLATE_ID,
    company_id: null,
    name: "Romance Editorial",
    category: "casamento",
    type: "official",
    preview_image: null,
    content: structuredClone(defaultContent),
    status: "active",
    created_at: now,
    updated_at: now,
  } as Template;
}

export function listDemoTemplates() {
  return [getDemoTemplate(DEMO_TEMPLATE_ID)!];
}
