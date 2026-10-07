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
    <main className="fixed inset-0 overflow-y-auto overscroll-contain bg-[#08090d] text-white selection:bg-[#d4af37]/25 lg:overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_18%,rgba(212,175,55,0.10),transparent_34%),radial-gradient(ellipse_at_82%_78%,rgba(74,64,43,0.16),transparent_38%),linear-gradient(135deg,#08090d_0%,#0d0f15_52%,#08090d_100%)]" />
      <div className="pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full border border-[#d4af37]/10" />
      <div className="pointer-events-none absolute -right-40 -bottom-40 h-[34rem] w-[34rem] rounded-full border border-white/[0.035]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.018)_50%,transparent_100%)]" />

      <div className="relative z-10 mx-auto grid min-h-full w-full max-w-[1440px] grid-cols-1 lg:h-full lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative hidden min-h-0 flex-col justify-between overflow-hidden px-12 py-10 lg:flex xl:px-20">
          <Logo className="h-12 w-[248px] text-white transition-opacity duration-500 hover:opacity-90" />

          <div className="max-w-[650px] pb-10 xl:pb-16">
            <div className="mb-7 flex items-center gap-3">
              <span className="h-px w-10 bg-[#d4af37]/70" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#e5c66b]">Acesso seguro</span>
            </div>
            <h2 className="max-w-[620px] font-display text-[clamp(3rem,4.7vw,5rem)] font-medium leading-[0.99] tracking-[-0.055em] text-white">
              Seu momento.
              <br />
              <span className="text-white/55">Do seu jeito.</span>
            </h2>
            <p className="mt-8 max-w-[500px] text-[15px] leading-7 text-white/45">
              Uma experiência elegante para criar e administrar convites digitais com segurança em cada etapa.
            </p>
          </div>

          <div className="flex items-center gap-7 text-[10px] font-medium uppercase tracking-[0.2em] text-white/30">
            <span>Experiência Vellune</span>
            <span className="h-px w-8 bg-white/10" />
            <span>Acesso protegido</span>
          </div>
        </section>

        <section className="flex min-h-full items-center justify-center px-4 py-5 sm:px-8 lg:h-full lg:min-h-0 lg:border-l lg:border-white/[0.045] lg:bg-white/[0.012] xl:px-16">
          <div className="w-full max-w-[430px] py-1 sm:py-2">
            <div className="mb-6 flex justify-center lg:hidden sm:mb-8">
              <Logo className="h-11 w-[225px] text-white" />
            </div>

            <div className="relative overflow-hidden rounded-[24px] border border-white/[0.075] bg-[#111318]/92 p-5 shadow-[0_30px_100px_rgba(0,0,0,0.46)] backdrop-blur-xl sm:rounded-[28px] sm:p-9">
              <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/35 to-transparent" />
              <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-[#d4af37]/[0.035] blur-3xl" />

              <div className="border-b border-white/[0.07] pb-6">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#d4af37]">Área segura</p>
                <h1 className="font-display text-[30px] font-medium tracking-[-0.04em] sm:text-[32px]">{title}</h1>
                {subtitle && <p className="mt-3 max-w-md text-sm leading-6 text-white/45">{subtitle}</p>}
              </div>

              <div className="pt-6">{children}</div>
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 text-center text-[9px] font-medium uppercase tracking-[0.22em] text-white/20">
              <LockKeyhole className="h-3.5 w-3.5 text-[#d4af37]/55" />
              <span>Dados protegidos</span>
              <Sparkles className="h-3.5 w-3.5 text-[#d4af37]/45" />
            </div>
            {footer}
          </div>
        </section>
      </div>
    </main>
  );
}
