import { supabase as typedSupabase } from "@/integrations/supabase/client";
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- tables newer than generated types
const supabase = typedSupabase as any;

export type SubscriptionPlan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price_monthly: number;
  duration_days: number;
  invitations_limit: number | null;
  customers_limit: number | null;
  guests_limit: number | null;
  storage_limit_mb: number | null;
  premium_templates_limit: number | null;
  features: Record<string, unknown>;
  status: "active" | "inactive";
  created_at: string;
  updated_at: string;
};

export type CompanySubscription = {
  id: string;
  company_id: string;
  plan_id: string;
  status: string;
  starts_at: string;
  expires_at: string | null;
  activated_at: string | null;
  cancelled_at: string | null;
  suspended_at: string | null;
  notes: string | null;
  changed_by: string | null;
  created_at: string;
  updated_at: string;
  plan?: SubscriptionPlan | null;
  company?: { id: string; name: string } | null;
};

export type SubscriptionUsage = {
  invitations: number;
  customers: number;
  guests: number;
  files: number;
  storageBytes: number;
};

export type SubscriptionOverview = {
  subscription: CompanySubscription | null;
  plan: SubscriptionPlan | null;
  usage: SubscriptionUsage;
};

export type SubscriptionLifecycle = {
  state: "missing" | "active" | "expiring" | "expired" | "suspended" | "cancelled";
  daysRemaining: number | null;
};

export type CompanySubscriptionHistoryItem = {
  id: string;
  company_id: string;
  subscription_id: string;
  action: string;
  from_status: string | null;
  to_status: string | null;
  from_plan_id: string | null;
  to_plan_id: string | null;
  from_expires_at: string | null;
  to_expires_at: string | null;
  notes: string | null;
  changed_by: string | null;
  created_at: string;
  company?: { id: string; name: string } | null;
  from_plan?: SubscriptionPlan | null;
  to_plan?: SubscriptionPlan | null;
  changed_by_user?: { id: string; name: string } | null;
};

export const plansKey = ["subscriptions", "plans"] as const;
export const subscriptionKey = (companyId: string) => ["subscriptions", companyId] as const;

export async function listPlans(includeInactive = true): Promise<SubscriptionPlan[]> {
  let query = supabase.from("subscription_plans").select("*").order("price_monthly");
  if (!includeInactive) query = query.eq("status", "active");
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as SubscriptionPlan[];
}

export async function getPlan(id: string): Promise<SubscriptionPlan | null> {
  const { data, error } = await supabase.from("subscription_plans").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as SubscriptionPlan | null;
}

export async function savePlan(values: Partial<SubscriptionPlan> & Pick<SubscriptionPlan, "code" | "name">, id?: string) {
  const payload = {
    code: values.code,
    name: values.name,
    description: values.description ?? null,
    price_monthly: Number(values.price_monthly ?? 0),
    duration_days: Number(values.duration_days ?? 30),
    invitations_limit: values.invitations_limit == null ? null : Number(values.invitations_limit),
    customers_limit: values.customers_limit == null ? null : Number(values.customers_limit),
    guests_limit: values.guests_limit == null ? null : Number(values.guests_limit),
    storage_limit_mb: values.storage_limit_mb == null ? null : Number(values.storage_limit_mb),
    premium_templates_limit: values.premium_templates_limit == null ? null : Number(values.premium_templates_limit),
    features: values.features ?? {},
    status: values.status ?? "active",
  };
  const result = id
    ? await supabase.from("subscription_plans").update(payload).eq("id", id)
    : await supabase.from("subscription_plans").insert(payload);
  if (result.error) throw result.error;
}

export async function setPlanStatus(id: string, status: "active" | "inactive") {
  const { error } = await supabase.from("subscription_plans").update({ status }).eq("id", id);
  if (error) throw error;
}

export async function listCompanySubscriptions(): Promise<CompanySubscription[]> {
  const [{ data: subscriptions, error }, { data: companies, error: companiesError }, { data: plans, error: plansError }] = await Promise.all([
    supabase.from("company_subscriptions").select("*").order("created_at", { ascending: false }),
    supabase.from("companies").select("id, name").is("deleted_at", null).order("name"),
    supabase.from("subscription_plans").select("*").order("name"),
  ]);
  if (error) throw error;
  if (companiesError) throw companiesError;
  if (plansError) throw plansError;
  const companyMap = new Map<string, { id: string; name: string }>((companies ?? []).map((company: { id: string; name: string }) => [company.id, company]));
  const planMap = new Map<string, SubscriptionPlan>((plans ?? []).map((plan: SubscriptionPlan) => [plan.id, plan as SubscriptionPlan]));
  return ((subscriptions ?? []) as CompanySubscription[]).map((subscription) => ({
    ...subscription,
    company: companyMap.get(subscription.company_id) ?? null,
    plan: planMap.get(subscription.plan_id) ?? null,
  }));
}

export async function saveCompanySubscription(values: {
  company_id: string;
  plan_id: string;
  status?: string;
  starts_at?: string;
  expires_at?: string | null;
  notes?: string | null;
}, id?: string) {
  const payload = {
    company_id: values.company_id,
    plan_id: values.plan_id,
    status: values.status ?? "active",
    starts_at: values.starts_at || new Date().toISOString(),
    expires_at: values.expires_at || null,
    notes: values.notes || null,
    activated_at: values.status === "active" || !values.status ? new Date().toISOString() : null,
  };
  const result = id
    ? await supabase.from("company_subscriptions").update(payload).eq("id", id)
    : await supabase.from("company_subscriptions").insert(payload);
  if (result.error) throw result.error;
}

export async function updateSubscriptionStatus(id: string, status: string) {
  const values: Record<string, string | null> = { status };
  if (status === "active") values["activated_at"] = new Date().toISOString();
  if (status === "suspended") values["suspended_at"] = new Date().toISOString();
  if (status === "cancelled") values["cancelled_at"] = new Date().toISOString();
  const { error } = await supabase.from("company_subscriptions").update(values).eq("id", id);
  if (error) throw error;
}

async function count(table: string, companyId: string, column = "id") {
  const { count: total, error } = await supabase.from(table).select(column, { count: "exact", head: true }).eq("company_id", companyId);
  if (error) throw error;
  return total ?? 0;
}

export async function getSubscriptionUsage(companyId: string): Promise<SubscriptionUsage> {
  const [{ count: invitations, error: invitationsError }, { count: customers, error: customersError }, { count: guests, error: guestsError }, filesResult] = await Promise.all([
    supabase
      .from("invitations")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .neq("status", "deleted")
      .is("deleted_at", null),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "active")
      .is("deleted_at", null),
    supabase
      .from("invitation_guests")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("status", "active")
      .is("deleted_at", null),
    supabase.from("files").select("size").eq("company_id", companyId),
  ]);

  if (invitationsError) throw invitationsError;
  if (customersError) throw customersError;
  if (guestsError) throw guestsError;
  if (filesResult.error) throw filesResult.error;

  const sizes = (filesResult.data ?? []) as { size: number }[];
  return {
    invitations: invitations ?? 0,
    customers: customers ?? 0,
    guests: guests ?? 0,
    files: sizes.length,
    storageBytes: sizes.reduce((sum, file) => sum + Number(file.size || 0), 0),
  };
}

export async function getSubscriptionOverview(companyId: string): Promise<SubscriptionOverview> {
  const [{ data: subscription, error }, usage] = await Promise.all([
    supabase.from("company_subscriptions").select("*").eq("company_id", companyId).in("status", ["active", "suspended"]).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    getSubscriptionUsage(companyId),
  ]);
  if (error) throw error;
  let plan: SubscriptionPlan | null = null;
  if (subscription?.plan_id) plan = await getPlan(subscription.plan_id);
  return { subscription: subscription as CompanySubscription | null, plan, usage };
}

export function isSubscriptionUsable(overview: SubscriptionOverview) {
  if (!overview.subscription || !overview.plan) return false;
  if (overview.subscription.status !== "active") return false;
  return !overview.subscription.expires_at || new Date(overview.subscription.expires_at) >= new Date();
}

export function planHasFeature(plan: SubscriptionPlan | null | undefined, feature: string) {
  return Boolean(plan?.features && plan.features[feature] === true);
}

export async function companyHasFeature(companyId: string, feature: string) {
  // Feature checks run frequently (for example when opening the editor), so
  // do not load usage counters or storage just to decide whether a flag is enabled.
  const { data: subscription, error } = await supabase
    .from("company_subscriptions")
    .select("status, expires_at, plan_id")
    .eq("company_id", companyId)
    .in("status", ["active", "suspended"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!subscription || subscription.status !== "active") return false;
  if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) return false;
  const plan = await getPlan(subscription.plan_id);
  return planHasFeature(plan, feature);
}

export function limitReached(value: number, limit: number | null | undefined) {
  return limit != null && value >= limit;
}

export const formatStorage = (bytes: number) => bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
export const formatMoney = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function subscriptionLimitErrorMessage(error: unknown): string | null {
  const err = error as { code?: string; message?: string } | null;
  if (err?.code !== "P0001") return null;
  const raw = err.message ?? "";
  if (/armazenamento/i.test(raw)) return "O limite de armazenamento do seu plano foi atingido. Revise seu plano para continuar enviando arquivos.";
  const match = raw.match(/Limite do plano atingido:\s*(clientes|convites|convidados)\s*\((\d+)\s+de\s+(\d+)\)/i);
  if (match) return `O limite de ${match[1]} do seu plano foi atingido (${match[2]} de ${match[3]}). Revise seu plano para continuar.`;
  return "Um limite do seu plano foi atingido. Revise seu plano para continuar.";
}


export function getSubscriptionLifecycle(overview: SubscriptionOverview): SubscriptionLifecycle {
  if (!overview.subscription || !overview.plan) return { state: "missing", daysRemaining: null };

  const status = overview.subscription.status;
  if (status === "cancelled") return { state: "cancelled", daysRemaining: null };
  if (status === "suspended") return { state: "suspended", daysRemaining: null };

  if (!overview.subscription.expires_at) return { state: "active", daysRemaining: null };

  const diff = new Date(overview.subscription.expires_at).getTime() - Date.now();
  const daysRemaining = Math.ceil(diff / 86_400_000);
  if (daysRemaining <= 0) return { state: "expired", daysRemaining: 0 };
  if (daysRemaining <= 7) return { state: "expiring", daysRemaining };
  return { state: "active", daysRemaining };
}

export async function listCompanySubscriptionHistory(
  limit = 100,
  subscriptionId?: string,
): Promise<CompanySubscriptionHistoryItem[]> {
  let historyQuery = supabase
    .from("company_subscription_history")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (subscriptionId) historyQuery = historyQuery.eq("subscription_id", subscriptionId);

  const { data, error } = await historyQuery;
  if (error) throw error;

  const rows = (data ?? []) as CompanySubscriptionHistoryItem[];
  if (rows.length === 0) return [];

  const companyIds = [...new Set(rows.map((row) => row.company_id))];
  const planIds = [...new Set(rows.flatMap((row) => [row.from_plan_id, row.to_plan_id]).filter(Boolean))] as string[];
  const userIds = [...new Set(rows.map((row) => row.changed_by).filter(Boolean))] as string[];

  const [{ data: companies, error: companiesError }, { data: plans, error: plansError }, { data: users, error: usersError }] = await Promise.all([
    supabase.from("companies").select("id, name").in("id", companyIds),
    planIds.length ? supabase.from("subscription_plans").select("*").in("id", planIds) : Promise.resolve({ data: [], error: null }),
    userIds.length ? supabase.from("users").select("id, name").in("id", userIds) : Promise.resolve({ data: [], error: null }),
  ]);

  if (companiesError) throw companiesError;
  if (plansError) throw plansError;
  if (usersError) throw usersError;

  const companyRows = (companies ?? []) as { id: string; name: string }[];
  const planRows = (plans ?? []) as SubscriptionPlan[];
  const userRows = (users ?? []) as { id: string; name: string }[];
  const companyMap = new Map<string, { id: string; name: string }>(companyRows.map((company) => [company.id, company]));
  const planMap = new Map<string, SubscriptionPlan>(planRows.map((plan) => [plan.id, plan]));
  const userMap = new Map<string, { id: string; name: string }>(userRows.map((user) => [user.id, user]));

  return rows.map((row) => ({
    ...row,
    company: companyMap.get(row.company_id) ?? null,
    from_plan: row.from_plan_id ? planMap.get(row.from_plan_id) ?? null : null,
    to_plan: row.to_plan_id ? planMap.get(row.to_plan_id) ?? null : null,
    changed_by_user: row.changed_by ? userMap.get(row.changed_by) ?? null : null,
  }));
}

export const subscriptionHistoryActionLabel: Record<string, string> = {
  created: "Assinatura criada",
  activated: "Assinatura ativada",
  suspended: "Assinatura suspensa",
  cancelled: "Assinatura cancelada",
  plan_changed: "Plano alterado",
  renewed: "Assinatura renovada",
  expiration_changed: "Vencimento alterado",
  start_changed: "Início alterado",
  status_changed: "Status alterado",
};
