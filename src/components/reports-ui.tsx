import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { EmptyState, fmtDate } from "@/components/admin-ui";
import { fmtEventDate, STATUS_LABEL, type InvitationStatus } from "@/lib/invitations";
import type { RecentResponse, ReportRow } from "@/lib/reports";
import { cn } from "@/lib/utils";

export function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="vellune-platform-card vellune-stat-card" aria-label={`${label}: ${value.toLocaleString("pt-BR")}`}>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="vellune-stat-value tabular-nums text-foreground">{value.toLocaleString("pt-BR")}</div>
    </div>
  );
}

export function StatGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{children}</div>;
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function InvStatus({ status }: { status: InvitationStatus }) {
  return <Badge variant={status === "published" ? "default" : "secondary"}>{STATUS_LABEL[status]}</Badge>;
}

export function UpcomingList({ rows }: { rows: ReportRow[] }) {
  if (!rows.length) return <EmptyState>Nenhum evento futuro.</EmptyState>;
  return (
    <div className="vellune-data-surface divide-y">
      {rows.map((r) => (
        <div key={r.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="truncate font-medium">{r.name}</div>
            <div className="text-sm text-muted-foreground">
              {r.customer_name ?? "—"} · {fmtEventDate(r.event_date)} às {r.event_time.slice(0, 5)}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <InvStatus status={r.status} />
            <Link to="/invitations/$id/editor" params={{ id: r.id }} className="text-sm font-medium text-primary hover:underline">Abrir convite</Link>
          </div>
        </div>
      ))}
    </div>
  );
}

export function RecentResponses({ rows }: { rows: RecentResponse[] }) {
  if (!rows.length) return <EmptyState>Nenhuma confirmação encontrada.</EmptyState>;
  return (
    <div className="divide-y rounded-xl border bg-card">
      {rows.map((r) => (
        <div key={r.id} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="truncate font-medium">{r.name}</div>
            <div className="truncate text-sm text-muted-foreground">{r.invitation?.name ?? "—"}</div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Badge variant={r.status === "confirmed" ? "default" : "secondary"}>{r.status === "confirmed" ? "Confirmado" : "Recusado"}</Badge>
            <span className="tabular-nums">{r.people_count} pessoa(s)</span>
            <span className="text-muted-foreground">{fmtDate(r.created_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

type Filter = "all" | "draft" | "published" | "closed";
const FILTERS: [Filter, string][] = [["all", "Todos"], ["draft", "Rascunhos"], ["published", "Publicados"], ["closed", "Fechados"]];

export function ReportTable({ rows }: { rows: ReportRow[] }) {
  const [q, setQ] = useState("");
  const [f, setF] = useState<Filter>("all");
  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => (f === "all" || r.status === f) &&
      (!s || r.name.toLowerCase().includes(s) || (r.customer_name ?? "").toLowerCase().includes(s)));
  }, [rows, q, f]);

  return (
    <div>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar convite ou cliente" className="pl-9" />
        </div>
        <div className="inline-flex flex-wrap rounded-md border bg-card p-0.5" role="group" aria-label="Filtrar relatórios">
          {FILTERS.map(([v, l]) => (
            <button key={v} type="button" onClick={() => setF(v)} aria-pressed={f === v}
              className={cn("rounded px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", f === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>{l}</button>
          ))}
        </div>
      </div>
      {!rows.length ? <EmptyState>Você ainda não possui convites.</EmptyState> : !shown.length ? <EmptyState>Nenhum convite encontrado.</EmptyState> : (
        <>
          <div className="vellune-data-surface hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">Relatório de convites, visualizações e respostas</caption>
              <thead className="border-b bg-muted/30 text-left text-muted-foreground">
                <tr>{["Convite", "Cliente", "Evento", "Status", "Visualizações", "Confirmações", "Recusas", "Pessoas"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {shown.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3">{r.customer_name ?? "—"}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{fmtEventDate(r.event_date)}</td>
                    <td className="px-4 py-3"><InvStatus status={r.status} /></td>
                    <td className="px-4 py-3 tabular-nums">{r.views}</td>
                    <td className="px-4 py-3 tabular-nums">{r.confirmed}</td>
                    <td className="px-4 py-3 tabular-nums">{r.declined}</td>
                    <td className="px-4 py-3 tabular-nums">{r.people}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {shown.map((r) => (
              <div key={r.id} className="vellune-platform-card p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0"><div className="truncate font-medium">{r.name}</div>
                    <div className="text-sm text-muted-foreground">{r.customer_name ?? "—"} · {fmtEventDate(r.event_date)}</div></div>
                  <InvStatus status={r.status} />
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs text-muted-foreground">
                  {([["Visualiz.", r.views], ["Confirm.", r.confirmed], ["Recusas", r.declined], ["Pessoas", r.people]] as const).map(([l, v]) => (
                    <div key={l}><div className="text-base font-semibold text-foreground tabular-nums">{v}</div>{l}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
