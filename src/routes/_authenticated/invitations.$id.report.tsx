import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ClipboardCheck, Users } from "lucide-react";
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
  const report = useQuery({
    queryKey: ["invitation-report", id],
    queryFn: () => loadReport(id),
    refetchInterval: 30000,
    staleTime: 15000,
  });

  if (report.isLoading) return <LoadingState />;
  if (report.isError) return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">Não foi possível carregar o relatório.</div>;
  if (!report.data?.invitation) return <EmptyState>Convite não encontrado.</EmptyState>;

  const { invitation, guests, rsvps, checkins } = report.data;
  const confirmed = rsvps.filter((response) => response.status === "confirmed");
  const checkedGuestIds = new Set(checkins.map((checkin) => checkin.guest_id));
  const peopleInvited = guests.reduce((total, guest) => total + guest.people_count, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Relatório do convite" description={invitation.name} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<Users className="h-5 w-5" />} label="Convidados" value={guests.length} detail={`${peopleInvited} pessoas`} />
        <Metric icon={<ClipboardCheck className="h-5 w-5" />} label="RSVPs confirmados" value={confirmed.length} detail={`${rsvps.length} respostas`} />
        <Metric icon={<CheckCircle2 className="h-5 w-5" />} label="Check-ins" value={checkins.length} detail="entradas registradas" />
        <Metric icon={<Users className="h-5 w-5" />} label="Pendentes" value={Math.max(0, guests.length - checkedGuestIds.size)} detail="convidados sem entrada" />
      </div>
      <Card>
        <CardHeader><CardTitle>Convidados e entrada</CardTitle></CardHeader>
        <CardContent>
          {guests.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">Nenhum convidado ativo neste convite.</p> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b text-left"><tr><th className="px-3 py-3">Nome</th><th className="px-3 py-3">Pessoas</th><th className="px-3 py-3">Contato</th><th className="px-3 py-3 text-right">Status</th></tr></thead><tbody>{guests.map((guest) => <tr key={guest.id} className="border-b last:border-0"><td className="px-3 py-3 font-medium">{guest.name}</td><td className="px-3 py-3">{guest.people_count}</td><td className="px-3 py-3 text-muted-foreground">{guest.phone || guest.email || "—"}</td><td className="px-3 py-3 text-right">{checkedGuestIds.has(guest.guest_id) ? <Badge>Entrada registrada</Badge> : <Badge variant="secondary">Pendente</Badge>}</td></tr>)}</tbody></table></div>}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ icon, label, value, detail }: { icon: React.ReactNode; label: string; value: number; detail: string }) {
  return <Card><CardContent className="flex items-center gap-4 p-5"><div className="rounded-xl bg-primary/10 p-3 text-primary">{icon}</div><div><p className="text-sm text-muted-foreground">{label}</p><p className="text-2xl font-semibold text-foreground">{value}</p><p className="text-xs text-muted-foreground">{detail}</p></div></CardContent></Card>;
}
