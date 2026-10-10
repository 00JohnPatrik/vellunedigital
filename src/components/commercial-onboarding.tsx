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
    <section className="relative mb-6 overflow-hidden rounded-[26px] border border-primary/25 bg-card p-5 shadow-vellune sm:p-6" aria-label="Comece com a Vellune">
      <div className="relative">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-normal text-primary-hover">
              <Sparkles className="h-3 w-3" /> Primeiro passo
            </div>
            <h2 className="mt-3 font-display text-xl font-semibold tracking-normal text-foreground">
              {userName ? `Olá, ${userName.split(" ")[0]}` : "Bem-vindo à Vellune"}
            </h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">Siga este caminho rápido para transformar um cliente em um convite publicado, sem complicação.</p>
          </div>
          <button type="button" onClick={dismiss} className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label="Fechar guia inicial" title="Fechar guia">
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
                current ? "border-primary/45 bg-primary/10 shadow-vellune" : "border-border bg-background/30 hover:border-primary-hover hover:bg-muted",
              )} aria-current={current ? "step" : undefined}>
                <div className="flex items-center justify-between gap-2">
                  <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", current ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                    {done ? <CircleCheck className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <span className="text-[9px] font-semibold tabular-nums text-muted-foreground">{index + 1}/4</span>
                </div>
                <p className="mt-2 text-[11px] font-semibold text-foreground">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted-foreground">{item.description}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-border bg-background/65 p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-normal text-primary">Agora</p>
            <p className="mt-1 text-xs font-medium text-foreground">{step.title}</p>
            <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">{step.description}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {step.to && <Button asChild size="sm" className="h-9 rounded-full bg-primary px-4 text-[11px] font-semibold text-primary-foreground hover:bg-primary-hover">
              <Link to={step.to}>{active === visibleSteps.length - 1 ? "Abrir convites" : "Continuar"}<ChevronRight className="h-3.5 w-3.5" /></Link>
            </Button>}
            <Button type="button" size="sm" variant="ghost" onClick={complete} className="h-9 rounded-full px-3 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground">
              {active === visibleSteps.length - 1 ? <><Check className="h-3.5 w-3.5" />Concluir guia</> : "Marcar como visto"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
