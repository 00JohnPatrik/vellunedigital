import { createFileRoute, Link } from "@tanstack/react-router";
import { SubscriptionOverviewCard } from "@/components/subscription-ui";
import { PageHeader } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette } from "lucide-react";
import { whatsappHref } from "@/lib/nav";
import { isDemoMode } from "@/lib/demo-mode";

export const Route = createFileRoute("/_authenticated/settings")({ component: SettingsPage });
function SettingsPage() {
  const { appUser! } = Route.useRouteContext();
  const companyId = appUser!.company?.id;
  const whatsapp = whatsappHref();
  const demo = isDemoMode();
  return <div><PageHeader title="Configurações" description="Preferências da conta e assinatura da empresa." action={whatsapp ? <Button asChild variant="outline"><a href={whatsapp} target="_blank" rel="noreferrer">Suporte pelo WhatsApp</a></Button> : undefined} /><div className="mt-6 grid max-w-4xl gap-6"><Card><CardHeader><CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" />Marca e identidade</CardTitle><CardDescription>Personalize cores, imagens, contatos e a presença da Vellune.</CardDescription></CardHeader><CardContent><Button asChild variant="outline"><Link to="/settings/brand">Abrir Marca e identidade</Link></Button></CardContent></Card>{demo ? <Card><CardHeader><CardTitle>Assinatura de demonstração</CardTitle><CardDescription>Plano fictício usado apenas neste ambiente de demonstração.</CardDescription></CardHeader><CardContent><p className="text-sm text-muted-foreground">Plano Demo ativo · Convites, clientes e convidados ilimitados para navegação.</p></CardContent></Card> : companyId ? <SubscriptionOverviewCard companyId={companyId} /> : <p className="text-sm text-muted-foreground">A assinatura está disponível apenas para contas vinculadas a uma empresa.</p>}</div></div>;
}
