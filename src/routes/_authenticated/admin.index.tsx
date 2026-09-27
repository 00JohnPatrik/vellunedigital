import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Building2, CheckCircle2, ExternalLink, FileText, Gauge, Users, Eye, UserCheck } from "lucide-react";
import { LoadingState, PageHeader } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivitySummary } from "@/components/phase7-ui";
import { fetchReport, globalCounts, totals } from "@/lib/reports";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminDashboard,
});

function MetricCard({ label, value, description, icon: Icon, accent }: { label: string; value: number; description: string; icon: typeof Building2; accent: string }) {
  return (
    <Card className="overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="relative p-5">
        <div className={`absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full opacity-10 ${accent}`} />
        <div className="relative flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight">{value.toLocaleString("pt-BR")}</p>
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent} bg-opacity-10`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ProgressMetric({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const percentage = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value.toLocaleString("pt-BR")}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className={`h-full rounded-full transition-all duration-700 ${color}`} style={{ width: `${percentage}%` }} />
      </div>
      <p className="text-right text-xs text-muted-foreground">{percentage}% do total de convites</p>
    </div>
  );
}

function AdminDashboard() {
  const counts = useQuery({ queryKey: ["reports", "global-counts"], queryFn: globalCounts });
  const report = useQuery({ queryKey: ["reports", "global"], queryFn: () => fetchReport() });

  if (counts.isLoading || report.isLoading) return <LoadingState />;
  if (counts.error || report.error || !counts.data) {
    return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Não foi possível carregar os dados reais do dashboard.</div>;
  }

  const metrics = totals(report.data ?? []);
  const totalInvitations = metrics.invitations;
  const confirmedRate = totalInvitations > 0 ? Math.round((metrics.confirmed / totalInvitations) * 100) : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Visão geral"
        description="Acompanhe a operação global da Vellune Digital com dados atualizados do sistema."
        action={<Button asChild variant="outline"><Link to="/admin/companies"><Building2 className="h-4 w-4" />Gerenciar empresas<ArrowUpRight className="h-4 w-4" /></Link></Button>}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores principais">
        <MetricCard label="Empresas ativas" value={counts.data.companies} description="Organizações cadastradas" icon={Building2} accent="bg-sky-500 text-sky-600" />
        <MetricCard label="Usuários ativos" value={counts.data.users} description="Contas com acesso liberado" icon={Users} accent="bg-violet-500 text-violet-600" />
        <MetricCard label="Convites criados" value={metrics.invitations} description="Total consolidado" icon={FileText} accent="bg-amber-500 text-amber-600" />
        <MetricCard label="Visualizações" value={metrics.views} description="Acessos aos convites" icon={Eye} accent="bg-emerald-500 text-emerald-600" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Desempenho da plataforma</CardTitle>
                <CardDescription>Métricas consolidadas a partir dos registros reais de convites.</CardDescription>
              </div>
              <div className="hidden rounded-lg bg-muted p-2 sm:block"><Gauge className="h-5 w-5 text-primary" /></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <ProgressMetric label="Visualizações" value={metrics.views} total={Math.max(metrics.views, totalInvitations)} color="bg-sky-500" />
            <ProgressMetric label="Confirmações" value={metrics.confirmed} total={Math.max(metrics.views, totalInvitations)} color="bg-emerald-500" />
            <ProgressMetric label="Pessoas confirmadas" value={metrics.people} total={Math.max(metrics.views, totalInvitations)} color="bg-violet-500" />
            <div className="grid gap-3 border-t pt-5 sm:grid-cols-2">
              <div className="rounded-xl bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Taxa relativa de confirmações</p><p className="mt-1 text-2xl font-semibold">{confirmedRate}%</p></div>
              <div className="rounded-xl bg-muted/50 p-4"><p className="text-xs text-muted-foreground">Pessoas confirmadas</p><p className="mt-1 text-2xl font-semibold">{metrics.people.toLocaleString("pt-BR")}</p></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Saúde da plataforma</CardTitle><CardDescription>Status derivado das consultas atuais.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border bg-emerald-500/5 p-4"><CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /><div><p className="font-medium">Dados sincronizados</p><p className="text-xs text-muted-foreground">Consultas concluídas com sucesso</p></div></div>
            <div className="flex items-center gap-3 rounded-xl border p-4"><UserCheck className="h-5 w-5 shrink-0 text-primary" /><div><p className="font-medium">Acessos ativos</p><p className="text-xs text-muted-foreground">{counts.data.users.toLocaleString("pt-BR")} usuários ativos</p></div></div>
            <div className="flex items-center gap-3 rounded-xl border p-4"><FileText className="h-5 w-5 shrink-0 text-amber-600" /><div><p className="font-medium">Operação registrada</p><p className="text-xs text-muted-foreground">{metrics.invitations.toLocaleString("pt-BR")} convites contabilizados</p></div></div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.42fr)]">
        <Card><CardHeader><CardTitle>Atividade recente</CardTitle><CardDescription>Eventos e indicadores disponíveis para a conta atual.</CardDescription></CardHeader><CardContent><ActivitySummary /></CardContent></Card>
        <Card><CardHeader><CardTitle>Ações rápidas</CardTitle><CardDescription>Acesse os principais fluxos administrativos.</CardDescription></CardHeader><CardContent className="grid gap-2">
          <Button asChild variant="outline" className="justify-between"><Link to="/admin/companies/new">Cadastrar empresa<ExternalLink className="h-4 w-4" /></Link></Button>
          <Button asChild variant="outline" className="justify-between"><Link to="/admin/companies">Pesquisar empresas<ExternalLink className="h-4 w-4" /></Link></Button>
          <Button asChild variant="outline" className="justify-between"><Link to="/admin/users">Gerenciar usuários<ExternalLink className="h-4 w-4" /></Link></Button>
          <Button asChild variant="outline" className="justify-between"><Link to="/admin/reports">Abrir relatórios<ExternalLink className="h-4 w-4" /></Link></Button>
        </CardContent></Card>
      </section>
    </div>
  );
}
