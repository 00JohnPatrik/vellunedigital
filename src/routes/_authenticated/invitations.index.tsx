import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertCircle, BarChart3, CheckCircle2, CircleDashed, Copy, Eye, Link2, MessageCircle, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState, fmtDate, LoadingState, PageHeader } from "@/components/admin-ui";
import { InvitationStatusBadge } from "@/components/invitation-ui";
import { RsvpPanel } from "@/components/rsvp-panel";
import { deleteInvitation, fmtEventDate, invitationsKey, listInvitations, publicUrl, whatsappShareUrl, type Invitation } from "@/lib/invitations";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/invitations/")({
  head: () => ({ meta: [{ title: "Convites — Vellune Digital" }] }),
  component: InvitationsPage,
});

type Filter = "all" | "draft" | "published" | "closed";
const FILTERS: [Filter, string][] = [["all", "Todos"], ["draft", "Rascunhos"], ["published", "Publicados"], ["closed", "Fechados"]];

function InvitationsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: invitationsKey, queryFn: listInvitations });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const isSuper = Route.useRouteContext().appUser.role === "super_admin";
  const [toDelete, setToDelete] = useState<Invitation | null>(null);
  const [reportInvitationId, setReportInvitationId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data ?? []).filter((i) => (filter === "all" || i.status === filter) && (!s || i.name.toLowerCase().includes(s)));
  }, [q.data, search, filter]);

  const statusCounts = useMemo(() => {
    const all = q.data ?? [];
    return {
      all: all.length,
      draft: all.filter((i) => i.status === "draft").length,
      published: all.filter((i) => i.status === "published").length,
      closed: all.filter((i) => i.status === "closed").length,
    };
  }, [q.data]);

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
          {i.access_token && <Button variant={variant} size="sm" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/painel-convite/${i.access_token}`); toast.success("Link do anfitrião copiado."); }}><Link2 className="h-4 w-4" />Copiar link do anfitrião</Button>}
        </>}
        <Button variant={variant} size="sm" onClick={() => setReportInvitationId(i.id)}><BarChart3 className="h-4 w-4" />Relatório</Button>
        {isSuper && <Button variant={variant} size="sm" className="text-destructive" onClick={() => setToDelete(i)}><Trash2 className="h-4 w-4" />Excluir</Button>}
      </>
    );
  };

  return (
    <div>
      <PageHeader title="Convites" description="Crie e gerencie os convites dos seus clientes."
        action={<Button asChild><Link to="/invitations/new"><Plus className="h-4 w-4" />Novo convite</Link></Button>} />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {([
          ["all", "Total", statusCounts.all, CircleDashed],
          ["draft", "Rascunhos", statusCounts.draft, CircleDashed],
          ["published", "Publicados", statusCounts.published, CheckCircle2],
          ["closed", "Fechados", statusCounts.closed, AlertCircle],
        ] as const).map(([key, label, count, Icon]) => (
          <button key={key} type="button" onClick={() => setFilter(key)} aria-pressed={filter === key}
            className={cn("flex items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/50 hover:bg-accent/40", filter === key && "border-primary bg-primary/5 ring-1 ring-primary/20")}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></span>
            <span className="min-w-0"><span className="block text-2xl font-semibold tabular-nums">{count}</span><span className="text-xs text-muted-foreground">{label}</span></span>
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome do convite" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar convites" />
        </div>
        <div className="flex flex-wrap gap-1 rounded-lg bg-muted/60 p-1" role="group" aria-label="Filtrar convites">
          {FILTERS.map(([k, l]) => (
            <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k}
              className={cn("rounded-md px-3 py-1.5 text-sm transition-colors", filter === k ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{l}</button>
          ))}
        </div>
      </div>

      {q.isLoading ? <LoadingState /> : q.isError ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-8 text-center">
          <AlertCircle className="mx-auto mb-3 h-5 w-5 text-destructive" />
          <p className="text-sm font-medium">Não foi possível carregar os convites.</p>
          <p className="mt-1 text-sm text-muted-foreground">Tente novamente para atualizar esta lista.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => void q.refetch()}>Tentar novamente</Button>
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed bg-muted/20 p-10 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-muted"><Search className="h-5 w-5 text-muted-foreground" /></div>
          <p className="mt-3 text-sm font-medium">{q.data?.length ? "Nenhum convite encontrado" : "Nenhum convite criado ainda"}</p>
          <p className="mt-1 text-sm text-muted-foreground">{q.data?.length ? "Ajuste a busca ou selecione outro filtro." : "Crie seu primeiro convite para começar."}</p>
          {!q.data?.length && <Button asChild size="sm" className="mt-4"><Link to="/invitations/new"><Plus className="h-4 w-4" />Novo convite</Link></Button>}
        </div>
      ) : (
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
                  <tr key={i.id} className="border-t transition-colors hover:bg-muted/30">
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
              <div key={i.id} className="rounded-xl border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:shadow-md">
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

      {reportInvitationId && <RsvpPanel invitationId={reportInvitationId} open onOpenChange={(open) => { if (!open) setReportInvitationId(null); }} />}

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
