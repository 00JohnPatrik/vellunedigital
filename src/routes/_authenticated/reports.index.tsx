import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, RefreshCw, Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState, PageHeader } from "@/components/admin-ui";
import { ReportTable, Section, StatCard } from "@/components/reports-ui";
import { fetchReport, reportToCsv, totals } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/reports/")({
  component: CompanyReports,
});

function CompanyReports() {
  const report = useQuery({ queryKey: ["reports", "company"], queryFn: () => fetchReport() });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (report.data ?? []).filter((row) => {
      const matchesSearch = !term || row.name.toLowerCase().includes(term) || (row.customer_name ?? "").toLowerCase().includes(term);
      const matchesStatus = status === "all" || String(row.status) === status;
      return matchesSearch && matchesStatus;
    });
  }, [report.data, search, status]);

  const downloadCsv = () => {
    const blob = new Blob([`\ufeff${reportToCsv(rows)}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `relatorio-convites-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (report.isLoading) return <LoadingState />;
  if (report.error) {
    return (
      <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-center">
        <p className="text-sm font-medium text-destructive">Não foi possível carregar o relatório.</p>
        <p className="mt-1 text-sm text-muted-foreground">Verifique sua conexão e tente novamente.</p>
        <Button type="button" variant="outline" className="mt-4" onClick={() => void report.refetch()} disabled={report.isFetching}>
          <RefreshCw className={report.isFetching ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Tentar novamente
        </Button>
      </div>
    );
  }

  const t = totals(rows);
  const statuses = [...new Set((report.data ?? []).map((row) => String(row.status)))].sort();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description="Resumo dos convites da sua empresa."
        action={<Button variant="outline" onClick={downloadCsv} disabled={!rows.length}><Download className="h-4 w-4" />Exportar CSV</Button>}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Convites" value={t.invitations} />
        <StatCard label="Visualizações" value={t.views} />
        <StatCard label="Confirmações" value={t.confirmed} />
        <StatCard label="Recusas" value={t.declined} />
        <StatCard label="Pessoas confirmadas" value={t.people} />
      </div>
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por convite ou cliente" aria-label="Buscar por convite ou cliente" className="pl-9" />
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Filtrar por status" className="h-10 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-ring">
          <option value="all">Todos os status</option>
          {statuses.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
      </div>
      {rows.length > 0 && t.views === 0 && <p className="text-sm text-muted-foreground">Nenhuma visualização registrada.</p>}
      {report.data?.length && !rows.length ? <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">Nenhum convite corresponde aos filtros.</div> : <Section title="Convites"><ReportTable rows={rows} /></Section>}
    </div>
  );
}
