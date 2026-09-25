import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LoadingState, PageHeader } from "@/components/admin-ui";
import { StatCard } from "@/components/reports-ui";
import { fetchReport, globalCounts, totals } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const counts = useQuery({ queryKey: ["reports", "global-counts"], queryFn: globalCounts });
  const report = useQuery({ queryKey: ["reports", "global"], queryFn: () => fetchReport() });
  if (counts.isLoading || report.isLoading) return <LoadingState />;
  if (counts.error || report.error) return <p className="text-sm text-destructive">Não foi possível carregar o dashboard.</p>;
  const t = totals(report.data ?? []);
  return (
    <div>
      <PageHeader title="Dashboard" description="Visão global da plataforma." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Empresas ativas" value={counts.data!.companies} />
        <StatCard label="Usuários ativos" value={counts.data!.users} />
        <StatCard label="Convites" value={t.invitations} />
        <StatCard label="Visualizações" value={t.views} />
        <StatCard label="Confirmações" value={t.confirmed} />
        <StatCard label="Pessoas confirmadas" value={t.people} />
      </div>
    </div>
  );
}
