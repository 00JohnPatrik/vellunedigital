import { createFileRoute } from "@tanstack/react-router";
import { SubscriptionOverviewCard } from "@/components/subscription-ui";
import { PageHeader } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { whatsappHref } from "@/lib/nav";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });
function SettingsPage() {
  const { appUser } = Route.useRouteContext(); const companyId = appUser.company?.id; const whatsapp = whatsappHref();
  return <div><PageHeader title="Configurações" description="Preferências da conta e assinatura da empresa." action={whatsapp ? <Button asChild variant="outline"><a href={whatsapp} target="_blank" rel="noreferrer">Suporte pelo WhatsApp</a></Button> : undefined} /><section className="mt-6 max-w-4xl">{companyId ? <SubscriptionOverviewCard companyId={companyId} /> : <p className="text-sm text-muted-foreground">A assinatura está disponível apenas para contas vinculadas a uma empresa.</p>}</section></div>;
}
