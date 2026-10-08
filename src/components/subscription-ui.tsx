import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CalendarClock, CheckCircle2, CreditCard, Crown, HardDrive, MessageCircle, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState, LoadingState } from "@/components/admin-ui";
import { formatMoney, formatStorage, getSubscriptionLifecycle, getSubscriptionOverview, listPlans, plansKey, subscriptionKey, type SubscriptionOverview } from "@/lib/subscriptions";
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
  const lifecycle = getSubscriptionLifecycle(data);
  const expired = lifecycle.state === "expired";
  const warning = lifecycle.state !== "active";
  return <Card><CardHeader className="flex flex-row items-start justify-between gap-3"><div><CardTitle className="flex items-center gap-2 text-base"><CreditCard className="h-4 w-4" />Assinatura</CardTitle><p className="mt-1 text-sm text-muted-foreground">Plano {data.plan.name}</p></div><Badge variant={warning ? "destructive" : "default"}>{expired ? "Vencida" : data.subscription.status === "active" ? lifecycle.state === "expiring" ? `Vence em ${lifecycle.daysRemaining}d` : "Ativa" : data.subscription.status}</Badge></CardHeader><CardContent className="space-y-5"><div className="grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Mensalidade</p><p className="mt-1 font-semibold">{formatMoney(data.plan.price_monthly)}</p></div><div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Início</p><p className="mt-1 font-semibold">{new Date(data.subscription.starts_at).toLocaleDateString("pt-BR")}</p></div><div className="rounded-lg bg-muted/50 p-3"><p className="text-xs text-muted-foreground">Vencimento</p><p className="mt-1 font-semibold">{data.subscription.expires_at ? new Date(data.subscription.expires_at).toLocaleDateString("pt-BR") : "Sem vencimento"}</p>{lifecycle.daysRemaining != null && <p className={`mt-0.5 text-xs ${lifecycle.state === "expiring" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`}>{lifecycle.daysRemaining} dia(s) restante(s)</p>}</div></div>{warning && <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /><span>{expired ? "A assinatura está vencida. Novos recursos podem ser bloqueados." : "A assinatura não está ativa. Consulte a administração."}</span></div>}{!compact && <div className="grid gap-4 sm:grid-cols-2"><UsageBar label="Convites" value={data.usage.invitations} limit={data.plan.invitations_limit} /><UsageBar label="Clientes" value={data.usage.customers} limit={data.plan.customers_limit} /><UsageBar label="Convidados" value={data.usage.guests} limit={data.plan.guests_limit} /><UsageBar label="Armazenamento" value={data.usage.storageBytes / 1024 / 1024} limit={data.plan.storage_limit_mb} suffix=" MB" /></div>}</CardContent></Card>;
}


export function SubscriptionUsageAlert({ companyId, className = "" }: { companyId: string; className?: string }) {
  const query = useQuery({
    queryKey: [...subscriptionKey(companyId), "usage-alert"],
    queryFn: () => getSubscriptionOverview(companyId),
    staleTime: 30_000,
  });

  const data = query.data;
  if (query.isLoading || query.isError || !data?.plan || !data.subscription) return null;
  const subscription = data.subscription;
  const plan = data.plan;
  if (subscription.status !== "active" || (subscription.expires_at && new Date(subscription.expires_at) < new Date())) return null;

  const usage = [
    { label: "Convites", value: data.usage.invitations, limit: plan.invitations_limit },
    { label: "Clientes", value: data.usage.customers, limit: plan.customers_limit },
    { label: "Convidados", value: data.usage.guests, limit: plan.guests_limit },
    { label: "Armazenamento", value: data.usage.storageBytes / 1024 / 1024, limit: plan.storage_limit_mb },
  ].filter((item) => item.limit != null);

  const relevant = usage.map((item) => ({
    ...item,
    percent: item.limit ? Math.round((item.value / item.limit) * 100) : 0,
  }));
  const critical = relevant.filter((item) => item.percent >= 90).sort((a, b) => b.percent - a.percent);
  const warning = relevant.filter((item) => item.percent >= 80).sort((a, b) => b.percent - a.percent);
  if (warning.length === 0) return null;

  const highest = critical[0] ?? warning[0];
  if (!highest) return null;
  const severity = highest.percent >= 100 ? "critical" : "warning";
  const formatValue = (item: typeof highest) =>
    item.label === "Armazenamento"
      ? `${formatStorage(item.value * 1024 * 1024)} de ${formatStorage((item.limit ?? 0) * 1024 * 1024)}`
      : `${item.value} de ${item.limit}`;

  return (
    <Card className={`mb-6 ${severity === "critical" ? "border-destructive/30 bg-destructive/5" : "border-amber-500/25 bg-amber-500/5"} ${className}`}>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <p className={`font-semibold ${severity === "critical" ? "text-destructive" : "text-amber-700 dark:text-amber-300"}`}>
            {highest.percent >= 100 ? `Limite de ${highest.label.toLowerCase()} atingido` : `Seu plano está em ${highest.percent}% de ${highest.label.toLowerCase()}`}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatValue(highest)}. {highest.percent >= 100 ? "Novos registros desse recurso serão bloqueados até renovar ou trocar o plano." : "Revise o uso antes de continuar criando novos registros."}
          </p>
        </div>
        <Button asChild variant={severity === "critical" ? "destructive" : "outline"} className="shrink-0">
          <Link to="/dashboard/assinatura">Ver plano e limites</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function SubscriptionStatusBanner({ companyId }: { companyId: string }) {
  const query = useQuery({ queryKey: [...subscriptionKey(companyId), "banner"], queryFn: () => getSubscriptionOverview(companyId), staleTime: 30_000 });
  if (query.isLoading || query.isError || !query.data) return null;

  const data = query.data;
  const lifecycle = getSubscriptionLifecycle(data);
  if (lifecycle.state === "active" && lifecycle.daysRemaining !== null && lifecycle.daysRemaining > 7) return null;

  const whatsapp = whatsappHref(
    lifecycle.state === "missing"
      ? "Olá! Quero ativar um plano para minha empresa na Vellune Digital."
      : lifecycle.state === "expired"
        ? "Olá! Minha assinatura da Vellune Digital venceu e quero renovar."
        : "Olá! Quero renovar ou verificar a situação da minha assinatura na Vellune Digital.",
  );

  const copy = {
    missing: {
      title: "Seu plano ainda não está ativo",
      description: "Ative um plano para liberar a operação comercial da sua empresa.",
      action: "Falar com a Vellune",
      icon: CreditCard,
    },
    expired: {
      title: "Sua assinatura venceu",
      description: "Renove o plano para manter a operação com os limites e recursos contratados.",
      action: "Renovar pelo WhatsApp",
      icon: AlertTriangle,
    },
    expiring: {
      title: `Sua assinatura vence em ${lifecycle.daysRemaining} dia(s)`,
      description: "Antecipe a renovação para evitar interrupções no uso.",
      action: "Renovar pelo WhatsApp",
      icon: CalendarClock,
    },
    suspended: {
      title: "Sua assinatura está suspensa",
      description: "Fale com a Vellune para regularizar o acesso comercial.",
      action: "Falar com a Vellune",
      icon: AlertTriangle,
    },
    cancelled: {
      title: "Sua assinatura foi cancelada",
      description: "Reative ou escolha um novo plano para voltar ao fluxo comercial.",
      action: "Escolher um plano",
      icon: CreditCard,
    },
    active: {
      title: "Assinatura ativa",
      description: "",
      action: "",
      icon: CheckCircle2,
    },
  }[lifecycle.state];

  const Icon = copy.icon;
  return (
    <Card className="mb-6 border-primary/20 bg-primary/5">
      <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-background/80 text-primary shadow-sm">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="font-semibold">{copy.title}</p>
            <p className="mt-1 text-sm leading-5 text-muted-foreground">{copy.description}</p>
          </div>
        </div>
        {whatsapp && (
          <Button asChild className="shrink-0">
            <a href={whatsapp} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4" />
              {copy.action}
            </a>
          </Button>
        )}
      </CardContent>
    </Card>
  );
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
