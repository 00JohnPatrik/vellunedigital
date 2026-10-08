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
  head: () => ({ meta: [{ title: "Cliente — Vellune Digital" }] }),
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
  const responseQ = useQuery({
    queryKey: ["customers", id, "responses"],
    enabled: valid && Boolean(hist.data?.length),
    queryFn: async () => {
      const ids = (hist.data ?? []).map((item) => item.id);
      if (!ids.length) return [] as { invitation_id: string; status: "confirmed" | "declined"; people_count: number | null; created_at: string }[];
      const { data, error } = await supabase.from("rsvp_responses").select("invitation_id,status,people_count,created_at").in("invitation_id", ids).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as { invitation_id: string; status: "confirmed" | "declined"; people_count: number | null; created_at: string }[];
    },
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["customers"] });
  const setEdit = (e: boolean) => navigate({ search: e ? { edit: true } : {}, replace: true });

  const back = (
    <Link to="/customers" className="mb-4 inline-flex items-center gap-1 rounded-full border border-[#2a2b31] bg-[#111318] px-3 py-1.5 text-xs font-medium text-[#A9B1BF] transition hover:border-[#d4af37]/45 hover:text-[#F5F7FA]">
      <ArrowLeft className="h-4 w-4" />Clientes
    </Link>
  );
  if (valid && q.isLoading) return <div>{back}<LoadingState /></div>;
  const c = q.data;
  if (!valid || !c) return <div>{back}<EmptyState>Cliente não encontrado.</EmptyState></div>;

  return (
    <div>
      {back}
      <PageHeader title={c.name} description={appUser!.role === "super_admin" ? c.company?.name : undefined}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" />Editar</Button>
            <StatusToggle size="default" status={c.status} name={c.name}
              onConfirm={async () => { await setCustomerStatus(c.id, c.status === "active" ? "inactive" : "active"); refresh(); }} />
            {appUser!.role === "super_admin" && <DeleteButton name={c.name} onConfirm={async () => {
              try { await softDelete("customer", c.id); toast.success("Cliente enviado para a Lixeira."); await refresh(); navigate({ to: "/customers" }); }
              catch { toast.error("Não foi possível excluir."); }
            }} />}
          </div>
        } />

      <dl className="vellune-platform-card grid max-w-4xl gap-4 p-5 text-sm shadow-[0_20px_70px_-55px_rgba(212,175,55,0.42)] sm:grid-cols-2">
        <div className="rounded-2xl border border-[#2a2b31] bg-[#08090d] p-4"><dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A9B1BF]">Status</dt><dd className="mt-2"><StatusBadge status={c.status} /></dd></div>
        <div className="rounded-2xl border border-[#2a2b31] bg-[#08090d] p-4"><dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A9B1BF]">Telefone</dt><dd className="mt-2 font-medium text-[#F5F7FA]">{c.phone || "—"}</dd></div>
        <div className="min-w-0 rounded-2xl border border-[#2a2b31] bg-[#08090d] p-4"><dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A9B1BF]">E-mail</dt><dd className="mt-2 break-all font-medium text-[#F5F7FA]">{c.email || "—"}</dd></div>
        <div className="rounded-2xl border border-[#2a2b31] bg-[#08090d] p-4"><dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A9B1BF]">Criado em</dt><dd className="mt-2 text-[#F5F7FA]">{fmtDateTime(c.created_at)}</dd></div>
        <div className="rounded-2xl border border-[#2a2b31] bg-[#08090d] p-4"><dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A9B1BF]">Atualizado em</dt><dd className="mt-2 text-[#F5F7FA]">{fmtDateTime(c.updated_at)}</dd></div>
        <div className="rounded-2xl border border-[#2a2b31] bg-[#08090d] p-4 sm:col-span-2"><dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A9B1BF]">Observação</dt><dd className="mt-2 whitespace-pre-wrap text-[#F5F7FA]">{c.observation || "—"}</dd></div>
      </dl>

      <section className="mt-8 max-w-4xl">
        <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#A9B1BF]">Relacionamento</p><h2 className="mt-1 font-display text-lg font-semibold text-[#F5F7FA]">Histórico de convites{hist.data?.length ? ` (${hist.data.length})` : ""}</h2></div><span className="rounded-full border border-[#2a2b31] bg-[#111318] px-2.5 py-1 text-[9px] text-[#A9B1BF]">Atividade do cliente</span></div>
        {hist.isLoading ? <LoadingState /> : !hist.data?.length ? <EmptyState>Este cliente ainda não possui convites.</EmptyState> : (
          <ol className="relative ml-2 border-l border-[#d4af37]/20 pl-5 text-sm">
            {hist.data.map((i) => (
              <li key={i.id} className="relative pb-4 last:pb-0">
                <span className="absolute -left-[25px] top-4 h-3 w-3 rounded-full border-2 border-[#111318] bg-[#d4af37] shadow-[0_0_0_3px_rgba(212,175,55,0.10)]" aria-hidden="true" />
                <div className="vellune-platform-card flex flex-col gap-3 p-4 transition hover:border-[#d4af37]/35 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><span className="truncate font-medium">{i.name}</span><InvitationStatusBadge status={i.status} /></div>
                    <p className="mt-1 text-xs text-muted-foreground">Evento em {fmtEventDate(i.event_date)} · atualizado em {fmtDateTime(i.updated_at)}</p>
                  </div>
                  {i.status === "draft" && <Button size="sm" variant="outline" asChild><Link to="/invitations/$id/editor" params={{ id: i.id }}>Editar</Link></Button>}
                  {(i.status === "published" || i.status === "closed") && <Button size="sm" variant="outline" asChild><Link to="/invitations/$id/preview" params={{ id: i.id }}>Visualizar</Link></Button>}
                  {i.status === "deleted" && <span className="text-xs text-muted-foreground">Somente histórico</span>}
                </div>
              </li>
            ))}
          </ol>
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
