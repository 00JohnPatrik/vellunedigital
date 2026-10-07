import type { ReactNode } from "react";
import { LockKeyhole, Sparkles } from "lucide-react";
import Logo from "@/components/Logo";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="vellune-auth-root fixed inset-0 h-[100dvh] w-full max-w-full overflow-hidden overscroll-none bg-[#08090d] text-white selection:bg-[#d4af37]/25">
      <style>{`
        @keyframes velluneAuthFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .vellune-auth-motion { animation: none !important; transition: none !important; }
        }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_18%,rgba(212,175,55,0.10),transparent_34%),radial-gradient(ellipse_at_82%_78%,rgba(74,64,43,0.16),transparent_38%),linear-gradient(135deg,#08090d_0%,#0d0f15_52%,#08090d_100%)]" />
      <div className="pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full border border-[#d4af37]/10" />
      <div className="pointer-events-none absolute -right-40 -bottom-40 h-[34rem] w-[34rem] rounded-full border border-white/[0.035]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.018)_50%,transparent_100%)]" />

      <div
        className="relative z-10 mx-auto grid h-full min-h-0 w-full max-w-[1440px] grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] vellune-auth-motion"
        style={{ animation: "velluneAuthFadeUp 650ms cubic-bezier(.22,1,.36,1)" }}
      >
        <section
          className="relative hidden min-h-0 flex-col justify-between overflow-hidden px-12 py-10 lg:flex xl:px-20"
          style={{ animation: "velluneAuthFadeUp 750ms cubic-bezier(.22,1,.36,1)" }}
        >
          <div>
            <Logo className="h-12 w-[248px] text-white transition-opacity duration-500 hover:opacity-90" />
          </div>

          <div className="max-w-[650px] pb-10 xl:pb-16">
            <div className="mb-7 flex items-center gap-3">
              <span className="h-px w-10 bg-[#d4af37]/70" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#e5c66b]">
                Convites digitais
              </span>
            </div>
            <h1 className="max-w-[620px] font-display text-[clamp(3.25rem,5vw,5.6rem)] font-medium leading-[0.98] tracking-[-0.055em] text-white">
              Seu momento.
              <br />
              <span className="text-white/55">Do seu jeito.</span>
            </h1>
            <p className="mt-8 max-w-[500px] text-[15px] leading-7 text-white/45">
              Uma experiência elegante para criar, personalizar e compartilhar convites que fazem cada celebração começar antes mesmo do evento.
            </p>
          </div>

          <div className="flex items-center gap-7 text-[10px] font-medium uppercase tracking-[0.2em] text-white/30">
            <span>Experiência Vellune</span>
            <span className="h-px w-8 bg-white/10" />
            <span>Acesso protegido</span>
          </div>
        </section>

        <section className="flex h-full min-h-0 items-center justify-center overflow-hidden px-3 py-2 sm:px-8 sm:py-5 lg:overflow-visible lg:border-l lg:border-white/[0.045] lg:bg-white/[0.012] xl:px-16">
          <div className="flex w-full max-w-[430px] min-h-0 shrink-0 flex-col py-0.5 sm:py-2">
            <div className="mb-3 flex w-full shrink-0 justify-center lg:hidden sm:mb-7">
              <Logo className="h-10 w-auto max-w-[72vw] text-white transition-opacity duration-500 hover:opacity-90 sm:h-14" />
            </div>

            <div
              className="relative w-full overflow-hidden rounded-[20px] border border-white/[0.075] bg-[#111318]/94 p-4 shadow-[0_30px_100px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.035)] ring-1 ring-white/[0.018] backdrop-blur-xl sm:rounded-[28px] sm:p-9"
              style={{ animation: "velluneAuthFadeUp 800ms cubic-bezier(.22,1,.36,1)" }}
            >
              <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/35 to-transparent" />
              <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-[#d4af37]/[0.035] blur-3xl" />

              <div className="border-b border-white/[0.07] pb-4 sm:pb-6">
                <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.25em] text-[#d4af37] sm:mb-2 sm:text-[10px]">
                  Área segura
                </p>
                <h1 className="font-display text-[26px] font-medium tracking-[-0.04em] sm:text-[32px]">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-2 max-w-md text-[13px] leading-5 text-white/45 sm:mt-3 sm:text-sm sm:leading-6">
                    {subtitle}
                  </p>
                )}
              </div>

              <div className="pt-4 sm:pt-6">{children}</div>
            </div>

            <div className="mt-2 flex shrink-0 items-center justify-center gap-2 text-center text-[8px] font-medium uppercase tracking-[0.22em] text-white/20 sm:mt-5 sm:text-[9px]">
              <LockKeyhole className="h-3 w-3 text-[#d4af37]/55 sm:h-3.5 sm:w-3.5" />
              <span>Dados protegidos</span>
              <Sparkles className="h-3 w-3 text-[#d4af37]/45 sm:h-3.5 sm:w-3.5" />
            </div>

            {footer}
          </div>
        </section>
      </div>
    </main>
  );
}
