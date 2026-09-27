import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Loader2, Pencil, RefreshCw, Send } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { dbErrorMessage, EmptyState, fmtDate, LoadingState, PageHeader, StatusBadge, StatusToggle, DeleteButton } from "@/components/admin-ui";
import { UserForm } from "@/components/admin-forms";
import { getCompanyAdmin, isUuid, setUserStatus, setDeleted } from "@/lib/admin-data";
import { sendAccessInvite } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin/users/$id")({
  validateSearch: z.object({ edit: z.boolean().optional() }),
  head: () => ({ meta: [{ title: "Usuário — Vellune Digital" }] }),
  component: UserDetail,
});

function UserDetail() {
  const { id } = Route.useParams();
  const { edit } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const qc = useQueryClient();
  const invite = useServerFn(sendAccessInvite);
  const [sending, setSending] = useState(false);
  const valid = isUuid(id);
  const q = useQuery({ queryKey: ["admin", "user", id], queryFn: () => getCompanyAdmin(id), enabled: valid });
  const refresh = () => qc.invalidateQueries({ queryKey: ["admin"] });
  const setEdit = (e: boolean) => navigate({ search: e ? { edit: true } : {}, replace: true });

  const back = (
    <Link to="/admin/users" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="h-4 w-4" />Usuários
    </Link>
  );
  if (valid && q.isLoading) return <div>{back}<LoadingState /></div>;
  if (valid && q.isError) return (
    <div>
      {back}
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="font-medium text-destructive">Não foi possível carregar este usuário.</p>
        <p className="mt-2 break-words text-sm text-muted-foreground">{q.error instanceof Error ? q.error.message : "Erro retornado pelo Supabase."}</p>
        <Button className="mt-4" variant="outline" onClick={() => void q.refetch()}><RefreshCw className="h-4 w-4" />Tentar novamente</Button>
      </div>
    </div>
  );
  const u = q.data;
  if (!valid || !u) return <div>{back}<EmptyState>Usuário não encontrado.</EmptyState></div>;

  async function resend() {
    setSending(true);
    try {
      const r = await invite({ data: { userId: u!.id, origin: window.location.origin } });
      if (r.ok) toast.success(`Acesso inicial enviado para ${u!.email}.`); else toast.error(r.error);
      refresh();
    } catch { toast.error("Não foi possível enviar o acesso."); } finally { setSending(false); }
  }

  return (
    <div>
      {back}
      <PageHeader title={u.name} description={u.email}
        action={!edit && (
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" />Editar</Button>
            <Button variant="outline" onClick={resend} disabled={sending || u.status !== "active"}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {u.auth_user_id ? "Reenviar acesso" : "Enviar acesso"}
            </Button>
            <StatusToggle size="default" status={u.status} name={u.name}
              onConfirm={async () => { await setUserStatus(u.id, u.status === "active" ? "inactive" : "active"); refresh(); }} />
            <DeleteButton name={u.name} description="O administrador vai para a Lixeira e perde o acesso imediatamente. A empresa e o histórico são preservados e ele pode ser restaurado."
              onConfirm={async () => { try { await setDeleted("users", u.id, true); toast.success("Administrador enviado para a Lixeira."); await qc.invalidateQueries(); await navigate({ to: "/admin/users" }); } catch { toast.error("Não foi possível excluir."); } }} />
          </div>
        )} />

      {edit ? (
        <UserForm key={u.updated_at} emailLocked submitLabel="Salvar alterações" onCancel={() => setEdit(false)}
          initial={{ name: u.name, email: u.email, phone: u.phone ?? "", company_id: u.company_id, status: u.status }}
          onSubmit={async (v) => {
            const { error } = await supabase.from("users")
              .update({ name: v.name, phone: v.phone || null, company_id: v.company_id, status: v.status }).eq("id", u.id);
            if (error) { toast.error(dbErrorMessage(error, "Já existe um usuário com esse telefone ou e-mail.")); return; }
            toast.success("Usuário atualizado.");
            await refresh();
            setEdit(false);
          }} />
      ) : (
        <dl className="grid max-w-2xl gap-4 rounded-xl border p-5 text-sm sm:grid-cols-2">
          <div><dt className="text-muted-foreground">Status</dt><dd className="mt-1"><StatusBadge status={u.status} /></dd></div>
          <div><dt className="text-muted-foreground">Função</dt><dd>Admin da empresa</dd></div>
          <div><dt className="text-muted-foreground">Empresa</dt><dd>
            {u.company ? <Link to="/admin/companies/$id" params={{ id: u.company.id }} className="hover:underline">{u.company.name}</Link> : "—"}
            {u.company?.status === "inactive" && <span className="ml-2 text-xs text-destructive">(inativa)</span>}
          </dd></div>
          <div><dt className="text-muted-foreground">Telefone</dt><dd>{u.phone || "—"}</dd></div>
          <div><dt className="text-muted-foreground">Acesso</dt><dd>{u.auth_user_id ? "Conta de acesso criada" : "Acesso ainda não enviado"}</dd></div>
          <div><dt className="text-muted-foreground">Criado em</dt><dd>{fmtDate(u.created_at)}</dd></div>
        </dl>
      )}
    </div>
  );
}
