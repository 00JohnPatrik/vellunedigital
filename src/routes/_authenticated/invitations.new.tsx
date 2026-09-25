import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Check, FilePlus2, Loader2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dbErrorMessage, EmptyState, LoadingState, PageHeader } from "@/components/admin-ui";
import { CustomerDialog, emptyCustomer } from "@/components/customer-dialog";
import { EventFields } from "@/components/invitation-ui";
import { PreviewImage } from "@/components/template-ui";
import { customersKey, findDuplicate, listCustomers, toRow, type Customer } from "@/lib/customers-data";
import { createInvitation, emptyEvent, invitationError, invitationsKey, validateEvent, type EventValues } from "@/lib/invitations";
import { categoryLabel, listTemplates, templatesKey } from "@/lib/templates";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/invitations/new")({
  head: () => ({ meta: [{ title: "Novo convite — Vellune Digital" }] }),
  component: NewInvitationPage,
});

const STEPS = ["Cliente", "Evento", "Modelo", "Criar"];

function NewInvitationPage() {
  const { appUser } = Route.useRouteContext();
  const companyId = appUser.company?.id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [event, setEvent] = useState<EventValues>(emptyEvent);
  const [errors, setErrors] = useState<Partial<Record<keyof EventValues, string>>>({});
  const [templateId, setTemplateId] = useState<string | null | undefined>(undefined); // null = do zero
  const [busy, setBusy] = useState(false);

  const nextFromEvent = () => { const e = validateEvent(event); setErrors(e); if (!Object.keys(e).length) setStep(2); };

  async function create() {
    if (!customer || templateId === undefined) return;
    setBusy(true);
    try {
      const id = await createInvitation(customer.id, templateId, event);
      toast.success("Convite criado como rascunho.");
      await qc.invalidateQueries({ queryKey: invitationsKey });
      navigate({ to: "/invitations/$id/editor", params: { id } });
    } catch (e) { toast.error(invitationError(e)); setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link to="/invitations" className="mb-3 inline-block text-sm text-muted-foreground hover:text-foreground">← Convites</Link>
      <PageHeader title="Novo convite" />
      <ol className="mb-6 grid grid-cols-4 gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className={cn("rounded-md border px-2 py-2 text-center text-xs sm:text-sm", i === step ? "border-primary bg-primary/10 font-medium" : i < step ? "text-foreground" : "text-muted-foreground")}>
            {i < step ? <Check className="mr-1 inline h-3.5 w-3.5" /> : `${i + 1}. `}{s}
          </li>
        ))}
      </ol>

      <div className="rounded-xl border bg-card p-4 sm:p-6">
        {step === 0 && <CustomerStep companyId={companyId} selected={customer} onSelect={(c) => { setCustomer(c); setTemplateId(undefined); }} />}
        {step === 1 && <EventFields v={event} setV={setEvent} errors={errors} />}
        {step === 2 && customer && <TemplateStep companyId={customer.company_id} selected={templateId} onSelect={setTemplateId} />}
        {step === 3 && (
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className="text-muted-foreground">Cliente</dt><dd className="font-medium">{customer?.name}</dd></div>
            <div><dt className="text-muted-foreground">Evento</dt><dd className="font-medium">{event.name}</dd></div>
            <div><dt className="text-muted-foreground">Data e hora</dt><dd className="font-medium">{new Date(`${event.event_date}T00:00:00`).toLocaleDateString("pt-BR")} às {event.event_time}</dd></div>
            <div><dt className="text-muted-foreground">Modelo</dt><dd className="font-medium">{templateId ? "Modelo selecionado" : "Criar do zero"}</dd></div>
            <p className="text-muted-foreground sm:col-span-2">O convite será criado como rascunho e você será levado à tela de edição.</p>
          </dl>
        )}
      </div>

      <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button variant="outline" disabled={busy} onClick={() => step === 0 ? navigate({ to: "/invitations" }) : setStep(step - 1)}>{step === 0 ? "Cancelar" : "Voltar"}</Button>
        {step === 0 && <Button disabled={!customer} onClick={() => setStep(1)}>Continuar</Button>}
        {step === 1 && <Button onClick={nextFromEvent}>Continuar</Button>}
        {step === 2 && <Button disabled={templateId === undefined} onClick={() => setStep(3)}>Continuar</Button>}
        {step === 3 && <Button disabled={busy} onClick={create}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Criar convite</Button>}
      </div>
    </div>
  );
}

function CustomerStep({ companyId, selected, onSelect }: { companyId: string | undefined; selected: Customer | null; onSelect: (c: Customer) => void }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: customersKey, queryFn: listCustomers });
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase(); const d = s.replace(/\D/g, "");
    return (q.data ?? []).filter((c) => c.status === "active" && (!s || c.name.toLowerCase().includes(s) || !!c.email?.includes(s) || (!!d && !!c.phone?.includes(d))));
  }, [q.data, search]);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Pesquisar cliente" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {companyId && <Button variant="outline" onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Cadastrar cliente</Button>}
      </div>
      {q.isLoading ? <LoadingState /> : rows.length === 0 ? <EmptyState>{q.data?.some((c) => c.status === "active") ? "Nenhum cliente encontrado." : "Nenhum cliente ativo. Cadastre um cliente para continuar."}</EmptyState> : (
        <div className="max-h-80 divide-y overflow-y-auto rounded-lg border">
          {rows.map((c) => (
            <button key={c.id} type="button" onClick={() => onSelect(c)}
              className={cn("flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted/50", selected?.id === c.id && "bg-primary/10")}>
              <span className="min-w-0"><span className="block truncate font-medium">{c.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{[c.phone, c.email, c.company?.name].filter(Boolean).join(" · ") || "—"}</span></span>
              {selected?.id === c.id && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </button>
          ))}
        </div>
      )}
      {companyId && (
        <CustomerDialog open={open} onOpenChange={setOpen} title="Novo cliente" initial={emptyCustomer}
          checkDuplicate={(v) => findDuplicate(v, companyId)}
          onUseExisting={(id) => { const c = q.data?.find((x) => x.id === id); if (c) onSelect(c); setOpen(false); }}
          onSubmit={async (v) => {
            const { data, error } = await supabase.from("customers").insert({ ...toRow(v), company_id: companyId })
              .select("id, company_id, name, phone, email, observation, status, created_at, updated_at").single();
            if (error) { toast.error(dbErrorMessage(error, "Cliente já cadastrado.")); return false; }
            toast.success("Cliente cadastrado.");
            await qc.invalidateQueries({ queryKey: customersKey });
            onSelect(data as Customer);
            return true;
          }} />
      )}
    </div>
  );
}

function TemplateStep({ companyId, selected, onSelect }: { companyId: string; selected: string | null | undefined; onSelect: (id: string | null) => void }) {
  const q = useQuery({ queryKey: templatesKey, queryFn: listTemplates });
  const list = (q.data ?? []).filter((t) => t.status === "active" && (t.type === "official" || t.company_id === companyId));
  const card = (id: string | null, title: string, sub: string, img?: string | null) => (
    <button key={id ?? "zero"} type="button" onClick={() => onSelect(id)}
      className={cn("overflow-hidden rounded-xl border text-left transition-colors hover:border-primary", selected === id && "border-primary ring-2 ring-primary/30")}>
      {id ? <PreviewImage src={img ?? null} name={title} className="aspect-[4/3]" />
        : <div className="flex aspect-[4/3] items-center justify-center bg-muted text-muted-foreground"><FilePlus2 className="h-8 w-8" /></div>}
      <div className="p-3"><div className="truncate text-sm font-medium">{title}</div><div className="truncate text-xs text-muted-foreground">{sub}</div></div>
    </button>
  );
  if (q.isLoading) return <LoadingState />;
  const official = list.filter((t) => t.type === "official");
  const mine = list.filter((t) => t.type === "company");
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{card(null, "Criar do zero", "Estrutura vazia")}</div>
      {[["Modelos oficiais", official], ["Modelos da empresa", mine]] .map(([label, items]) => (
        <div key={label as string}>
          <h3 className="mb-2 text-sm font-medium">{label as string}</h3>
          {(items as typeof list).length === 0 ? <p className="text-sm text-muted-foreground">Nenhum modelo disponível.</p> : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{(items as typeof list).map((t) => card(t.id, t.name, categoryLabel(t.category), t.preview_image))}</div>
          )}
        </div>
      ))}
    </div>
  );
}
