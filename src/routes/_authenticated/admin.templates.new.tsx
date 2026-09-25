import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/admin-ui";
import { emptyTemplate, TemplateForm, templateError } from "@/components/template-ui";
import { createTemplate, templatesKey } from "@/lib/templates";

export const Route = createFileRoute("/_authenticated/admin/templates/new")({
  head: () => ({ meta: [{ title: "Novo modelo oficial — Vellune Digital" }] }),
  component: NewOfficial,
});

function NewOfficial() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return (
    <div>
      <Link to="/admin/templates" className="mb-3 inline-block text-sm text-muted-foreground hover:text-foreground">← Modelos oficiais</Link>
      <PageHeader title="Novo modelo oficial" />
      <TemplateForm initial={emptyTemplate()} isNew submitLabel="Criar modelo" onCancel={() => navigate({ to: "/admin/templates" })}
        onSubmit={async (v) => {
          try {
            const id = await createTemplate(v, "official", null);
            toast.success("Modelo criado."); await qc.invalidateQueries({ queryKey: templatesKey });
            navigate({ to: "/admin/templates/$id", params: { id } });
          } catch (e) { toast.error(templateError(e)); }
        }} />
    </div>
  );
}
