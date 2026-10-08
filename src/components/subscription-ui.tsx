import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, CreditCard, Crown, HardDrive, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/admin-ui";
import { formatMoney, formatStorage, getSubscriptionOverview, listPlans, plansKey, subscriptionKey, type SubscriptionOverview } from "@/lib/subscriptions";
import { whatsappHref } from "@/lib/nav";

function UsageBar({ label, value, limit, suffix = "" }: { label: string; value: number; limit: number | null | undefined; suffix?: string }) {
  const percentage = limit ? Math.min(100, value / limit * 100) : 0;
  return <div className="space-y-1.5"><div className="flex justify-between gap-3 text-sm"><span>{label}</span><span className="text-muted-foreground">{value}{limit == null ? "" : ` / ${limit}`}{suffix}</span></div>{limit != null && <Progress value={percentage} className={percentage >= 90 ? "[&>div]:bg-destructive" : ""} />}</div>;
}

export function SubscriptionOverviewCard({ companyId, compact = false }: { companyId: string; compact?: boolean }) {
  const query = useQuery({ queryKey: subscriptionKey(companyId), queryFn: () => getSubscriptionOverview(companyId) });
  if (query.isLoading) return <LoadingState />;
  if (query.isError) return <EmptyState>Não foi possível carregar a assinatura.</EmptyState>;
  const data = query.data as SubscriptionOverview;
  if (!data.subscription || !data.plan) return <EmptyState><div className="space-y-2"><CreditCard className="mx-auto h-6 w-6" /><p>Nenhuma assinatura atribuída a esta empresa.</p><p className="text-xs">Solicite a atribuição de um plano ao administrador.</p></div></EmptyState>;
  const expired = data.subscription.expires_at && new Date(data.subscription.expires_at) < new Date();
  const warning = expired || data.subscription.status !== "active";
  return <Card><CardHeader className="flex flex-row items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-4 w-4" />Assinatura</CardTitle><p className="mt-1 text-sm text-muted-foreground">Plano {data.plan.name}</p></div><Badge variant={warning ? "destructive" : "default"}>{expired ? "Vencida" : data.subscription.status === "active" ? "Ativa" : data.subscription.status}</Badge></CardHeader><CardContent className="space-y-5"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Mensalidade</p><p className="mt-1 font-semibold">{formatMoney(data.plan.price_monthly)}</p></div><div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Início</p><p className="mt-1 font-semibold">{new Date(data.subscription.starts_at).toLocaleDateString("pt-BR")}</p></div><div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Vencimento</p><p className="mt-1 font-semibold">{data.subscription.expires_at ? new Date(data.subscription.expires_at).toLocaleDateString("pt-BR") : "Sem vencimento"}</p></div></div>{warning && <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{expired ? "A assinatura está vencida. Novos recursos podem ser bloqueados." : "A assinatura não está ativa. Consulte a administração."}</span></div>}{!compact && <div className="grid gap-4 sm:grid-cols-2"><UsageBar label="Convites" value={data.usage.invitations} limit={data.plan.invitations_limit} /><UsageBar label="Clientes" value={data.usage.customers} limit={data.plan.customers_limit} /><UsageBar label="Convidados" value={data.usage.guests} limit={data.plan.guests_limit} /><UsageBar label="Armazenamento" value={data.usage.storageBytes / 1024 / 1024} limit={data.plan.storage_limit_mb} suffix=" MB" /></div>}</CardContent></Card>;
}


export function PlanCatalog({ companyId }: { companyId: string }) {
  const currentQuery = useQuery({ queryKey: subscriptionKey(companyId), queryFn: () => getSubscriptionOverview(companyId), staleTime: 30_000 });
  const plansQuery = useQuery({ queryKey: plansKey, queryFn: () => listPlans(false), staleTime: 60_000 });

  if (plansQuery.isLoading) return <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Carregando planos disponíveis…</CardContent></Card>;
  if (plansQuery.isError) return <Card><CardContent className="py-8 text-center text-sm text-destructive">Não foi possível carregar os planos disponíveis.</CardContent></Card>;

  const currentPlanId = currentQuery.data?.plan?.id ?? null;
  const plans = plansQuery.data ?? [];

  return (
    <section className="space-y-4" aria-label="Planos disponíveis">
      <div>
        <h2 className="font-display text-lg font-semibold">Escolha o próximo nível</h2>
        <p className="mt-1 text-sm text-muted-foreground">A contratação continua manual pelo WhatsApp nesta fase. Você escolhe o plano e a equipe faz a ativação.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlanId;
          const requestUrl = whatsappHref(
            "Olá! Quero conhecer o plano " + plan.name + " da Vellune Digital (R$ " +
              plan.price_monthly.toLocaleString("pt-BR", { minimumFractionDigits: 2 }) + "/mês).",
          );
          return (
            <Card key={plan.id} className={isCurrent ? "border-primary/50 shadow-md" : ""}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      {isCurrent ? <Crown className="h-4 w-4 text-primary" /> : <CreditCard className="h-4 w-4 text-muted-foreground" />}
                      {plan.name}
                    </CardTitle>
                    {plan.description && <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>}
                  </div>
                  {isCurrent && <Badge>Atual</Badge>}
                </div>
                <div className="pt-2">
                  <span className="text-2xl font-semibold">{formatMoney(plan.price_monthly)}</span>
                  <span className="ml-1 text-xs text-muted-foreground">/mês</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Convites</span><span className="font-medium">{plan.invitations_limit == null ? "Ilimitados" : plan.invitations_limit}</span></div>
                  <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Clientes</span><span className="font-medium">{plan.customers_limit == null ? "Ilimitados" : plan.customers_limit}</span></div>
                  <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Convidados</span><span className="font-medium">{plan.guests_limit == null ? "Ilimitados" : plan.guests_limit}</span></div>
                  <div className="flex items-center justify-between gap-3"><span className="text-muted-foreground">Armazenamento</span><span className="font-medium">{plan.storage_limit_mb == null ? "Ilimitado" : plan.storage_limit_mb + " MB"}</span></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {plan.features?.custom_branding === true && <Badge variant="secondary">White-label</Badge>}
                  {plan.features?.checkin === true && <Badge variant="secondary">Check-in QR</Badge>}
                  {plan.premium_templates_limit != null && <Badge variant="secondary">{plan.premium_templates_limit} modelos premium</Badge>}
                </div>
                {!isCurrent && requestUrl ? (
                  <Button asChild className="w-full">
                    <a href={requestUrl} target="_blank" rel="noreferrer">Falar sobre este plano</a>
                  </Button>
                ) : (
                  <Button type="button" variant="outline" className="w-full" disabled>Plano atual</Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
