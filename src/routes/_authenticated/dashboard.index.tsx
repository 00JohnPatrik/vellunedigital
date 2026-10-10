import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LoadingState, PageHeader } from "@/components/admin-ui";
import { RecentResponses, Section, StatCard, StatGrid, UpcomingList } from "@/components/reports-ui";
import { fetchReport, recentResponses, totals, upcoming } from "@/lib/reports";
import { CompanyDashboardEnhancements } from "@/components/phase7-ui";
import { ExperimentalCompanyDashboard } from "@/components/experimental-company-dashboard";
import { CommercialOnboarding } from "@/components/commercial-onboarding";
import { SubscriptionStatusBanner } from "@/components/subscription-ui";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({ meta: [
    { title: "Estúdio criativo — Vellune Digital" },
    { name: "description", content: "Seu espaço para criar convites, continuar designs e acompanhar confirmações na Vellune Digital." },
    { property: "og:title", content: "Estúdio criativo — Vellune Digital" },
    { property: "og:description", content: "Crie, organize e acompanhe os convites da sua empresa." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: CompanyDashboard,
});

function CompanyDashboard() {
  const { appUser } = Route.useRouteContext();
  const experimentalLayout = useRouterState({ select: state => new URLSearchParams(state.location.searchStr).get("legacy") !== "1" });
  const report = useQuery({ queryKey: ["reports", "company"], queryFn: () => fetchReport() });
  const recent = useQuery({ queryKey: ["reports", "recent"], queryFn: () => recentResponses(5) });

  if (!appUser?.company) return null;

  if (report.isLoading) return <div role="status" aria-label="Carregando dashboard" className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[0,1,2,3].map(i => <div key={i} className="h-44 animate-pulse rounded-2xl border border-border bg-card" />)}</div>;

  if (report.error) {
    return (
      <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-sm font-medium text-destructive">Não foi possível carregar o dashboard.</p>
        <p className="mt-1 text-sm text-muted-foreground">Atualize a página e tente novamente.</p>
      </div>
    );
  }

  const rows = report.data ?? [];
  const t = totals(rows);

  if (experimentalLayout) {
    return (
      <>
        <ExperimentalCompanyDashboard
          appUser={appUser}
          reportRows={rows}
          recentResponses={recent.data ?? []}
        />
        <div className="mt-8"><SubscriptionStatusBanner companyId={appUser.company.id} /><CommercialOnboarding userId={appUser.id} userName={appUser.name} /></div>
      </>
    );
  }

  return (
    <>
      <CommercialOnboarding userId={appUser.id} userName={appUser.name} />
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
        <CompanyDashboardEnhancements companyId={appUser.company.id} />
      </div>
    </>
  );
}
