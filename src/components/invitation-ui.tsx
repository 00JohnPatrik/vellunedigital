import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InvitationCanvas } from "@/components/block-render";
import type { Block } from "@/lib/templates";
import type { EventCtx } from "@/lib/blocks";
import { publicUrl, STATUS_LABEL, type EventValues, type InvitationStatus } from "@/lib/invitations";

export function InvitationStatusBadge({ status }: { status: InvitationStatus }) {
  const variant = status === "published" ? "default" : status === "draft" ? "outline" : "secondary";
  return <Badge variant={variant}>{STATUS_LABEL[status]}</Badge>;
}

export function EventFields({ v, setV, errors }: { v: EventValues; setV: (v: EventValues) => void; errors: Partial<Record<keyof EventValues, string>> }) {
  const f = (k: keyof EventValues, label: string, props: React.ComponentProps<typeof Input> = {}, span = "") => (
    <div className={`space-y-1.5 ${span}`}>
      <Label htmlFor={`ev-${k}`}>{label}</Label>
      <Input id={`ev-${k}`} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} {...props} />
      {errors[k] && <p className="text-xs text-destructive">{errors[k]}</p>}
    </div>
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {f("name", "Nome do evento *", { maxLength: 150 }, "sm:col-span-2")}
      {f("event_date", "Data *", { type: "date" })}
      {f("event_time", "Hora *", { type: "time" })}
      {f("venue_name", "Nome do local", { maxLength: 150 }, "sm:col-span-2")}
      {f("address", "Endereço", { maxLength: 255 }, "sm:col-span-2")}
      {f("city", "Cidade", { maxLength: 100 })}
      {f("state", "UF", { maxLength: 2, placeholder: "SP", className: "uppercase" })}
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="ev-message">Mensagem</Label>
        <Textarea id="ev-message" rows={3} maxLength={2000} value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} />
      </div>
    </div>
  );
}

/** Read-only rendering of the invitation content (same JSON and renderer as the editor). */
export function InvitationRender({ blocks, ctx }: { blocks: Block[]; ctx?: EventCtx }) {
  return <InvitationCanvas blocks={blocks} ctx={ctx} />;
}

export const invitationCtx = (i: { event_date: string; event_time: string; venue_name: string | null; address: string | null; city: string | null; state: string | null; slug: string }, v?: Partial<EventValues>): EventCtx => ({
  event_date: v?.event_date ?? i.event_date, event_time: v?.event_time ?? i.event_time, venue_name: v ? v.venue_name : i.venue_name,
  address: v ? v.address : i.address, city: v ? v.city : i.city, state: v ? v.state?.toUpperCase() : i.state, publicUrl: publicUrl(i.slug),
});
