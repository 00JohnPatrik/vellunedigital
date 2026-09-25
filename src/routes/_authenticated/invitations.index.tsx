import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { BarChart3, Copy, Eye, MessageCircle, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState, fmtDate, LoadingState, PageHeader } from "@/components/admin-ui";
import { InvitationStatusBadge } from "@/components/invitation-ui";
import { deleteInvitation, fmtEventDate, invitationsKey, listInvitations, publicUrl, whatsappShareUrl, type Invitation } from "@/lib/invitations";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/invitations/")({
  head: () => ({ meta: [{ title: "Convites — Convitely" }] }),
  component: InvitationsPage,
});

type Filter = "all" | "draft" | "published" | "closed";
const FILTERS: [Filter, string][] = [["all", "Todos"], ["draft", "Rascunhos"], ["published", "Publicados"], ["closed", "Fechados"]];

function InvitationsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: invitationsKey, queryFn: listInvitations });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [toDelete, setToDelete] = useState<Invitation | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data ?? []).filter((i) => (filter === "all" || i.status === filter) && (!s || i.name.toLowerCase().includes(s)));
  }, [q.data, search, filter]);

  async function confirmDelete() {
    if (!toDelete) return;
    setBusy(true);
    try { await deleteInvitation(toDelete.id); toast.success("Convite excluído."); await qc.invalidateQueries({ queryKey: invitationsKey }); }
    catch { toast.error("Não foi possível excluir. Tente novamente."); }
    finally { setBusy(false); setToDelete(null); }
  }

  const actions = (i: Invitation, variant: "ghost" | "outline") => {
    const shareable = i.status === "published";
    return (
      <>
        <Button variant={variant} size="sm" asChild><Link to="/invitations/$id/editor" params={{ id: i.id }}><Pencil className="h-4 w-4" />Editar</Link></Button>
        <Button variant={variant} size="sm" asChild><Link to="/invitations/$id/preview" params={{ id: i.id }}><Eye className="h-4 w-4" />Visualizar</Link></Button>
        {shareable && <>
          <Button variant={variant} size="sm" onClick={() => { navigator.clipboard.writeText(publicUrl(i.slug)); toast.success("Link copiado."); }}><Copy className="h-4 w-4" />Copiar link</Button>
          <Button variant={variant} size="sm" asChild><a href={whatsappShareUrl(i.slug)} target="_blank" rel="noreferrer"><MessageCircle className="h-4 w-4" />WhatsApp</a></Button>
        </>}
        <Button variant={variant} size="sm" disabled title="Disponível em breve"><BarChart3 className="h-4 w-4" />Relatório</Button>
        <Button variant={variant} size="sm" className="text-destructive" onClick={() => setToDelete(i)}><Trash2 className="h-4 w-4" />Excluir</Button>
      </>
    );
  };

  return (
    <div>
      <PageHeader title="Convites" description="Crie e gerencie os convites dos seus clientes."
        action={<Button asChild><Link to="/invitations/new"><Plus className="h-4 w-4" />Novo convite</Link></Button>} />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome do convite" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="inline-flex flex-wrap rounded-md border p-0.5">
          {FILTERS.map(([k, l]) => (
            <button key={k} type="button" onClick={() => setFilter(k)}
              className={cn("rounded px-3 py-1.5 text-sm", filter === k ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{l}</button>
          ))}
        </div>
      </div>

      {q.isLoading ? <LoadingState /> : q.isError ? <EmptyState>Não foi possível carregar os convites.</EmptyState>
        : rows.length === 0 ? <EmptyState>{q.data?.length ? "Nenhum convite encontrado." : "Nenhum convite criado ainda. Clique em \"Novo convite\" para começar."}</EmptyState> : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border lg:block">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">Evento</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Atualizado</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((i) => (
                  <tr key={i.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{i.name}</td>
                    <td className="px-4 py-3">{i.customer?.name ?? "—"}</td>
                    <td className="px-4 py-3">{fmtEventDate(i.event_date)} · {i.event_time.slice(0, 5)}</td>
                    <td className="px-4 py-3"><InvitationStatusBadge status={i.status} /></td>
                    <td className="px-4 py-3">{fmtDate(i.updated_at)}</td>
                    <td className="px-4 py-3"><div className="flex flex-wrap justify-end gap-1">{actions(i, "ghost")}</div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {rows.map((i) => (
              <div key={i.id} className="rounded-xl border p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{i.name}</div>
                    <div className="truncate text-sm text-muted-foreground">{i.customer?.name ?? "—"}</div>
                  </div>
                  <InvitationStatusBadge status={i.status} />
                </div>
                <div className="mt-2 text-sm">{fmtEventDate(i.event_date)} · {i.event_time.slice(0, 5)} · atualizado {fmtDate(i.updated_at)}</div>
                <div className="mt-3 flex flex-wrap gap-2">{actions(i, "outline")}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir este convite?</AlertDialogTitle>
            <AlertDialogDescription>{toDelete?.name} deixará de aparecer na lista.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); confirmDelete(); }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
