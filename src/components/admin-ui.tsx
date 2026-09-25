import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

export type Status = "active" | "inactive";
export type StatusFilter = "all" | Status;

export function PageHeader({ title, description, action }: { title: string; description?: string | undefined; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: Status }) {
  return <Badge variant={status === "active" ? "default" : "secondary"}>{status === "active" ? "Ativo" : "Inativo"}</Badge>;
}

export function StatusTabs({ value, onChange, labels }: { value: StatusFilter; onChange: (v: StatusFilter) => void; labels: [string, string, string] }) {
  const opts: StatusFilter[] = ["all", "active", "inactive"];
  return (
    <div className="inline-flex rounded-md border p-0.5">
      {opts.map((o, i) => (
        <button key={o} type="button" onClick={() => onChange(o)}
          className={cn("rounded px-3 py-1.5 text-sm", value === o ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
          {labels[i]}
        </button>
      ))}
    </div>
  );
}

/** Toggle status; asks for confirmation before deactivating. */
export function StatusToggle({ status, name, onConfirm, size = "sm" }: { status: Status; name: string; onConfirm: () => Promise<void>; size?: "sm" | "default" }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const run = async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); setOpen(false); } };
  if (status === "inactive") {
    return <Button variant="outline" size={size} disabled={busy} onClick={run}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Ativar</Button>;
  }
  return (
    <>
      <Button variant="outline" size={size} onClick={() => setOpen(true)}>Inativar</Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Inativar {name}?</AlertDialogTitle>
            <AlertDialogDescription>O acesso à área administrativa será bloqueado até que seja ativado novamente.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); run(); }}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}Inativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">{children}</div>;
}

export function LoadingState() {
  return <div className="flex items-center justify-center p-10 text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>;
}

export const fmtDate = (s: string) => new Date(s).toLocaleDateString("pt-BR");

export function dbErrorMessage(err: { code?: string; message?: string } | null, dupMsg: string) {
  if (!err) return "";
  if (err.code === "23505") return dupMsg;
  if (err.code === "23514") return "Dados inválidos. Verifique os campos obrigatórios.";
  return "Não foi possível salvar. Tente novamente.";
}

/** Logical delete with confirmation (super admin only — enforced in the database). */
export function DeleteButton({ name, onConfirm }: { name: string; onConfirm: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const run = async () => { setBusy(true); try { await onConfirm(); setOpen(false); } finally { setBusy(false); } };
  return (
    <>
      <Button variant="outline" className="text-destructive" onClick={() => setOpen(true)}>Excluir</Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {name}?</AlertDialogTitle>
            <AlertDialogDescription>O item vai para a Lixeira e pode ser restaurado depois.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={(e) => { e.preventDefault(); void run(); }}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
