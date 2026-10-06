import { useState, type CSSProperties } from "react";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitRsvp, type PublicRsvp, type SubmitRsvpResult } from "@/lib/public-invitation.functions";
import { cn } from "@/lib/utils";

const CLOSED = "As confirmações para este evento foram encerradas.";
const FIELD_MSG: Record<string, string> = {
  name: "Informe seu nome.", people: "Informe um número de pessoas válido.", phone: "Telefone inválido.", email: "E-mail inválido.", status: "Escolha uma opção.",
};

type Cfg = Extract<PublicRsvp, { enabled: true }>;

/** Public, login-free RSVP form. Never shows other guests. */
export function RsvpForm({ slug, cfg, title, label, visual = {} }: { slug: string; cfg: Cfg; title?: string | undefined; label?: string | undefined; visual?: Record<string, string> }) {
  const buttonStyle: CSSProperties = {
    backgroundColor: visual["backgroundColor"] || undefined,
    color: visual["textColor"] || undefined,
    borderColor: visual["borderColor"] || undefined,
    borderRadius: visual["radius"] ? `${Number(visual["radius"]) || 0}px` : undefined,
    fontFamily: visual["fontFamily"] || undefined,
    fontSize: visual["fontSize"] ? `${Number(visual["fontSize"]) || 16}px` : undefined,
    fontWeight: visual["fontWeight"] || undefined,
    letterSpacing: visual["letterSpacing"] ? `${Number(visual["letterSpacing"]) || 0}px` : undefined,
    textTransform: visual["textTransform"] as CSSProperties["textTransform"] || undefined,
  };
  const buttonClass = visual["preset"] === "pill" ? "rounded-full" : visual["preset"] === "minimal" ? "rounded-none" : "rounded-lg";
  const send = useServerFn(submitRsvp);
  const [status, setStatus] = useState<"confirmed" | "declined" | null>(null);
  const [name, setName] = useState(""); const [people, setPeople] = useState("1");
  const [phone, setPhone] = useState(""); const [email, setEmail] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [dup, setDup] = useState(false);
  const [done, setDone] = useState<Extract<SubmitRsvpResult, { state: "ok" }> | null>(null);
  const [closed, setClosed] = useState(!cfg.open);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!name.trim()) e["name"] = FIELD_MSG["name"]!;
    if (status === "confirmed") {
      const n = Number(people);
      if (!/^\d+$/.test(people.trim()) || n < 1) e["people"] = "Informe um número inteiro a partir de 1.";
      else if (cfg.max_people && n > cfg.max_people) e["people"] = `O máximo permitido é ${cfg.max_people} ${cfg.max_people === 1 ? "pessoa" : "pessoas"}.`;
    }
    if (cfg.allow_email && email.trim() && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) e["email"] = FIELD_MSG["email"]!;
    if (cfg.allow_phone && phone.trim() && !/^\d{8,15}$/.test(phone.replace(/\D/g, ""))) e["phone"] = FIELD_MSG["phone"]!;
    return e;
  };

  const submit = async (update = false) => {
    if (!status) return;
    const e = validate(); setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const res = await send({ data: { slug, status, name: name.trim(), people: status === "confirmed" ? Number(people) : null, phone: cfg.allow_phone ? phone : "", email: cfg.allow_email ? email : "", update } });
      if (res.state === "ok") { setDone(res); setDup(false); }
      else if (res.state === "duplicate") setDup(true);
      else if (res.state === "closed" || res.state === "unavailable") setClosed(true);
      else if (res.state === "invalid") setErr({ [res.field]: FIELD_MSG[res.field] ?? "Verifique os dados." });
    } catch { setErr({ form: "Não foi possível enviar agora. Tente novamente." }); }
    finally { setBusy(false); }
  };

  if (closed) return <Box><p className="text-sm text-muted-foreground">{CLOSED}</p></Box>;
  if (done) return (
    <Box>
      <CheckCircle2 className="mx-auto h-8 w-8 text-primary" />
      <p className="font-display text-lg">{done.status === "confirmed" ? "Presença confirmada!" : "Presença registrada."}</p>
      {done.status === "confirmed" && <p className="text-sm text-muted-foreground">{done.name} · {done.people} {done.people === 1 ? "pessoa" : "pessoas"}</p>}
      {done.status === "declined" && <p className="text-sm text-muted-foreground">Obrigado por avisar, {done.name}.</p>}
    </Box>
  );

  return (
    <div className="space-y-3 rounded-xl border p-4 text-left" style={{ borderColor: visual["containerBorderColor"] || undefined, backgroundColor: visual["containerBackgroundColor"] || undefined }}>
      <p className="text-center font-display text-lg">{label || "Confirmar presença"}</p>
      {title && <p className="text-center text-sm text-muted-foreground">{title}</p>}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {(["confirmed", "declined"] as const).map((s) => (
          <Button key={s} type="button" size="lg" variant={status === s ? "default" : "outline"} className={cn("h-12 min-w-0", buttonClass)} style={buttonStyle} onClick={() => { setStatus(s); setDup(false); }}>
            {s === "confirmed" ? "Vou comparecer" : "Não poderei comparecer"}
          </Button>
        ))}
      </div>
      {status && (
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); void submit(false); }} noValidate>
          <Field id="rsvp-name" label="Nome" error={err["name"]}><Input id="rsvp-name" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} autoComplete="name" className="h-11" /></Field>
          {status === "confirmed" && (
            <Field id="rsvp-people" label={`Número de pessoas${cfg.max_people ? ` (máx. ${cfg.max_people})` : ""}`} error={err["people"]}>
              <Input id="rsvp-people" type="number" inputMode="numeric" min={1} max={cfg.max_people ?? undefined} step={1} value={people} onChange={(e) => setPeople(e.target.value)} className="h-11" />
            </Field>
          )}
          {cfg.allow_phone && <Field id="rsvp-phone" label="Telefone (opcional)" error={err["phone"]}><Input id="rsvp-phone" type="tel" inputMode="tel" maxLength={30} value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" className="h-11" /></Field>}
          {cfg.allow_email && <Field id="rsvp-email" label="E-mail (opcional)" error={err["email"]}><Input id="rsvp-email" type="email" maxLength={200} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="h-11" /></Field>}
          {err["form"] && <p className="text-sm text-destructive" role="alert">{err["form"]}</p>}
          {dup ? (
            <div className="space-y-2 rounded-md bg-muted p-3 text-sm" role="alert">
              <p>Já encontramos uma confirmação para este contato.</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Button type="button" size="lg" onClick={() => void submit(true)} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Atualizar resposta</Button>
                <Button type="button" size="lg" variant="outline" onClick={() => setDup(false)} disabled={busy}>Cancelar</Button>
              </div>
            </div>
          ) : (
            <Button type="submit" size="lg" className={cn("h-12 w-full", buttonClass)} style={buttonStyle} disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />}Enviar</Button>
          )}
        </form>
      )}
    </div>
  );
}

function Box({ children }: { children: React.ReactNode }) {
  return <div className="space-y-1 rounded-xl border p-5 text-center" role="status">{children}</div>;
}

function Field({ id, label, error, children }: { id: string; label: string; error?: string | undefined; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
