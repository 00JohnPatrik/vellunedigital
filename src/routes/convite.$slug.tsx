import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, ExternalLink, Loader2, MailX, MessageCircle, Share2, Sparkles } from "lucide-react";
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
    return {
      meta: [
        { title: i.name },
        { name: "description", content: desc },
        { property: "og:title", content: i.name },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: publicPath },
        { property: "og:site_name", content: "Vellune Digital" },
        { name: "twitter:card", content: "summary" },
        { name: "twitter:title", content: i.name },
        { name: "twitter:description", content: desc },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: PublicInvitationPage,
  errorComponent: () => <Message title="Não foi possível abrir o convite." text="Tente novamente em alguns instantes." />,
  notFoundComponent: () => <Message title="Convite não encontrado." text="Confira se o link está correto." />,
});

const viewed = new Set<string>();

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
  const [copied, setCopied] = useState(false);
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
      setCopied(true);
      toast.success("Link copiado.");
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("Não foi possível copiar o link.");
    }
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

  const share = async () => {
    if (typeof navigator.share !== "function") {
      await copyLink();
      return;
    }
    try {
      await navigator.share({ title: i.name, text: "Confira este convite", url: publicUrl });
    } catch {
      // Cancelamento pelo visitante não é um erro da página.
    }
  };

  return (
    <main className="min-h-screen bg-[#08090d] px-4 py-8 text-[#F5F7FA] sm:py-14" style={{ "--brand-primary": branding?.primary_color ?? undefined, "--brand-accent": branding?.accent_color ?? undefined } as CSSProperties} aria-label="Convite digital">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-5 flex flex-wrap items-center justify-center gap-2" aria-label="Ações do convite">
          <Button type="button" variant="outline" size="sm" className="rounded-full border-[#2a2b31] bg-[#111318] text-[#F5F7FA] hover:bg-[#171a20]" onClick={copyLink}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado" : "Copiar link"}
          </Button>
          <Button type="button" variant="outline" size="sm" className="rounded-full border-[#2a2b31] bg-[#111318] text-[#F5F7FA] hover:bg-[#171a20]" onClick={() => void share()}>
            <Share2 className="h-4 w-4" />Compartilhar
          </Button>
          <Button type="button" variant="outline" size="sm" className="rounded-full border-[#2a2b31] bg-[#111318] text-[#F5F7FA] hover:bg-[#171a20]" asChild>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" />WhatsApp</a>
          </Button>
          <Button type="button" variant="ghost" size="sm" className="rounded-full text-[#A9B1BF] hover:bg-[#111318] hover:text-[#F5F7FA]" asChild>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" aria-label="Abrir convite em uma nova aba"><ExternalLink className="h-4 w-4" /></a>
          </Button>
        </div>
        {hasSensorAnimation && !motionReady && (
          <div className="mb-5 flex items-center justify-center">
            <Button type="button" size="sm" onClick={() => void enableMotion()} className="rounded-full bg-[#d4af37] text-[#16130b] hover:bg-[#e5c66b]">
              <Sparkles className="h-4 w-4" />Ativar movimento do convite
            </Button>
          </div>
        )}
        {(branding?.logo_url || branding?.brand_name) && (
          <div className="mb-5 flex flex-col items-center gap-2 rounded-2xl border border-[#2a2b31] bg-[#111318]/80 p-4 text-center backdrop-blur-md">
            {branding.logo_url && <img src={branding.logo_url} alt={branding.brand_name ?? "Logo da empresa"} className="max-h-16 max-w-48 object-contain" />}
            {branding.brand_name && <span className="text-sm font-medium text-foreground">{branding.brand_name}</span>}
          </div>
        )}
        <InvitationCanvas background={i.content?.settings?.background} blocks={i.content?.blocks ?? []} ctx={ctx} className="mx-auto max-w-lg gap-6 border-border/60 p-5 shadow-xl sm:p-10" />
        <footer className="mt-8 flex flex-col items-center gap-2 text-center text-[11px] tracking-wide text-[#A9B1BF]">
          {branding?.whatsapp_number && <a className="text-[#d4af37] hover:text-[#e5c66b] hover:underline" href={`https://wa.me/${branding.whatsapp_number.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">Fale conosco pelo WhatsApp</a>}
          {branding?.contact_email && <a className="text-[#A9B1BF] hover:text-[#F5F7FA] hover:underline" href={`mailto:${branding.contact_email}`}>{branding.contact_email}</a>}
          {(branding?.show_vellune_branding ?? true) && <span>Convite digital · Vellune Digital</span>}
          {!branding?.show_vellune_branding && branding?.brand_name && <span>{branding.brand_name}</span>}
        </footer>
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
