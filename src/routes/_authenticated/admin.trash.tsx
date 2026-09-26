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

type Tab = TrashKind | "company" | "admin";
const TABS: [Tab, string, string][] = [
  ["invitation", "Convites", "Nenhum convite na lixeira."],
  ["company", "Empresas", "Nenhuma empresa na lixeira."],
  ["customer", "Clientes", "Nenhum cliente na lixeira."],
  ["admin", "Administradores", "Nenhum administrador na lixeira."],
  ["template", "Modelos", "Nenhum modelo na lixeira."],
];
const fmt = (s: string) => new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

function details(r: TrashItem) {
  const parts: string[] = [];
  if (r.kind === "invitation") parts.push(`Empresa: ${r.company ?? "—"}`, `Cliente: ${r.customer ?? "—"}`);
  if (r.kind === "customer") parts.push(`Empresa: ${r.company ?? "—"}`);
  if (r.kind === "template") parts.push(`Empresa: ${r.company ?? "Oficial"}`, `Categoria: ${r.category ? categoryLabel(r.category) : "—"}`);
  parts.push(`Excluído em ${fmt(r.deleted_at)}`, `Por ${r.deleted_by ?? "—"}`);
  return parts.join(" · ");
}

function TrashPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: trashKey, queryFn: listTrash });
  const [tab, setTab] = useState<Tab>("invitation");
  const [target, setTarget] = useState<TrashItem | null>(null);
  const [busy, setBusy] = useState(false);
  const all = q.data ?? [];
  const count = (t: Tab) => all.filter((r) => r.kind === t).length;
  const rows = all.filter((r) => r.kind === tab);
  const empty = TABS.find((t) => t[0] === tab)![2];

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
      <PageHeader title="Lixeira" description="Itens excluídos, separados por tipo. Nada é apagado definitivamente." />
      <div className="mb-4 inline-flex flex-wrap rounded-md border p-0.5">
        {TABS.map(([v, l]) => (
          <button key={v} type="button" onClick={() => setTab(v)}
            className={cn("rounded px-3 py-1.5 text-sm", tab === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>{l} ({count(v)})</button>
        ))}
      </div>
      {q.isLoading ? <LoadingState /> : q.error ? <p className="text-sm text-destructive">Não foi possível carregar a lixeira.</p>
        : !rows.length ? <EmptyState>{empty}</EmptyState> : (
          <div className="divide-y rounded-xl border">
            {rows.map((r) => (
              <div key={`${r.kind}-${r.id}`} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <span className="truncate font-medium">{r.name}</span>
                  <p className="mt-1 text-xs text-muted-foreground">{details(r)}</p>
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
