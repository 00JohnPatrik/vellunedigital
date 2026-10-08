import Logo from "@/components/Logo";

export function AuthSuccessTransition({
  open,
  eyebrow = "Acesso confirmado",
  title = "Abrindo seu espaço",
  ariaLabel = "Acesso confirmado. Abrindo seu espaço Vellune.",
}: {
  open: boolean;
  eyebrow?: string;
  title?: string;
  ariaLabel?: string;
}) {
  if (!open) return null;

  return (
    <div
      className="vellune-success-overlay fixed inset-0 z-[200] flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#08090d] text-white"
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
    >
      <div className="vellune-success-grid pointer-events-none absolute inset-0" />
      <div className="vellune-success-spotlight pointer-events-none absolute inset-0" />
      <div className="vellune-success-ring vellune-success-ring-one pointer-events-none absolute h-[min(72vw,760px)] w-[min(72vw,760px)] rounded-full border border-[#d4af37]/10" />
      <div className="vellune-success-ring vellune-success-ring-two pointer-events-none absolute h-[min(46vw,500px)] w-[min(46vw,500px)] rounded-full border border-white/[0.045]" />

      <div className="vellune-success-scene relative flex flex-col items-center">
        <div className="vellune-success-aura pointer-events-none absolute -inset-20 rounded-full" />
        <div className="vellune-success-3d-card pointer-events-none absolute inset-x-[-14%] top-[12%] mx-auto h-40 max-w-[360px] rounded-[32px] border border-white/[0.06] bg-white/[0.018]" />
        <div className="vellune-success-mark relative flex h-28 w-28 items-center justify-center sm:h-36 sm:w-36">
          <span className="vellune-success-mark-glow absolute inset-4 rounded-[30px]" />
          <Logo markOnly className="relative z-10 h-full w-full drop-shadow-[0_0_50px_rgba(212,175,55,0.28)]" title="Vellune Digital" />
        </div>

        <div className="vellune-success-copy mt-8 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-[0.34em] text-[#d4af37]">{eyebrow}</p>
          <p className="mt-2 font-display text-xl font-medium tracking-[-0.03em] text-white/85 sm:text-2xl">{title}</p>
          <div className="vellune-success-line mx-auto mt-4 h-px w-16 bg-gradient-to-r from-transparent via-[#d4af37]/50 to-transparent" />
        </div>
      </div>

      <style>{`
        .vellune-success-overlay {
          perspective: 1400px;
          background:
            radial-gradient(circle at 50% 48%, rgba(212,175,55,.10), transparent 18%),
            radial-gradient(circle at 50% 45%, rgba(212,175,55,.045), transparent 46%),
            linear-gradient(135deg,#08090d,#0d0f15 52%,#08090d);
        }
        .vellune-success-grid {
          opacity: .33;
          background-image:
            linear-gradient(rgba(255,255,255,.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
          background-size: 46px 46px;
          mask-image: radial-gradient(circle at center, black 0%, transparent 68%);
          animation: velluneSuccessGrid 4.5s ease-in-out infinite;
        }
        .vellune-success-spotlight {
          background: radial-gradient(ellipse at 50% 46%, rgba(244,213,130,.12), transparent 27%);
          animation: velluneSuccessSpotlight 2.4s ease-in-out infinite;
        }
        .vellune-success-scene { transform-style: preserve-3d; }
        .vellune-success-aura {
          background: radial-gradient(circle, rgba(212,175,55,.12), transparent 66%);
          filter: blur(28px);
          animation: velluneSuccessAura 1.8s ease-out both;
        }
        .vellune-success-3d-card {
          transform: rotateX(62deg) rotateZ(-6deg) translateZ(-55px);
          box-shadow: 0 35px 70px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.05);
          animation: velluneSuccessSlab 1250ms cubic-bezier(.16,1,.3,1) both;
        }
        .vellune-success-mark {
          transform-style: preserve-3d;
          filter: drop-shadow(0 24px 30px rgba(0,0,0,.25));
          animation: velluneSuccessMark 1050ms cubic-bezier(.16,1,.3,1) both;
        }
        .vellune-success-mark-glow {
          background: radial-gradient(circle, rgba(212,175,55,.28), transparent 68%);
          filter: blur(10px);
          transform: translateZ(-20px);
        }
        .vellune-success-copy { animation: velluneSuccessCopy 760ms cubic-bezier(.22,1,.36,1) 220ms both; }
        .vellune-success-ring { animation: velluneSuccessRing 1350ms cubic-bezier(.16,1,.3,1) both infinite; }
        .vellune-success-ring-two { animation-delay: 220ms; }
        .vellune-success-line { animation: velluneSuccessLine 900ms cubic-bezier(.22,1,.36,1) 340ms both; }

        @keyframes velluneSuccessMark {
          0% { opacity:0; transform: scale(.2) rotateX(22deg) rotateY(-18deg); }
          36% { opacity:1; transform: scale(1.16) rotateX(-5deg) rotateY(6deg); }
          62% { transform: scale(.97) rotateX(2deg) rotateY(-2deg); }
          100% { opacity:1; transform: scale(1) rotateX(0) rotateY(0); }
        }
        @keyframes velluneSuccessSlab {
          0% { opacity:0; transform: rotateX(76deg) rotateZ(-10deg) translateZ(-90px) scale(.72); }
          60% { opacity:1; transform: rotateX(60deg) rotateZ(-5deg) translateZ(-40px) scale(1.02); }
          100% { opacity:1; transform: rotateX(62deg) rotateZ(-6deg) translateZ(-55px) scale(1); }
        }
        @keyframes velluneSuccessCopy {
          0% { opacity:0; transform: translateY(10px) translateZ(-8px); }
          100% { opacity:1; transform: translateY(0) translateZ(0); }
        }
        @keyframes velluneSuccessRing {
          0% { opacity:0; transform: scale(.58); }
          35% { opacity:.82; }
          100% { opacity:0; transform: scale(1.36); }
        }
        @keyframes velluneSuccessLine {
          0% { opacity:0; transform: scaleX(.2); }
          100% { opacity:1; transform: scaleX(1); }
        }
        @keyframes velluneSuccessGrid {
          0%,100% { opacity:.24; transform: scale(1); }
          50% { opacity:.42; transform: scale(1.015); }
        }
        @keyframes velluneSuccessSpotlight {
          0%,100% { opacity:.72; transform: scale(1); }
          50% { opacity:1; transform: scale(1.035); }
        }
        @keyframes velluneSuccessAura {
          0% { opacity:0; transform:scale(.65); }
          100% { opacity:1; transform:scale(1); }
        }
        @media (prefers-reduced-motion:reduce) {
          .vellune-success-grid,.vellune-success-spotlight,.vellune-success-aura,.vellune-success-3d-card,.vellune-success-mark,.vellune-success-copy,.vellune-success-ring,.vellune-success-line {
            animation:none!important;
          }
        }
      `}</style>
    </div>
  );
}
