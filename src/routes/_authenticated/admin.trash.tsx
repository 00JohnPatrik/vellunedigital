import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EmptyState, LoadingState, PageHeader } from "@/components/admin-ui";
import { listTrash, restore, TRASH_LABEL, trashKey, type TrashItem, type TrashKind } from "@/lib/trash";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/trash")({
  head: () => ({ meta: [{ title: "Lixeira — Vellune Digital" }] }),
  component: TrashPage,
});

const FILTERS: [TrashKind | "all", string][] = [["all", "Todos"], ["customer", "Clientes"], ["template", "Modelos"], ["invitation", "Convites"]];
const fmt = (s: string) => new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

function TrashPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: trashKey, queryFn: listTrash });
  const [filter, setFilter] = useState<TrashKind | "all">("all");
  const [target, setTarget] = useState<TrashItem | null>(null);
  const [busy, setBusy] = useState(false);
  const rows = (q.data ?? []).filter((r) => filter === "all" || r.kind === filter);

  async function confirm() {
    if (!target) return;
    setBusy(true);
    try {
      await restore(target.kind, target.id);
      toast.success(`${TRASH_LABEL[target.kind]} restaurado(a).`);
      await qc.invalidateQueries();
      setTarget(null);
    } catch { toast.error("Não foi possível restaurar."); }
    finally { setBusy(false); }
  }

  return (
    <div>
      <PageHeader title="Lixeira" description="Clientes, modelos e convites excluídos. Nada é apagado definitivamente." />
      <div className="mb-4 inline-flex flex-wrap rounded-md border p-0.5">
        {FILTERS.map(([v, l]) => (
          <button key={v} type="button" onClick={() => setFilter(v)}
            className={cn("rounded px-3 py-1.5 text-sm", filter === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{l}</button>
        ))}
      </div>
      {q.isLoading ? <LoadingState /> : q.error ? <p className="text-sm text-destructive">Não foi possível carregar a lixeira.</p>
        : !rows.length ? <EmptyState>A lixeira está vazia.</EmptyState> : (
          <div className="divide-y rounded-xl border">
            {rows.map((r) => (
              <div key={`${r.kind}-${r.id}`} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2"><Badge variant="secondary">{TRASH_LABEL[r.kind]}</Badge><span className="truncate font-medium">{r.name}</span></div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {r.company ?? "Oficial"} · excluído em {fmt(r.deleted_at)} · por {r.deleted_by ?? "—"}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setTarget(r)}>Restaurar</Button>
              </div>
            ))}
          </div>
        )}
      <AlertDialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Restaurar este item?</AlertDialogTitle></AlertDialogHeader>
          {target?.kind === "invitation" && <p className="text-sm text-muted-foreground">O convite volta como rascunho.</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); void confirm(); }}>Restaurar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
