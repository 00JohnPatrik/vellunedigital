import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { DeleteButton, dbErrorMessage, EmptyState, LoadingState, PageHeader, StatusBadge, StatusToggle } from "@/components/admin-ui";
import { CustomerDialog } from "@/components/customer-dialog";
import { getCustomer, toRow } from "@/lib/customers-data";
import { setCustomerStatus } from "@/lib/customer-actions";
import { isUuid } from "@/lib/admin-data";
import { softDelete } from "@/lib/trash";
import { InvitationStatusBadge } from "@/components/invitation-ui";
import { fmtEventDate, type InvitationStatus } from "@/lib/invitations";

export const Route = createFileRoute("/_authenticated/customers/$id")({
  validateSearch: z.object({ edit: z.boolean().optional() }),
  head: () => ({ meta: [{ title: "Cliente — Convitely" }] }),
  component: CustomerDetail,
});

const fmtDateTime = (s: string) => new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

function CustomerDetail() {
  const { id } = Route.useParams();
  const { edit } = Route.useSearch();
  const { appUser } = Route.useRouteContext();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();
  const valid = isUuid(id);
  const q = useQuery({ queryKey: ["customers", id], queryFn: () => getCustomer(id), enabled: valid });
  const hist = useQuery({
    queryKey: ["customers", id, "invitations"], enabled: valid,
    queryFn: async () => {
      const { data, error } = await supabase.from("invitations").select("id, name, event_date, status, updated_at").eq("customer_id", id).order("updated_at", { ascending: false });
      if (error) throw error;
      return data as { id: string; name: string; event_date: string; status: InvitationStatus; updated_at: string }[];
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["customers"] });
  const setEdit = (e: boolean) => navigate({ search: e ? { edit: true } : {}, replace: true });

  const back = (
    <Link to="/customers" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" />Clientes
    </Link>
  );
  if (valid && q.isLoading) return <div>{back}<LoadingState /></div>;
  const c = q.data;
  if (!valid || !c) return <div>{back}<EmptyState>Cliente não encontrado.</EmptyState></div>;

  return (
    <div>
      {back}
      <PageHeader title={c.name} description={appUser.role === "super_admin" ? c.company?.name : undefined}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" />Editar</Button>
            <StatusToggle size="default" status={c.status} name={c.name}
              onConfirm={async () => { await setCustomerStatus(c.id, c.status === "active" ? "inactive" : "active"); refresh(); }} />
            {appUser.role === "super_admin" && <DeleteButton name={c.name} onConfirm={async () => {
              try { await softDelete("customer", c.id); toast.success("Cliente enviado para a Lixeira."); await refresh(); navigate({ to: "/customers" }); }
              catch { toast.error("Não foi possível excluir."); }
            }} />}
          </div>
        } />

      <dl className="grid max-w-2xl gap-4 rounded-xl border p-5 text-sm sm:grid-cols-2">
        <div><dt className="text-muted-foreground">Status</dt><dd className="mt-1"><StatusBadge status={c.status} /></dd></div>
        <div><dt className="text-muted-foreground">Telefone</dt><dd>{c.phone || "—"}</dd></div>
        <div className="min-w-0"><dt className="text-muted-foreground">E-mail</dt><dd className="break-all">{c.email || "—"}</dd></div>
        <div><dt className="text-muted-foreground">Criado em</dt><dd>{fmtDateTime(c.created_at)}</dd></div>
        <div><dt className="text-muted-foreground">Atualizado em</dt><dd>{fmtDateTime(c.updated_at)}</dd></div>
        <div className="sm:col-span-2"><dt className="text-muted-foreground">Observação</dt><dd className="whitespace-pre-wrap">{c.observation || "—"}</dd></div>
      </dl>

      <section className="mt-8 max-w-2xl">
        <h2 className="mb-3 font-display text-lg font-semibold">Histórico de convites{hist.data?.length ? ` (${hist.data.length})` : ""}</h2>
        {hist.isLoading ? <LoadingState /> : !hist.data?.length ? <EmptyState>Este cliente ainda não possui convites.</EmptyState> : (
          <div className="divide-y rounded-xl border text-sm">
            {hist.data.map((i) => (
              <div key={i.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><span className="truncate font-medium">{i.name}</span><InvitationStatusBadge status={i.status} /></div>
                  <p className="mt-1 text-xs text-muted-foreground">Evento em {fmtEventDate(i.event_date)} · atualizado em {fmtDateTime(i.updated_at)}</p>
                </div>
                {i.status === "draft" && <Button size="sm" variant="outline" asChild><Link to="/invitations/$id/editor" params={{ id: i.id }}>Editar</Link></Button>}
                {(i.status === "published" || i.status === "closed") && <Button size="sm" variant="outline" asChild><Link to="/invitations/$id/preview" params={{ id: i.id }}>Visualizar</Link></Button>}
                {i.status === "deleted" && <span className="text-xs text-muted-foreground">Somente histórico</span>}
              </div>
            ))}
          </div>
        )}
      </section>

      <CustomerDialog open={!!edit} onOpenChange={setEdit} title="Editar cliente" showStatus
        initial={{ name: c.name, phone: c.phone ?? "", email: c.email ?? "", observation: c.observation ?? "", status: c.status }}
        onSubmit={async (v) => {
          const { error } = await supabase.from("customers").update(toRow(v)).eq("id", c.id);
          if (error) { toast.error(dbErrorMessage(error, "Cliente já cadastrado.")); return false; }
          toast.success("Cliente atualizado.");
          await refresh();
          return true;
        }} />
    </div>
  );
}
