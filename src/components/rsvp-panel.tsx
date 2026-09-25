import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { getRsvpConfig, listRsvpResponses, rsvpKey, rsvpStats, saveRsvpConfig, type RsvpConfig } from "@/lib/rsvp";

const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso); const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const fmt = (iso: string) => new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

/** RSVP section of an invitation: config + counters + read-only responses list. */
export function RsvpPanel({ invitationId, open, onOpenChange }: { invitationId: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const cfgQ = useQuery({ queryKey: [...rsvpKey(invitationId), "config"], queryFn: () => getRsvpConfig(invitationId), enabled: open });
  const respQ = useQuery({ queryKey: [...rsvpKey(invitationId), "responses"], queryFn: () => listRsvpResponses(invitationId), enabled: open });
  const [c, setC] = useState<RsvpConfig | null>(null);
  const [deadline, setDeadline] = useState(""); const [max, setMax] = useState("");
  const [err, setErr] = useState(""); const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"all" | "confirmed" | "declined">("all"); const [q, setQ] = useState("");

  useEffect(() => { if (cfgQ.data) { setC(cfgQ.data); setDeadline(toLocal(cfgQ.data.deadline)); setMax(cfgQ.data.max_people ? String(cfgQ.data.max_people) : ""); } }, [cfgQ.data]);

  const stats = rsvpStats(respQ.data ?? []);
  const rows = useMemo(() => (respQ.data ?? []).filter((r) => (filter === "all" || r.status === filter) && r.name.toLowerCase().includes(q.trim().toLowerCase())), [respQ.data, filter, q]);

  const save = async () => {
    if (!c) return;
    setErr("");
    if (max.trim() && (!/^\d+$/.test(max.trim()) || Number(max) < 1 || Number(max) > 1000)) { setErr("Número máximo de pessoas deve ser um inteiro entre 1 e 1000."); return; }
    const dl = deadline ? new Date(deadline) : null;
    if (dl && Number.isNaN(dl.getTime())) { setErr("Data limite inválida."); return; }
    setSaving(true);
    try {
      await saveRsvpConfig(invitationId, { ...c, deadline: dl ? dl.toISOString() : null, max_people: max.trim() ? Number(max) : null });
      toast.success("Configuração do RSVP salva.");
      void qc.invalidateQueries({ queryKey: rsvpKey(invitationId) });
    } catch { toast.error("Não foi possível salvar a configuração."); } finally { setSaving(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader><SheetTitle>RSVP</SheetTitle></SheetHeader>
        {!c ? <div className="py-10 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div> : (
          <div className="mt-4 space-y-6">
            <div className="grid grid-cols-3 gap-2 text-center">
              {[["Confirmações", stats.confirmed], ["Recusas", stats.declined], ["Pessoas confirmadas", stats.people]].map(([l, n]) => (
                <div key={l} className="rounded-lg border p-3"><div className="font-display text-2xl tabular-nums">{n}</div><div className="text-[11px] text-muted-foreground">{l}</div></div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Status: <Badge variant={cfgQ.data?.enabled ? "default" : "secondary"}>{cfgQ.data?.enabled ? "Ativo" : "Inativo"}</Badge>
              {" · "}Prazo: {cfgQ.data?.deadline ? fmt(cfgQ.data.deadline) : "sem prazo"}
              {" · "}Limite: {cfgQ.data?.max_people ? `${cfgQ.data.max_people} por resposta` : "sem limite"}
            </p>

            <section className="space-y-3 rounded-lg border p-4">
              <h3 className="font-medium">Configuração</h3>
              <Toggle label="Ativar confirmações" checked={c.enabled} onChange={(v) => setC({ ...c, enabled: v })} />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5"><Label htmlFor="rsvp-dl">Data limite</Label><Input id="rsvp-dl" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
                <div className="space-y-1.5"><Label htmlFor="rsvp-max">Número máximo de pessoas</Label><Input id="rsvp-max" type="number" min={1} step={1} placeholder="Sem limite" value={max} onChange={(e) => setMax(e.target.value)} /></div>
              </div>
              <Toggle label="Permitir telefone" checked={c.allow_phone} onChange={(v) => setC({ ...c, allow_phone: v })} />
              <Toggle label="Permitir e-mail" checked={c.allow_email} onChange={(v) => setC({ ...c, allow_email: v })} />
              {err && <p className="text-sm text-destructive">{err}</p>}
              <Button onClick={() => void save()} disabled={saving}>{saving && <Loader2 className="h-4 w-4 animate-spin" />}Salvar configuração</Button>
            </section>

            <section className="space-y-3">
              <h3 className="font-medium">Respostas</h3>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input placeholder="Buscar por nome" value={q} onChange={(e) => setQ(e.target.value)} />
                <div className="flex gap-1">
                  {([["all", "Todos"], ["confirmed", "Confirmados"], ["declined", "Recusados"]] as const).map(([k, l]) => (
                    <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>{l}</Button>
                  ))}
                </div>
              </div>
              {respQ.isLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : rows.length === 0
                ? <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma resposta encontrada.</p>
                : <ul className="divide-y rounded-lg border">
                    {rows.map((r) => (
                      <li key={r.id} className="space-y-1 p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium">{r.name}</span>
                          <Badge variant={r.status === "confirmed" ? "default" : "secondary"}>{r.status === "confirmed" ? "Confirmado" : "Recusado"}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                          {r.status === "confirmed" && <span>{r.people_count} {r.people_count === 1 ? "pessoa" : "pessoas"}</span>}
                          {r.phone && <span>{r.phone}</span>}{r.email && <span>{r.email}</span>}
                          <span>{fmt(r.updated_at)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>}
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return <label className="flex items-center justify-between gap-3 text-sm"><span>{label}</span><Switch checked={checked} onCheckedChange={onChange} /></label>;
}
