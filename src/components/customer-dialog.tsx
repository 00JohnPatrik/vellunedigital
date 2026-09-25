import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Status } from "@/components/admin-ui";
import type { CustomerValues } from "@/lib/customers-data";

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const emptyCustomer: CustomerValues = { name: "", phone: "", email: "", observation: "", status: "active" };

type Props = {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; initial: CustomerValues; showStatus?: boolean;
  /** Return a possible duplicate to show the warning; null to continue. */
  checkDuplicate?: (v: CustomerValues) => Promise<{ id: string; name: string } | null>;
  onUseExisting?: (id: string) => void;
  onSubmit: (v: CustomerValues) => Promise<boolean>;
};

export function CustomerDialog({ open, onOpenChange, title, initial, showStatus, checkDuplicate, onUseExisting, onSubmit }: Props) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string }>({});
  const [busy, setBusy] = useState(false);
  const [dup, setDup] = useState<{ id: string; name: string; values: CustomerValues } | null>(null);

  useEffect(() => { if (open) { setV(initial); setErrors({}); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  async function save(values: CustomerValues) {
    setBusy(true);
    try { if (await onSubmit(values)) onOpenChange(false); } finally { setBusy(false); }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    const clean: CustomerValues = { ...v, name: v.name.trim(), email: v.email.trim().toLowerCase(), phone: v.phone.replace(/\D/g, ""), observation: v.observation.trim() };
    const errs: typeof errors = {};
    if (!clean.name) errs.name = "Informe o nome.";
    if (clean.email && (!emailRe.test(clean.email) || clean.email.length > 255)) errs.email = "Informe um e-mail válido.";
    if (clean.phone && (clean.phone.length < 8 || clean.phone.length > 13)) errs.phone = "Telefone inválido.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    if (checkDuplicate) {
      setBusy(true);
      const d = await checkDuplicate(clean).catch(() => null);
      setBusy(false);
      if (d) { setDup({ ...d, values: clean }); return; }
    }
    await save(clean);
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
          <form onSubmit={submit} className="grid gap-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="c-name">Nome *</Label>
              <Input id="c-name" value={v.name} maxLength={150} onChange={(e) => setV({ ...v, name: e.target.value })} />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-phone">Telefone</Label>
              <Input id="c-phone" inputMode="tel" value={v.phone} maxLength={20} placeholder="(11) 99999-9999" onChange={(e) => setV({ ...v, phone: e.target.value })} />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-email">E-mail</Label>
              <Input id="c-email" type="email" value={v.email} maxLength={255} onChange={(e) => setV({ ...v, email: e.target.value })} />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-obs">Observação</Label>
              <Textarea id="c-obs" value={v.observation} maxLength={2000} rows={3} onChange={(e) => setV({ ...v, observation: e.target.value })} />
            </div>
            {showStatus && (
              <div className="space-y-1.5">
                <Label htmlFor="c-status">Status</Label>
                <Select value={v.status} onValueChange={(s) => setV({ ...v, status: s as Status })}>
                  <SelectTrigger id="c-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Salvar</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!dup} onOpenChange={(o) => !o && setDup(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Possível cadastro duplicado</AlertDialogTitle>
            <AlertDialogDescription>
              Já existe um cliente com esses dados. Deseja utilizar o cadastro existente?
              {dup && <span className="mt-2 block font-medium text-foreground">{dup.name}</span>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { if (dup) { onOpenChange(false); onUseExisting?.(dup.id); } }}>Usar cadastro existente</AlertDialogCancel>
            <AlertDialogAction onClick={() => { const d = dup; setDup(null); if (d) save(d.values); }}>Criar mesmo assim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
