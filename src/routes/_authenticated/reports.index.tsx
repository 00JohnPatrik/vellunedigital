import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LoadingState, PageHeader } from "@/components/admin-ui";
import { ReportTable, Section, StatCard } from "@/components/reports-ui";
import { fetchReport, totals } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/reports/")({
  component: CompanyReports,
});

function CompanyReports() {
  const report = useQuery({ queryKey: ["reports", "company"], queryFn: () => fetchReport() });
  if (report.isLoading) return <LoadingState />;
  if (report.error) return <p className="text-sm text-destructive">Não foi possível carregar o relatório.</p>;
  const rows = report.data ?? [];
  const t = totals(rows);
  return (
    <div>
      <PageHeader title="Relatórios" description="Resumo dos convites da sua empresa." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Convites" value={t.invitations} />
        <StatCard label="Visualizações" value={t.views} />
        <StatCard label="Confirmações" value={t.confirmed} />
        <StatCard label="Recusas" value={t.declined} />
        <StatCard label="Pessoas confirmadas" value={t.people} />
      </div>
      {rows.length > 0 && t.views === 0 && <p className="mt-4 text-sm text-muted-foreground">Nenhuma visualização registrada.</p>}
      <Section title="Convites"><ReportTable rows={rows} /></Section>
    </div>
  );
}
