import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Edit3, FileUp, Loader2, Plus, Printer, QrCode, Search, Trash2, Users, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EmptyState, LoadingState, PageHeader } from "@/components/admin-ui";
import { createGuest, deleteGuest, emptyGuest, getGuest, getInvitationForGuests, guestsKey, guestsToCsv, guestToValues, listInvitationGuests, parseGuestsCsv, updateGuest, type GuestValues, type InvitationGuest } from "@/lib/guests";

export const Route = createFileRoute("/_authenticated/invitations/$id/guests")({
  head: () => ({ meta: [{ title: "Convidados — Vellune Digital" }] }),
  component: GuestsPage,
});

function GuestsPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const invitation = useQuery({ queryKey: ["invitation-for-guests", id], queryFn: () => getInvitationForGuests(id) });
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const guests = useQuery({ queryKey: [...guestsKey(id), search, page], queryFn: () => listInvitationGuests(id, search, page), enabled: !!invitation.data });
  const [editing, setEditing] = useState<InvitationGuest | null | undefined>(undefined);
  const [qrGuest, setQrGuest] = useState<InvitationGuest | null>(null);
  const [deleting, setDeleting] = useState<InvitationGuest | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const rows = guests.data?.rows ?? [];
  const totalPages = Math.max(1, Math.ceil((guests.data?.total ?? 0) / 20));
  const qrUrl = qrGuest ? `${typeof window !== "undefined" ? window.location.origin : ""}/checkin/${qrGuest.qr_token}` : "";

  const downloadCsv = async () => {
    try {
      const result = await listInvitationGuests(id, search, 1, 10000);
      const url = URL.createObjectURL(new Blob([guestsToCsv(result.rows)], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a"); a.href = url; a.download = "convidados.csv"; a.click(); URL.revokeObjectURL(url);
    } catch { toast.error("Não foi possível exportar os convidados."); }
  };

  const importCsv = async (file: File) => {
    try {
      const values = parseGuestsCsv(await file.text());
      if (!values.length) throw new Error("Nenhum convidado encontrado no CSV.");
      for (const value of values) await createGuest(id, value);
      toast.success(`${values.length} convidado(s) importado(s).`);
      await qc.invalidateQueries({ queryKey: guestsKey(id) });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível importar o CSV."); }
    finally { if (fileRef.current) fileRef.current.value = ""; }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try { await deleteGuest(id, deleting.id); toast.success("Convidado excluído."); await qc.invalidateQueries({ queryKey: guestsKey(id) }); }
    catch { toast.error("Não foi possível excluir o convidado."); }
    finally { setDeleting(null); }
  };

  if (invitation.isLoading) return <LoadingState />;
  if (!invitation.data) return <EmptyState>Convite não encontrado.</EmptyState>;

  return (
    <div className="space-y-5">
      <PageHeader title="Convidados" description={`Gerencie os convidados de ${invitation.data.name}.`} action={<Button onClick={() => setEditing(null)}><Plus className="h-4 w-4" />Adicionar convidado</Button>} />
      <div className="flex flex-wrap gap-2"><Button variant="outline" asChild><Link to="/invitations/$id/checkin" params={{ id }}><QrCode className="h-4 w-4" />Abrir check-in</Link></Button><Button variant="outline" onClick={downloadCsv}><Download className="h-4 w-4" />Exportar CSV</Button><Button variant="outline" onClick={() => fileRef.current?.click()}><FileUp className="h-4 w-4" />Importar CSV</Button><input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) void importCsv(file); }} /></div>
      <div className="flex items-center gap-2 rounded-xl border bg-card p-3"><Search className="h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Buscar por nome" className="border-0 shadow-none focus-visible:ring-0" /><span className="text-sm text-muted-foreground">{guests.data?.total ?? 0}</span></div>
      {guests.isLoading ? <LoadingState /> : guests.isError ? <div className="rounded-xl border border-destructive/30 p-8 text-center text-sm text-destructive">Não foi possível carregar os convidados.</div> : rows.length === 0 ? <div className="rounded-xl border border-dashed p-10 text-center"><Users className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-medium">Nenhum convidado encontrado.</p><p className="mt-1 text-sm text-muted-foreground">Adicione um convidado ou importe um arquivo CSV.</p></div> : <div className="overflow-x-auto rounded-xl border"><table className="w-full text-sm"><thead className="bg-muted/50 text-left"><tr><th className="px-4 py-3">Nome</th><th className="px-4 py-3">Contato</th><th className="px-4 py-3">Pessoas</th><th className="px-4 py-3 text-right">Ações</th></tr></thead><tbody>{rows.map((guest) => <tr key={guest.id} className="border-t"><td className="px-4 py-3 font-medium">{guest.name}</td><td className="px-4 py-3 text-muted-foreground">{guest.phone || guest.email || "—"}</td><td className="px-4 py-3">{guest.people_count}</td><td className="px-4 py-3"><div className="flex justify-end gap-1"><Button size="icon" variant="ghost" title="QR Code" onClick={() => setQrGuest(guest)}><QrCode className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Editar" onClick={() => setEditing(guest)}><Edit3 className="h-4 w-4" /></Button><Button size="icon" variant="ghost" title="Excluir" className="text-destructive" onClick={() => setDeleting(guest)}><Trash2 className="h-4 w-4" /></Button></div></td></tr>)}</tbody></table></div>}
      {totalPages > 1 && <div className="flex items-center justify-between"><Button variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Anterior</Button><span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span><Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Próxima</Button></div>}
      <GuestDialog invitationId={id} guest={editing} onClose={() => setEditing(undefined)} onSaved={() => { setEditing(undefined); void qc.invalidateQueries({ queryKey: guestsKey(id) }); }} />
      <Dialog open={!!qrGuest} onOpenChange={(open) => !open && setQrGuest(null)}><DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>QR Code de {qrGuest?.name}</DialogTitle></DialogHeader>{qrGuest && <div className="space-y-4 text-center"><div className="mx-auto w-fit rounded-xl border bg-white p-4"><QRCodeSVG value={qrUrl} size={220} /></div><p className="break-all text-xs text-muted-foreground">{qrGuest.qr_token}</p><div className="flex justify-center gap-2"><Button variant="outline" onClick={() => window.print()}><Printer className="h-4 w-4" />Imprimir</Button><Button onClick={() => { const a = document.createElement("a"); a.href = document.querySelector("svg")?.outerHTML ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(document.querySelector("svg")!.outerHTML)}` : ""; a.download = `${qrGuest.name}-qr.svg`; a.click(); }}><Download className="h-4 w-4" />Baixar</Button></div></div>}</DialogContent></Dialog>
      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir convidado?</AlertDialogTitle><AlertDialogDescription>{deleting?.name} será removido da lista por exclusão lógica.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={(e) => { e.preventDefault(); void confirmDelete(); }}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}

function GuestDialog({ invitationId, guest, onClose, onSaved }: { invitationId: string; guest: InvitationGuest | null | undefined; onClose: () => void; onSaved: () => void }) {
  const [values, setValues] = useState<GuestValues>(emptyGuest);
  const [busy, setBusy] = useState(false);
  useMemo(() => { if (guest !== undefined) setValues(guest ? guestToValues(guest) : emptyGuest); }, [guest]);
  const open = guest !== undefined;
  const save = async () => { setBusy(true); try { if (guest) await updateGuest(invitationId, guest.id, values); else await createGuest(invitationId, values); toast.success(guest ? "Convidado atualizado." : "Convidado adicionado."); onSaved(); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar o convidado."); } finally { setBusy(false); } };
  return <Dialog open={open} onOpenChange={(value) => !value && onClose()}><DialogContent><DialogHeader><DialogTitle>{guest ? "Editar convidado" : "Adicionar convidado"}</DialogTitle></DialogHeader><div className="space-y-4"><Field label="Nome *" value={values.name} onChange={(name) => setValues({ ...values, name })} /><Field label="Telefone" value={values.phone} onChange={(phone) => setValues({ ...values, phone })} /><Field label="E-mail" value={values.email} onChange={(email) => setValues({ ...values, email })} type="email" /><Field label="Número de pessoas *" value={values.people_count} onChange={(people_count) => setValues({ ...values, people_count })} type="number" /></div><DialogFooter><Button variant="outline" onClick={onClose}>Cancelar</Button><Button onClick={() => void save()} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Salvar</Button></DialogFooter></DialogContent></Dialog>;
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: string }) { return <div className="space-y-1.5"><Label>{label}</Label><Input type={type} value={value} onChange={(e) => onChange(e.target.value)} /></div>; }
