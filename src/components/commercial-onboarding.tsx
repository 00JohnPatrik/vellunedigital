import { useMemo, useState } from "react";
import { Check, ChevronRight, CircleCheck, LayoutTemplate, Palette, Send, Sparkles, Users, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type OnboardingStep = {
  id: string;
  title: string;
  description: string;
  to?: "/customers" | "/templates" | "/invitations/new" | "/invitations";
  icon: typeof Users;
};

const STEPS: OnboardingStep[] = [
  { id: "customer", title: "Cadastre seu primeiro cliente", description: "Tenha os dados do anfitrião organizados antes de criar o convite.", to: "/customers", icon: Users },
  { id: "template", title: "Escolha um modelo", description: "Comece com uma composição Vellune pronta e personalize tudo.", to: "/templates", icon: LayoutTemplate },
  { id: "editor", title: "Personalize no Editor Pro", description: "Ajuste textos, fotos, cores, posições e efeitos no canvas.", to: "/invitations/new", icon: Palette },
  { id: "publish", title: "Publique e compartilhe", description: "Revise, publique e envie o convite pelo WhatsApp.", to: "/invitations", icon: Send },
];

const STORAGE_PREFIX = "vellune:commercial-onboarding:v1";

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}:${userId}`;
}

export function CommercialOnboarding({ userId, userName }: { userId: string; userName?: string | null }) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem(storageKey(userId)) === "dismissed"; } catch { return false; }
  });
  const [active, setActive] = useState(0);

  const visibleSteps = useMemo(() => STEPS, []);

  if (dismissed) return null;

  const step = visibleSteps[Math.min(active, visibleSteps.length - 1)]!;

  const dismiss = () => {
    try { localStorage.setItem(storageKey(userId), "dismissed"); } catch { /* optional */ }
    setDismissed(true);
  };

  const complete = () => {
    if (active < visibleSteps.length - 1) setActive((value) => value + 1);
    else dismiss();
  };

  return (
    <section className="relative mb-6 overflow-hidden rounded-[26px] border border-[#d4af37]/25 bg-[linear-gradient(135deg,#111318_0%,#151820_62%,#0c0e13_100%)] p-5 shadow-[0_28px_90px_-50px_rgba(212,175,55,0.6)] sm:p-6" aria-label="Comece com a Vellune">
      <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-[#d4af37]/10 blur-3xl" />
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#d4af37]/20 bg-[#d4af37]/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#e5c66b]">
              <Sparkles className="h-3 w-3" /> Primeiro passo
            </div>
            <h2 className="mt-3 font-display text-xl font-semibold tracking-[-0.025em] text-[#F5F7FA]">
              {userName ? `Olá, ${userName.split(" ")[0]}` : "Bem-vindo à Vellune"}
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#A9B1BF]">Siga este caminho rápido para transformar um cliente em um convite publicado, sem complicação.</p>
          </div>
          <button type="button" onClick={dismiss} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#A9B1BF] transition hover:bg-white/[0.06] hover:text-[#F5F7FA]" aria-label="Fechar guia inicial" title="Fechar guia">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-4">
          {visibleSteps.map((item, index) => {
            const Icon = item.icon;
            const done = index < active;
            const current = index === active;
            return (
              <button key={item.id} type="button" onClick={() => setActive(index)} className={cn(
                "group rounded-2xl border p-3 text-left transition-all",
                current ? "border-[#d4af37]/45 bg-[#d4af37]/10 shadow-[0_12px_30px_-18px_rgba(212,175,55,0.6)]" : "border-white/[0.07] bg-white/[0.025] hover:border-white/[0.14] hover:bg-white/[0.05]",
              )} aria-current={current ? "step" : undefined}>
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", current ? "bg-[#d4af37]/15 text-[#d4af37]" : "bg-white/[0.05] text-[#A9B1BF]")}>
                    {done ? <CircleCheck className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span className="text-[9px] font-semibold tabular-nums text-[#737b89]">{index + 1}/4</span>
                </div>
                <p className="mt-2 text-[11px] font-semibold text-[#F5F7FA]">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#8e97a7]">{item.description}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-white/[0.07] bg-[#08090d]/65 p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#d4af37]">Agora</p>
            <p className="mt-1 text-xs font-medium text-[#F5F7FA]">{step.title}</p>
            <p className="mt-0.5 text-[10px] leading-4 text-[#8e97a7]">{step.description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {step.to && <Button asChild size="sm" className="h-9 rounded-full bg-[#d4af37] px-4 text-[11px] font-semibold text-[#16130b] hover:bg-[#e5c66b]">
              <Link to={step.to}>{active === visibleSteps.length - 1 ? "Abrir convites" : "Continuar"}<ChevronRight className="h-3.5 w-3.5" /></Link>
            </Button>}
            <Button type="button" size="sm" variant="ghost" onClick={complete} className="h-9 rounded-full px-3 text-[10px] text-[#A9B1BF] hover:bg-white/[0.05] hover:text-[#F5F7FA]">
              {active === visibleSteps.length - 1 ? <><Check className="h-3.5 w-3.5" />Concluir guia</> : "Marcar como visto"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
