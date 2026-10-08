import { CheckCircle2, Send, Sparkles } from "lucide-react";
import Logo from "@/components/Logo";

export function AuthPremiumVisual() {
  return (
    <section className="vellune-auth-visual relative hidden min-h-0 flex-col justify-between overflow-hidden px-10 py-8 lg:flex xl:px-20" style={{ animation: "velluneAuthFadeUp 750ms cubic-bezier(.22,1,.36,1)" }}>
      <style>{`
        .vellune-auth-invitation-stage { perspective: 1400px; }
        .vellune-auth-invitation-card {
          transform: rotateY(-7deg) rotateX(3deg) rotateZ(-0.6deg);
          transform-style: preserve-3d;
          box-shadow: 0 38px 90px rgba(0,0,0,.42), 18px 22px 0 rgba(212,175,55,.025), 0 1px 0 rgba(255,255,255,.08) inset;
          animation: velluneInvitationFloat 7s ease-in-out infinite;
        }
        .vellune-auth-invitation-card::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: inherit;
          background: linear-gradient(125deg, rgba(255,255,255,.08), transparent 28%, transparent 72%, rgba(212,175,55,.06));
          pointer-events: none;
        }
        .vellune-auth-invitation-depth { transform: translateZ(-34px) translateX(28px) translateY(18px); }
        .vellune-auth-editor-chrome { transform: translateZ(-12px) translateX(-22px) translateY(28px) rotateZ(.6deg); }
        @keyframes velluneInvitationFloat {
          0%,100% { transform: rotateY(-7deg) rotateX(3deg) rotateZ(-0.6deg) translate3d(0,0,0); }
          50% { transform: rotateY(-5deg) rotateX(2deg) rotateZ(-0.2deg) translate3d(0,-5px,0); }
        }
        @media (max-height: 840px) and (min-width: 1024px) {
          .vellune-auth-visual { padding-top: 1.5rem; padding-bottom: 1.5rem; }
          .vellune-auth-visual-content { padding-bottom: .75rem; scrollbar-width: none; }
          .vellune-auth-visual-content::-webkit-scrollbar { display: none; }
          .vellune-auth-visual-headline { font-size: clamp(2.65rem, 4.2vw, 4.35rem); }
          .vellune-auth-visual-copy { margin-top: 1rem; max-width: 28rem; line-height: 1.55; }
          .vellune-auth-visual-pills { margin-top: 1.1rem; }
          .vellune-auth-visual-preview { margin-top: 1.15rem; transform: scale(.86); transform-origin: left bottom; margin-bottom: -1.6rem; }
          .vellune-auth-visual-footer { transform: scale(.9); transform-origin: left bottom; }
        }
        @media (max-height: 730px) and (min-width: 1024px) {
          .vellune-auth-visual { padding-top: 1rem; padding-bottom: 1rem; }
          .vellune-auth-visual-content { padding-bottom: .25rem; }
          .vellune-auth-visual-headline { font-size: clamp(2.35rem, 3.8vw, 3.7rem); }
          .vellune-auth-visual-copy { margin-top: .8rem; }
          .vellune-auth-visual-preview { margin-top: .8rem; transform: scale(.76); margin-bottom: -3.4rem; }
        }
        @media (prefers-reduced-motion: reduce) {
          .vellune-auth-visual, .vellune-auth-invitation-card { animation: none !important; }
        }
      `}</style>

      <div className="flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#d4af37]/25 bg-[#d4af37]/[0.06] text-[#e5c66b] shadow-[0_0_24px_rgba(212,175,55,0.08)]" aria-hidden="true">
          <Sparkles className="h-4 w-4" />
        </span>
        <div>
          <Logo className="h-10 w-[208px] text-white transition-opacity duration-500 hover:opacity-90" />
          <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.3em] text-white/25">Convites com presença</p>
        </div>
      </div>

      <div className="vellune-auth-visual-content relative flex min-h-0 flex-1 items-center max-w-[690px] overflow-y-auto overflow-x-visible overscroll-contain pb-3 xl:pb-5">
        <div className="pointer-events-none absolute -left-28 -top-24 h-64 w-64 rounded-full bg-[#d4af37]/[0.035] blur-3xl" />
        <div className="relative w-full">
          <h1 className="vellune-auth-visual-headline max-w-[620px] font-display text-[clamp(3rem,4.7vw,5.25rem)] font-medium leading-[0.98] tracking-[-0.055em] text-white">
            Seu momento.<br /><span className="text-white/55">Do seu jeito.</span>
          </h1>
          <p className="vellune-auth-visual-copy mt-5 max-w-[500px] text-[15px] leading-7 text-white/45">
            Crie, personalize e publique experiências digitais que fazem cada celebração começar antes mesmo do evento.
          </p>

          <div className="vellune-auth-visual-pills mt-7 flex flex-wrap gap-2.5">
            {["Criar", "Personalizar", "Publicar"].map((label) => (
              <span key={label} className="rounded-full border border-white/[0.08] bg-white/[0.025] px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/40">
                {label}
              </span>
            ))}
          </div>

          <div className="vellune-auth-visual-preview vellune-auth-invitation-stage relative mt-6 w-[min(500px,94%)]">
            <div className="pointer-events-none absolute -right-10 top-3 h-56 w-56 rounded-full border border-[#d4af37]/10" />

            <div className="vellune-auth-editor-chrome absolute bottom-0 left-0 w-[62%] overflow-hidden rounded-[22px] border border-white/[0.07] bg-[#101217]/78 p-2.5 shadow-[0_26px_70px_rgba(0,0,0,.34)] backdrop-blur-xl">
              <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-2 pb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-white/20" /><span className="h-1.5 w-1.5 rounded-full bg-white/10" /><span className="h-1.5 w-1.5 rounded-full bg-white/[0.06]" />
                <span className="ml-2 text-[7px] font-semibold uppercase tracking-[0.22em] text-white/25">Vellune Studio</span>
              </div>
              <div className="mt-2 grid grid-cols-[52px_1fr] gap-2">
                <div className="space-y-1.5">
                  {[0,1,2,3].map((i) => <div key={i} className="h-7 rounded-lg border border-white/[0.05] bg-white/[0.022]" />)}
                </div>
                <div className="relative min-h-[118px] rounded-xl border border-white/[0.06] bg-[radial-gradient(circle_at_50%_15%,rgba(212,175,55,.12),transparent_42%),linear-gradient(145deg,#191b22,#0e1015)]">
                  <div className="absolute inset-5 rounded-lg border border-[#d4af37]/10 bg-[#11141a]/75" />
                </div>
              </div>
            </div>

            <div className="vellune-auth-invitation-depth pointer-events-none absolute inset-0 rounded-[28px] border border-[#d4af37]/10 bg-[#6f4d14]/[0.04]" />

            <div className="vellune-auth-invitation-card relative ml-auto w-[72%] overflow-hidden rounded-[28px] border border-[#d4af37]/18 bg-[radial-gradient(circle_at_50%_12%,rgba(244,213,130,.19),transparent_30%),linear-gradient(165deg,#24231f_0%,#15171a_55%,#0d0f13_100%)] p-5 sm:p-6">
              <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full border border-[#d4af37]/10" />
              <div className="pointer-events-none absolute -left-10 -bottom-14 h-28 w-28 rounded-full border border-white/[0.05]" />
              <div className="relative flex min-h-[230px] flex-col items-center justify-between text-center sm:min-h-[250px]">
                <div>
                  <p className="text-[8px] font-semibold uppercase tracking-[0.28em] text-[#d4af37]">Uma ocasião especial</p>
                  <div className="mx-auto mt-4 h-12 w-12 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/[0.06] shadow-[0_0_40px_rgba(212,175,55,.08)]" />
                  <p className="mt-4 font-display text-[25px] tracking-[-0.04em] text-white/92">Seu evento</p>
                  <p className="mt-1 text-[8px] uppercase tracking-[0.28em] text-white/32">Convite digital</p>
                </div>
                <div>
                  <div className="mx-auto h-px w-16 bg-gradient-to-r from-transparent via-[#d4af37]/55 to-transparent" />
                  <p className="mt-3 text-[8px] leading-4 text-white/38">Você está convidado</p>
                </div>
              </div>
            </div>

            <div className="absolute -bottom-4 right-0 flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#111318]/88 px-3 py-2 shadow-[0_16px_42px_rgba(0,0,0,.3)] backdrop-blur-xl">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#d4af37]" />
              <span className="text-[9px] text-white/38">Pronto para publicar</span>
              <Send className="h-3.5 w-3.5 text-white/22" />
            </div>
          </div>
        </div>
      </div>

      <div className="vellune-auth-visual-footer flex shrink-0 items-center text-[9px] font-medium uppercase tracking-[0.2em] text-white/25"><span>Experiência Vellune</span></div>
    </section>
  );
}
