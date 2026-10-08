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
  const [invitations, customers, guests, filesResult] = await Promise.all([
    count("invitations", companyId),
    count("customers", companyId),
    count("invitation_guests", companyId),
    supabase.from("files").select("size").eq("company_id", companyId),
  ]);
  if (filesResult.error) throw filesResult.error;
  const sizes = (filesResult.data ?? []) as { size: number }[];
  return { invitations, customers, guests, files: sizes.length, storageBytes: sizes.reduce((sum, file) => sum + Number(file.size || 0), 0) };
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
  const overview = await getSubscriptionOverview(companyId);
  return isSubscriptionUsable(overview) && planHasFeature(overview.plan, feature);
}

export function limitReached(value: number, limit: number | null | undefined) {
  return limit != null && value >= limit;
}

export const formatStorage = (bytes: number) => bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
export const formatMoney = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
