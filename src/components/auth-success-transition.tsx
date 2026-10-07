import Logo from "@/components/Logo";

export function AuthSuccessTransition({ open }: { open: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#08090d] text-white" role="status" aria-live="polite" aria-label="Acesso confirmado. Abrindo seu espaço Vellune.">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(212,175,55,0.16),transparent_20%),radial-gradient(circle_at_50%_45%,rgba(212,175,55,0.06),transparent_46%),linear-gradient(135deg,#08090d,#0d0f15,#08090d)]" />
      <div className="pointer-events-none absolute h-[min(70vw,720px)] w-[min(70vw,720px)] rounded-full border border-[#d4af37]/10 vellune-success-ring" />
      <div className="pointer-events-none absolute h-[min(42vw,440px)] w-[min(42vw,440px)] rounded-full border border-[#d4af37]/[0.06] vellune-success-ring vellune-success-ring-delay" />
      <div className="relative flex flex-col items-center">
        <div className="vellune-success-mark flex h-28 w-28 items-center justify-center drop-shadow-[0_0_50px_rgba(212,175,55,0.25)] sm:h-36 sm:w-36"><Logo markOnly className="h-full w-full" title="Vellune Digital" /></div>
        <div className="mt-8 text-center vellune-success-copy"><p className="text-[9px] font-semibold uppercase tracking-[0.34em] text-[#d4af37]">Acesso confirmado</p><p className="mt-2 font-display text-xl font-medium tracking-[-0.03em] text-white/80 sm:text-2xl">Abrindo seu espaço</p></div>
      </div>
      <style>{`
        @keyframes velluneSuccessMark { 0%{opacity:0;transform:scale(.18);filter:blur(7px)} 32%{opacity:1;transform:scale(1.55);filter:blur(0)} 58%{transform:scale(1.08)} 78%{transform:scale(1.2)} 100%{opacity:1;transform:scale(1)} }
        @keyframes velluneSuccessCopy { 0%,50%{opacity:0;transform:translateY(8px)} 100%{opacity:1;transform:translateY(0)} }
        @keyframes velluneSuccessRing { 0%{opacity:0;transform:scale(.6)} 45%{opacity:.8} 100%{opacity:0;transform:scale(1.35)} }
        .vellune-success-mark{animation:velluneSuccessMark 1150ms cubic-bezier(.16,1,.3,1) both}
        .vellune-success-copy{animation:velluneSuccessCopy 950ms cubic-bezier(.22,1,.36,1) 120ms both}
        .vellune-success-ring{animation:velluneSuccessRing 1250ms cubic-bezier(.16,1,.3,1) both infinite}
        .vellune-success-ring-delay{animation-delay:220ms}
        @media (prefers-reduced-motion:reduce){.vellune-success-mark,.vellune-success-copy,.vellune-success-ring{animation:none!important}}
      `}</style>
    </div>
  );
}
