import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock3, Link2, Save, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { invitationAutomationKey, formatAutomationDate, getInvitationAutomation, saveInvitationAutomation, type InvitationAutomationSettings } from "@/lib/invitation-automation";

export function InvitationAutomationCard({ invitationId, accessToken }: { invitationId: string; accessToken?: string | null }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: invitationAutomationKey(invitationId),
    queryFn: () => getInvitationAutomation(invitationId),
    staleTime: 30_000,
  });

  const [form, setForm] = useState<InvitationAutomationSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (query.data?.settings) setForm(query.data.settings);
  }, [query.data?.settings]);

  if (query.isLoading) {
    return <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">Carregando automações…</CardContent></Card>;
  }

  if (query.isError || !query.data || !form) {
    return <Card><CardContent className="py-8 text-center text-sm text-destructive">Não foi possível carregar as automações deste convite.</CardContent></Card>;
  }

  const state = query.data.state;
  const portalOpen = Boolean(state.portal_open);
  const autoCloseAt = formatAutomationDate(state.auto_close_at, state.timezone);
  const portalExpiresAt = formatAutomationDate(state.portal_expires_at, state.timezone);
  const publicPortalUrl = accessToken && typeof window !== "undefined"
    ? window.location.origin + "/painel-convite/" + accessToken
    : null;

  const update = <K extends keyof InvitationAutomationSettings>(key: K, value: InvitationAutomationSettings[K]) => {
    setForm((current) => current ? { ...current, [key]: value } : current);
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveInvitationAutomation(invitationId, {
        auto_close_enabled: form.auto_close_enabled,
        auto_close_after_hours: form.auto_close_after_hours,
        client_portal_enabled: form.client_portal_enabled,
        client_portal_hours_after_event: form.client_portal_hours_after_event,
      });
      await qc.invalidateQueries({ queryKey: invitationAutomationKey(invitationId) });
      toast.success("Automações atualizadas.");
    } catch {
      toast.error("Não foi possível salvar as automações.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 via-background to-background">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Automações do convite
        </CardTitle>
        <p className="text-sm text-muted-foreground">Controle o ciclo de vida sem depender de tarefas manuais depois da publicação.</p>
      </CardHeader>
      <CardContent className="space-y-5 p-5 sm:p-6">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold"><Clock3 className="h-4 w-4 text-primary" />Fechar convite automaticamente</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">Depois do evento, o convite passa para Fechado e o RSVP deixa de aceitar novas respostas.</p>
              </div>
              <Switch checked={form.auto_close_enabled} onCheckedChange={(value) => update("auto_close_enabled", value)} aria-label="Fechar convite automaticamente" />
            </div>
            <div className="mt-4 grid gap-2">
              <Label className="text-xs">Tempo após o evento</Label>
              <Select
                value={String(form.auto_close_after_hours)}
                onValueChange={(value) => update("auto_close_after_hours", Number(value) as 6 | 12 | 24)}
                disabled={!form.auto_close_enabled}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 horas</SelectItem>
                  <SelectItem value="12">12 horas</SelectItem>
                  <SelectItem value="24">24 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-3 rounded-lg border border-dashed bg-background/50 p-3 text-xs">
              <span className="text-muted-foreground">Próximo fechamento:</span>
              <span className="ml-1 font-medium">{form.auto_close_enabled ? autoCloseAt : "Desativado"}</span>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/20 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="h-4 w-4 text-primary" />Portal do cliente</div>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">O cliente usa um link seguro, somente leitura, para acompanhar o convite e as confirmações.</p>
              </div>
              <Switch checked={form.client_portal_enabled} onCheckedChange={(value) => update("client_portal_enabled", value)} aria-label="Portal do cliente" />
            </div>
            <div className="mt-4 grid gap-2">
              <Label className="text-xs">Acesso após o evento</Label>
              <Select
                value={String(form.client_portal_hours_after_event)}
                onValueChange={(value) => update("client_portal_hours_after_event", Number(value) as 6 | 12 | 24 | 48)}
                disabled={!form.client_portal_enabled}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="6">6 horas</SelectItem>
                  <SelectItem value="12">12 horas</SelectItem>
                  <SelectItem value="24">24 horas</SelectItem>
                  <SelectItem value="48">48 horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="mt-3 rounded-lg border border-dashed bg-background/50 p-3 text-xs">
              <span className="text-muted-foreground">Acesso:</span>
              <span className="ml-1 font-medium">{form.client_portal_enabled ? (portalOpen ? "Ativo até " + portalExpiresAt : "Expirado ou indisponível") : "Desativado"}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <div>
              <p className="text-sm font-semibold">Como a automação funciona</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">O sistema aplica as regras automaticamente quando o convite é consultado. Não é necessário contratar um servidor de cron para o fechamento básico do convite.</p>
            </div>
          </div>
        </div>

        {publicPortalUrl && (
          <div className="rounded-xl border bg-muted/20 p-4">
            <Label className="text-xs">Link do portal do cliente</Label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <div className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground">
                <span className="block truncate">{publicPortalUrl}</span>
              </div>
              <Button type="button" variant="outline" onClick={async () => {
                try {
                  await navigator.clipboard.writeText(publicPortalUrl);
                  toast.success("Link do portal copiado.");
                } catch {
                  toast.error("Não foi possível copiar o link.");
                }
              }}>
                <Link2 className="h-4 w-4" />Copiar link
              </Button>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button type="button" onClick={() => void save()} disabled={saving}>
            {saving ? <span className="animate-pulse">Salvando…</span> : <><Save className="h-4 w-4" />Salvar automações</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
