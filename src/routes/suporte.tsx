import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, MessageCircle, ShieldCheck } from "lucide-react";
import Logo from "@/components/Logo";
import { AuthPremiumVisual } from "@/components/auth-premium-visual";
import { whatsappHref } from "@/lib/nav";

export const Route = createFileRoute("/suporte")({
  head: () => ({
    meta: [
      { title: "Suporte — Vellune Digital" },
      { name: "description", content: "Canal de suporte da Vellune Digital." },
      { name: "theme-color", content: "#08090d" },
    ],
  }),
  component: SupportPage,
});

function SupportPage() {
  const supportUrl = whatsappHref("Olá, preciso de ajuda com meu acesso à Vellune Digital.");

  return (
    <main
      className="vellune-login-root fixed inset-0 h-[100dvh] w-full max-w-full overflow-hidden bg-[#08090d] text-white selection:bg-[#d4af37]/25"
      style={{ colorScheme: "dark" }}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_18%,rgba(212,175,55,0.10),transparent_34%),radial-gradient(ellipse_at_82%_78%,rgba(74,64,43,0.16),transparent_38%),linear-gradient(135deg,#08090d_0%,#0d0f15_52%,#08090d_100%)]" />
      <div className="pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full border border-[#d4af37]/10" />
      <div className="pointer-events-none absolute -right-40 -bottom-40 h-[34rem] w-[34rem] rounded-full border border-white/[0.035]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.018)_50%,transparent_100%)]" />

      <div
        className="relative z-10 mx-auto grid h-full min-h-0 w-full max-w-[1440px] grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]"
        style={{ animation: "velluneFadeUp 650ms cubic-bezier(.22,1,.36,1)" }}
      >
        <AuthPremiumVisual />

        <section className="vellune-auth-section flex h-full min-h-0 items-stretch justify-start overflow-x-clip overflow-y-auto overscroll-contain bg-[#08090d] px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-5 lg:h-full lg:min-h-0 lg:items-stretch lg:justify-start lg:overflow-y-auto lg:border-l lg:border-white/[0.045] lg:bg-white/[0.012] xl:px-16">
          <div className="my-auto mx-auto w-full max-w-[430px] shrink-0 py-1 sm:py-2">
            <div className="mb-4 flex w-full shrink-0 flex-col items-center justify-center lg:hidden sm:mb-9">
              <Logo className="h-11 w-auto max-w-[78vw] text-white transition-opacity duration-500 hover:opacity-90 sm:h-16" />
            </div>

            <div
              className="relative w-full overflow-hidden rounded-[20px] border border-white/[0.075] bg-[#111318]/94 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.035)] ring-1 ring-white/[0.018] backdrop-blur-xl sm:rounded-[28px] sm:p-9"
              style={{ animation: "velluneFadeUp 800ms cubic-bezier(.22,1,.36,1)" }}
            >
              <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/35 to-transparent" />
              <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-[#d4af37]/[0.035] blur-3xl" />

              <div className="relative z-10">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 rounded-md px-1 py-1 text-xs font-medium text-white/40 transition-colors hover:text-[#e5c66b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/20"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao login
                </Link>

                <div className="mt-7 flex h-11 w-11 items-center justify-center rounded-full border border-[#d4af37]/25 bg-[#d4af37]/10 text-[#e5c66b] shadow-[0_0_34px_rgba(212,175,55,.08)]">
                  <MessageCircle className="h-5 w-5" />
                </div>

                <div className="mt-6">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#d4af37]">Atendimento</p>
                  <h1 className="font-display text-[32px] font-medium tracking-[-0.04em] sm:text-[34px]">Precisa de ajuda?</h1>
                  <p className="mt-3 text-sm leading-6 text-white/45">
                    Fale diretamente com o suporte da Vellune para resolver dúvidas de acesso, recuperação de senha e utilização da plataforma.
                  </p>
                </div>

                <div className="mt-7 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#d4af37]/15 bg-[#d4af37]/[0.05] text-[#e5c66b]">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/65">Suporte direto</p>
                      <p className="mt-1 text-[13px] leading-5 text-white/35">WhatsApp oficial da Vellune Digital.</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-white/[0.05] bg-[#0d0f13]/70 px-3.5 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/25">WhatsApp</p>
                    <p className="mt-1 text-sm font-medium text-white/70">(85) 98933-5371</p>
                  </div>

                  {supportUrl ? (
                    <a
                      href={supportUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Abrir o WhatsApp da Vellune Digital" title="Abrir WhatsApp"
                      className="vellune-auth-cta mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#d4af37] px-5 text-sm font-semibold text-[#16130b] shadow-[0_12px_34px_rgba(212,175,55,0.10)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#e5c66b] hover:shadow-[0_16px_38px_rgba(212,175,55,0.16)]"
                    >
                      Falar pelo WhatsApp
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  ) : (
                    <div className="mt-4 rounded-xl border border-dashed border-white/[0.08] px-4 py-3 text-xs leading-5 text-white/35">
                      O canal de WhatsApp não está configurado nesta implantação.
                    </div>
                  )}
                </div>

                <div className="mt-5 flex items-start gap-2 text-[11px] leading-5 text-white/30">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#d4af37]/55" />
                  <p>Por segurança, nunca compartilhe sua senha ou códigos de recuperação com o suporte.</p>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-2 text-center text-[10px] leading-4 text-white/25 sm:mt-4 sm:text-[11px]">
              <a href="/protecao-dados" className="transition-colors hover:text-white/60">Privacidade</a>
              <span aria-hidden="true" className="text-white/10">•</span>
              <a href="/termos" className="transition-colors hover:text-white/60">Termos de uso</a>
              <span aria-hidden="true" className="text-white/10">•</span>
              <span className="inline-flex items-center gap-1 font-medium text-[#d4af37]/75">
                <MessageCircle className="h-3 w-3" />
                Suporte direto
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
