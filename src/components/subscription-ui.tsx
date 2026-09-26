import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, CreditCard, HardDrive, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { EmptyState, LoadingState } from "@/components/admin-ui";
import { formatMoney, formatStorage, getSubscriptionOverview, subscriptionKey, type SubscriptionOverview } from "@/lib/subscriptions";

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
