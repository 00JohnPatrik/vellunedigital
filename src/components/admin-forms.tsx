import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Status } from "@/components/admin-ui";
import { companiesKey, listCompanies } from "@/lib/admin-data";

export type CompanyValues = { name: string; type: string; status: Status };
export type UserValues = { name: string; email: string; phone: string; company_id: string; status: Status };

function Field({ id, label, error, children }: { id: string; label: string; error?: string | undefined; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function StatusSelect({ value, onChange }: { value: Status; onChange: (s: Status) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Status)}>
      <SelectTrigger id="status"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="active">Ativo</SelectItem>
        <SelectItem value="inactive">Inativo</SelectItem>
      </SelectContent>
    </Select>
  );
}

type FormProps<T> = { initial: T; submitLabel: string; onSubmit: (v: T) => Promise<void>; onCancel?: () => void };

export function CompanyForm({ initial, submitLabel, onSubmit, onCancel }: FormProps<CompanyValues>) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof CompanyValues, string>>>({});
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const clean = { ...v, name: v.name.trim(), type: v.type.trim() };
    const errs: typeof errors = {};
    if (!clean.name) errs.name = "Informe o nome da empresa.";
    else if (clean.name.length > 150) errs.name = "Máximo de 150 caracteres.";
    if (!clean.type) errs.type = "Informe o tipo.";
    else if (clean.type.length > 80) errs.type = "Máximo de 80 caracteres.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try { await onSubmit(clean); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="grid max-w-xl gap-4" noValidate>
      <Field id="name" label="Nome da empresa *" error={errors.name}>
        <Input id="name" value={v.name} maxLength={150} onChange={(e) => setV({ ...v, name: e.target.value })} />
      </Field>
      <Field id="type" label="Tipo *" error={errors.type}>
        <Input id="type" value={v.type} maxLength={80} placeholder="Ex.: Cerimonial, Buffet, Agência" onChange={(e) => setV({ ...v, type: e.target.value })} />
      </Field>
      <Field id="status" label="Status">
        <StatusSelect value={v.status} onChange={(status) => setV({ ...v, status })} />
      </Field>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{submitLabel}</Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>}
      </div>
    </form>
  );
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function UserForm({ initial, submitLabel, onSubmit, onCancel, emailLocked }: FormProps<UserValues> & { emailLocked?: boolean }) {
  const [v, setV] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof UserValues, string>>>({});
  const [busy, setBusy] = useState(false);
  const companies = useQuery({ queryKey: companiesKey, queryFn: listCompanies });
  const options = (companies.data ?? []).filter((c) => c.status === "active" || c.id === initial.company_id);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const clean = { ...v, name: v.name.trim(), email: v.email.trim().toLowerCase(), phone: v.phone.replace(/\D/g, "") };
    const errs: typeof errors = {};
    if (!clean.name) errs.name = "Informe o nome.";
    else if (clean.name.length > 120) errs.name = "Máximo de 120 caracteres.";
    if (!emailRe.test(clean.email) || clean.email.length > 255) errs.email = "Informe um e-mail válido.";
    if (clean.phone && (clean.phone.length < 10 || clean.phone.length > 13)) errs.phone = "Telefone inválido (DDD + número).";
    if (!clean.company_id) errs.company_id = "Selecione a empresa.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try { await onSubmit(clean); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="grid max-w-xl gap-4" noValidate>
      <Field id="name" label="Nome *" error={errors.name}>
        <Input id="name" value={v.name} maxLength={120} onChange={(e) => setV({ ...v, name: e.target.value })} />
      </Field>
      <Field id="email" label="E-mail *" error={errors.email}>
        <Input id="email" type="email" value={v.email} maxLength={255} readOnly={emailLocked} disabled={emailLocked}
          onChange={(e) => setV({ ...v, email: e.target.value })} />
        {emailLocked && <p className="text-xs text-muted-foreground">O e-mail não pode ser alterado nesta fase.</p>}
      </Field>
      <Field id="phone" label="Telefone" error={errors.phone}>
        <Input id="phone" inputMode="tel" value={v.phone} maxLength={20} placeholder="(11) 99999-9999" onChange={(e) => setV({ ...v, phone: e.target.value })} />
      </Field>
      <Field id="company" label="Empresa *" error={errors.company_id}>
        <Select value={v.company_id} onValueChange={(company_id) => setV({ ...v, company_id })}>
          <SelectTrigger id="company"><SelectValue placeholder={companies.isLoading ? "Carregando..." : "Selecione a empresa"} /></SelectTrigger>
          <SelectContent>
            {options.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}{c.status === "inactive" ? " (inativa)" : ""}</SelectItem>)}
          </SelectContent>
        </Select>
        {!companies.isLoading && options.length === 0 && <p className="text-xs text-muted-foreground">Cadastre uma empresa ativa primeiro.</p>}
      </Field>
      <Field id="role" label="Função">
        <Input id="role" value="Admin da empresa" disabled readOnly />
      </Field>
      <Field id="status" label="Status">
        <StatusSelect value={v.status} onChange={(status) => setV({ ...v, status })} />
      </Field>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}{submitLabel}</Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>}
      </div>
    </form>
  );
}
