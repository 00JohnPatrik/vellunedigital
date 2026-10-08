import { createFileRoute, Link, useNavigate, useRouteContext } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertCircle, BarChart3, CalendarDays, CheckCircle2, CircleDashed, Copy, Eye, Heart, Link2, Mail, MessageCircle, MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState, fmtDate, LoadingState, PageHeader } from "@/components/admin-ui";
import { InvitationRender, InvitationStatusBadge } from "@/components/invitation-ui";
import { deleteInvitation, duplicateInvitation, fmtEventDate, invitationsKey, listInvitations, publicUrl, whatsappShareUrl, type Invitation } from "@/lib/invitations";
import { invitationFavoritesKey, listInvitationFavorites, setInvitationFavorite } from "@/lib/invitation-favorites";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/_authenticated/invitations/")({
  head: () => ({ meta: [{ title: "Convites — Vellune Digital" }] }),
  component: InvitationsPage,
});

type Filter = "all" | "draft" | "published" | "closed" | "favorites";
const FILTERS: [Filter, string][] = [["all", "Todos"], ["draft", "Rascunhos"], ["published", "Publicados"], ["closed", "Fechados"]];

function InvitationsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const q = useQuery({ queryKey: invitationsKey, queryFn: listInvitations });
  const favoritesQuery = useQuery({
    queryKey: invitationFavoritesKey(appUser.id),
    queryFn: () => listInvitationFavorites(appUser.id),
    staleTime: 60_000,
  });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const { appUser } = useRouteContext({ from: "/_authenticated" });
  const isSuper = appUser?.role === "super_admin";
  const [toDelete, setToDelete] = useState<Invitation | null>(null);
  const [busy, setBusy] = useState(false);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);

  const favoriteIds = useMemo(() => new Set(favoritesQuery.data ?? []), [favoritesQuery.data]);

  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data ?? []).filter((i) => {
      const name = String(i.name ?? "");
      const customer = String(i.customer?.name ?? "");
      const matchesFilter = filter === "favorites" ? favoriteIds.has(i.id) : filter === "all" || i.status === filter;
      return matchesFilter && (!s || name.toLowerCase().includes(s) || customer.toLowerCase().includes(s));
    });
  }, [q.data, search, filter, favoriteIds]);

  const statusCounts = useMemo(() => {
    const all = q.data ?? [];
    return {
      all: all.length,
      draft: all.filter((i) => i.status === "draft").length,
      published: all.filter((i) => i.status === "published").length,
      closed: all.filter((i) => i.status === "closed").length,
    };
  }, [q.data]);

  async function toggleFavorite(i: Invitation) {
    const wasFavorite = favoriteIds.has(i.id);
    qc.setQueryData<string[]>(invitationFavoritesKey(appUser.id), (current) => {
      const ids = new Set(current ?? []);
      if (wasFavorite) ids.delete(i.id);
      else ids.add(i.id);
      return [...ids];
    });
    try {
      await setInvitationFavorite(appUser.id, i.id, !wasFavorite);
      toast.success(wasFavorite ? "Removido dos favoritos." : "Adicionado aos favoritos.");
    } catch {
      await qc.invalidateQueries({ queryKey: invitationFavoritesKey(appUser.id) });
      toast.error("Não foi possível atualizar o favorito.");
    }
  }

  async function duplicate(i: Invitation) {
    if (duplicatingId) return;
    setDuplicatingId(i.id);
    try {
      const id = await duplicateInvitation(i.id);
      await qc.invalidateQueries({ queryKey: invitationsKey });
      toast.success("Convite duplicado. Abrindo a nova cópia.");
      navigate({ to: "/invitations/$id/editor", params: { id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível duplicar o convite.");
    } finally {
      setDuplicatingId(null);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setBusy(true);
    try { await deleteInvitation(toDelete.id); toast.success("Convite excluído."); await qc.invalidateQueries({ queryKey: invitationsKey }); }
    catch { toast.error("Não foi possível excluir. Tente novamente."); }
    finally { setBusy(false); setToDelete(null); }
  }

  const copyPublicLink = (i: Invitation) => {
    navigator.clipboard.writeText(publicUrl(i.slug));
    toast.success("Link do convite copiado.");
  };

  const copyHostLink = (i: Invitation) => {
    if (!i.access_token) return;
    navigator.clipboard.writeText(`${window.location.origin}/painel-convite/${i.access_token}`);
    toast.success("Link do anfitrião copiado.");
  };

  const actions = (i: Invitation, variant: "ghost" | "outline") => {
    const shareable = i.status === "published";
    return (
      <div className="flex items-center gap-1.5">
        <Button
          variant={variant}
          size="icon"
          aria-pressed={favoriteIds.has(i.id)}
          aria-label={favoriteIds.has(i.id) ? `Remover ${i.name} dos favoritos` : `Favoritar ${i.name}`}
          title={favoriteIds.has(i.id) ? "Remover dos favoritos" : "Favoritar"}
          onClick={() => void toggleFavorite(i)}
          className={cn(favoriteIds.has(i.id) && "text-[#d4af37] hover:text-[#e5c66b]")}
        >
          <Heart className={cn("h-4 w-4", favoriteIds.has(i.id) && "fill-current")} />
        </Button>
        <Button variant={variant} size="sm" asChild>
          <Link to="/invitations/$id/editor" params={{ id: i.id }}>
            <Pencil className="h-4 w-4" />Editar
          </Link>
        </Button>
        <Button variant={variant} size="sm" asChild>
          <Link to="/invitations/$id/preview" params={{ id: i.id }}>
            <Eye className="h-4 w-4" />Visualizar
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant={variant} size="icon" aria-label={`Mais ações para ${i.name}`} title="Mais ações">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {shareable && (
              <>
                <DropdownMenuItem onSelect={() => copyPublicLink(i)}>
                  <Copy className="h-4 w-4" />Copiar link
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={whatsappShareUrl(i.slug)} target="_blank" rel="noreferrer">
                    <MessageCircle className="h-4 w-4" />Compartilhar no WhatsApp
                  </a>
                </DropdownMenuItem>
                {i.access_token && (
                  <DropdownMenuItem onSelect={() => copyHostLink(i)}>
                    <Link2 className="h-4 w-4" />Link do anfitrião
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem onSelect={() => void toggleFavorite(i)}>
              <Heart className={cn("h-4 w-4", favoriteIds.has(i.id) && "fill-current text-[#d4af37]")} />{favoriteIds.has(i.id) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void duplicate(i)} disabled={duplicatingId === i.id}>
              <Copy className="h-4 w-4" />{duplicatingId === i.id ? "Duplicando..." : "Duplicar convite"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/invitations/$id/report" params={{ id: i.id }}>
                <BarChart3 className="h-4 w-4" />Ver relatório
              </Link>
            </DropdownMenuItem>
            {isSuper && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setToDelete(i)}>
                  <Trash2 className="h-4 w-4" />Excluir convite
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
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
            className={cn("vellune-platform-card flex items-center gap-3 p-4 text-left", filter === key && "border-[#d4af37]/55")}>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Icon className="h-4 w-4" /></span>
            <span className="min-w-0"><span className="block text-2xl font-semibold tabular-nums">{count}</span><span className="text-xs text-muted-foreground">{label}</span></span>
          </button>
        ))}
      </div>

      <div className="mb-5 flex flex-col gap-3 rounded-xl border bg-card p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar convite ou cliente" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Buscar convites" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 rounded-lg bg-muted/60 p-1" role="group" aria-label="Filtrar convites">
            {FILTERS.map(([k, l]) => (
              <button key={k} type="button" onClick={() => setFilter(k)} aria-pressed={filter === k}
                className={cn("rounded-md px-3 py-1.5 text-sm transition-colors", filter === k ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{l}</button>
            ))}
          </div>
                      <button type="button" onClick={() => setFilter("favorites")} aria-pressed={filter === "favorites"}
              className={cn("inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm transition-colors", filter === "favorites" ? "border-[#d4af37]/50 bg-[#d4af37]/10 font-medium text-[#e5c66b]" : "border-transparent text-muted-foreground hover:border-[#2a2b31] hover:text-foreground")}>
              <Heart className={cn("h-3.5 w-3.5", filter === "favorites" && "fill-current")} />
              Favoritos
              <span className="text-[10px] opacity-70">({favoritesQuery.data?.length ?? 0})</span>
            </button>
          {(search || filter !== "all") && (
            <Button type="button" variant="ghost" size="sm" onClick={() => { setSearch(""); setFilter("all"); }}>
              Limpar filtros
            </Button>
          )}
        </div>
      </div>
      {!q.isLoading && !q.isError && (
        <p className="mb-4 text-sm text-muted-foreground" aria-live="polite">
          {rows.length} {rows.length === 1 ? "convite encontrado" : "convites encontrados"}
          {search || filter !== "all" ? " com os filtros atuais" : ""}.
        </p>
      )}

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
          <div className="hidden gap-4 lg:grid lg:grid-cols-2 xl:grid-cols-3">
  {rows.map((i) => (
    <article key={i.id} className="group overflow-hidden rounded-[22px] border border-[#2a2b31] bg-[#111318] shadow-[0_18px_55px_-42px_rgba(0,0,0,0.95)] transition duration-200 hover:-translate-y-0.5 hover:border-[#d4af37]/45 hover:shadow-[0_26px_65px_-40px_rgba(212,175,55,0.28)]">
      <Link to="/invitations/$id/editor" params={{ id: i.id }} className="block">
        <div className="relative h-[270px] overflow-hidden bg-[#08090d]">
          <div className="absolute inset-0 flex items-start justify-center overflow-hidden">
            <div className="h-[700px] w-[390px] origin-top scale-[0.54]">
              <InvitationRender
                background={i.content?.settings?.background}
                blocks={i.content?.blocks ?? []}
                ctx={{ event_date: i.event_date, event_time: i.event_time, venue_name: i.venue_name, address: i.address, city: i.city, state: i.state, publicUrl: publicUrl(i.slug) }}
              />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#111318] via-[#111318]/55 to-transparent" />
          <div className="absolute left-3 top-3"><InvitationStatusBadge status={i.status} /></div>
          <span className="absolute bottom-3 right-3 rounded-full border border-[#2a2b31] bg-[#08090d]/80 p-2 text-[#F5F7FA] backdrop-blur-md transition group-hover:text-[#d4af37]"><Eye className="h-4 w-4" /></span>
        </div>
      </Link>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-display text-base font-semibold text-[#F5F7FA]">{i.name}</h2>
            <p className="mt-1 truncate text-xs text-[#A9B1BF]">{i.customer?.name ?? "Sem cliente"}</p>
          </div>
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-[#d4af37]" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[10px] text-[#A9B1BF]">
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" />{fmtEventDate(i.event_date)}</span>
          <span>{fmtDate(i.updated_at)}</span>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">{actions(i, "outline")}</div>
      </div>
    </article>
  ))}
</div>
<div className="grid gap-3 sm:grid-cols-2 lg:hidden">
            {rows.map((i) => (
              <div key={i.id} className="vellune-platform-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{i.name}</div>
                    <div className="truncate text-sm text-muted-foreground">{i.customer?.name ?? "—"}</div>
                  </div>
                  <InvitationStatusBadge status={i.status} />
                </div>
                <div className="mt-2 text-sm">{fmtEventDate(i.event_date)} · {String(i.event_time ?? "").slice(0, 5) || "—"} · atualizado {fmtDate(i.updated_at)}</div>
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
