import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { dbErrorMessage, EmptyState, fmtDate, LoadingState, PageHeader, StatusBadge, StatusToggle, DeleteButton } from "@/components/admin-ui";
import { CompanyForm } from "@/components/admin-forms";
import { getCompany, isUuid, listCompanyAdmins, setCompanyStatus, setDeleted } from "@/lib/admin-data";
import { SubscriptionOverviewCard } from "@/components/subscription-ui";

export const Route = createFileRoute("/_authenticated/admin/companies/$id")({
  validateSearch: z.object({ edit: z.boolean().optional() }),
  head: () => ({ meta: [{ title: "Empresa — Vellune Digital" }] }),
  component: CompanyDetail,
});

function CompanyDetail() {
  const { id } = Route.useParams();
  const { edit } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();
  const valid = isUuid(id);
  const company = useQuery({ queryKey: ["admin", "company", id], queryFn: () => getCompany(id), enabled: valid });
  const admins = useQuery({ queryKey: ["admin", "company-admins", id], queryFn: () => listCompanyAdmins(id), enabled: valid });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });
  const setEdit = (e: boolean) => navigate({ search: e ? { edit: true } : {}, replace: true });

  const back = (
    <Link to="/admin/companies" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" />Empresas
    </Link>
  );
  if (valid && company.isLoading) return <div>{back}<LoadingState /></div>;
  const c = company.data;
  if (!valid || !c || (c as { deleted_at?: string | null }).deleted_at) return <div>{back}<EmptyState>Empresa não encontrada.</EmptyState></div>;

  return (
    <div>
      {back}
      <PageHeader title={c.name} description={c.type ?? undefined}
        action={!edit && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" />Editar</Button>
            <StatusToggle size="default" status={c.status} name={c.name}
              onConfirm={async () => { await setCompanyStatus(c.id, c.status === "active" ? "inactive" : "active"); refresh(); }} />
            <DeleteButton name={c.name} description="A empresa vai para a Lixeira. Clientes, modelos, convites, respostas, visualizações e arquivos são preservados e tudo pode ser restaurado."
              onConfirm={async () => { try { await setDeleted("companies", c.id, true); toast.success("Empresa enviada para a Lixeira."); await qc.invalidateQueries(); await navigate({ to: "/admin/companies" }); } catch { toast.error("Não foi possível excluir."); } }} />
          </div>
        )} />

      {edit ? (
        <CompanyForm key={c.updated_at} initial={{ name: c.name, type: c.type ?? "", status: c.status }} submitLabel="Salvar alterações"
          onCancel={() => setEdit(false)}
          onSubmit={async (v) => {
            const { error } = await supabase.from("companies").update(v).eq("id", c.id);
            if (error) { toast.error(dbErrorMessage(error, "Já existe uma empresa com esse nome.")); return; }
            toast.success("Empresa atualizada.");
            await refresh();
            setEdit(false);
          }} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_1fr]">
          <dl className="grid gap-3 rounded-xl border p-5 text-sm">
            <div><dt className="text-muted-foreground">Status</dt><dd className="mt-1"><StatusBadge status={c.status} /></dd></div>
            <div><dt className="text-muted-foreground">Tipo</dt><dd>{c.type ?? "—"}</dd></div>
            <div><dt className="text-muted-foreground">Criada em</dt><dd>{fmtDate(c.created_at)}</dd></div>
            <div><dt className="text-muted-foreground">Atualizada em</dt><dd>{fmtDate(c.updated_at)}</dd></div>
          </dl>
          <div className="rounded-xl border p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="font-medium">Administradores</h2>
              <Button size="sm" variant="outline" asChild>
                <Link to="/admin/users/new" search={{ company: c.id }}><Plus className="h-4 w-4" />Adicionar</Link>
              </Button>
            </div>
            {admins.isLoading ? <LoadingState /> : !admins.data?.length ? (
              <p className="text-sm text-muted-foreground">Nenhum administrador cadastrado.</p>
            ) : (
              <ul className="divide-y">
                {admins.data.map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <Link to="/admin/users/$id" params={{ id: u.id }} className="min-w-0 hover:underline">
                      <div className="truncate font-medium">{u.name}</div>
                      <div className="truncate text-muted-foreground">{u.email}</div>
                    </Link>
                    <StatusBadge status={u.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      {!edit && <section className="mt-6"><SubscriptionOverviewCard companyId={c.id} /></section>}
    </div>
  );
}
