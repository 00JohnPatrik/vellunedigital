import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { AlertTriangle, CalendarDays, Clock, MapPin, MessageCircle, Navigation } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { PreviewImage } from "@/components/template-ui";
import { BLOCKS, type Block } from "@/lib/templates";
import { fontCss, formatDate, formatTime, isKnownType, pick, type EventCtx } from "@/lib/blocks";
import { cn } from "@/lib/utils";

const ALIGN: Record<string, string> = { left: "justify-start text-left", center: "justify-center text-center", right: "justify-end text-right" };
const WIDTH: Record<string, string> = { auto: "w-auto max-w-full", partial: "w-full sm:w-2/3", full: "w-full" };
const TEXT_SIZE: Record<string, string> = { sm: "text-sm", md: "text-base", lg: "text-xl", xl: "text-3xl", "2xl": "text-4xl" };
const IMG_HEIGHT: Record<string, string> = { auto: "", square: "aspect-square", wide: "aspect-video", portrait: "aspect-[4/5]" };
const IMG_POS: Record<string, string> = { center: "object-center", top: "object-top", bottom: "object-bottom" };
const BTN_STYLE: Record<string, string> = {
  solid: "bg-primary text-primary-foreground",
  outline: "border border-primary text-primary",
  soft: "bg-secondary text-secondary-foreground",
};

function Row({ align = "center", children }: { align?: string | undefined; children: ReactNode }) {
  return <div className={cn("flex w-full", ALIGN[align] ?? ALIGN["center"])}>{children}</div>;
}

function Btn({ p, fallback, href, interactive, icon }: { p: Record<string, string>; fallback: string; href?: string | null; interactive: boolean; icon?: ReactNode }) {
  const cls = cn("inline-flex items-center justify-center gap-2 rounded-md px-5 py-2.5 text-sm font-medium", BTN_STYLE[p["style"] ?? "solid"] ?? BTN_STYLE["solid"], WIDTH[p["width"] ?? "auto"]);
  const body = <>{icon}{p["label"] || fallback}</>;
  return (
    <Row align={p["align"]}>
      {interactive && href ? <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{body}</a> : <span className={cls}>{body}</span>}
    </Row>
  );
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (!active) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [active]);
  return now;
}

function Countdown({ p, ctx }: { p: Record<string, string>; ctx?: EventCtx }) {
  const eventTarget = ctx?.event_date ? `${ctx.event_date}T${(ctx.event_time ?? "00:00").slice(0, 5)}` : null;
  const target = pick(p, p["target"], eventTarget);
  const t = target ? new Date(target).getTime() : NaN;
  const now = useNow(!Number.isNaN(t));
  const diff = Number.isNaN(t) ? null : Math.max(0, t - now);
  const parts = diff === null ? null : [
    [Math.floor(diff / 86400000), "dias"], [Math.floor(diff / 3600000) % 24, "horas"],
    [Math.floor(diff / 60000) % 60, "min"], [Math.floor(diff / 1000) % 60, "seg"],
  ] as const;
  return (
    <div className={cn("space-y-2", ALIGN[p["align"] ?? "center"])}>
      {p["title"] && <p className="text-sm text-muted-foreground">{p["title"]}</p>}
      <Row align={p["align"]}>
        <div className="flex gap-2">
          {(parts ?? [["–", "dias"], ["–", "horas"], ["–", "min"], ["–", "seg"]]).map(([n, l]) => (
            <div key={l} className="min-w-14 rounded-md border px-2 py-1.5 text-center">
              <div className="font-display text-xl tabular-nums">{n}</div><div className="text-[10px] uppercase text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </Row>
      {!parts && <p className="text-xs text-muted-foreground">Defina a data do evento.</p>}
    </div>
  );
}

/** Renders one block. The exact same JSON is used by the editor canvas and every preview. */
export function BlockView({ block, ctx, interactive = false }: { block: Block; ctx?: EventCtx; interactive?: boolean }) {
  const p = block.props ?? {};
  if (!isKnownType(block.type)) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-destructive/50 p-3 text-left text-sm text-destructive">
        <AlertTriangle className="h-4 w-4 shrink-0" />Bloco desconhecido ("{String(block.type)}"). Selecione para corrigir.
      </div>
    );
  }
  switch (block.type) {
    case "text": {
      const style: CSSProperties = { fontFamily: fontCss(p["font"]), color: p["color"] || undefined };
      return (
        <Row align={p["align"]}>
          <p style={style} className={cn("whitespace-pre-line break-words", TEXT_SIZE[p["size"] ?? "lg"], p["bold"] === "1" && "font-bold", WIDTH[p["width"] ?? "full"])}>{p["text"]}</p>
        </Row>
      );
    }
    case "image": {
      const w = p["width"] === "auto" ? "w-full sm:w-1/2" : WIDTH[p["width"] ?? "full"];
      return (
        <Row align={p["align"]}>
          <div className={cn("overflow-hidden rounded-lg", w)}>
            {p["height"] === "auto" && p["url"]
              ? <img src={p["url"]} alt={p["alt"] ?? ""} className="h-auto w-full" loading="lazy" />
              : <PreviewImage src={p["url"] || null} name={p["alt"] ?? ""} className={cn(IMG_HEIGHT[p["height"] ?? "wide"] || "aspect-video", IMG_POS[p["position"] ?? "center"])} />}
          </div>
        </Row>
      );
    }
    case "date": {
      const d = formatDate(pick(p, p["date"], ctx?.event_date), p["format"]);
      return <Info align={p["align"]} label={p["label"]} icon={<CalendarDays className="h-4 w-4" />}>{d ?? "Data a definir"}</Info>;
    }
    case "time": {
      const t = formatTime(pick(p, p["time"], ctx?.event_time), p["format"]);
      return <Info align={p["align"]} label={p["label"]} icon={<Clock className="h-4 w-4" />}>{t ?? "Horário a definir"}</Info>;
    }
    case "location": {
      const custom = p["source"] === "custom";
      const name = custom ? p["name"] : ctx?.venue_name || p["name"];
      const address = custom ? p["address"] : ctx?.address || p["address"];
      const city = custom ? "" : [ctx?.city, ctx?.state].filter(Boolean).join(" - ");
      return (
        <div className={cn("space-y-1", ALIGN[p["align"] ?? "center"])}>
          {p["show_name"] !== "0" && <Row align={p["align"]}><span className="flex items-center gap-2 font-medium"><MapPin className="h-4 w-4" />{name || "Local a definir"}</span></Row>}
          {p["show_address"] !== "0" && address && <p className="text-sm text-muted-foreground">{address}</p>}
          {p["show_city"] !== "0" && city && <p className="text-sm text-muted-foreground">{city}</p>}
          {p["show_directions"] !== "0" && (
            <Row align={p["align"]}><span className="mt-1 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs"><Navigation className="h-3.5 w-3.5" />Como chegar</span></Row>
          )}
        </div>
      );
    }
    case "countdown": return <Countdown p={p} ctx={ctx} />;
    case "rsvp":
      return (
        <div className="space-y-2">
          {p["title"] && <p className={cn("text-sm text-muted-foreground", ALIGN[p["align"] ?? "center"])}>{p["title"]}</p>}
          <Btn p={p} fallback={BLOCKS.rsvp.label} interactive={false} />
        </div>
      );
    case "whatsapp": return <Btn p={p} fallback="WhatsApp" interactive={false} icon={<MessageCircle className="h-4 w-4" />} />;
    case "button": return <Btn p={p} fallback="Botão" href={/^https?:\/\//i.test(p["url"] ?? "") ? p["url"] : null} interactive={interactive} />;
    case "qr_code": {
      const size = p["size"] === "sm" ? 96 : p["size"] === "lg" ? 176 : 128;
      const value = p["value"] || ctx?.publicUrl || "https://convitely.app/convite/previa";
      return (
        <div className="space-y-1">
          <Row align={p["align"]}><div className="rounded-md bg-card p-2"><QRCodeSVG value={value} size={size} bgColor="transparent" fgColor="currentColor" /></div></Row>
          {!p["value"] && <p className={cn("text-[11px] text-muted-foreground", ALIGN[p["align"] ?? "center"])}>Prévia — usará o link público do convite.</p>}
        </div>
      );
    }
    case "divider": {
      const style: CSSProperties = { borderTopWidth: `${Number(p["thickness"]) || 1}px`, borderTopStyle: (p["style"] as CSSProperties["borderTopStyle"]) || "solid" };
      return <Row align={p["align"]}><hr style={style} className={cn("border-0 border-border", p["width"] === "auto" ? "w-1/3" : WIDTH[p["width"] ?? "full"])} /></Row>;
    }
  }
}

function Info({ align = "center", label, icon, children }: { align?: string | undefined; label?: string | undefined; icon: ReactNode; children: ReactNode }) {
  return (
    <div className={cn("space-y-0.5", ALIGN[align])}>
      {label && <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>}
      <Row align={align}><span className="flex items-center gap-2 text-base">{icon}{children}</span></Row>
    </div>
  );
}

/** Read-only rendering of a whole invitation (hidden blocks are skipped). */
export function InvitationCanvas({ blocks, ctx, className }: { blocks: Block[]; ctx?: EventCtx; className?: string }) {
  const visible = blocks.filter((b) => !b.hidden);
  return (
    <div className={cn("mx-auto flex w-full max-w-md flex-col gap-5 rounded-2xl border bg-card p-6 shadow-sm", className)}>
      {visible.length ? visible.map((b) => <BlockView key={b.id} block={b} ctx={ctx} interactive />)
        : <p className="py-10 text-center text-sm text-muted-foreground">Este convite ainda não possui blocos.</p>}
    </div>
  );
}
