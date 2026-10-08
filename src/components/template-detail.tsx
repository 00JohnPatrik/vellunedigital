import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DeleteButton, EmptyState, fmtDate, LoadingState, PageHeader, StatusBadge, StatusToggle } from "@/components/admin-ui";
import { BlocksPreview, PreviewImage, TemplateForm, templateError, toValues } from "@/components/template-ui";
import { softDelete } from "@/lib/trash";
import { categoryLabel, getTemplate, isTemplateId, setTemplateStatus, templatesKey, updateTemplate, type Template } from "@/lib/templates";

/** Shared view/edit page. `canEdit` is UI only — RLS + triggers enforce it in the database. */
export function TemplateDetail({ id, canEdit, back, extraActions, startEditing = false, onDeleted }: {
  onDeleted?: (() => void) | undefined; id: string; canEdit: (t: Template) => boolean; back: ReactNode; extraActions?: (t: Template) => ReactNode; startEditing?: boolean;
}) {
  const qc = useQueryClient();
  const key = [...templatesKey, id];
  const q = useQuery({ queryKey: key, queryFn: () => (isTemplateId(id) ? getTemplate(id) : Promise.resolve(null)) });
  const [editing, setEditing] = useState(startEditing);
  const refresh = () => qc.invalidateQueries({ queryKey: templatesKey });

  if (q.isLoading) return <LoadingState />;
  const t = q.data;
  if (!t) return <div className="space-y-4">{back}<EmptyState>Modelo não encontrado ou sem permissão de acesso.</EmptyState></div>;
  const editable = canEdit(t);

  if (editing && editable) {
    return (
      <div>
        {back}
        <PageHeader title={`Editar: ${t.name}`} />
        <TemplateForm assets={{ kind: "template", id: t.id, companyId: t.company_id }} initial={toValues(t)} isNew={false} submitLabel="Salvar alterações" onCancel={() => setEditing(false)}
          onSubmit={async (v) => {
            try { await updateTemplate(t.id, v); toast.success("Modelo atualizado."); await refresh(); setEditing(false); }
            catch (e) { toast.error(templateError(e)); }
          }} />
      </div>
    );
  }

  return (
    <div>
      {back}
      <PageHeader title={t.name} description={`${categoryLabel(t.category)} · ${t.type === "official" ? "Modelo oficial" : "Modelo da empresa"} · criado em ${fmtDate(t.created_at)}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={t.status} />
            {extraActions?.(t)}
            {editable && <Button variant="outline" onClick={() => setEditing(true)}>Editar</Button>}
            {editable && <StatusToggle status={t.status} name={t.name} onConfirm={async () => {
              try { await setTemplateStatus(t.id, t.status === "active" ? "inactive" : "active"); toast.success("Status atualizado."); await refresh(); }
              catch (e) { toast.error(templateError(e)); }
            }} />}
            {onDeleted && <DeleteButton name={t.name} onConfirm={async () => {
              try { await softDelete("template", t.id); toast.success("Modelo enviado para a Lixeira."); await refresh(); onDeleted(); }
              catch { toast.error("Não foi possível excluir."); }
            }} />}
          </div>
        } />
      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        <div className="overflow-hidden rounded-xl border">
        <PreviewImage
          src={t.preview_image}
          name={t.name}
          blocks={t.content?.blocks ?? []}
          background={t.content?.settings?.background}
        />
      </div>
        <BlocksPreview blocks={t.content?.blocks ?? []} background={t.content?.settings?.background} />
      </div>
    </div>
  );
}
