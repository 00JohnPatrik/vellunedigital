import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarPlus, Check, Loader2, MailX, MessageCircle, Share2, Sparkles } from "lucide-react";
import { InvitationCanvas } from "@/components/block-render";
import { Button } from "@/components/ui/button";
import { getPublicInvitation, recordInvitationView } from "@/lib/public-invitation.functions";
import { requestMotionPermission } from "@/lib/invitation-editor-animation";
import { toast } from "sonner";

export const Route = createFileRoute("/convite/$slug")({
  loader: ({ params }) => getPublicInvitation({ data: { slug: params.slug } }),
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
    const firstImage = (i.content?.blocks ?? []).find((block) => block.type === "image" && /^https?:\\/\\//i.test(block.props?.url ?? ""))?.props?.url
      ?? (() => {
        const gallery = (i.content?.blocks ?? []).find((block) => block.type === "gallery");
        if (!gallery?.props?.images) return null;
        try {
          const items = JSON.parse(gallery.props.images) as Array<{ url?: unknown }>;
          const url = items.find((item) => typeof item?.url === "string" && /^https?:\\/\\//i.test(item.url))?.url;
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

function formatPublicEvent(invitation: { event_date: string; event_time?: string | null; venue_name?: string | null }) {
  const date = new Date(`${invitation.event_date}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const time = invitation.event_time ? ` às ${String(invitation.event_time).slice(0, 5)}` : "";
  const venue = invitation.venue_name ? ` · ${invitation.venue_name}` : "";
  return `${date}${time}${venue}`;
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
  const [motionReady, setMotionReady] = useState(false);
  const ok = res.state === "ok";

  useEffect(() => {
    if (!ok || viewed.has(slug)) return;

    const storageKey = `vellune:invitation-viewed:${slug}`;
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

  if (res.state === "not_found") return <Message title="Convite não encontrado." text="Confira se o link está correto." />;
  if (res.state !== "ok") return <Message title="Este convite ainda não está disponível." text="Volte mais tarde ou fale com quem enviou o convite." />;

  const i = res.invitation;
  const branding = i.branding;
  const hasSensorAnimation = useMemo(
    () => (i.content?.blocks ?? []).some((block) => block.animation?.enabled !== false && block.animation?.sensor === true),
    [i.content?.blocks],
  );
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/convite/${slug}` : `/convite/${slug}`;
  const whatsappNumber = branding?.whatsapp_number?.replace(/\D/g, "");
  const calendarEnd = (() => {
    const start = new Date(`${i.event_date}T${String(i.event_time).slice(0, 5)}`);
    return new Date(start.getTime() + 2 * 60 * 60 * 1000);
  })();
  const pad = (value: number) => String(value).padStart(2, "0");
  const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(i.name)}&dates=${i.event_date.replaceAll("-", "")}T${String(i.event_time).slice(0,5).replace(":", "")}00/${calendarEnd.getFullYear()}${pad(calendarEnd.getMonth()+1)}${pad(calendarEnd.getDate())}T${pad(calendarEnd.getHours())}${pad(calendarEnd.getMinutes())}00&details=${encodeURIComponent(i.message ?? "Convite digital Vellune Digital")}&location=${encodeURIComponent([i.venue_name, i.address, i.city, i.state].filter(Boolean).join(", "))}`;
  const whatsappMessage = `${i.name} — ${publicUrl}`;
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`
    : `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;
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
      await navigator.share({ title: i.name, text: `${i.name} — ${formatPublicEvent(i)}`, url: publicUrl });
    } catch {
      // Cancelamento pelo visitante não é um erro da página.
    }
  };

  const scrollToRsvp = () => {
    const rsvp = document.querySelector<HTMLElement>('[data-invitation-block="rsvp"]');
    if (!rsvp) {
      toast.info("A confirmação de presença aparece no convite.");
      return;
    }
    rsvp.scrollIntoView({ behavior: "smooth", block: "center" });
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
      <Button type="button" variant="ghost" size="sm" className="min-w-0 flex-1 rounded-full text-[#F5F7FA] hover:bg-white/10" asChild>
        <a href={calendarUrl} target="_blank" rel="noopener noreferrer">
          <CalendarPlus className="h-4 w-4" />
          <span>Agenda</span>
        </a>
      </Button>
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
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-28 top-16 h-72 w-72 rounded-full bg-[#d4af37]/7 blur-3xl" />
        <div className="absolute -right-24 bottom-20 h-80 w-80 rounded-full bg-[#6f8d82]/6 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-none sm:max-w-4xl">
        <div className="mb-4 hidden items-center justify-center sm:flex">{actions}</div>

        <div className="relative">
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
