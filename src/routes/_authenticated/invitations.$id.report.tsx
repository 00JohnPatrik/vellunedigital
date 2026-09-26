import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ClipboardCheck, Users, UserRoundCheck, UserRoundX } from "lucide-react";
import { EmptyState, LoadingState, PageHeader } from "@/components/admin-ui";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getInvitationForGuests, listAllInvitationGuests } from "@/lib/guests";
import { listRsvpResponses } from "@/lib/rsvp";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/invitations/$id/report")({
  head: () => ({ meta: [{ title: "Relatório do convite — Vellune Digital" }] }),
  component: InvitationReport,
});

async function loadReport(id: string) {
  const [invitation, guests, rsvps, checkins] = await Promise.all([
    getInvitationForGuests(id),
    listAllInvitationGuests(id),
    listRsvpResponses(id),
    supabase.from("guest_checkins").select("id, guest_id, status, checked_in_at").eq("invitation_id", id).eq("status", "active"),
  ]);
  if (checkins.error) throw checkins.error;
  return { invitation, guests, rsvps, checkins: checkins.data ?? [] };
}

function InvitationReport() {
  const { id } = Route.useParams();
  const report = useQuery({ queryKey: ["invitation-report", id], queryFn: () => loadReport(id), refetchInterval: 30000, staleTime: 15000 });
  if (report.isLoading) return <LoadingState />;
  if (report.isError) return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">Não foi possível carregar o relatório.</div>;
  if (!report.data?.invitation) return <EmptyState>Convite não encontrado.</EmptyState>;

  const { invitation, guests, rsvps, checkins } = report.data;
  const confirmed = rsvps.filter((response) => response.status === "confirmed");
  const declined = rsvps.filter((response) => response.status === "declined");
  const activeGuestIds = new Set(guests.map((guest) => guest.guest_id));
  const activeCheckins = checkins.filter((checkin) => activeGuestIds.has(checkin.guest_id));
  const checkedGuestIds = new Set(activeCheckins.map((checkin) => checkin.guest_id));
  const peopleInvited = guests.reduce((total, guest) => total + guest.people_count, 0);
  const peopleConfirmed = confirmed.reduce((total, response) => total + response.people_count, 0);
  const responseTotal = confirmed.length + declined.length;
  const responseRate = guests.length ? Math.round((responseTotal / guests.length) * 100) : 0;
  const checkinRate = guests.length ? Math.round((checkedGuestIds.size / guests.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Relatório do convite" description={invitation.name} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Users className="h-5 w-5" />} label="Convidados" value={guests.length} detail={`${peopleInvited} pessoas convidadas`} />
        <Metric icon={<UserRoundCheck className="h-5 w-5" />} label="Confirmados" value={confirmed.length} detail={`${peopleConfirmed} pessoas confirmadas`} />
        <Metric icon={<CheckCircle2 className="h-5 w-5" />} label="Check-ins" value={checkedGuestIds.size} detail={`${checkinRate}% dos convidados`} />
        <Metric icon={<ClipboardCheck className="h-5 w-5" />} label="Respostas" value={responseTotal} detail={`${responseRate}% de retorno`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Resumo do evento</CardTitle></CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <Summary label="Data" value={formatDate(invitation.event_date)} />
            <Summary label="Horário" value={invitation.event_time?.slice(0, 5) || "—"} />
            <Summary label="Local" value={invitation.venue_name || "Não informado"} />
            <Summary label="Endereço" value={invitation.address || "Não informado"} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Distribuição das respostas</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Bar label="Confirmados" value={confirmed.length} total={Math.max(guests.length, 1)} className="bg-emerald-500" />
            <Bar label="Recusaram" value={declined.length} total={Math.max(guests.length, 1)} className="bg-rose-500" />
            <Bar label="Sem resposta" value={Math.max(0, guests.length - responseTotal)} total={Math.max(guests.length, 1)} className="bg-muted-foreground/40" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Convidados e entrada</CardTitle></CardHeader>
        <CardContent>
          {guests.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum convidado ativo neste convite.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b text-left"><tr><th className="px-3 py-3">Nome</th><th className="px-3 py-3">Pessoas</th><th className="px-3 py-3">Contato</th><th className="px-3 py-3 text-right">Status</th></tr></thead><tbody>{guests.map((guest) => <tr key={guest.id} className="border-b last:border-0"><td className="px-3 py-3 font-medium">{guest.name}</td><td className="px-3 py-3">{guest.people_count}</td><td className="px-3 py-3 text-muted-foreground">{guest.phone || guest.email || "—"}</td><td className="px-3 py-3 text-right">{checkedGuestIds.has(guest.guest_id) ? <Badge><CheckCircle2 className="mr-1 h-3 w-3" />Entrada registrada</Badge> : <Badge variant="secondary"><UserRoundX className="mr-1 h-3 w-3" />Pendente</Badge>}</td></tr>)}</tbody></table></div>}
        </CardContent>
      </Card>
    </div>
  );
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-medium text-foreground">{value}</p></div>;
}

function Bar({ label, value, total, className }: { label: string; value: number; total: number; className: string }) {
  const percentage = Math.min(100, Math.round((value / total) * 100));
  return <div className="space-y-1.5"><div className="flex justify-between text-sm"><span>{label}</span><span className="font-medium tabular-nums">{value}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full transition-all ${className}`} style={{ width: `${percentage}%` }} /></div></div>;
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail: string }) {
  return <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-xl bg-primary/10 p-3 text-primary">{icon}</div><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-semibold text-foreground">{value}</p><p className="text-xs text-muted-foreground">{detail}</p></div></CardContent></Card>;
}
