import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MailX } from "lucide-react";
import { InvitationCanvas } from "@/components/block-render";
import { getPublicInvitation, recordInvitationView } from "@/lib/public-invitation.functions";

export const Route = createFileRoute("/convite/$slug")({
  loader: ({ params }) => getPublicInvitation({ data: { slug: params.slug } }),
  head: ({ loaderData }) => {
    if (!loaderData || loaderData.state !== "ok") {
      return { meta: [{ title: "Convite indisponível — Vellune Digital" }, { name: "robots", content: "noindex" }] };
    }
    const i = loaderData.invitation;
    const desc = i.message?.slice(0, 150) || `Você está convidado! ${new Date(`${i.event_date}T00:00:00`).toLocaleDateString("pt-BR")}${i.venue_name ? ` · ${i.venue_name}` : ""}`;
    return {
      meta: [
        { title: i.name }, { name: "description", content: desc },
        { property: "og:title", content: i.name }, { property: "og:description", content: desc },
        { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: PublicInvitationPage,
  errorComponent: () => <Message title="Não foi possível abrir o convite." text="Tente novamente em alguns instantes." />,
  notFoundComponent: () => <Message title="Convite não encontrado." text="Confira se o link está correto." />,
});

// Slugs already counted in this page load — guards against re-renders / StrictMode double effects.
const viewed = new Set<string>();

function PublicInvitationPage() {
  const res = Route.useLoaderData();
  const { slug } = Route.useParams();
  const ok = res.state === "ok";
  useEffect(() => {
    if (!ok || viewed.has(slug)) return;
    viewed.add(slug);
    recordInvitationView({ data: { slug } }).catch(() => {});
  }, [ok, slug]);
  if (res.state === "not_found") return <Message title="Convite não encontrado." text="Confira se o link está correto." />;
  if (res.state !== "ok") return <Message title="Este convite ainda não está disponível." text="Volte mais tarde ou fale com quem enviou o convite." />;
  const i = res.invitation;
  const ctx = {
    event_date: i.event_date, event_time: i.event_time, venue_name: i.venue_name, address: i.address, city: i.city, state: i.state,
    publicUrl: typeof window !== "undefined" ? `${window.location.origin}/convite/${slug}` : `/convite/${slug}`,
    rsvp: i.rsvp ?? { enabled: false as const }, slug,
  };
  return (
    <main className="min-h-screen bg-gradient-to-b from-muted/60 via-background to-muted/40 px-4 py-8 sm:py-14" aria-label="Convite digital">
      <div className="mx-auto w-full max-w-2xl">
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
