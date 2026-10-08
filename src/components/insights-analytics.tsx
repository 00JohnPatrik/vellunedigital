import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, CheckCircle2, Eye, Users } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { fetchRsvpAnalytics, type ReportRow, totals } from "@/lib/reports";

export function InsightsAnalytics({ rows }: { rows: ReportRow[] }) {
  const rsvp = useQuery({ queryKey: ["reports", "rsvp-analytics"], queryFn: () => fetchRsvpAnalytics(90), staleTime: 60_000 });
  const t = useMemo(() => totals(rows), [rows]);
  const responseRate = t.confirmed + t.declined ? Math.round((t.confirmed / (t.confirmed + t.declined)) * 100) : 0;
  const top = useMemo(() => [...rows].sort((a, b) => (b.views + b.confirmed) - (a.views + a.confirmed)).slice(0, 6).map((row) => ({ name: row.name.length > 18 ? row.name.slice(0, 18) + "…" : row.name, visualizacoes: row.views, confirmados: row.confirmed })), [rows]);
  if (!rows.length && !rsvp.data?.length) return null;

  return (
    <section className="space-y-4" aria-label="Visão geral de desempenho">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <InsightStat icon={Eye} label="Visualizações" value={t.views} caption="somadas nos convites" />
        <InsightStat icon={CheckCircle2} label="Taxa de confirmação" value={responseRate + "%"} caption="entre respostas recebidas" />
        <InsightStat icon={Users} label="Pessoas confirmadas" value={t.people} caption="total de convidados" />
        <InsightStat icon={Activity} label="Respostas recentes" value={rsvp.data?.reduce((sum, day) => sum + day.confirmed + day.declined, 0) ?? 0} caption="nos últimos 90 dias" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[24px] border border-[#2a2b31] bg-[#111318] p-5 sm:p-6">
          <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#d4af37]">Tendência</p><h2 className="mt-1 font-display text-lg font-semibold text-[#F5F7FA]">Respostas ao longo do tempo</h2></div><span className="text-[9px] text-[#7f8795]">últimos 14 dias</span></div>
          <div className="h-56 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={(rsvp.data ?? []).slice(-14)}><CartesianGrid vertical={false} strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fontSize: 10 }} tickLine={false} axisLine={false} /><YAxis allowDecimals={false} width={24} tick={{ fontSize: 10 }} tickLine={false} axisLine={false} /><Tooltip /><Area type="monotone" dataKey="confirmed" name="Confirmados" fillOpacity={0.14} strokeWidth={2} /><Area type="monotone" dataKey="declined" name="Recusas" fillOpacity={0.08} strokeWidth={2} /></AreaChart></ResponsiveContainer></div>
        </div>
        <div className="rounded-[24px] border border-[#2a2b31] bg-[#111318] p-5 sm:p-6">
          <div className="mb-4"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-[#d4af37]">Destaques</p><h2 className="mt-1 font-display text-lg font-semibold text-[#F5F7FA]">Convites em evidência</h2></div>
          <div className="h-56 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={top} layout="vertical" margin={{ left: 4, right: 8, top: 4, bottom: 4 }}><CartesianGrid horizontal={false} strokeDasharray="3 3" /><XAxis type="number" allowDecimals={false} hide /><YAxis type="category" dataKey="name" width={95} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} /><Tooltip /><Bar dataKey="visualizacoes" name="Visualizações" fillOpacity={0.7} radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer></div>
        </div>
      </div>
    </section>
  );
}

function InsightStat({ icon: Icon, label, value, caption }: { icon: typeof Eye; label: string; value: number | string; caption: string }) {
  return <div className="rounded-[20px] border border-[#2a2b31] bg-[#111318] p-4 shadow-[0_18px_55px_-42px_rgba(212,175,55,0.35)]"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#d4af37]/10 text-[#d4af37]"><Icon className="h-4 w-4" /></span><p className="mt-3 text-[10px] uppercase tracking-[0.12em] text-[#7f8795]">{label}</p><p className="mt-1 font-display text-2xl font-semibold tabular-nums text-[#F5F7FA]">{value}</p><p className="mt-1 text-[10px] text-[#8e97a7]">{caption}</p></div>;
}
