import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { TemplateDetail } from "@/components/template-detail";

export const Route = createFileRoute("/_authenticated/admin/templates/$id")({
  validateSearch: (s: Record<string, unknown>): { edit?: boolean } => (s["edit"] === true || s["edit"] === "true" ? { edit: true } : {}),
  head: () => ({ meta: [{ title: "Modelo oficial — Vellune Digital" }] }),
  component: AdminTemplatePage,
});

function AdminTemplatePage() {
  const { id } = Route.useParams();
  const { edit } = Route.useSearch();
  const { appUser } = Route.useRouteContext();
  const navigate = useNavigate();
  return <TemplateDetail key={id} id={id} favoriteUserId={appUser!.id} startEditing={!!edit} canEdit={() => true} onDeleted={() => navigate({ to: "/admin/templates" })}
    back={<Link to="/admin/templates" className="mb-3 inline-block text-sm text-muted-foreground hover:text-foreground">← Modelos oficiais</Link>} />;
}
