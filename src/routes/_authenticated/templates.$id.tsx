import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TemplateDetail } from "@/components/template-detail";
import { templateError } from "@/components/template-ui";
import { duplicateTemplate, templatesKey, useOfficialTemplate } from "@/lib/templates";

export const Route = createFileRoute("/_authenticated/templates/$id")({
  validateSearch: (s: Record<string, unknown>): { edit?: boolean } => (s["edit"] === true || s["edit"] === "true" ? { edit: true } : {}),
  head: () => ({ meta: [{ title: "Modelo — Convitely" }] }),
  component: CompanyTemplatePage,
});

function CompanyTemplatePage() {
  const { id } = Route.useParams();
  const { edit } = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const go = async (p: Promise<string>, msg: string) => {
    try { const nid = await p; toast.success(msg); await qc.invalidateQueries({ queryKey: templatesKey }); navigate({ to: "/templates/$id", params: { id: nid } }); }
    catch (e) { toast.error(templateError(e)); }
  };
  return <TemplateDetail key={id} id={id} startEditing={!!edit} canEdit={(t) => t.type === "company"}
    back={<Link to="/templates" className="mb-3 inline-block text-sm text-muted-foreground hover:text-foreground">← Modelos</Link>}
    extraActions={(t) => t.type === "official"
      ? <Button onClick={() => go(useOfficialTemplate(t.id), "Cópia criada em Meus modelos.")}>Usar modelo</Button>
      : <Button variant="outline" onClick={() => go(duplicateTemplate(t), "Modelo duplicado.")}>Duplicar</Button>} />;
}
