import { isDemoMode } from "@/lib/demo-mode";
import { listCustomers, type Customer } from "@/lib/customers-data";
import { listInvitations, type Invitation } from "@/lib/invitations";
import { listTemplates, categoryLabel, type Template } from "@/lib/templates";
import type { AppRole } from "@/lib/app-user";

export type GlobalSearchResultType = "invitation" | "customer" | "template";

export type GlobalSearchResult = {
  id: string;
  type: GlobalSearchResultType;
  title: string;
  subtitle: string;
  meta?: string;
  to: string;
};

const normalize = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

function invitationText(invitation: Invitation) {
  const blockText = (invitation.content?.blocks ?? [])
    .flatMap((block) => Object.values(block.props ?? {}))
    .filter((value) => typeof value === "string")
    .join(" ");

  return [
    invitation.name,
    invitation.customer?.name,
    invitation.message,
    invitation.venue_name,
    invitation.address,
    invitation.city,
    invitation.state,
    blockText,
  ].join(" ");
}

function customerText(customer: Customer) {
  return [customer.name, customer.email, customer.phone, customer.observation, customer.company?.name].join(" ");
}

function templateText(template: Template) {
  const blockText = (template.content?.blocks ?? [])
    .flatMap((block) => Object.values(block.props ?? {}))
    .filter((value) => typeof value === "string")
    .join(" ");

  return [template.name, categoryLabel(template.category), blockText].join(" ");
}

export async function searchWorkspaceContent(term: string, role: AppRole, limit = 12): Promise<GlobalSearchResult[]> {
  const needle = normalize(term.trim());
  if (needle.length < 2) return [];

  const [invitationsResult, customersResult, templatesResult] = await Promise.allSettled([
    listInvitations(),
    listCustomers(),
    isDemoMode() ? Promise.resolve([] as Template[]) : listTemplates(),
  ]);

  const invitations = invitationsResult.status === "fulfilled" ? invitationsResult.value : [];
  const customers = customersResult.status === "fulfilled" ? customersResult.value : [];
  const templates = templatesResult.status === "fulfilled" ? templatesResult.value : [];

  const invitationHits: GlobalSearchResult[] = invitations
    .filter((item) => normalize(invitationText(item)).includes(needle))
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      type: "invitation",
      title: item.name,
      subtitle: item.customer?.name ? `Cliente: ${item.customer.name}` : "Convite",
      meta: item.status === "published" ? "Publicado" : item.status === "closed" ? "Fechado" : "Rascunho",
      to: `/invitations/${item.id}/editor`,
    }));

  const customerHits: GlobalSearchResult[] = customers
    .filter((item) => normalize(customerText(item)).includes(needle))
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      type: "customer",
      title: item.name,
      subtitle: item.email || item.phone || "Cliente",
      meta: item.status === "active" ? "Ativo" : "Inativo",
      to: `/customers/${item.id}`,
    }));

  const templateHits: GlobalSearchResult[] = templates
    .filter((item) => normalize(templateText(item)).includes(needle))
    .slice(0, limit)
    .map((item) => ({
      id: item.id,
      type: "template",
      title: item.name,
      subtitle: categoryLabel(item.category),
      meta: item.type === "official" ? "Modelo oficial" : "Sua coleção",
      to: role === "super_admin" ? `/admin/templates/${item.id}` : `/templates/${item.id}`,
    }));

  return [...invitationHits, ...customerHits, ...templateHits].slice(0, Math.max(limit, 18));
}
