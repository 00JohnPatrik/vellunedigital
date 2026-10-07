import { createFileRoute } from "@tanstack/react-router";
import { SubscriptionOverviewCard } from "@/components/subscription-ui";
import { PageHeader } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { whatsappHref } from "@/lib/nav";

export const Route = createFileRoute("/_authenticated/dashboard/assinatura")({ component: CompanySubscriptionPage });
function CompanySubscriptionPage() {
  const { appUser } = Route.useRouteContext(); const companyId = appUser!.company?.id; const whatsapp = whatsappHref();
  return <div><PageHeader title="Assinatura" description="Acompanhe seu plano, limites e utilização." action={whatsapp ? <Button asChild variant="outline"><a href={whatsapp} target="_blank" rel="noreferrer">Falar pelo WhatsApp</a></Button> : undefined} />{companyId ? <SubscriptionOverviewCard companyId={companyId} /> : <p className="text-sm text-muted-foreground">Empresa não encontrada.</p>}</div>;
}
