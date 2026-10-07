import type { ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import Logo from "@/components/Logo";
import { AuthPremiumVisual } from "@/components/auth-premium-visual";
import { useEffect, useRef } from "react";

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
  const authScrollRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previous = {
      htmlBackground: html.style.backgroundColor,
      bodyBackground: body.style.backgroundColor,
      htmlColorScheme: html.style.colorScheme,
      bodyColorScheme: body.style.colorScheme,
    };
    html.style.backgroundColor = "#08090d";
    body.style.backgroundColor = "#08090d";
    html.style.colorScheme = "dark";
    body.style.colorScheme = "dark";
    return () => {
      html.style.backgroundColor = previous.htmlBackground;
      body.style.backgroundColor = previous.bodyBackground;
      html.style.colorScheme = previous.htmlColorScheme;
      body.style.colorScheme = previous.bodyColorScheme;
    };
  }, []);

  useEffect(() => {
    const section = authScrollRef.current;
    if (!section) return;

    const revealFocusedField = () => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement) || !section.contains(active)) return;
      window.requestAnimationFrame(() => {
        active.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      });
    };

    section.addEventListener("focusin", revealFocusedField);
    return () => section.removeEventListener("focusin", revealFocusedField);
  }, []);

  return (
    <main className="vellune-auth-root fixed inset-0 h-[100dvh] w-full max-w-full overflow-hidden overflow-x-clip overscroll-none bg-[#08090d] text-white selection:bg-[#d4af37]/25" style={{ colorScheme: "dark" }}>
      <style>{`
        @keyframes velluneAuthFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes velluneAuthGlow {
          0%, 100% { opacity: .35; transform: scale(1); }
          50% { opacity: .65; transform: scale(1.04); }
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
        <AuthPremiumVisual />

        <section ref={authScrollRef} className="flex h-full min-h-0 items-stretch justify-start overflow-y-auto overflow-x-clip overscroll-contain bg-[#08090d] px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-5 lg:items-stretch lg:justify-start lg:overflow-y-auto lg:border-l lg:border-white/[0.045] lg:bg-white/[0.012] xl:px-16">
          <div className="my-auto mx-auto flex w-full max-w-[430px] min-h-0 shrink-0 flex-col py-0.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:py-2">
            <div className="mb-3 flex w-full shrink-0 flex-col items-center justify-center lg:hidden sm:mb-7">
              <Logo className="h-10 w-auto max-w-[72vw] text-white transition-opacity duration-500 hover:opacity-90 sm:h-14" />
              <span className="mt-2 text-[8px] font-semibold uppercase tracking-[0.28em] text-white/25">Seu espaço de criação</span>
            </div>

            <div
              className="relative w-full overflow-hidden rounded-[20px] border border-white/[0.075] bg-[#111318]/94 p-4 shadow-[0_30px_100px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.035)] ring-1 ring-white/[0.018] backdrop-blur-xl sm:rounded-[28px] sm:p-9"
              style={{ animation: "velluneAuthFadeUp 800ms cubic-bezier(.22,1,.36,1)" }}
            >
              <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/35 to-transparent" />
              <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-[#d4af37]/[0.035] blur-3xl" />

              <div className="border-b border-white/[0.07] pb-4 sm:pb-6">
                <div className="mb-2 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.25em] text-[#d4af37] sm:text-[10px]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37] shadow-[0_0_8px_rgba(212,175,55,0.55)]" />
                  Área segura
                </div>
                <h1 className="font-display text-[24px] font-medium leading-[1.1] tracking-[-0.04em] sm:text-[32px]">
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

            <div className="mt-2 flex shrink-0 items-center justify-center gap-2 text-center text-[8px] font-medium uppercase tracking-[0.2em] text-white/20 sm:mt-5 sm:text-[9px]">
              <ShieldCheck className="h-3 w-3 text-[#d4af37]/60 sm:h-3.5 sm:w-3.5" />
              <span className="text-white/30">Vellune Secure</span>
              <span className="h-px w-3 bg-white/[0.09]" />
              <span>Ambiente protegido</span>
            </div>

            {footer}
          </div>
        </section>
      </div>
    </main>
  );
}
