import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Check, Copy, ExternalLink, Loader2, MailX, MessageCircle, Share2 } from "lucide-react";
import { InvitationCanvas } from "@/components/block-render";
import { Button } from "@/components/ui/button";
import { getPublicInvitation, recordInvitationView } from "@/lib/public-invitation.functions";
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
  const ok = res.state === "ok";

  useEffect(() => {
    if (!ok || viewed.has(slug)) return;
    viewed.add(slug);
    recordInvitationView({ data: { slug } }).catch(() => {});
  }, [ok, slug]);

  if (res.state === "not_found") return <Message title="Convite não encontrado." text="Confira se o link está correto." />;
  if (res.state !== "ok") return <Message title="Este convite ainda não está disponível." text="Volte mais tarde ou fale com quem enviou o convite." />;

  const i = res.invitation;
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/convite/${slug}` : `/convite/${slug}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${i.name} — ${publicUrl}`)}`;
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
    <main className="min-h-screen bg-gradient-to-b from-muted/60 via-background to-muted/40 px-4 py-8 sm:py-14" aria-label="Convite digital">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-5 flex flex-wrap items-center justify-center gap-2" aria-label="Compartilhar convite">
          <Button type="button" variant="outline" size="sm" onClick={copyLink}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado" : "Copiar link"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void share()}>
            <Share2 className="h-4 w-4" />Compartilhar
          </Button>
          <Button type="button" variant="outline" size="sm" asChild>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" />WhatsApp</a>
          </Button>
          <Button type="button" variant="ghost" size="sm" asChild>
            <a href={publicUrl} target="_blank" rel="noopener noreferrer" aria-label="Abrir convite em uma nova aba"><ExternalLink className="h-4 w-4" /></a>
          </Button>
        </div>
        <InvitationCanvas background={i.content?.settings?.background} blocks={i.content?.blocks ?? []} ctx={ctx} className="mx-auto max-w-lg gap-6 border-border/60 p-5 shadow-xl sm:p-10" />
        <p className="mt-8 text-center text-[11px] tracking-wide text-muted-foreground">Convite digital · Vellune Digital</p>
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
