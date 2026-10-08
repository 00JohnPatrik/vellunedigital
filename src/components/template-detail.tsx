import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { DeleteButton, EmptyState, fmtDate, LoadingState, PageHeader, StatusBadge, StatusToggle } from "@/components/admin-ui";
import { BlocksPreview, PreviewImage, TemplateForm, templateError, toValues } from "@/components/template-ui";
import { softDelete } from "@/lib/trash";
import { categoryLabel, getTemplate, isTemplateId, setTemplateStatus, templatesKey, updateTemplate, type Template } from "@/lib/templates";
import { listTemplateFavorites, setTemplateFavorite, templateFavoritesKey } from "@/lib/template-favorites";

/** Shared view/edit page. `canEdit` is UI only — RLS + triggers enforce it in the database. */
export function TemplateDetail({ id, canEdit, back, extraActions, startEditing = false, favoriteUserId, onDeleted }: {
  onDeleted?: (() => void) | undefined; id: string; canEdit: (t: Template) => boolean; back: ReactNode; extraActions?: (t: Template) => ReactNode; startEditing?: boolean; favoriteUserId?: string;
}) {
  const qc = useQueryClient();
  const key = [...templatesKey, id];
  const q = useQuery({ queryKey: key, queryFn: () => (isTemplateId(id) ? getTemplate(id) : Promise.resolve(null)) });
  const [editing, setEditing] = useState(startEditing);
  const favoritesQ = useQuery({
    queryKey: templateFavoritesKey(favoriteUserId ?? "guest"),
    queryFn: () => listTemplateFavorites(favoriteUserId!),
    enabled: Boolean(favoriteUserId),
  });
  const favorite = Boolean(favoritesQ.data?.includes(id));
  const refresh = () => qc.invalidateQueries({ queryKey: templatesKey });
  const toggleFavorite = async () => {
    if (!favoriteUserId) return;
    qc.setQueryData<string[]>(templateFavoritesKey(favoriteUserId), (current) => {
      const ids = new Set(current ?? []);
      if (ids.has(id)) ids.delete(id); else ids.add(id);
      return [...ids];
    });
    try {
      await setTemplateFavorite(favoriteUserId, id, !favorite);
      toast.success(favorite ? "Removido dos favoritos." : "Adicionado aos favoritos.");
    } catch {
      void qc.invalidateQueries({ queryKey: templateFavoritesKey(favoriteUserId) });
      toast.error("Não foi possível atualizar o favorito.");
    }
  };

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
            {favoriteUserId && <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => void toggleFavorite()} aria-label={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"} title={favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}><Heart className="h-4 w-4" fill={favorite ? "currentColor" : "none"} /></Button>}
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
      <div className="grid gap-6 lg:grid-cols-[330px_1fr]">
        <div className="overflow-hidden rounded-[24px] border border-[#2a2b31] bg-[#111318] p-2 shadow-[0_24px_70px_-45px_rgba(212,175,55,0.25)]">
          <PreviewImage
            src={t.preview_image}
            name={t.name}
            blocks={t.content?.blocks ?? []}
            background={t.content?.settings?.background}
            className="aspect-[4/5] rounded-[18px]"
          />
        </div>
        <div className="rounded-[24px] border border-[#2a2b31] bg-[#111318] p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A9B1BF]">Estrutura</p>
              <h2 className="mt-1 font-display text-lg font-semibold tracking-[-0.02em] text-[#F5F7FA]">Prévia do conteúdo</h2>
            </div>
            <span className="rounded-full border border-[#2a2b31] bg-[#08090d] px-2.5 py-1 text-[10px] font-semibold text-[#A9B1BF]">{t.content?.blocks?.length ?? 0} blocos</span>
          </div>
          <BlocksPreview blocks={t.content?.blocks ?? []} background={t.content?.settings?.background} />
        </div>
      </div>
    </div>
  );
}
