import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { PageHeader, StatusBadge, LoadingState } from "@/components/admin-ui";
import { listPlans, plansKey, savePlan, setPlanStatus, type SubscriptionPlan } from "@/lib/subscriptions";

export const Route = createFileRoute("/_authenticated/admin/plans")({ component: PlansPage });

type PlanForm = {
  code: string;
  name: string;
  description: string;
  price_monthly: string;
  duration_days: string;
  invitations_limit: string;
  customers_limit: string;
  guests_limit: string;
  storage_limit_mb: string;
  features: Record<string, unknown>;
};

const empty: PlanForm = {
  code: "",
  name: "",
  description: "",
  price_monthly: "0",
  duration_days: "30",
  invitations_limit: "",
  customers_limit: "",
  guests_limit: "",
  storage_limit_mb: "",
  features: {},
};

const FEATURE_LABELS: Array<{ key: string; label: string; description: string }> = [
  { key: "custom_branding", label: "White-label", description: "Permite remover a marca Vellune dos convites públicos." },
  { key: "checkin", label: "Check-in por QR", description: "Libera o módulo de controle de entrada por QR Code." },
];

function PlansPage() {
  const qc = useQueryClient();
  const query = useQuery({ queryKey: plansKey, queryFn: () => listPlans() });
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [form, setForm] = useState<PlanForm>(empty);
  const [open, setOpen] = useState(false);

  const start = (plan?: SubscriptionPlan) => {
    setEditing(plan ?? null);
    setForm(
      plan
        ? {
            code: plan.code,
            name: plan.name,
            description: plan.description ?? "",
            price_monthly: String(plan.price_monthly),
            duration_days: String(plan.duration_days),
            invitations_limit: plan.invitations_limit == null ? "" : String(plan.invitations_limit),
            customers_limit: plan.customers_limit == null ? "" : String(plan.customers_limit),
            guests_limit: plan.guests_limit == null ? "" : String(plan.guests_limit),
            storage_limit_mb: plan.storage_limit_mb == null ? "" : String(plan.storage_limit_mb),
            // Preserve existing feature flags, including flags not yet surfaced by the UI.
            features: { ...(plan.features ?? {}) },
          }
        : { ...empty, features: {} },
    );
    setOpen(true);
  };

  const setFeature = (key: string, enabled: boolean) => {
    setForm((current) => ({
      ...current,
      features: { ...current.features, [key]: enabled },
    }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await savePlan(
        {
          ...form,
          price_monthly: Number(form.price_monthly),
          duration_days: Number(form.duration_days),
          invitations_limit: form.invitations_limit ? Number(form.invitations_limit) : null,
          customers_limit: form.customers_limit ? Number(form.customers_limit) : null,
          guests_limit: form.guests_limit ? Number(form.guests_limit) : null,
          storage_limit_mb: form.storage_limit_mb ? Number(form.storage_limit_mb) : null,
          features: form.features,
        },
        editing?.id,
      );
      toast.success("Plano salvo.");
      setOpen(false);
      await qc.invalidateQueries({ queryKey: plansKey });
    } catch {
      toast.error("Não foi possível salvar o plano.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Planos"
        description="Configure limites, recursos e preços disponíveis para as empresas."
        action={
          <Button onClick={() => start()}>
            <Plus className="h-4 w-4" />Novo plano
          </Button>
        }
      />

      {open && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editing ? "Editar plano" : "Novo plano"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {([
                ["code", "Código"],
                ["name", "Nome"],
                ["price_monthly", "Preço mensal"],
                ["duration_days", "Duração em dias"],
                ["invitations_limit", "Limite de convites"],
                ["customers_limit", "Limite de clientes"],
                ["guests_limit", "Limite de convidados"],
                ["storage_limit_mb", "Armazenamento (MB)"],
              ] as [keyof Omit<PlanForm, "description" | "features">, string][]).map(([key, label]) => (
                <div key={key} className="space-y-1.5">
                  <Label htmlFor={key}>{label}</Label>
                  <Input
                    id={key}
                    type={key === "price_monthly" || key.includes("limit") || key === "duration_days" ? "number" : "text"}
                    value={form[key]}
                    onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                    required={key === "code" || key === "name"}
                  />
                </div>
              ))}

              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
              </div>

              <div className="space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-4 sm:col-span-2 lg:col-span-3">
                <div>
                  <p className="text-sm font-semibold">Recursos do plano</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Recursos controlados por feature flag. Recursos desativados não aparecem para as empresas.
                  </p>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {FEATURE_LABELS.map((feature) => (
                    <div key={feature.key} className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/45 p-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium">{feature.label}</p>
                        <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{feature.description}</p>
                      </div>
                      <Switch
                        checked={form.features[feature.key] === true}
                        onCheckedChange={(checked) => setFeature(feature.key, checked)}
                        aria-label={feature.label}
                      />
                    </div>
                  ))}
                </div>
                <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  Flags futuras não exibidas nesta tela continuam preservadas ao editar o plano.
                </p>
              </div>

              <div className="flex gap-2 sm:col-span-2 lg:col-span-3">
                <Button type="submit">Salvar</Button>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {query.isLoading ? (
        <LoadingState />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(query.data ?? []).map((plan) => (
            <Card key={plan.id}>
              <CardHeader className="flex flex-row items-start justify-between gap-3">
                <div>
                  <CardTitle>{plan.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{plan.code}</p>
                </div>
                <StatusBadge status={plan.status} />
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>{plan.description || "Sem descrição."}</p>
                <p className="text-lg font-semibold">
                  {plan.price_monthly.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  <span className="text-xs font-normal text-muted-foreground"> / mês</span>
                </p>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                  <span>Convites: {plan.invitations_limit ?? "Ilimitado"}</span>
                  <span>Clientes: {plan.customers_limit ?? "Ilimitado"}</span>
                  <span>Convidados: {plan.guests_limit ?? "Ilimitado"}</span>
                  <span>Armazenamento: {plan.storage_limit_mb ?? "Ilimitado"} MB</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {FEATURE_LABELS.filter((feature) => plan.features?.[feature.key] === true).map((feature) => (
                    <span key={feature.key} className="rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-[10px] font-medium text-primary">
                      {feature.label}
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => start(plan)}>
                    <Pencil className="h-4 w-4" />Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await setPlanStatus(plan.id, plan.status === "active" ? "inactive" : "active");
                        await qc.invalidateQueries({ queryKey: plansKey });
                        toast.success(plan.status === "active" ? "Plano desativado." : "Plano ativado.");
                      } catch {
                        toast.error("Não foi possível atualizar o status do plano.");
                      }
                    }}
                  >
                    {plan.status === "active" ? "Desativar" : "Ativar"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
