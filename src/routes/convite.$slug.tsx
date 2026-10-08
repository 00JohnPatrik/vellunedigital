import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { CalendarPlus, Check, Download, Loader2, MailX, MessageCircle, Share2, Sparkles } from "lucide-react";
import { InvitationCanvas } from "@/components/block-render";
import { Button } from "@/components/ui/button";
import { getPublicInvitation, recordInvitationView } from "@/lib/public-invitation.functions";
import { requestMotionPermission } from "@/lib/invitation-editor-animation";
import { toast } from "sonner";

export const Route = createFileRoute("/convite/$slug")({
  validateSearch: z.object({ guest: z.string().optional() }),
  loader: ({ params, location }) => getPublicInvitation({ data: { slug: params.slug, guestToken: location.search.guest } }),
  pendingComponent: InvitationLoading,
  head: ({ loaderData }) => {
    if (!loaderData || loaderData.state !== "ok") {
      return {
        meta: [
          { title: "Convite indisponível — Vellune Digital" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const i = loaderData.invitation;
    const desc = i.message?.slice(0, 150) || `Você está convidado! ${new Date(`${i.event_date}T00:00:00`).toLocaleDateString("pt-BR")}${i.venue_name ? ` · ${i.venue_name}` : ""}`;
    const publicPath = `/convite/${i.slug}`;
    const firstImage = (i.content?.blocks ?? []).find((block) => block.type === "image" && /^https?:\/\//i.test(block.props?.url ?? ""))?.props?.url
      ?? (() => {
        const gallery = (i.content?.blocks ?? []).find((block) => block.type === "gallery");
        if (!gallery?.props?.images) return null;
        try {
          const items = JSON.parse(gallery.props.images) as Array<{ url?: unknown }>;
          const url = items.find((item) => typeof item?.url === "string" && /^https?:\/\//i.test(item.url))?.url;
          return typeof url === "string" ? url : null;
        } catch {
          return null;
        }
      })();
    const themeColor = i.branding?.primary_color || i.branding?.accent_color || "#08090d";
    return {
      meta: [
        { title: i.name },
        { name: "description", content: desc },
        { name: "theme-color", content: themeColor },
        { property: "og:title", content: i.name },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: publicPath },
        { property: "og:site_name", content: "Vellune Digital" },
        ...(firstImage ? [{ property: "og:image", content: firstImage }] : []),
        { name: "twitter:card", content: firstImage ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: i.name },
        { name: "twitter:description", content: desc },
        ...(firstImage ? [{ name: "twitter:image", content: firstImage }] : []),
        { name: "robots", content: "noindex" },
      ],
      links: [
        { rel: "canonical", href: publicPath },
        ...(i.branding?.favicon_url ? [{ rel: "icon", href: i.branding.favicon_url }] : []),
      ],
    };
  },
  component: PublicInvitationPage,
  errorComponent: () => <Message title="Não foi possível abrir o convite." text="Tente novamente em alguns instantes." />,
  notFoundComponent: () => <Message title="Convite não encontrado." text="Confira se o link está correto." />,
});

const viewed = new Set<string>();

function formatIcsText(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

function makeCalendarIcs(invitation: { name: string; event_date: string; event_time?: string | null; venue_name?: string | null; address?: string | null; city?: string | null; state?: string | null; message?: string | null }, slug: string) {
  const startDate = new Date(invitation.event_date + "T" + String(invitation.event_time ?? "00:00").slice(0, 5));
  const start = invitation.event_date.replaceAll("-", "") + "T" + String(invitation.event_time ?? "00:00").slice(0, 5).replace(":", "") + "00";
  const endDate = Number.isNaN(startDate.getTime()) ? startDate : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);
  const end = Number.isNaN(endDate.getTime())
    ? start
    : endDate.getFullYear() + String(endDate.getMonth() + 1).padStart(2, "0") + String(endDate.getDate()).padStart(2, "0") + "T" +
      String(endDate.getHours()).padStart(2, "0") + String(endDate.getMinutes()).padStart(2, "0") + "00";
  const location = [invitation.venue_name, invitation.address, invitation.city, invitation.state].filter(Boolean).join(", ");
  const body = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Vellune Digital//Convite//PT-BR",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    "UID:" + slug + "@vellunedigital.app",
    "DTSTART:" + start,
    "DTEND:" + end,
    "SUMMARY:" + formatIcsText(invitation.name),
    location ? "LOCATION:" + formatIcsText(location) : "",
    invitation.message ? "DESCRIPTION:" + formatIcsText(invitation.message) : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean).join("\r\n");
  return "data:text/calendar;charset=utf-8," + encodeURIComponent(body);
}

function formatPublicEvent(invitation: { event_date: string; event_time?: string | null; venue_name?: string | null }) {
  const date = new Date(`${invitation.event_date}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = invitation.event_time ? ` às ${String(invitation.event_time).slice(0, 5)}` : "";
  const venue = invitation.venue_name ? ` · ${invitation.venue_name}` : "";
  return `${date}${time}${venue}`;
}

const PUBLIC_SECTIONS = [
  { key: "event", label: "Evento", types: ["date", "time", "countdown"] },
  { key: "photos", label: "Fotos", types: ["image", "gallery"] },
  { key: "location", label: "Local", types: ["location"] },
  { key: "confirmation", label: "Confirmar", types: ["rsvp"] },
  { key: "gifts", label: "Presentes", types: ["gifts"] },
] as const;

function findPublicSectionElement(key: string) {
  const section = PUBLIC_SECTIONS.find((item) => item.key === key);
  if (!section) return null;
  for (const type of section.types) {
    const element = document.querySelector<HTMLElement>('[data-invitation-block="' + type + '"]');
    if (element) return element;
  }
  return null;
}

function InvitationLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4" aria-live="polite" aria-busy="true">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border bg-card p-8 text-center shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        <h1 className="font-display text-xl font-semibold text-foreground">Abrindo seu convite</h1>
        <p className="text-sm text-muted-foreground">Aguarde só um instante.</p>
      </div>
    </main>
  );
}

function PublicInvitationPage() {
  const res = Route.useLoaderData();
  const { slug } = Route.useParams();
  const { guest } = Route.useSearch();
  const ok = res.state === "ok";
  const invitation = ok ? res.invitation : null;
  const [motionReady, setMotionReady] = useState(false);
  const [introVisible, setIntroVisible] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  const sections = useMemo(
    () => invitation
      ? PUBLIC_SECTIONS.filter((section) => invitation.content?.blocks?.some((block) => section.types.includes(block.type as never)))
      : [],
    [invitation],
  );

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setIntroVisible(false), reducedMotion ? 0 : 720);
    return () => window.clearTimeout(timer);
  }, [reducedMotion]);

  useEffect(() => {
    if (!ok || viewed.has(slug)) return;
    const storageKey = "vellune:invitation-viewed:" + slug;
    try {
      if (window.sessionStorage.getItem(storageKey) === "1") {
        viewed.add(slug);
        return;
      }
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // The in-memory guard remains as a fallback when storage is unavailable.
    }
    viewed.add(slug);
    recordInvitationView({ data: { slug } }).catch(() => {});
  }, [ok, slug]);

  useEffect(() => {
    const updateScroll = () => {
      const documentHeight = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setScrollProgress(Math.min(100, Math.max(0, (window.scrollY / documentHeight) * 100)));
      if (!sections.length) {
        setActiveSection(null);
        return;
      }
      const candidates = sections.flatMap((section) => {
        const element = findPublicSectionElement(section.key);
        return element
          ? [{ key: section.key, distance: Math.abs(element.getBoundingClientRect().top - window.innerHeight * 0.35) }]
          : [];
      });
      candidates.sort((a, b) => a.distance - b.distance);
      setActiveSection(candidates[0]?.key ?? sections[0]?.key ?? null);
    };
    updateScroll();
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    return () => {
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
    };
  }, [sections]);

  if (res.state === "not_found") return <Message title="Convite não encontrado." text="Confira se o link está correto." />;
  if (res.state !== "ok") return <Message title="Este convite ainda não está disponível." text="Volte mais tarde ou fale com quem enviou o convite." />;

  const i = res.invitation;
  const branding = i.branding;
  const hasSensorAnimation = (i.content?.blocks ?? []).some((block) => block.animation?.enabled !== false && block.animation?.sensor === true);
  const basePublicUrl = (typeof window !== "undefined" ? window.location.origin : "") + "/convite/" + slug;
  const publicUrl = guest ? basePublicUrl + "?guest=" + encodeURIComponent(guest) : basePublicUrl;
  const whatsappNumber = branding?.whatsapp_number?.replace(/\D/g, "") ?? "";
  const calendarEnd = (() => {
    const start = new Date(i.event_date + "T" + String(i.event_time).slice(0, 5));
    return new Date(start.getTime() + 2 * 60 * 60 * 1000);
  })();
  const pad = (value: number) => String(value).padStart(2, "0");
  const calendarParams = new URLSearchParams({
    action: "TEMPLATE",
    text: i.name,
    dates: i.event_date.replaceAll("-", "") + "T" + String(i.event_time).slice(0, 5).replace(":", "") + "00/" +
      calendarEnd.getFullYear() + pad(calendarEnd.getMonth() + 1) + pad(calendarEnd.getDate()) + "T" + pad(calendarEnd.getHours()) + pad(calendarEnd.getMinutes()) + "00",
    details: i.message ?? "Convite digital Vellune Digital",
    location: [i.venue_name, i.address, i.city, i.state].filter(Boolean).join(", "),
  });
  const calendarUrl = "https://calendar.google.com/calendar/render?" + calendarParams.toString();
  const icsUrl = makeCalendarIcs(i, slug);
  const shareText = i.name + " — " + formatPublicEvent(i) + (i.guest?.name ? " · Convite de " + i.guest.name : "");
  const whatsappMessage = shareText + " — " + publicUrl;
  const whatsappUrl = whatsappNumber
    ? "https://wa.me/" + whatsappNumber + "?text=" + encodeURIComponent(whatsappMessage)
    : "https://wa.me/?text=" + encodeURIComponent(whatsappMessage);

  const ctx = {
    event_date: i.event_date,
    event_time: i.event_time,
    venue_name: i.venue_name,
    address: i.address,
    city: i.city,
    state: i.state,
    publicUrl,
    rsvp: i.rsvp ?? { enabled: false as const },
    slug,
    event_name: i.name,
    guest_name: i.guest?.name ?? null,
    guest_people: i.guest?.people_count ?? null,
    guest_status: i.guest?.status ?? null,
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success("Link copiado.");
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
  };

  const share = async () => {
    if (typeof navigator.share !== "function") {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title: i.name, text: shareText, url: publicUrl });
    } catch {
      // Cancelamento pelo visitante não é um erro da página.
    }
  };

  const scrollToRsvp = () => {
    const rsvp = findPublicSectionElement("confirmation");
    if (!rsvp) {
      toast.info("A confirmação de presença aparece no convite.");
      return;
    }
    rsvp.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    setActiveSection("confirmation");
  };

  const scrollToSection = (key: string) => {
    const element = findPublicSectionElement(key);
    if (!element) return;
    element.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "center" });
    setActiveSection(key);
  };

  const enableMotion = async () => {
    const granted = await requestMotionPermission();
    if (granted) {
      setMotionReady(true);
      toast.success("Movimento do convite ativado.");
    } else {
      toast.error("O movimento não pôde ser ativado neste dispositivo.");
    }
  };

  const actions = (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2" aria-label="Ações rápidas do convite">
      <Button type="button" variant="ghost" size="sm" className="min-w-0 flex-1 rounded-full text-[#F5F7FA] hover:bg-white/10" onClick={() => void share()}>
        <Share2 className="h-4 w-4" />
        <span>Compartilhar</span>
      </Button>
      <details className="group relative min-w-0 flex-1">
        <summary className="flex h-9 cursor-pointer list-none items-center justify-center gap-2 rounded-full px-3 text-sm text-[#F5F7FA] hover:bg-white/10 [&::-webkit-details-marker]:hidden">
          <CalendarPlus className="h-4 w-4" />
          <span>Agenda</span>
        </summary>
        <div className="absolute bottom-[calc(100%+8px)] left-1/2 z-50 w-56 -translate-x-1/2 rounded-2xl border border-white/10 bg-[#111318]/95 p-1.5 text-sm text-white shadow-2xl backdrop-blur-xl">
          <a href={calendarUrl} target="_blank" rel="noopener noreferrer" className="block rounded-xl px-3 py-2.5 hover:bg-white/10">Google Calendar</a>
          <a href={icsUrl} download={slug + ".ics"} className="flex items-center gap-2 rounded-xl px-3 py-2.5 hover:bg-white/10"><Download className="h-4 w-4" />Salvar arquivo .ics</a>
        </div>
      </details>
      {whatsappNumber && (
        <Button type="button" variant="ghost" size="sm" className="min-w-0 flex-1 rounded-full text-[#F5F7FA] hover:bg-white/10" asChild>
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" />
            <span>WhatsApp</span>
          </a>
        </Button>
      )}
      {i.rsvp?.enabled && (
        <Button type="button" size="sm" className="min-w-0 flex-1 rounded-full bg-[#d4af37] text-[#16130b] hover:bg-[#e5c66b]" onClick={scrollToRsvp}>
          <Check className="h-4 w-4" />
          <span>Confirmar</span>
        </Button>
      )}
    </div>
  );

  return (
    <main
      className="relative min-h-screen overflow-x-hidden bg-[#08090d] pb-24 text-[#F5F7FA] sm:px-4 sm:py-8 sm:pb-8"
      style={{ "--brand-primary": branding?.primary_color ?? undefined, "--brand-accent": branding?.accent_color ?? undefined } as CSSProperties}
      aria-label="Convite digital"
    >
      <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px] bg-white/10">
        <div className="h-full origin-left transition-[width] duration-200" style={{ width: scrollProgress + "%", backgroundColor: branding?.accent_color || branding?.primary_color || "#d4af37" }} />
      </div>

      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-28 top-16 h-72 w-72 rounded-full bg-[#d4af37]/7 blur-3xl" />
        <div className="absolute -right-24 bottom-20 h-80 w-80 rounded-full bg-[#6f8d82]/6 blur-3xl" />
      </div>

      {sections.length > 1 && (
        <nav className="fixed right-4 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-1 rounded-2xl border border-white/10 bg-[#0f1117]/75 p-1.5 shadow-2xl backdrop-blur-xl lg:flex" aria-label="Navegação rápida do convite">
          {sections.map((section) => (
            <button
              key={section.key}
              type="button"
              onClick={() => scrollToSection(section.key)}
              className={"rounded-xl px-3 py-2 text-left text-[10px] font-medium transition " + (activeSection === section.key ? "bg-white/12 text-white" : "text-white/45 hover:bg-white/8 hover:text-white")}
              aria-current={activeSection === section.key ? "location" : undefined}
            >
              {section.label}
            </button>
          ))}
        </nav>
      )}

      <div className="relative z-10 mx-auto w-full max-w-none sm:max-w-4xl">
        <div className="mb-4 hidden items-center justify-center sm:flex">{actions}</div>

        {i.guest?.name && scrollProgress < 8 && (
          <div className="pointer-events-none fixed left-1/2 top-3 z-40 -translate-x-1/2 rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-[10px] font-medium text-white/80 shadow-lg backdrop-blur-md">
            Este convite foi preparado para {i.guest.name}
          </div>
        )}

        <div className={"relative transition-all duration-700 ease-out " + (reducedMotion ? "transition-none" : "") + (introVisible ? " translate-y-2 scale-[0.995] opacity-0" : " translate-y-0 scale-100 opacity-100")}>
          <InvitationCanvas
            background={i.content?.settings?.background}
            blocks={i.content?.blocks ?? []}
            ctx={ctx}
            immersive
            className="mx-auto max-w-none gap-4 rounded-none border-0 p-0 shadow-none sm:max-w-3xl sm:rounded-2xl sm:border sm:p-10 sm:shadow-2xl"
          />
          {hasSensorAnimation && !motionReady && (
            <div className="absolute right-3 top-3 z-20">
              <Button
                type="button"
                size="sm"
                onClick={() => void enableMotion()}
                className="rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-md hover:bg-black/60"
              >
                <Sparkles className="h-4 w-4" />
                Movimento
              </Button>
            </div>
          )}
        </div>

        <footer className="px-4 pb-3 pt-5 text-center text-[10px] tracking-wide text-white/45 sm:pb-0">
          {(branding?.show_vellune_branding ?? true) && <span>Convite digital · Vellune Digital</span>}
          {!branding?.show_vellune_branding && branding?.brand_name && <span>{branding.brand_name}</span>}
        </footer>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#08090d]/90 px-2 pt-1.5 backdrop-blur-xl sm:hidden" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}>
        {actions}
      </div>
    </main>
  );
}

function Message({ title, text }: { title: string; text: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/40 px-4" aria-live="polite">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-8">
        <MailX className="mx-auto mb-3 h-8 w-8 text-muted-foreground" aria-hidden="true" />
        <h1 className="font-display text-xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{text}</p>
      </div>
    </main>
  );
}
