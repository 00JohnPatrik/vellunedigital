import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LoadingState, PageHeader } from "@/components/admin-ui";
import { RecentResponses, Section, StatCard, StatGrid, UpcomingList } from "@/components/reports-ui";
import { fetchReport, recentResponses, totals, upcoming } from "@/lib/reports";
import { CompanyDashboardEnhancements } from "@/components/phase7-ui";
import { ExperimentalCompanyDashboard } from "@/components/experimental-company-dashboard";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  component: CompanyDashboard,
});

function CompanyDashboard() {
  const { appUser } = Route.useRouteContext();
  const experimentalLayout = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("legacy") !== "1";
  const report = useQuery({ queryKey: ["reports", "company"], queryFn: () => fetchReport() });
  const recent = useQuery({ queryKey: ["reports", "recent"], queryFn: () => recentResponses(5) });
  if (report.isLoading) return <LoadingState />;
  const rows = report.data ?? [];
  const t = totals(rows);

  if (experimentalLayout) {
    return (
      <ExperimentalCompanyDashboard
        appUser={appUser!}
        reportRows={rows}
        recentResponses={recent.data ?? []}
      />
    );
  }

  if (report.error) {
    return (
      <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-sm font-medium text-destructive">Não foi possível carregar o dashboard.</p>
        <p className="mt-1 text-sm text-muted-foreground">Atualize a página e tente novamente.</p>
      </div>
    );
  }

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
        {recent.isLoading ? <LoadingState /> : recent.error ? (
          <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
            Não foi possível carregar as confirmações recentes.
          </div>
        ) : <RecentResponses rows={recent.data ?? []} />}
      </Section>
      <CompanyDashboardEnhancements companyId={appUser!.company!.id} />
    </div>
  );
}
