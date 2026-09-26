import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, CalendarDays, CheckCircle2, ClipboardList, Eye, ExternalLink, Search, Users, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getHostDashboard, type HostDashboardResponse } from "@/lib/host-dashboard.functions";

export const Route = createFileRoute("/painel-convite/$token")({
  loader: ({ params }) => getHostDashboard({ data: { token: params.token } }),
  head: () => ({ meta: [{ title: "Painel do anfitrião — Vellune Digital" }, { name: "robots", content: "noindex" }] }),
  component: HostDashboardPage,
});

function HostDashboardPage() {
  const result = Route.useLoaderData();

  if (result.state === "not_found") return <StateMessage title="Painel não encontrado" text="Confira se o link do anfitrião está correto." />;

  return <DashboardContent dashboard={result.dashboard} />;
}

function DashboardContent({ dashboard }: { dashboard: NonNullable<Extract<Awaited<ReturnType<typeof getHostDashboard>>, { state: "ok" }>["dashboard"]> }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "confirmed" | "declined">("all");
  const [copied, setCopied] = useState(false);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return dashboard.responses.filter((response) =>
      (filter === "all" || response.status === filter) &&
      (!term || response.name.toLowerCase().includes(term) || response.email?.toLowerCase().includes(term) || response.phone?.includes(term)),
    );
  }, [dashboard.responses, filter, search]);

  const copyPublicLink = async () => {
    const url = `${window.location.origin}/convite/${dashboard.invitation.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-muted/60 via-background to-muted/30 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl border bg-card p-5 shadow-sm sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Painel do anfitrião</p>
              <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">{dashboard.invitation.name}</h1>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" />{formatDate(dashboard.invitation.event_date)} às {dashboard.invitation.event_time.slice(0, 5)}</span>
                {dashboard.invitation.venue_name && <span>{dashboard.invitation.venue_name}</span>}
                {dashboard.invitation.customer_name && <span>Cliente: {dashboard.invitation.customer_name}</span>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={dashboard.invitation.status === "published" ? "default" : "secondary"}>{dashboard.invitation.status === "published" ? "Publicado" : "Fechado"}</Badge>
              <Button variant="outline" size="sm" asChild>
                <a href={`/convite/${dashboard.invitation.slug}`} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" />Abrir convite</a>
              </Button>
              <Button variant="outline" size="sm" onClick={() => void copyPublicLink()}><ClipboardList className="h-4 w-4" />{copied ? "Link copiado" : "Copiar convite"}</Button>
            </div>
          </div>
          {dashboard.invitation.message && <p className="mt-5 max-w-3xl border-t pt-5 text-sm leading-6 text-muted-foreground">{dashboard.invitation.message}</p>}
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-label="Resumo do convite">
          <Metric icon={Eye} label="Visualizações" value={dashboard.metrics.views} />
          <Metric icon={ClipboardList} label="Respostas" value={dashboard.metrics.responses} />
          <Metric icon={CheckCircle2} label="Confirmados" value={dashboard.metrics.confirmed} />
          <Metric icon={XCircle} label="Recusados" value={dashboard.metrics.declined} />
          <Metric icon={Users} label="Pessoas" value={dashboard.metrics.people} />
        </section>

        <section className="rounded-2xl border bg-card shadow-sm">
          <div className="border-b p-5 sm:p-6">
            <h2 className="font-display text-lg font-semibold">Respostas dos convidados</h2>
            <p className="mt-1 text-sm text-muted-foreground">Acompanhamento somente leitura das confirmações recebidas.</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Buscar por nome, telefone ou e-mail" value={search} onChange={(event) => setSearch(event.target.value)} /></div>
              <div className="flex gap-1 rounded-lg bg-muted/60 p-1">
                {([['all', 'Todas'], ['confirmed', 'Confirmados'], ['declined', 'Recusados']] as const).map(([key, label]) => <button key={key} type="button" onClick={() => setFilter(key)} className={`rounded-md px-3 py-1.5 text-sm transition-colors ${filter === key ? "bg-background font-medium shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>{label}</button>)}
              </div>
            </div>
          </div>
          {rows.length === 0 ? <div className="p-10 text-center"><Search className="mx-auto h-6 w-6 text-muted-foreground" /><p className="mt-3 text-sm font-medium">Nenhuma resposta encontrada</p><p className="mt-1 text-sm text-muted-foreground">Ajuste a busca ou selecione outro filtro.</p></div> : <div className="divide-y">{rows.map((response) => <ResponseRow key={response.id} response={response} />)}</div>}
        </section>
        <p className="text-center text-xs text-muted-foreground">Painel de acompanhamento · Vellune Digital</p>
      </div>
    </main>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Eye; label: string; value: number }) {
  return <div className="rounded-xl border bg-card p-4 shadow-sm"><Icon className="h-4 w-4 text-primary" /><div className="mt-2 text-2xl font-semibold tabular-nums">{value}</div><div className="text-xs text-muted-foreground">{label}</div></div>;
}

function ResponseRow({ response }: { response: HostDashboardResponse }) {
  return <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"><div><p className="font-medium">{response.name}</p><div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">{response.status === "confirmed" && <span>{response.people_count} {response.people_count === 1 ? "pessoa" : "pessoas"}</span>}{response.phone && <span>{response.phone}</span>}{response.email && <span>{response.email}</span>}<span>{formatDateTime(response.updated_at)}</span></div></div><Badge variant={response.status === "confirmed" ? "default" : "secondary"}>{response.status === "confirmed" ? "Confirmado" : "Recusado"}</Badge></div>;
}

function StateMessage({ title, text }: { title: string; text: string }) {
  return <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4"><div className="max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm"><AlertCircle className="mx-auto h-8 w-8 text-muted-foreground" /><h1 className="mt-4 font-display text-xl font-semibold">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{text}</p></div></main>;
}

function formatDate(value: string) { return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR", { dateStyle: "long" }); }
function formatDateTime(value: string) { return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); }
