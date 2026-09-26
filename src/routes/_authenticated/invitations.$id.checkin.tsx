import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Camera, CameraOff, Loader2, QrCode, Search, Undo2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState, PageHeader } from "@/components/admin-ui";
import { getGuestByToken, getGuestCheckin, getInvitationForGuests, setGuestCheckin, type Checkin, type InvitationGuest } from "@/lib/guests";

export const Route = createFileRoute("/_authenticated/invitations/$id/checkin")({
  head: () => ({ meta: [{ title: "Check-in — Vellune Digital" }] }),
  component: CheckinPage,
});

function CheckinPage() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const invitation = useQuery({ queryKey: ["invitation-for-guests", id], queryFn: () => getInvitationForGuests(id) });
  const inv = invitation.data ? { id: invitation.data.id, name: invitation.data.name } : null;
  const [token, setToken] = useState("");
  const [guest, setGuest] = useState<InvitationGuest | null>(null);
  const [checkin, setCheckin] = useState<Checkin | null>(null);
  const [busy, setBusy] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState("");
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  const lookup = async (value = token) => {
    if (!value.trim()) return;
    setBusy(true); setError("");
    try { const found = await getGuestByToken(id, value.trim()); if (!found) { setGuest(null); setCheckin(null); setError("QR Code inválido ou convidado não encontrado neste convite."); return; } setGuest(found); setCheckin(await getGuestCheckin(id, found.guest_id)); }
    catch { setError("Não foi possível consultar o convidado."); }
    finally { setBusy(false); }
  };

  const toggleCheckin = async (active: boolean) => {
    if (!guest) return;
    setBusy(true);
    try { const result = await setGuestCheckin(id, guest.company_id, guest.guest_id, active); setCheckin(result); await qc.invalidateQueries({ queryKey: ["invitation-report", id] }); toast.success(active ? "Check-in registrado." : "Check-in desfeito."); }
    catch { toast.error("Não foi possível atualizar o check-in."); }
    finally { setBusy(false); }
  };

  const toggleCamera = async () => {
    if (cameraOn) { streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; setCameraOn(false); return; }
    if (!("BarcodeDetector" in window)) { toast.error("A leitura por câmera não é compatível com este navegador. Use a busca manual."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      streamRef.current = stream; if (videoRef.current) videoRef.current.srcObject = stream; setCameraOn(true);
      const detector = new (window as Window & { BarcodeDetector: new (options?: { formats: string[] }) => { detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector({ formats: ["qr_code"] });
      const scan = async () => { if (!streamRef.current || !videoRef.current) return; try { const codes = await detector.detect(videoRef.current); if (codes[0]?.rawValue) { setToken(codes[0].rawValue.split("/checkin/").pop() ?? codes[0].rawValue); await lookup(codes[0].rawValue.split("/checkin/").pop() ?? codes[0].rawValue); toggleCamera(); return; } } catch { /* câmera ainda sem quadro legível */ } window.requestAnimationFrame(() => void scan()); };
      void videoRef.current?.play(); void scan();
    } catch { toast.error("Não foi possível acessar a câmera."); }
  };

  if (invitation.isLoading) return <LoadingState />;
  if (invitation.isError) return <EmptyState>Não foi possível carregar o convite.</EmptyState>;
  if (!inv) return <EmptyState>Convite não encontrado.</EmptyState>;
  return <div className="mx-auto max-w-2xl space-y-5"><PageHeader title="Check-in" description={`Controle a entrada dos convidados de ${inv.name}.`} action={<Button variant="outline" asChild><Link to="/invitations/$id/guests" params={{ id }}><Users className="h-4 w-4" />Convidados</Link></Button>} /><div className="rounded-2xl border bg-card p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row"><Input value={token} onChange={(e) => setToken(e.target.value)} onKeyDown={(e) => e.key === "Enter" && void lookup()} placeholder="Digite ou cole o qr_token" aria-label="QR token" /><Button onClick={() => void lookup()} disabled={busy || !token.trim()}><Search className="h-4 w-4" />Buscar</Button><Button variant="outline" onClick={() => void toggleCamera()}><Camera className="h-4 w-4" />{cameraOn ? "Parar câmera" : "Ler câmera"}</Button></div>{cameraOn && <div className="mt-4 overflow-hidden rounded-xl bg-black"><video ref={videoRef} className="aspect-video w-full object-cover" muted playsInline /></div>}{error && <p className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}</div>{guest && <div className="rounded-2xl border bg-card p-6 text-center shadow-sm"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary"><QrCode className="h-8 w-8" /></div><h2 className="mt-4 text-xl font-semibold">{guest.name}</h2><p className="mt-1 text-sm text-muted-foreground">{guest.people_count} {guest.people_count === 1 ? "pessoa" : "pessoas"}{guest.phone ? ` · ${guest.phone}` : ""}</p><div className="mt-4">{checkin?.status === "active" ? <Badge>Check-in realizado em {new Date(checkin.checked_in_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</Badge> : <Badge variant="secondary">Ainda não entrou</Badge>}</div><div className="mt-6 flex justify-center gap-2">{checkin?.status === "active" ? <Button variant="outline" onClick={() => void toggleCheckin(false)} disabled={busy}><Undo2 className="h-4 w-4" />Desfazer check-in</Button> : <Button onClick={() => void toggleCheckin(true)} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Registrar entrada</Button>}</div></div>}<div className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground"><CameraOff className="mx-auto mb-2 h-5 w-5" />O check-in é vinculado ao guest_id e reutiliza o registro existente para evitar duplicidades.</div></div>;
}
