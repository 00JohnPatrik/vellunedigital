import { CalendarDays, Clock, MapPin, MessageCircle, QrCode, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PreviewImage } from "@/components/template-ui";
import { BLOCKS, type Block } from "@/lib/templates";
import { fmtEventDate, STATUS_LABEL, type EventValues, type InvitationStatus } from "@/lib/invitations";

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

function daysUntil(target: string) {
  const t = new Date(target).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.ceil((t - Date.now()) / 86400000));
}

/** Simplified visual rendering of the invitation content (no RSVP/WhatsApp/QR functionality yet). */
export function InvitationRender({ blocks }: { blocks: Block[] }) {
  if (!blocks.length) return <p className="py-10 text-center text-sm text-muted-foreground">Este convite ainda não possui blocos.</p>;
  return (
    <div className="mx-auto flex max-w-md flex-col gap-5 rounded-2xl border bg-card p-6 text-center shadow-sm">
      {blocks.map((b) => {
        const p = b.props ?? {};
        switch (b.type) {
          case "text": return <p key={b.id} className="whitespace-pre-line font-display text-xl">{p["text"]}</p>;
          case "image": return <PreviewImage key={b.id} src={p["url"] || null} name={p["alt"] ?? ""} className="aspect-video rounded-lg" />;
          case "date": return <Line key={b.id} icon={<CalendarDays className="h-4 w-4" />}>{p["date"] ? fmtEventDate(p["date"]) : "Data a definir"}</Line>;
          case "time": return <Line key={b.id} icon={<Clock className="h-4 w-4" />}>{p["time"] || "Horário a definir"}</Line>;
          case "location": return (
            <div key={b.id} className="space-y-0.5"><Line icon={<MapPin className="h-4 w-4" />}>{p["name"] || "Local a definir"}</Line>
              {p["address"] && <p className="text-sm text-muted-foreground">{p["address"]}</p>}</div>
          );
          case "countdown": {
            const d = p["target"] ? daysUntil(p["target"]) : null;
            return <Line key={b.id} icon={<Timer className="h-4 w-4" />}>{d === null ? "Contagem regressiva" : `Faltam ${d} dia${d === 1 ? "" : "s"}`}</Line>;
          }
          case "rsvp": case "button":
            return <div key={b.id} className="rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">{p["label"] || BLOCKS[b.type].label}</div>;
          case "whatsapp": return <Line key={b.id} icon={<MessageCircle className="h-4 w-4" />}>{p["phone"] ? `WhatsApp ${p["phone"]}` : "WhatsApp"}</Line>;
          case "qr_code": return <div key={b.id} className="mx-auto flex h-24 w-24 items-center justify-center rounded-md border border-dashed text-muted-foreground"><QrCode className="h-8 w-8" /></div>;
          case "divider": return <hr key={b.id} />;
          default: return null;
        }
      })}
    </div>
  );
}

function Line({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="flex items-center justify-center gap-2 text-sm">{icon}<span>{children}</span></div>;
}
