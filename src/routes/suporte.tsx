import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, MessageCircle, ShieldCheck } from "lucide-react";
import { whatsappHref } from "@/lib/nav";

export const Route = createFileRoute("/suporte")({
  head: () => ({
    meta: [
      { title: "Suporte — Vellune Digital" },
      { name: "description", content: "Canal de suporte da Vellune Digital." },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  const supportUrl = whatsappHref("Olá, preciso de ajuda com meu acesso à Vellune Digital.");

  return (
    <main className="min-h-[100svh] bg-background text-foreground">
      <div className="mx-auto flex min-h-[100svh] w-full max-w-3xl items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full rounded-[28px] border border-border bg-card/80 p-6 shadow-2xl sm:p-10">
          <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar ao acesso
          </Link>
          <div className="mt-10 flex h-12 w-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
            <MessageCircle className="h-5 w-5" />
          </div>
          <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.24em] text-primary">Atendimento</p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-[-.045em] sm:text-5xl">Precisa de ajuda?</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            Use o canal direto de suporte para resolver dúvidas de acesso, recuperação de senha e utilização da plataforma.
          </p>

          <div className="mt-8 rounded-2xl border border-border bg-background/50 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Suporte Vellune
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Atendimento pelo WhatsApp, quando o canal estiver configurado para esta implantação.
            </p>
            <div className="mt-5">
              {supportUrl ? (
                <a
                  href={supportUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
                >
                  Abrir WhatsApp <ExternalLink className="h-4 w-4" />
                </a>
              ) : (
                <div className="rounded-xl border border-dashed border-border px-4 py-3 text-xs text-muted-foreground">
                  O canal direto ainda não foi configurado para esta implantação.
                </div>
              )}
            </div>
          </div>

          <p className="mt-6 text-xs leading-5 text-muted-foreground/70">
            Não compartilhe sua senha ou códigos de recuperação com o suporte.
          </p>
        </div>
      </div>
    </main>
  );
}
