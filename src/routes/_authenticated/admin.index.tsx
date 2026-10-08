import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowUpRight, Building2, CalendarClock, CheckCircle2, CreditCard, ExternalLink, FileText, Gauge, Users, Eye, UserCheck } from "lucide-react";
import { LoadingState, PageHeader } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivitySummary } from "@/components/phase7-ui";
import { fetchReport, globalCounts, totals } from "@/lib/reports";
import { listUsersPresence, type PresenceUser } from "@/lib/admin-data";
import { getPresenceStatus, presenceClass, presenceLabel } from "@/components/presence-tracker";
import { listCompanySubscriptions, type CompanySubscription } from "@/lib/subscriptions";
import { supabase } from "@/integrations/supabase/client";

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

function commercialState(subscription: CompanySubscription) {
  if (subscription.status !== "active") return subscription.status;
  if (!subscription.expires_at) return "active";
  const days = Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / 86_400_000);
  if (days <= 0) return "expired";
  if (days <= 7) return "expiring";
  return "active";
}

function AdminDashboard() {
  const counts = useQuery({ queryKey: ["reports", "global-counts"], queryFn: globalCounts });
  const report = useQuery({ queryKey: ["reports", "global"], queryFn: () => fetchReport() });
  const users = useQuery({
    queryKey: ["admin", "users", "presence"],
    queryFn: listUsersPresence,
    refetchInterval: 30_000,
  });
  const subscriptions = useQuery({
    queryKey: ["admin", "subscriptions"],
    queryFn: listCompanySubscriptions,
    staleTime: 30_000,
  });
  const companies = useQuery({
    queryKey: ["admin", "companies", "commercial-overview"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name").is("deleted_at", null).order("name");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });

  if (counts.isLoading || report.isLoading || users.isLoading) return <LoadingState />;
  if (counts.error || report.error || !counts.data) {
    return <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Não foi possível carregar os dados reais do dashboard.</div>;
  }

  const metrics = totals(report.data ?? []);
  const totalInvitations = metrics.invitations;
  const confirmedRate = totalInvitations > 0 ? Math.round((metrics.confirmed / totalInvitations) * 100) : 0;

  const commercial = useMemo(() => {
    const rows = subscriptions.data ?? [];
    const active = rows.filter((item) => commercialState(item) === "active" || commercialState(item) === "expiring");
    const expiring = rows.filter((item) => commercialState(item) === "expiring");
    const attention = rows.filter((item) => ["expired", "suspended", "cancelled"].includes(commercialState(item)));
    const activeCompanyIds = new Set(active.map((item) => item.company_id));
    const companiesWithoutActivePlan = (companies.data ?? []).filter((company) => !activeCompanyIds.has(company.id));
    const monthlyValue = active.reduce((sum, item) => sum + Number(item.plan?.price_monthly ?? 0), 0);
    const upcoming = rows
      .filter((item) => {
        const state = commercialState(item);
        return state === "expiring";
      })
      .sort((a, b) => new Date(a.expires_at ?? 0).getTime() - new Date(b.expires_at ?? 0).getTime())
      .slice(0, 6);
    return { active, expiring, attention, companiesWithoutActivePlan, monthlyValue, upcoming };
  }, [companies.data, subscriptions.data]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Visão geral"
        description="Acompanhe a operação global da Vellune Digital com dados atualizados do sistema."
        action={<Button asChild variant="outline"><Link to="/admin/companies"><Building2 className="h-4 w-4" />Gerenciar empresas<ArrowUpRight className="h-4 w-4" /></Link></Button>}
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicadores principais">
        <MetricCard label="Online agora" value={(users.data ?? []).filter((u) => getPresenceStatus(u.last_seen_at) === "online").length} description="Usuários vistos nos últimos 2 minutos" icon={UserCheck} accent="bg-emerald-500 text-emerald-600" />
        <MetricCard label="Empresas ativas" value={counts.data.companies} description="Organizações cadastradas" icon={Building2} accent="bg-[#d4af37] text-[#d4af37]" />
        <MetricCard label="Usuários ativos" value={counts.data.users} description="Contas com acesso liberado" icon={Users} accent="bg-[#d4af37] text-[#d4af37]" />
        <MetricCard label="Convites criados" value={metrics.invitations} description="Total consolidado" icon={FileText} accent="bg-[#d4af37] text-[#d4af37]" />
        <MetricCard label="Visualizações" value={metrics.views} description="Acessos aos convites" icon={Eye} accent="bg-emerald-500 text-emerald-600" />
      </section>

      <section className="space-y-4" aria-label="Visão comercial">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-semibold">Visão comercial</h2>
            <p className="text-sm text-muted-foreground">Sinais de assinatura e oportunidades de renovação em tempo real.</p>
          </div>
          <Button asChild variant="outline"><Link to="/admin/subscriptions"><CreditCard className="h-4 w-4" />Gerenciar assinaturas<ArrowUpRight className="h-4 w-4" /></Link></Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Assinaturas ativas" value={commercial.active.length} description="Inclui as que vencem em até 7 dias" icon={CreditCard} accent="bg-emerald-500 text-emerald-600" />
          <MetricCard label="Vencem em 7 dias" value={commercial.expiring.length} description="Renovações que merecem contato" icon={CalendarClock} accent="bg-amber-500 text-amber-600" />
          <MetricCard label="Sem assinatura ativa" value={commercial.companiesWithoutActivePlan.length} description="Empresas prontas para conversão" icon={AlertTriangle} accent="bg-[#d4af37] text-[#d4af37]" />
          <MetricCard label="Valor mensal contratado" value={commercial.monthlyValue} description="Soma dos planos ativos; não é receita recebida" icon={CreditCard} accent="bg-[#d4af37] text-[#d4af37]" />
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle>Próximos vencimentos</CardTitle><CardDescription>Empresas com assinatura ativa vencendo em até 7 dias.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {commercial.upcoming.map((item) => {
                const days = Math.max(0, Math.ceil((new Date(item.expires_at!).getTime() - Date.now()) / 86_400_000));
                return <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{item.company?.name ?? item.company_id}</p><p className="text-xs text-muted-foreground">{item.plan?.name ?? "Plano removido"} · vence {new Date(item.expires_at!).toLocaleDateString("pt-BR")}</p></div>
                  <span className="shrink-0 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">{days}d</span>
                </div>;
              })}
              {commercial.upcoming.length === 0 && <p className="py-5 text-sm text-muted-foreground">Nenhum vencimento nos próximos 7 dias.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Empresas sem assinatura ativa</CardTitle><CardDescription>Oportunidades de ativação, recuperação ou reativação.</CardDescription></CardHeader>
            <CardContent className="space-y-3">
              {commercial.companiesWithoutActivePlan.slice(0, 6).map((company) => <div key={company.id} className="flex items-center justify-between gap-3 rounded-xl border p-3"><p className="truncate text-sm font-medium">{company.name}</p><Button asChild size="sm" variant="outline"><Link to="/admin/subscriptions">Ativar</Link></Button></div>)}
              {commercial.companiesWithoutActivePlan.length === 0 && <p className="py-5 text-sm text-muted-foreground">Todas as empresas têm uma assinatura ativa.</p>}
            </CardContent>
          </Card>
        </div>

        {commercial.attention.length > 0 && (
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="font-medium">Há {commercial.attention.length} assinatura(s) que precisam de atenção</p><p className="text-sm text-muted-foreground">Vencidas, suspensas ou canceladas aparecem na gestão comercial.</p></div>
              <Button asChild variant="outline"><Link to="/admin/subscriptions">Abrir fila de atenção</Link></Button>
            </CardContent>
          </Card>
        )}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Desempenho da plataforma</CardTitle>
                <CardDescription>Métricas consolidadas a partir dos registros reais de convites.</CardDescription>
              </div>
              <div className="hidden rounded-xl border border-[#2a2b31] bg-[#08090d] p-2 sm:block"><Gauge className="h-5 w-5 text-primary" /></div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <ProgressMetric label="Visualizações" value={metrics.views} total={Math.max(metrics.views, totalInvitations)} color="bg-[#d4af37]" />
            <ProgressMetric label="Confirmações" value={metrics.confirmed} total={Math.max(metrics.views, totalInvitations)} color="bg-emerald-500" />
            <ProgressMetric label="Pessoas confirmadas" value={metrics.people} total={Math.max(metrics.views, totalInvitations)} color="bg-[#d4af37]" />
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
        <Card>
          <CardHeader><CardTitle>Usuários agora</CardTitle><CardDescription>Presença baseada no último heartbeat registrado.</CardDescription></CardHeader>
          <CardContent className="space-y-3">
            {(users.data ?? []).slice(0, 8).map((user: PresenceUser) => {
              const presence = getPresenceStatus(user.last_seen_at);
              return <div key={user.id} className="flex items-center justify-between gap-3 rounded-xl border p-3 transition-colors hover:bg-muted/40">
                <div className="min-w-0"><p className="truncate text-sm font-medium">{user.name}</p><p className="truncate text-xs text-muted-foreground">{user.company?.name ?? "Acesso global"}</p></div>
                <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground"><span className={`h-2 w-2 rounded-full ${presenceClass(presence)}`} />{presenceLabel(presence)}</span>
              </div>;
            })}
            {(users.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>}
            <Button asChild variant="outline" className="w-full"><Link to="/admin/users">Ver lista completa<ArrowUpRight className="h-4 w-4" /></Link></Button>
          </CardContent>
        </Card>
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
