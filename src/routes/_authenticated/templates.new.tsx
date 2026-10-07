import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin-ui";
import { emptyTemplate, TemplateForm, templateError } from "@/components/template-ui";
import { createTemplate, templatesKey } from "@/lib/templates";

export const Route = createFileRoute("/_authenticated/templates/new")({
  head: () => ({ meta: [{ title: "Novo modelo — Vellune Digital" }] }),
  component: NewCompanyTemplate,
});

function NewCompanyTemplate() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { appUser } = Route.useRouteContext();
  return (
    <div>
      <Link to="/templates" className="mb-3 inline-block text-sm text-muted-foreground hover:text-foreground">← Modelos</Link>
      <PageHeader title="Novo modelo" />
      <TemplateForm initial={emptyTemplate()} isNew submitLabel="Criar modelo" onCancel={() => navigate({ to: "/templates" })}
        onSubmit={async (v) => {
          try {
            // company_id is also forced server-side by the templates_guard trigger.
            const id = await createTemplate(v, "company", appUser!.company?.id ?? null);
            toast.success("Modelo criado."); await qc.invalidateQueries({ queryKey: templatesKey });
            navigate({ to: "/templates/$id", params: { id } });
          } catch (e) { toast.error(templateError(e)); }
        }} />
    </div>
  );
}
