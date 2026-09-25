import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, LoadingState, PageHeader } from "@/components/admin-ui";
import { EventFields, InvitationRender, InvitationStatusBadge } from "@/components/invitation-ui";
import { BlocksEditor } from "@/components/template-ui";
import { customersKey, listCustomers } from "@/lib/customers-data";
import { getInvitation, invitationError, invitationsKey, toEventValues, updateInvitation, validateEvent, type EventValues, type Invitation } from "@/lib/invitations";
import type { Block } from "@/lib/templates";

export const Route = createFileRoute("/_authenticated/invitations/$id/editor")({
  head: () => ({ meta: [{ title: "Editar convite — Convitely" }] }),
  component: EditorPage,
});

function EditorPage() {
  const { id } = Route.useParams();
  const q = useQuery({ queryKey: [...invitationsKey, id], queryFn: () => getInvitation(id) });
  return (
    <div>
      <Link to="/invitations" className="mb-3 inline-block text-sm text-muted-foreground hover:text-foreground">← Convites</Link>
      {q.isLoading ? <LoadingState /> : !q.data ? <EmptyState>Convite não encontrado.</EmptyState> : <EditorForm key={q.data.updated_at} inv={q.data} />}
    </div>
  );
}

function EditorForm({ inv }: { inv: Invitation }) {
  const qc = useQueryClient();
  const customers = useQuery({ queryKey: customersKey, queryFn: listCustomers });
  const [v, setV] = useState<EventValues>(() => toEventValues(inv));
  const [customerId, setCustomerId] = useState(inv.customer_id);
  const [blocks, setBlocks] = useState<Block[]>(() => structuredClone(inv.content?.blocks ?? []));
  const [errors, setErrors] = useState<Partial<Record<keyof EventValues, string>>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => setErrors({}), [inv.id]);

  const options = (customers.data ?? []).filter((c) => c.company_id === inv.company_id && (c.status === "active" || c.id === inv.customer_id));

  async function save() {
    const e = validateEvent(v); setErrors(e);
    if (Object.keys(e).length) { toast.error("Verifique os campos obrigatórios."); return; }
    setBusy(true);
    try {
      await updateInvitation(inv.id, customerId, v, { version: 1, blocks });
      toast.success("Convite salvo.");
      await qc.invalidateQueries({ queryKey: invitationsKey });
    } catch (err) { toast.error(invitationError(err)); }
    finally { setBusy(false); }
  }

  return (
    <>
      <PageHeader title={inv.name} description={`Link reservado: /convite/${inv.slug}`}
        action={<div className="flex items-center gap-2"><InvitationStatusBadge status={inv.status} />
          <Button variant="outline" asChild><Link to="/invitations/$id/preview" params={{ id: inv.id }}><Eye className="h-4 w-4" />Visualizar</Link></Button>
          <Button onClick={save} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Salvar</Button></div>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <section className="space-y-4 rounded-xl border bg-card p-4">
            <h2 className="font-medium">Dados do evento</h2>
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder={inv.customer?.name ?? "Selecione"} /></SelectTrigger>
                <SelectContent>{options.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <EventFields v={v} setV={setV} errors={errors} />
          </section>
          <section className="space-y-3 rounded-xl border bg-card p-4">
            <div>
              <h2 className="font-medium">Conteúdo do convite</h2>
              <p className="text-xs text-muted-foreground">Edição básica da estrutura. O editor visual completo chegará em breve.</p>
            </div>
            <BlocksEditor blocks={blocks} setBlocks={setBlocks} />
          </section>
          <Button onClick={save} disabled={busy} className="w-full sm:w-auto">{busy && <Loader2 className="h-4 w-4 animate-spin" />}Salvar alterações</Button>
        </div>
        <aside className="lg:sticky lg:top-20 lg:self-start"><InvitationRender blocks={blocks} /></aside>
      </div>
    </>
  );
}
