import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, CheckCircle2, History, Pencil, RefreshCw, Search, ShieldAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, LoadingState } from "@/components/admin-ui";
import {
  listCompanySubscriptionHistory,
  listCompanySubscriptions,
  listPlans,
  saveCompanySubscription,
  subscriptionHistoryActionLabel,
  updateSubscriptionStatus,
  type CompanySubscription,
  type CompanySubscriptionHistoryItem,
} from "@/lib/subscriptions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/admin/subscriptions")({ component: SubscriptionsPage });

type StatusFilter = "all" | "active" | "suspended" | "cancelled" | "expired";

const toStartIso = (value: string) => value ? new Date(`${value}T00:00:00`).toISOString() : new Date().toISOString();
const toExpiryIso = (value: string) => value ? new Date(`${value}T23:59:59.999`).toISOString() : null;
const inputDate = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 10) : "";

function getAdminState(subscription: CompanySubscription) {
  if (subscription.status === "suspended") return { key: "suspended" as const, label: "Suspensa", daysRemaining: null };
  if (subscription.status === "cancelled") return { key: "cancelled" as const, label: "Cancelada", daysRemaining: null };
  if (!subscription.expires_at) return { key: "active" as const, label: "Ativa", daysRemaining: null };

  const daysRemaining = Math.ceil((new Date(subscription.expires_at).getTime() - Date.now()) / 86_400_000);
  if (daysRemaining <= 0) return { key: "expired" as const, label: "Vencida", daysRemaining: 0 };
  if (daysRemaining <= 7) return { key: "active" as const, label: `Ativa · ${daysRemaining}d`, daysRemaining };
  return { key: "active" as const, label: "Ativa", daysRemaining };
}

function statusTone(state: ReturnType<typeof getAdminState>) {
  if (state.key === "expired" || state.key === "cancelled") return "destructive" as const;
  if (state.key === "suspended") return "secondary" as const;
  return "default" as const;
}

function SubscriptionsPage() {
  const qc = useQueryClient();
  const subscriptions = useQuery({ queryKey: ["admin", "subscriptions"], queryFn: listCompanySubscriptions });
  const plans = useQuery({ queryKey: ["subscriptions", "plans"], queryFn: () => listPlans(false) });
  const history = useQuery({ queryKey: ["admin", "subscription-history"], queryFn: () => listCompanySubscriptionHistory(120) });
  const companies = useQuery({
    queryKey: ["admin", "subscription-companies"],
    queryFn: async () => {
      const { data, error } = await supabase.from("companies").select("id, name").is("deleted_at", null).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const [companyId, setCompanyId] = useState("");
  const [planId, setPlanId] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [notes, setNotes] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const currentForCompany = useMemo(
    () => (subscriptions.data ?? []).find((item) => item.company_id === companyId) ?? null,
    [companyId, subscriptions.data],
  );

  const startEdit = (item?: CompanySubscription) => {
    if (!item) {
      setEditingId(null);
      setCompanyId("");
      setPlanId("");
      setStartsAt("");
      setExpiresAt("");
      setNotes("");
      return;
    }

    setEditingId(item.id);
    setCompanyId(item.company_id);
    setPlanId(item.plan_id);
    setStartsAt(inputDate(item.starts_at));
    setExpiresAt(inputDate(item.expires_at));
    setNotes(item.notes ?? "");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const assign = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await saveCompanySubscription(
        {
          company_id: companyId,
          plan_id: planId,
          starts_at: toStartIso(startsAt),
          expires_at: toExpiryIso(expiresAt),
          notes: notes.trim() || null,
        },
        editingId ?? currentForCompany?.id,
      );
      toast.success(editingId || currentForCompany ? "Assinatura atualizada." : "Assinatura atribuída.");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin", "subscriptions"] }),
        qc.invalidateQueries({ queryKey: ["admin", "subscription-history"] }),
      ]);
      startEdit();
    } catch {
      toast.error("Não foi possível salvar a assinatura.");
    }
  };

  const changeStatus = async (id: string, status: string) => {
    try {
      await updateSubscriptionStatus(id, status);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin", "subscriptions"] }),
        qc.invalidateQueries({ queryKey: ["admin", "subscription-history"] }),
      ]);
      toast.success(status === "active" ? "Assinatura reativada." : status === "suspended" ? "Assinatura suspensa." : "Assinatura cancelada.");
    } catch {
      toast.error("Não foi possível atualizar o status.");
    }
  };

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (subscriptions.data ?? []).filter((item) => {
      const state = getAdminState(item);
      if (statusFilter !== "all" && state.key !== statusFilter) return false;
      if (!needle) return true;
      return [item.company?.name, item.plan?.name, item.plan?.code, item.status].filter(Boolean).some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [search, statusFilter, subscriptions.data]);

  const summary = useMemo(() => {
    const all = subscriptions.data ?? [];
    return {
      total: all.length,
      active: all.filter((item) => getAdminState(item).key === "active").length,
      expiring: all.filter((item) => getAdminState(item).daysRemaining != null && getAdminState(item).daysRemaining <= 7 && getAdminState(item).daysRemaining > 0).length,
      attention: all.filter((item) => ["expired", "suspended", "cancelled"].includes(getAdminState(item).key)).length,
    };
  }, [subscriptions.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assinaturas"
        description="Gerencie ativações, renovações, vencimentos e histórico comercial das empresas."
        action={
          <Button variant="outline" onClick={() => startEdit()}>
            <RefreshCw className="h-4 w-4" />Nova atribuição
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ["Empresas com assinatura", summary.total, CheckCircle2],
          ["Ativas", summary.active, CheckCircle2],
          ["Vencendo em até 7 dias", summary.expiring, CalendarClock],
          ["Precisam de atenção", summary.attention, ShieldAlert],
        ].map(([label, value, Icon]) => (
          <Card key={String(label)}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-semibold">{value as number}</p>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-muted">
                  <Icon className="h-4 w-4" />
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{editingId || currentForCompany ? "Gerenciar assinatura" : "Atribuir plano"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={assign} className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5">
              <Label>Empresa</Label>
              <Select value={companyId} onValueChange={(value) => {
                setCompanyId(value);
                if (!editingId) {
                  const existing = (subscriptions.data ?? []).find((item) => item.company_id === value);
                  if (existing) {
                    setPlanId(existing.plan_id);
                    setStartsAt(inputDate(existing.starts_at));
                    setExpiresAt(inputDate(existing.expires_at));
                    setNotes(existing.notes ?? "");
                  }
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{(companies.data ?? []).map((company) => <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Plano</Label>
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{(plans.data ?? []).map((plan) => <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Início</Label>
              <Input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Vencimento</Label>
              <Input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full" disabled={!companyId || !planId}>Salvar assinatura</Button>
            </div>
            <div className="space-y-1.5 md:col-span-2 lg:col-span-5">
              <Label>Observação interna</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex.: renovação paga via WhatsApp, bônus, condição comercial…" rows={2} />
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por empresa ou plano…" className="pl-9" />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
            <SelectTrigger className="w-full sm:w-[190px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativas</SelectItem>
              <SelectItem value="expired">Vencidas</SelectItem>
              <SelectItem value="suspended">Suspensas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {subscriptions.isLoading ? <LoadingState /> : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const state = getAdminState(item);
            return (
              <Card key={item.id}>
                <CardContent className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{item.company?.name ?? item.company_id}</p>
                      <Badge variant={statusTone(state)}>{state.label}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.plan?.name ?? "Plano removido"} · início {new Date(item.starts_at).toLocaleDateString("pt-BR")}
                      {item.expires_at ? ` · vence ${new Date(item.expires_at).toLocaleDateString("pt-BR")}` : " · sem vencimento"}
                    </p>
                    {item.notes && <p className="mt-2 text-xs text-muted-foreground">{item.notes}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => startEdit(item)}><Pencil className="h-4 w-4" />Gerenciar</Button>
                    {item.status === "active" ? (
                      <>
                        <Button size="sm" variant="outline" onClick={() => changeStatus(item.id, "suspended")}>Suspender</Button>
                        <Button size="sm" variant="outline" onClick={() => changeStatus(item.id, "cancelled")}><XCircle className="h-4 w-4" />Cancelar</Button>
                      </>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => changeStatus(item.id, "active")}><RefreshCw className="h-4 w-4" />Reativar</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma assinatura encontrada com os filtros atuais.</p>}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><History className="h-4 w-4" />Histórico comercial</CardTitle>
        </CardHeader>
        <CardContent>
          {history.isLoading ? <LoadingState /> : (
            <div className="divide-y divide-border/60">
              {(history.data ?? []).slice(0, 15).map((entry: CompanySubscriptionHistoryItem) => (
                <div key={entry.id} className="grid gap-2 py-3 text-sm md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="font-medium">{subscriptionHistoryActionLabel[entry.action] ?? entry.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.company?.name ?? entry.company_id}
                      {entry.to_plan?.name ? ` · ${entry.to_plan.name}` : ""}
                      {entry.changed_by_user?.name ? ` · por ${entry.changed_by_user.name}` : ""}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground md:text-right">{new Date(entry.created_at).toLocaleString("pt-BR")}</p>
                </div>
              ))}
              {(history.data ?? []).length === 0 && <p className="py-6 text-sm text-muted-foreground">Ainda não há eventos de histórico.</p>}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
