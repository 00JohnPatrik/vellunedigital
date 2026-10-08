import { createFileRoute } from "@tanstack/react-router";
import { PlanCatalog, SubscriptionOverviewCard } from "@/components/subscription-ui";
import { PageHeader } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { whatsappHref } from "@/lib/nav";

export const Route = createFileRoute("/_authenticated/dashboard/assinatura")({ component: CompanySubscriptionPage });
function CompanySubscriptionPage() {
  const { appUser } = Route.useRouteContext(); const companyId = appUser!.company?.id; const whatsapp = whatsappHref();
  return <div className="space-y-6"><PageHeader title="Assinatura" description="Acompanhe seu plano, limites, utilização e próximos upgrades." action={whatsapp ? <Button asChild variant="outline"><a href={whatsapp} target="_blank" rel="noreferrer">Suporte pelo WhatsApp</a></Button> : undefined} />{companyId ? <><SubscriptionOverviewCard companyId={companyId} /><PlanCatalog companyId={companyId} /></> : <p className="text-sm text-muted-foreground">Empresa não encontrada.</p>}</div>;
}
