import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LoadingState, PageHeader } from "@/components/admin-ui";
import { RecentResponses, Section, StatCard, StatGrid, UpcomingList } from "@/components/reports-ui";
import { fetchReport, recentResponses, totals, upcoming } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: CompanyDashboard,
});

function CompanyDashboard() {
  const report = useQuery({ queryKey: ["reports", "company"], queryFn: () => fetchReport() });
  const recent = useQuery({ queryKey: ["reports", "recent"], queryFn: () => recentResponses(5) });
  if (report.isLoading) return <LoadingState />;
  if (report.error) return <p className="text-sm text-destructive">Não foi possível carregar o dashboard.</p>;
  const rows = report.data ?? [];
  const t = totals(rows);
  return (
    <div>
      <PageHeader title="Dashboard" description="Resumo da sua empresa." />
      <StatGrid>
        <StatCard label="Convites ativos" value={t.invitations} />
        <StatCard label="Visualizações" value={t.views} />
        <StatCard label="Confirmações" value={t.confirmed} />
        <StatCard label="Pessoas confirmadas" value={t.people} />
      </StatGrid>
      {rows.length === 0 && <p className="mt-4 text-sm text-muted-foreground">Você ainda não possui convites.</p>}
      <Section title="Próximos eventos"><UpcomingList rows={upcoming(rows)} /></Section>
      <Section title="Confirmações recentes">
        {recent.isLoading ? <LoadingState /> : <RecentResponses rows={recent.data ?? []} />}
      </Section>
    </div>
  );
}
