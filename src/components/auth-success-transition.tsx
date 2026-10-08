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
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.14),transparent_22%),radial-gradient(circle_at_50%_45%,rgba(212,175,55,0.05),transparent_48%),linear-gradient(135deg,#08090d,#0d0f15,#08090d)]" />

      <div className="vellune-success-ring vellune-success-ring-one pointer-events-none absolute h-[min(70vw,720px)] w-[min(70vw,720px)] rounded-full border border-[#d4af37]/10" />
      <div className="vellune-success-ring vellune-success-ring-two pointer-events-none absolute h-[min(42vw,440px)] w-[min(42vw,440px)] rounded-full border border-[#d4af37]/[0.055]" />

      <div className="vellune-success-scene relative flex flex-col items-center">
        <div className="vellune-success-aura pointer-events-none absolute -inset-16 rounded-full" />

        <div className="vellune-success-mark relative flex h-28 w-28 items-center justify-center sm:h-36 sm:w-36">
          <span className="vellune-success-mark-glow absolute inset-5 rounded-[28px]" />
          <Logo markOnly className="relative z-10 h-full w-full drop-shadow-[0_0_46px_rgba(212,175,55,0.23)]" title="Vellune Digital" />
        </div>

        <div className="vellune-success-copy mt-8 text-center">
          <p className="text-[9px] font-semibold uppercase tracking-[0.34em] text-[#d4af37]">{eyebrow}</p>
          <p className="mt-2 font-display text-xl font-medium tracking-[-0.03em] text-white/80 sm:text-2xl">{title}</p>
        </div>
      </div>

      <style>{`
        .vellune-success-overlay {
          perspective: 1200px;
        }

        .vellune-success-scene {
          transform-style: preserve-3d;
        }

        .vellune-success-mark {
          transform-style: preserve-3d;
          animation: velluneSuccessMark 900ms cubic-bezier(.16,1,.3,1) both;
        }

        .vellune-success-mark-glow {
          background: radial-gradient(circle, rgba(212,175,55,.20), transparent 70%);
          filter: blur(11px);
          transform: translateZ(-16px) scale(.82);
          animation: velluneSuccessGlow 900ms ease-out both;
        }

        .vellune-success-copy {
          animation: velluneSuccessCopy 620ms cubic-bezier(.22,1,.36,1) 120ms both;
        }

        .vellune-success-ring {
          animation: velluneSuccessRing 1050ms cubic-bezier(.16,1,.3,1) both;
        }

        .vellune-success-ring-two {
          animation-delay: 120ms;
          opacity: .7;
        }

        .vellune-success-aura {
          background: radial-gradient(circle, rgba(212,175,55,.09), transparent 68%);
          filter: blur(30px);
          animation: velluneSuccessAura 1100ms ease-out both;
        }

        @keyframes velluneSuccessMark {
          0% {
            opacity: 0;
            transform: scale(.82) rotateX(10deg) rotateY(-8deg) translateY(8px);
          }
          48% {
            opacity: 1;
            transform: scale(1.035) rotateX(-2deg) rotateY(2deg) translateY(0);
          }
          100% {
            opacity: 1;
            transform: scale(1) rotateX(0) rotateY(0) translateY(0);
          }
        }

        @keyframes velluneSuccessGlow {
          0% {
            opacity: 0;
            transform: translateZ(-18px) scale(.58);
          }
          55% {
            opacity: .95;
            transform: translateZ(-16px) scale(1.05);
          }
          100% {
            opacity: .72;
            transform: translateZ(-16px) scale(.9);
          }
        }

        @keyframes velluneSuccessCopy {
          0% {
            opacity: 0;
            transform: translateY(7px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes velluneSuccessRing {
          0% {
            opacity: 0;
            transform: scale(.68);
          }
          35% {
            opacity: .64;
          }
          100% {
            opacity: 0;
            transform: scale(1.28);
          }
        }

        @keyframes velluneSuccessAura {
          0% {
            opacity: 0;
            transform: scale(.78);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .vellune-success-mark,
          .vellune-success-mark-glow,
          .vellune-success-copy,
          .vellune-success-ring,
          .vellune-success-aura {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
