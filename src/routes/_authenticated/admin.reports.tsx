import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LoadingState, PageHeader } from "@/components/admin-ui";
import { ReportTable, Section, StatCard } from "@/components/reports-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { companiesKey, listCompanies } from "@/lib/admin-data";
import { fetchReport, totals } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: AdminReports,
});

function AdminReports() {
  const [company, setCompany] = useState("all");
  const companies = useQuery({ queryKey: companiesKey, queryFn: listCompanies });
  const report = useQuery({ queryKey: ["reports", "admin", company], queryFn: () => fetchReport(company === "all" ? null : company) });
  const rows = report.data ?? [];
  const t = totals(rows);
  const companyCount = company === "all" ? (companies.data?.length ?? 0) : 1;
  return (
    <div>
      <PageHeader title="Relatórios" description="Visão global ou por empresa."
        action={
          <Select value={company} onValueChange={setCompany}>
            <SelectTrigger className="sm:w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as empresas</SelectItem>
              {companies.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        } />
      {report.isLoading ? <LoadingState /> : report.error ? <p className="text-sm text-destructive">Não foi possível carregar o relatório.</p> : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Empresas" value={companyCount} />
            <StatCard label="Convites" value={t.invitations} />
            <StatCard label="Visualizações" value={t.views} />
            <StatCard label="Confirmações" value={t.confirmed} />
            <StatCard label="Pessoas confirmadas" value={t.people} />
          </div>
          <Section title="Convites"><ReportTable rows={rows} /></Section>
        </>
      )}
    </div>
  );
}
