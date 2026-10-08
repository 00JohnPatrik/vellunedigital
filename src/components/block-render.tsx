import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AlertTriangle, CalendarDays, ChevronLeft, ChevronRight, Clock, Maximize2, MapPin, MessageCircle, Navigation, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { RsvpForm } from "@/components/rsvp-form";
import { BLOCKS, getBlockGeometry, type Background, type Block } from "@/lib/templates";
import { fontCss, formatDate, formatTime, isKnownType, pick, type EventCtx } from "@/lib/blocks";
import { cn } from "@/lib/utils";
import { useAssetUrl } from "@/lib/assets";
import { animationStyle, normalizeAnimation, parallaxStyle, requestMotionPermission, useMotionOffset } from "@/lib/invitation-editor-animation";

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

function MediaFallback({ name = "Imagem" }: { name?: string }) {
  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-dashed bg-muted px-4 text-center text-xs text-muted-foreground">
      {name || "Imagem indisponível"}
    </div>
  );
}

function Row({ align = "center", children }: { align?: string | undefined; children: ReactNode }) {
  return <div className={cn("flex w-full", ALIGN[align] ?? ALIGN["center"])}>{children}</div>;
}

function Btn({ p, fallback, href, interactive, icon }: { p: Record<string, string>; fallback: string; href?: string | null | undefined; interactive: boolean; icon?: ReactNode }) {
  const preset = p["preset"] || "classic";
  const presetClass = preset === "pill" ? "rounded-full" : preset === "minimal" ? "rounded-none border-x-0 border-t-0" : preset === "square" ? "rounded-md" : "rounded-lg";
  const visual: CSSProperties = {
    color: p["textColor"] || undefined,
    backgroundColor: p["backgroundColor"] || undefined,
    borderColor: p["borderColor"] || undefined,
    borderWidth: p["borderWidth"] ? `${Math.max(0, Math.min(12, Number(p["borderWidth"]))) || 0}px` : undefined,
    borderStyle: p["borderWidth"] && p["borderStyle"] ? p["borderStyle"] as CSSProperties["borderStyle"] : undefined,
    borderRadius: p["radius"] ? `${Math.max(0, Math.min(999, Number(p["radius"]))) || 0}px` : undefined,
    fontFamily: p["fontFamily"] || undefined,
    fontSize: p["fontSize"] ? `${Math.max(8, Math.min(96, Number(p["fontSize"]))) || 16}px` : undefined,
    fontWeight: p["fontWeight"] || undefined,
    letterSpacing: p["letterSpacing"] ? `${Number(p["letterSpacing"]) || 0}px` : undefined,
    lineHeight: p["lineHeight"] ? Number(p["lineHeight"]) || undefined : undefined,
    paddingInline: p["paddingX"] ? `${Math.max(0, Math.min(80, Number(p["paddingX"]))) || 0}px` : undefined,
    paddingBlock: p["paddingY"] ? `${Math.max(0, Math.min(48, Number(p["paddingY"]))) || 0}px` : undefined,
    minHeight: p["minHeight"] ? `${Math.max(24, Math.min(160, Number(p["minHeight"]))) || 48}px` : undefined,
    textTransform: p["textTransform"] as CSSProperties["textTransform"] || undefined,
    boxShadow: p["shadow"] === "soft" ? "0 6px 18px rgb(15 23 42 / .14)" : p["shadow"] === "strong" ? "0 12px 28px rgb(15 23 42 / .24)" : undefined,
  };
  const cls = cn("inline-flex min-w-0 max-w-full items-center justify-center gap-2 px-5 py-2.5 text-center text-sm font-medium transition-colors hover:brightness-95", presetClass, BTN_STYLE[p["style"] ?? "solid"] ?? BTN_STYLE["solid"], WIDTH[p["width"] ?? "auto"]);
  const body = <>{icon}{p["label"] || fallback}</>;
  return (
    <Row align={p["align"]}>
      {interactive && href ? <a href={href} target="_blank" rel="noopener noreferrer" className={cls} style={visual}>{body}</a> : <span className={cls} style={visual}>{body}</span>}
    </Row>
  );
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (!active) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [active]);
  return now;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return reduced;
}

function useBlockAnimation(animationValue: unknown, selected: boolean, index: number) {
  const animation = normalizeAnimation(animationValue);
  const reducedMotion = useReducedMotion();
  const [playing, setPlaying] = useState(animation.trigger === "on_load");
  const ref = useRef<HTMLDivElement | null>(null);
  const motion = useMotionOffset(Boolean(animation.parallax || animation.sensor) && !reducedMotion);

  useEffect(() => {
    setPlaying(animation.trigger === "on_load");
  }, [animation.trigger, animation.enabled, animation.preset, animation.direction]);

  useEffect(() => {
    if (animation.trigger !== "on_scroll" || !ref.current || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setPlaying(Boolean(entry?.isIntersecting)), { threshold: 0.15 });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [animation.trigger]);

  const style = {
    ...animationStyle(animation, { playing, selected, reducedMotion, index }),
    ...parallaxStyle(animation, motion, !reducedMotion),
  } as CSSProperties;
  return { ref, style, playing, setPlaying, animation };
}

function Countdown({ p, ctx }: { p: Record<string, string>; ctx?: EventCtx | undefined }) {
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
    <div className={cn("space-y-2", ALIGN[p["align"] ?? "center"])} style={p["color"] ? { color: p["color"] } : undefined}>
      {p["title"] && <p className="text-sm text-muted-foreground">{p["title"]}</p>}
      {diff !== 0 && <Row align={p["align"]}>
        <div className="flex gap-2">
          {(parts ?? [["–", "dias"], ["–", "horas"], ["–", "min"], ["–", "seg"]]).map(([n, l]) => (
            <div key={l} className="min-w-14 rounded-md border px-2 py-1.5 text-center">
              <div className="font-display text-xl tabular-nums">{n}</div><div className="text-[10px] uppercase text-muted-foreground">{l}</div>
            </div>
          ))}
        </div>
      </Row>}
      {!parts && <p className="text-xs text-muted-foreground">Defina a data do evento.</p>}
      {diff === 0 && <p className="font-display text-lg">O grande dia chegou!</p>}
    </div>
  );
}

/** Renders one block. The exact same JSON is used by the editor canvas and every preview. */
function BlockContent({ block, ctx, interactive = false }: { block: Block; ctx?: EventCtx | undefined; interactive?: boolean }) {
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
      const numericFontSize = Number(p["fontSize"]);
      const numericLetterSpacing = Number(p["letterSpacing"]);
      const numericLineHeight = Number(p["lineHeight"]);
      const style: CSSProperties = {
        fontFamily: fontCss(p["font"]),
        color: p["color"] || undefined,
        fontSize: Number.isFinite(numericFontSize) && numericFontSize > 0 ? `${numericFontSize}px` : undefined,
        fontWeight: p["fontWeight"] || (p["bold"] === "1" ? "700" : undefined),
        fontStyle: p["fontStyle"] || undefined,
        textDecoration: p["textDecoration"] || undefined,
        letterSpacing: Number.isFinite(numericLetterSpacing) ? `${numericLetterSpacing}px` : undefined,
        lineHeight: Number.isFinite(numericLineHeight) && numericLineHeight > 0 ? numericLineHeight : undefined,
      };
      return (
        <Row align={p["align"]}>
          <p style={style} className={cn("whitespace-pre-line break-words", !p["fontSize"] && TEXT_SIZE[p["size"] ?? "lg"], WIDTH[p["width"] ?? "full"])}>{p["text"]}</p>
        </Row>
      );
    }
    case "image":
      return <ImageBlock p={p} />;
    case "shape":
    case "decoration":
      return <ShapeBlock p={p} />;
    case "gallery":
      return <GalleryBlock p={p} />;
    case "date": {
      const d = formatDate(pick(p, p["date"], ctx?.event_date), p["format"]);
      return <Info align={p["align"]} label={p["label"]} color={p["color"]} icon={<CalendarDays className="h-4 w-4" />}>{d ?? "Data a definir"}</Info>;
    }
    case "time": {
      const t = formatTime(pick(p, p["time"], ctx?.event_time), p["format"]);
      return <Info align={p["align"]} label={p["label"]} color={p["color"]} icon={<Clock className="h-4 w-4" />}>{t ?? "Horário a definir"}</Info>;
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
            <Row align={p["align"]}>{(() => {
              const cls = "mt-1 inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs";
              const q = [name, address, city].filter(Boolean).join(", ");
              const body = <><Navigation className="h-3.5 w-3.5" />Como chegar</>;
              return interactive && (address || city)
                ? <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`} target="_blank" rel="noopener noreferrer" className={cn(cls, "hover:bg-accent")}>{body}</a>
                : <span className={cls}>{body}</span>;
            })()}</Row>
          )}
        </div>
      );
    }
    case "countdown": return <Countdown p={p} ctx={ctx} />;
    case "rsvp":
      if (ctx?.rsvp && ctx.slug) {
        if (!ctx.rsvp.enabled) return null;
        return <RsvpForm slug={ctx.slug} cfg={ctx.rsvp} title={p["title"]} label={p["label"]} visual={p} />;
      }
      return (
        <div className="space-y-2">
          {p["title"] && <p className={cn("text-sm text-muted-foreground", ALIGN[p["align"] ?? "center"])}>{p["title"]}</p>}
          <Btn p={p} fallback={BLOCKS.rsvp.label} interactive={false} />
        </div>
      );
    case "whatsapp": {
      const phone = (p["phone"] ?? "").replace(/\D/g, "");
      const message = p["message"]?.trim() || "Olá! Gostaria de falar com vocês.";
      const href = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null;
      return <Btn p={p} fallback="WhatsApp" href={href} interactive={interactive} icon={<MessageCircle className="h-4 w-4" />} />;
    }
    case "button": return <Btn p={p} fallback="Botão" href={/^https?:\/\//i.test(p["url"] ?? "") ? p["url"] : null} interactive={interactive} />;
    case "qr_code": {
      const size = p["size"] === "sm" ? 96 : p["size"] === "lg" ? 176 : p["size"] === "xl" ? 224 : 128;
      const value = p["value"] || ctx?.publicUrl || "https://convitely.app/convite/previa";
      const qrStyle: CSSProperties = {
        backgroundColor: p["backgroundColor"] || "hsl(var(--card))",
        color: p["foregroundColor"] || "currentColor",
        padding: `${Math.max(4, Math.min(32, Number(p["padding"]))) || 8}px`,
        borderRadius: `${Math.max(0, Math.min(48, Number(p["radius"]))) || 6}px`,
        boxShadow: p["shadow"] === "soft" ? "0 6px 18px rgb(15 23 42 / .14)" : p["shadow"] === "strong" ? "0 12px 28px rgb(15 23 42 / .24)" : undefined,
      };
      return (
        <div className="space-y-2">
          <Row align={p["align"]}><div style={qrStyle}><QRCodeSVG value={value} size={size} bgColor={p["backgroundColor"] || "transparent"} fgColor={p["foregroundColor"] || "currentColor"} /></div></Row>
          {p["caption"] && <p className={cn("text-xs text-muted-foreground", ALIGN[p["align"] ?? "center"])}>{p["caption"]}</p>}
          {!p["value"] && <p className={cn("text-[11px] text-muted-foreground", ALIGN[p["align"] ?? "center"])}>Prévia — usará o link público do convite.</p>}
        </div>
      );
    }
    case "divider": {
      const style: CSSProperties = { borderTopWidth: `${Number(p["thickness"]) || 1}px`, borderTopStyle: (p["style"] as CSSProperties["borderTopStyle"]) || "solid", borderTopColor: p["borderColor"] || p["color"] || "currentColor" };
      return <Row align={p["align"]}><hr style={style} className={cn("border-x-0 border-b-0", p["width"] === "auto" ? "w-1/3" : WIDTH[p["width"] ?? "full"])} /></Row>;
    }
  }
}

export function BlockView({ block, ctx, interactive = false, selected = false, index = 0 }: { block: Block; ctx?: EventCtx | undefined; interactive?: boolean; selected?: boolean; index?: number }) {
  const p = block.props ?? {};
  const animationState = useBlockAnimation(block.animation, selected, index);
  const animation = animationState.animation;
  const handleInteraction = () => {
    if (animation.sensor) void requestMotionPermission();
    if (animation.trigger === "on_click") animationState.setPlaying(true);
  };
  const fill = p["fill"] ?? "none";
  const borderWidth = Math.min(20, Math.max(0, Number(p["borderWidth"]) || 0));
  const radius = Math.max(0, Math.min(160, Number(p["borderRadius"]) || 0));
  const independentRadius = p["radiusIndependent"] === "1";
  const shadowPreset = p["shadow"] || "none";
  const shadowColor = /^#[0-9a-f]{6}$/i.test(p["shadowColor"] || "") ? p["shadowColor"] : "#000000";
  const shadow = shadowPreset === "soft" ? `0 4px 14px 0 ${shadowColor}33` : shadowPreset === "medium" ? `0 8px 24px 0 ${shadowColor}40` : shadowPreset === "strong" ? `0 14px 36px 0 ${shadowColor}55` : shadowPreset === "custom" ? `${Number(p["shadowX"]) || 0}px ${Number(p["shadowY"]) || 0}px ${Math.max(0, Number(p["shadowBlur"]) || 0)}px ${Number(p["shadowSpread"]) || 0}px ${shadowColor}66` : undefined;
  const blur = Math.max(0, Math.min(20, Number(p["filterBlur"]) || 0));
  const brightness = Math.max(0, Math.min(200, Number(p["filterBrightness"] ?? 100) || 100));
  const appearance: CSSProperties = {
    ...(fill === "solid" && p["fillColor"] ? { backgroundColor: p["fillColor"] } : {}),
    ...(fill === "gradient" && p["fillGradient"] ? { backgroundImage: p["fillGradient"] } : {}),
    ...(borderWidth > 0 ? { borderWidth, borderStyle: (p["borderStyle"] as CSSProperties["borderStyle"]) || "solid", borderColor: p["borderColor"] || "currentColor" } : {}),
    ...(independentRadius ? { borderTopLeftRadius: Math.max(0, Number(p["radiusTopLeft"]) || radius), borderTopRightRadius: Math.max(0, Number(p["radiusTopRight"]) || radius), borderBottomRightRadius: Math.max(0, Number(p["radiusBottomRight"]) || radius), borderBottomLeftRadius: Math.max(0, Number(p["radiusBottomLeft"]) || radius) } : radius > 0 ? { borderRadius: radius } : {}),
    ...(shadow ? { boxShadow: shadow } : {}),
    ...(blur > 0 || brightness !== 100 ? { filter: `blur(${blur}px) brightness(${brightness}%)` } : {}),
    opacity: Number.isFinite(Number(block.opacity)) ? Math.min(1, Math.max(0, Number(block.opacity))) : 1,
  };
  return (
    <div
      data-editor-block={block.id}
      data-editor-block-locked={block.locked ? "true" : "false"}
      data-editor-block-visibility={block.visibility === false || block.hidden ? "hidden" : "visible"}
      ref={animationState.ref}
      className="relative min-h-0 min-w-0 h-full w-full"
      style={{ ...appearance, ...animationState.style }}
      onMouseEnter={() => { if (animation.trigger === "on_hover") animationState.setPlaying(true); }}
      onMouseLeave={() => { if (animation.trigger === "on_hover") animationState.setPlaying(false); }}
      onClick={handleInteraction}
      onKeyDown={(event) => {
        if (animation.trigger === "on_click" && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          handleInteraction();
        }
      }}
      role={animation.trigger === "on_click" || animation.sensor ? "button" : undefined}
      tabIndex={animation.trigger === "on_click" || animation.sensor ? 0 : undefined}
      aria-label={animation.sensor ? "Ativar animação e sensores de movimento" : animation.trigger === "on_click" ? "Ativar animação do elemento" : undefined}
    >
      <BlockContent block={block} ctx={ctx} interactive={interactive} />
    </div>
  );
}

function Info({ align = "center", label, icon, children, color }: { align?: string | undefined; label?: string | undefined; icon: ReactNode; children: ReactNode; color?: string }) {
  return (
    <div className={cn("space-y-0.5", ALIGN[align])} style={color ? { color } : undefined}>
      {label && <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>}
      <Row align={align}><span className="flex items-center gap-2 text-base">{icon}{children}</span></Row>
    </div>
  );
}

export const bgColorStyle = (bg?: Background) => {
  if (!bg?.color && !bg?.gradient) return undefined;
  return {
    ...(bg.color ? { backgroundColor: bg.color } : {}),
    ...(bg.gradient ? { backgroundImage: bg.gradient } : {}),
  };
};

/** Background layers are painted independently behind the content (parent needs `relative isolate`). */
export function BackgroundLayers({ bg }: { bg?: Background | undefined }) {
  const src = useAssetUrl(bg?.image);
  const backgroundAnimation = bg as Background & { parallax?: number; depth?: number; sensor?: boolean };
  const reducedMotion = useReducedMotion();
  const motion = useMotionOffset(Boolean(backgroundAnimation.parallax || backgroundAnimation.sensor) && !reducedMotion);
  const overlay = Math.min(80, Math.max(0, Number(bg?.overlay) || 0));
  const overlayColor = typeof bg?.overlayColor === "string" && /^#[0-9a-f]{6}$/i.test(bg.overlayColor) ? bg.overlayColor : "hsl(var(--foreground))";
  const scale = Math.min(300, Math.max(10, Number(bg?.imageScale) || 100));
  const imageOpacity = Math.min(1, Math.max(0, Number.isFinite(Number(bg?.imageOpacity)) ? Number(bg?.imageOpacity) : 1));
  const offsetX = Number(bg?.imageOffsetX) || 0;
  const offsetY = Number(bg?.imageOffsetY) || 0;
  const position = `calc(${bg?.x === "left" ? "0%" : bg?.x === "right" ? "100%" : "50%"} + ${offsetX}px) calc(${bg?.y === "top" ? "0%" : bg?.y === "bottom" ? "100%" : "50%"} + ${offsetY}px)`;
  const coverZoom = bg?.size === "cover" ? Math.max(1, scale / 100) : 1;
  const imageSize = bg?.size === "contain" ? `${scale}% auto` : "cover";
  return (
    <>
      {(bg?.color || bg?.gradient) && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            ...(bg?.color ? { backgroundColor: bg.color } : {}),
            ...(bg?.gradient ? { backgroundImage: bg.gradient } : {}),
          }}
        />
      )}
      {src && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
          style={{
            transform: `scale(${coverZoom}) translate3d(${motion.x * (Number(backgroundAnimation.parallax) || 0)}px, ${motion.y * (Number(backgroundAnimation.parallax) || 0)}px, ${Number(backgroundAnimation.depth) || 0}px)`,
              transformOrigin: "center center",
              willChange: backgroundAnimation.parallax || backgroundAnimation.sensor ? "transform" : "auto",
          }}
        >
          <div
            className="absolute inset-0 bg-no-repeat"
            style={{
              backgroundImage: `url("${src}")`,
              backgroundSize: imageSize,
              backgroundPosition: position,
              opacity: imageOpacity,
            }}
          />
        </div>
      )}
      {overlay > 0 && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0"
          style={{ backgroundColor: overlayColor, opacity: overlay / 100 }}
        />
      )}
    </>
  );
}

/** Read-only rendering of a whole invitation (hidden blocks are skipped). */
export function InvitationCanvas({ blocks, ctx, className, background }: { blocks: Block[]; ctx?: EventCtx | undefined; className?: string | undefined; background?: Background | undefined }) {
  const visible = blocks.filter((b) => b.visibility !== false && !b.hidden);
  const geometries = visible.map((block) => getBlockGeometry(block));
  const hasFreeCanvasBlock = geometries.some((geometry) => Object.keys(geometry).length > 0);
  const canvasHeight = Math.max(
    640,
    ...geometries.map((geometry) => (geometry.y ?? 24) + (geometry.height ?? 0) + 24),
  );
  return (
    <div
      className={cn(
        "relative isolate mx-auto w-full max-w-md overflow-hidden rounded-2xl border bg-card shadow-sm",
        hasFreeCanvasBlock ? "min-h-[640px] p-0" : "flex flex-col gap-5 p-6",
        className,
      )}
      style={{ ...bgColorStyle(background), ...(hasFreeCanvasBlock ? { minHeight: canvasHeight } : {}) }}
    >
      <BackgroundLayers bg={background} />
      {visible.length ? visible.map((b, index) => {
        const geometry = geometries[index] ?? {};
        const free = hasFreeCanvasBlock && Object.keys(geometry).length > 0;
        const safeNumber = (value: number | undefined, fallback: number) => Number.isFinite(value) ? value! : fallback;
        const frame: CSSProperties = free ? {
          position: "absolute",
          left: safeNumber(geometry.x, 24),
          top: safeNumber(geometry.y, 24),
          width: geometry.width !== undefined && Number.isFinite(geometry.width) && geometry.width > 0 ? geometry.width : undefined,
          height: geometry.height !== undefined && Number.isFinite(geometry.height) && geometry.height > 0 ? geometry.height : undefined,
          zIndex: geometry.zIndex !== undefined && Number.isFinite(geometry.zIndex) ? geometry.zIndex : undefined,
          transform: `rotate(${safeNumber(geometry.rotation, 0)}deg) scale(${geometry.scale !== undefined && Number.isFinite(geometry.scale) && geometry.scale > 0 ? geometry.scale : 1})`,
          transformOrigin: "center",
          boxSizing: "border-box",
        } : {};
        return <div key={b.id} className={cn("min-w-0", free && "overflow-visible")} style={frame}><BlockView block={b} ctx={ctx} interactive index={index} /></div>;
      }) : <p className="py-10 text-center text-sm text-muted-foreground">Este convite ainda não possui blocos.</p>}
    </div>
  );
}

function ShapeBlock({ p }: { p: Record<string, string> }) {
  const shape = p["shape"] || "rectangle";
  const fill = p["fill"] || (shape === "line" ? "none" : "solid");
  const fillColor = p["fillColor"] || "#7c3aed";
  const borderColor = p["borderColor"] || fillColor;
  const borderWidth = Math.min(20, Math.max(0, Number(p["borderWidth"]) || 0));
  const radius = Math.max(0, Math.min(999, Number(p["borderRadius"]) || 0));
  const independent = p["radiusIndependent"] === "1";
  const shadow = p["shadow"] === "soft" ? "0 4px 14px rgb(15 23 42 / .14)" : p["shadow"] === "medium" ? "0 8px 24px rgb(15 23 42 / .2)" : p["shadow"] === "strong" ? "0 14px 36px rgb(15 23 42 / .28)" : undefined;
  const style: CSSProperties = {
    width: "100%",
    height: "100%",
    backgroundColor: fill === "solid" ? fillColor : undefined,
    backgroundImage: fill === "gradient" ? p["fillGradient"] || undefined : undefined,
    borderWidth: shape === "line" ? Math.max(1, borderWidth || 1) : borderWidth,
    borderStyle: p["borderStyle"] || "solid",
    borderColor,
    borderRadius: independent ? undefined : radius,
    borderTopLeftRadius: independent ? Number(p["radiusTopLeft"]) || radius : undefined,
    borderTopRightRadius: independent ? Number(p["radiusTopRight"]) || radius : undefined,
    borderBottomRightRadius: independent ? Number(p["radiusBottomRight"]) || radius : undefined,
    borderBottomLeftRadius: independent ? Number(p["radiusBottomLeft"]) || radius : undefined,
    boxShadow: shadow,
    clipPath: shape === "circle" ? "circle(50% at 50% 50%)" : shape === "triangle" ? "polygon(50% 0%, 100% 100%, 0% 100%)" : shape === "star" ? "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 100%, 50% 73%, 21% 100%, 32% 57%, 2% 35%, 39% 35%)" : shape === "heart" ? "path(\"M50 90 C20 68 0 50 0 28 C0 8 24 0 50 24 C76 0 100 8 100 28 C100 50 80 68 50 90 Z\")" : undefined,
  };
  return <div className="flex h-full w-full items-center justify-center" aria-label={`${shape} visual`}><div className="h-full w-full" style={style} /></div>;
}

function ImageBlock({ p }: { p: Record<string, string> }) {
  const src = useAssetUrl(p["url"]);
  const w = p["width"] === "auto" ? "w-full sm:w-1/2" : WIDTH[p["width"] ?? "full"];
  const fit = p["objectFit"] || "cover";
  const position = p["objectPosition"] || p["position"] || "center";
  const zoom = Math.min(300, Math.max(100, Number(p["imageZoom"]) || 100));
  const brightness = Math.min(200, Math.max(0, Number(p["imageBrightness"] ?? 100)));
  const contrast = Math.min(200, Math.max(0, Number(p["imageContrast"] ?? 100)));
  const saturate = Math.min(200, Math.max(0, Number(p["imageSaturate"] ?? 100)));
  const imageStyle: CSSProperties = {
    objectFit: fit === "original" ? "contain" : fit as CSSProperties["objectFit"],
    objectPosition: position,
    transform: `scale(${zoom / 100})`,
    transformOrigin: position,
    filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`,
  };
  const frameClass = cn("overflow-hidden rounded-lg", w, p["height"] === "auto" ? "" : IMG_HEIGHT[p["height"] ?? "wide"] || "aspect-video");
  return (
    <Row align={p["align"]}>
      <div className={frameClass}>
        {src ? <img src={src} alt={p["alt"] ?? ""} className={cn("h-full w-full", p["height"] === "auto" && "h-auto")} loading="lazy" style={imageStyle} /> : <MediaFallback name={p["alt"] ?? "Imagem indisponível"} />}
      </div>
    </Row>
  );
}

type GalleryImage = { url: string; alt?: string; caption?: string };

function GalleryImageButton({ item, index, height, captions, onOpen }: { item: GalleryImage; index: number; height: string; captions: boolean; onOpen: (index: number) => void }) {
  const src = useAssetUrl(item.url);
  return (
    <button type="button" className={cn("group relative block w-full overflow-hidden rounded-lg bg-muted text-left", height)} onClick={() => onOpen(index)} aria-label={`Abrir imagem ${index + 1}${item.alt ? `: ${item.alt}` : ""}`}>
      {src ? <img src={src} alt={item.alt ?? ""} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105" /> : <span className="flex h-full min-h-24 items-center justify-center text-xs text-muted-foreground">Imagem indisponível</span>}
      {captions && item.caption && <span className="absolute inset-x-0 bottom-0 bg-background/75 px-2 py-1 text-xs text-foreground">{item.caption}</span>}
      <span className="absolute right-2 top-2 rounded-md bg-background/75 p-1.5 opacity-0 transition-opacity group-hover:opacity-100"><Maximize2 className="h-4 w-4" aria-hidden="true" /></span>
    </button>
  );
}

function GalleryFullscreen({ images, active, onClose, onMove }: { images: GalleryImage[]; active: number; onClose: () => void; onMove: (direction: number) => void }) {
  const current = images[active];
  const src = useAssetUrl(current?.url);
  if (!current) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Imagem ampliada" className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 p-4" onClick={onClose}>
      <button type="button" aria-label="Fechar tela cheia" className="absolute right-4 top-4 rounded-full bg-muted p-2" onClick={onClose}><X className="h-5 w-5" /></button>
      <img src={src ?? undefined} alt={current.alt ?? ""} className="max-h-[90vh] max-w-full object-contain" onClick={(event) => event.stopPropagation()} />
      {images.length > 1 && <><button type="button" aria-label="Imagem anterior" className="absolute left-4 rounded-full bg-muted p-2" onClick={(event) => { event.stopPropagation(); onMove(-1); }}><ChevronLeft className="h-6 w-6" /></button><button type="button" aria-label="Próxima imagem" className="absolute right-4 rounded-full bg-muted p-2" onClick={(event) => { event.stopPropagation(); onMove(1); }}><ChevronRight className="h-6 w-6" /></button></>}
    </div>
  );
}

function GalleryBlock({ p }: { p: Record<string, string> }) {
  const [active, setActive] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  let images: GalleryImage[] = [];
  try {
    const parsed = JSON.parse(p["images"] || "[]");
    if (Array.isArray(parsed)) images = parsed.filter((item): item is GalleryImage => !!item && typeof item.url === "string" && item.url.length > 0);
  } catch {
    images = [];
  }
  const mode = p["mode"] === "carousel" ? "carousel" : "grid";
  const columns = p["columns"] === "4" ? "grid-cols-4" : p["columns"] === "3" ? "grid-cols-3" : "grid-cols-2";
  const height = IMG_HEIGHT[p["height"] ?? "square"] || "aspect-square";
  const current = images[active] ?? images[0];
  const move = (direction: number) => setActive((index) => (index + direction + images.length) % images.length);
  const openImage = (index: number) => { setActive(index); setFullscreen(true); };

  if (!images.length) return <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Adicione imagens à galeria.</div>;

  return (
    <Row align={p["align"]}>
      <div className="w-full space-y-2">
        {mode === "carousel" ? (
          <div className="relative">
            <GalleryImageButton item={current!} index={active} height={height} captions={p["captions"] !== "0"} onOpen={openImage} />
            {images.length > 1 && <>
              <button type="button" onClick={() => move(-1)} aria-label="Imagem anterior" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 text-foreground shadow-sm"><ChevronLeft className="h-5 w-5" /></button>
              <button type="button" onClick={() => move(1)} aria-label="Próxima imagem" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 text-foreground shadow-sm"><ChevronRight className="h-5 w-5" /></button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-background/80 px-2 py-1 text-[11px] text-foreground">{active + 1} / {images.length}</div>
            </>}
          </div>
        ) : <div className={cn("grid gap-2", columns)}>{images.map((item, index) => <div key={`${item.url}-${index}`}><GalleryImageButton item={item} index={index} height={height} captions={p["captions"] !== "0"} onOpen={openImage} /></div>)}</div>}
        {fullscreen && <GalleryFullscreen images={images} active={active} onClose={() => setFullscreen(false)} onMove={move} />}
      </div>
    </Row>
  );
}
