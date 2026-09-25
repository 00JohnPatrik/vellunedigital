import { createFileRoute, Link } from "@tanstack/react-router";
import { TemplateDetail } from "@/components/template-detail";

export const Route = createFileRoute("/_authenticated/admin/templates/$id")({
  validateSearch: (s: Record<string, unknown>): { edit?: boolean } => (s["edit"] === true || s["edit"] === "true" ? { edit: true } : {}),
  head: () => ({ meta: [{ title: "Modelo oficial — Convitely" }] }),
  component: AdminTemplatePage,
});

function AdminTemplatePage() {
  const { id } = Route.useParams();
  const { edit } = Route.useSearch();
  return <TemplateDetail key={id} id={id} startEditing={!!edit} canEdit={() => true}
    back={<Link to="/admin/templates" className="mb-3 inline-block text-sm text-muted-foreground hover:text-foreground">← Modelos oficiais</Link>} />;
}
