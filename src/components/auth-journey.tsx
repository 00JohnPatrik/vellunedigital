import { Check } from "lucide-react";

type AuthJourneyStep = 1 | 2 | 3;

export function AuthJourneySteps({
  activeStep,
  labels = ["Acesso", "Verificação", "Segurança"],
}: {
  activeStep: AuthJourneyStep;
  labels?: [string, string, string];
}) {
  return (
    <div className="vellune-auth-journey mb-5 grid grid-cols-3 gap-2 sm:mb-6 sm:gap-2.5" aria-label="Etapas do acesso Vellune">
      {labels.map((label, index) => {
        const step = (index + 1) as AuthJourneyStep;
        const complete = step < activeStep;
        const active = step === activeStep;
        return (
          <div
            key={label}
            className={[
              "relative min-w-0 rounded-xl border px-2.5 py-2.5 text-center transition-[border-color,background-color,box-shadow] duration-300 sm:px-3",
              active
                ? "border-[#d4af37]/25 bg-[#d4af37]/[0.065] shadow-[inset_0_0_0_1px_rgba(212,175,55,0.035)]"
                : complete
                  ? "border-[#d4af37]/15 bg-white/[0.028]"
                  : "border-white/[0.065] bg-white/[0.018]",
            ].join(" ")}
          >
            {index < labels.length - 1 && (
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute left-[calc(100%+4px)] top-1/2 hidden h-px w-2 -translate-y-1/2 sm:block ${complete ? "bg-[#d4af37]/35" : "bg-white/[0.07]"}`}
              />
            )}
            <span
              className={[
                "mx-auto flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold transition-all duration-300",
                active
                  ? "bg-[#d4af37] text-[#16130b] shadow-[0_0_18px_rgba(212,175,55,0.16)]"
                  : complete
                    ? "border border-[#d4af37]/30 bg-[#d4af37]/10 text-[#e5c66b]"
                    : "border border-white/[0.10] text-white/35",
              ].join(" ")}
            >
              {complete ? <Check className="h-3 w-3" /> : step}
            </span>
            <p className={`mt-2 truncate text-[8px] font-semibold uppercase tracking-[0.12em] sm:text-[9px] ${active ? "text-white/55" : complete ? "text-white/40" : "text-white/30"}`}>
              {label}
            </p>
          </div>
        );
      })}
    </div>
  );
}
