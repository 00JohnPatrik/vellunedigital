import { buildContent, type Background } from "@/lib/templates";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ArrowLeft, Check, Eye, Loader2, Send, Settings2, Share2, UserCheck } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ShareDialog } from "@/components/share-dialog";
import { RsvpPanel } from "@/components/rsvp-panel";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EmptyState, LoadingState } from "@/components/admin-ui";
import { EventFields, InvitationStatusBadge, invitationCtx } from "@/components/invitation-ui";
import { useBlocksHistory, VisualEditor } from "@/components/visual-editor";
import { customersKey, listCustomers } from "@/lib/customers-data";
import { getInvitation, invitationError, invitationsKey, publishInvitation, toEventValues, updateInvitation, validateEvent, type EventValues, type Invitation } from "@/lib/invitations";
import { normalizeBlocks, validateContent } from "@/lib/blocks";

export const Route = createFileRoute("/_authenticated/invitations/$id/editor")({
  head: () => ({ meta: [{ title: "Editor do convite — Vellune Digital" }] }),
  component: EditorPage,
});

function EditorPage() {
  const { id } = Route.useParams();
  const q = useQuery({ queryKey: [...invitationsKey, id], queryFn: () => getInvitation(id), refetchOnWindowFocus: false });
  if (q.isLoading) return <LoadingState />;
  if (!q.data) return <div><BackLink /><EmptyState>Convite não encontrado.</EmptyState></div>;
  // Keyed by id only: background refetches never reset the editor state/history.
  return <EditorForm key={q.data.id} inv={q.data} />;
}

const BackLink = () => <Link to="/invitations" className="mb-3 inline-block text-sm text-muted-foreground hover:text-foreground">← Convites</Link>;

type SaveState = "saved" | "dirty" | "saving" | "error";
const AUTOSAVE_MS = 1500;

function EditorForm({ inv }: { inv: Invitation }) {
  const qc = useQueryClient();
  const customers = useQuery({ queryKey: customersKey, queryFn: listCustomers });
  const [v, setV] = useState<EventValues>(() => toEventValues(inv));
  const [customerId, setCustomerId] = useState(inv.customer_id);
  const h = useBlocksHistory(normalizeBlocks(inv.content));
  const [bg, setBg] = useState<Background>(() => structuredClone(inv.content?.settings?.background ?? {}));
  const [errors, setErrors] = useState<Partial<Record<keyof EventValues, string>>>({});
  const [eventOpen, setEventOpen] = useState(false);
  const [state, setState] = useState<SaveState>("saved");
  const [errMsg, setErrMsg] = useState("");
  const [status, setStatus] = useState(inv.status);
  const [warnOpen, setWarnOpen] = useState(inv.status === "published");
  const [shareOpen, setShareOpen] = useState(false);
  const [rsvpOpen, setRsvpOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const navigate = useNavigate();

  // Latest snapshot + version counter so an in-flight save never overwrites newer edits.
  const snap = useRef({ v, customerId, blocks: h.blocks, bg });
  snap.current = { v, customerId, blocks: h.blocks, bg };
  const version = useRef(0);
  const savedVersion = useRef(0);
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const first = useRef(true);

  const save = useCallback(async (manual = false): Promise<boolean> => {
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    if (inFlight.current) { timer.current = setTimeout(() => void save(manual), 300); return false; }
    const { v: ev, customerId: cid, blocks, bg: background } = snap.current;
    const e = validateEvent(ev); setErrors(e);
    if (Object.keys(e).length) { setState("error"); setErrMsg("Dados do evento incompletos"); if (manual) { toast.error("Verifique os dados do evento."); setEventOpen(true); } return false; }
    const content = buildContent(blocks, background);
    const invalid = validateContent(content);
    if (invalid) { setState("error"); setErrMsg(invalid); if (manual) toast.error(invalid); return false; }
    const target = version.current;
    inFlight.current = true; setState("saving");
    try {
      await updateInvitation(inv.id, cid, ev, content);
      savedVersion.current = target;
      setState(version.current === target ? "saved" : "dirty");
      if (manual) toast.success("Convite salvo.");
      void qc.invalidateQueries({ queryKey: invitationsKey });
      return true;
    } catch (err) {
      setState("error"); setErrMsg(invitationError(err));
      if (manual) toast.error(invitationError(err));
      return false;
    } finally { inFlight.current = false; }
  }, [inv.id, qc]);

  // Debounced autosave on any real change (StrictMode-safe: compares against the loaded snapshot).
  const initial = useRef(JSON.stringify(snap.current));
  useEffect(() => {
    if (first.current && JSON.stringify(snap.current) === initial.current) return;
    first.current = false;
    version.current += 1;
    setState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), AUTOSAVE_MS);
  }, [v, customerId, h.blocks, bg, save]);

  // Re-run a pending save once the in-flight one ends with newer edits.
  useEffect(() => {
    if (state === "dirty" && !inFlight.current && !timer.current && version.current !== savedVersion.current) {
      timer.current = setTimeout(() => void save(), AUTOSAVE_MS);
    }
  }, [state, save]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const on = (e: BeforeUnloadEvent) => { if (state === "dirty" || state === "saving") e.preventDefault(); };
    window.addEventListener("beforeunload", on);
    return () => { window.removeEventListener("beforeunload", on); if (timer.current) clearTimeout(timer.current); };
  }, [state]);

  const publish = async () => {
    const e = validateEvent(snap.current.v);
    if (Object.keys(e).length) { setErrors(e); toast.error("Preencha nome, data e hora do evento antes de publicar."); setEventOpen(true); return; }
    if (!snap.current.blocks.some((b) => !b.hidden)) { toast.error("Adicione ao menos um bloco visível antes de publicar."); return; }
    setPublishing(true);
    try {
      if (!(await save(true))) return;
      await publishInvitation(inv.id);
      setStatus("published"); setShareOpen(true);
      toast.success("Convite publicado!");
      void qc.invalidateQueries({ queryKey: invitationsKey });
    } catch (err) { toast.error(invitationError(err)); } finally { setPublishing(false); }
  };
  const isPublic = status === "published" || status === "closed";

  const ctx = useMemo(() => invitationCtx(inv, v), [inv, v]);
  const options = (customers.data ?? []).filter((c) => c.company_id === inv.company_id && (c.status === "active" || c.id === inv.customer_id));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" asChild><Link to="/invitations"><ArrowLeft className="h-4 w-4" />Voltar</Link></Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2"><h1 className="truncate font-display text-lg font-semibold">{v.name || inv.name}</h1><InvitationStatusBadge status={status} /></div>
          <p className="truncate text-xs text-muted-foreground">{isPublic ? "Link público" : "Link reservado"}: /convite/{inv.slug}</p>
        </div>
        <SaveIndicator state={state} msg={errMsg} onRetry={() => void save(true)} />
      </div>

      <VisualEditor h={h} bg={bg} onBg={setBg} ctx={ctx} assets={{ kind: "invitation", id: inv.id, companyId: inv.company_id }} toolbarExtra={<>
        <Button type="button" size="sm" variant="outline" onClick={() => setEventOpen(true)}><Settings2 className="h-4 w-4" /><span className="hidden sm:inline">Dados do evento</span></Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setRsvpOpen(true)}><UserCheck className="h-4 w-4" />RSVP</Button>
        <Button type="button" size="sm" variant="outline" asChild><Link to="/invitations/$id/preview" params={{ id: inv.id }}><Eye className="h-4 w-4" /><span className="hidden sm:inline">Visualizar</span></Link></Button>
        <Button type="button" size="sm" onClick={() => void save(true)} disabled={state === "saving"}>{state === "saving" && <Loader2 className="h-4 w-4 animate-spin" />}Salvar</Button>
        {isPublic
          ? <Button type="button" size="sm" variant="secondary" onClick={() => setShareOpen(true)}><Share2 className="h-4 w-4" />Compartilhar</Button>
          : <Button type="button" size="sm" variant="secondary" onClick={() => void publish()} disabled={publishing}>{publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Publicar convite</Button>}
      </>} />

      <ShareDialog slug={inv.slug} open={shareOpen} onOpenChange={setShareOpen} />
      <RsvpPanel invitationId={inv.id} open={rsvpOpen} onOpenChange={setRsvpOpen} />
      <AlertDialog open={warnOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convite publicado</AlertDialogTitle>
            <AlertDialogDescription>Este convite já está publicado. A alteração será refletida imediatamente para os convidados.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => void navigate({ to: "/invitations" })}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => setWarnOpen(false)}>Continuar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={eventOpen} onOpenChange={setEventOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader><SheetTitle>Dados do evento</SheetTitle></SheetHeader>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select value={customerId} onValueChange={setCustomerId}>
                <SelectTrigger><SelectValue placeholder={inv.customer?.name ?? "Selecione"} /></SelectTrigger>
                <SelectContent>{options.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <EventFields v={v} setV={setV} errors={errors} />
            <p className="text-xs text-muted-foreground">Blocos de data, horário, local e contagem usam estes dados quando a origem é "Dados do evento".</p>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function SaveIndicator({ state, msg, onRetry }: { state: SaveState; msg: string; onRetry: () => void }) {
  if (state === "saving") return <span className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status"><Loader2 className="h-3.5 w-3.5 animate-spin" />Salvando...</span>;
  if (state === "saved") return <span className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status"><Check className="h-3.5 w-3.5" />Salvo</span>;
  if (state === "dirty") return <span className="text-xs text-muted-foreground" role="status">Alterações não salvas</span>;
  return (
    <span className="flex items-center gap-1.5 text-xs text-destructive" role="alert" title={msg}>
      <AlertCircle className="h-3.5 w-3.5" />Não foi possível salvar
      <Button type="button" size="sm" variant="link" className="h-auto p-0 text-xs" onClick={onRetry}>Tentar novamente</Button>
    </span>
  );
}
