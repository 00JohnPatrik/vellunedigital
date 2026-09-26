import type { ReactNode } from "react";
import { ArrowUpRight, LockKeyhole, Sparkles } from "lucide-react";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="relative flex min-h-screen overflow-hidden bg-auth px-4 py-6 text-foreground sm:px-6 sm:py-10">
      <div className="pointer-events-none absolute -left-32 top-[-10rem] h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-[-8rem] h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative z-10 m-auto grid w-full max-w-6xl items-center gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(420px,520px)] lg:gap-16">
        <section className="hidden max-w-lg space-y-8 lg:block" aria-label="Sobre a plataforma">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-card/80 p-2 shadow-sm backdrop-blur">
              <img src="/uploads/LogoClara.png" alt="Vellune Digital" className="block h-full w-full object-contain dark:hidden" />
              <img src="/uploads/logoEscura.jpg" alt="Vellune Digital" className="hidden h-full w-full rounded-xl object-contain dark:block" />
            </div>
            <div>
              <p className="font-display text-lg font-semibold tracking-tight">Vellune Digital</p>
              <p className="text-xs text-muted-foreground">Convites que marcam momentos</p>
            </div>
          </div>
          <div className="space-y-5">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Experiências feitas para encantar
            </p>
            <h2 className="font-display text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
              Seu próximo momento especial começa aqui.
            </h2>
            <p className="max-w-md text-base leading-7 text-muted-foreground">
              Crie, personalize e compartilhe convites digitais com uma experiência elegante para você e seus convidados.
            </p>
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-card shadow-sm ring-1 ring-border/60">
              <LockKeyhole className="h-4 w-4 text-primary" />
            </span>
            <span>Acesso protegido para sua equipe</span>
            <ArrowUpRight className="ml-auto h-4 w-4 text-primary" />
          </div>
        </section>

        <section className="w-full max-w-xl justify-self-center">
          <div className="mb-6 flex flex-col items-center gap-3 text-center lg:hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-border/70 bg-card p-2 shadow-sm">
              <img src="/uploads/LogoClara.png" alt="Vellune Digital" className="block h-full w-full object-contain dark:hidden" />
              <img src="/uploads/logoEscura.jpg" alt="Vellune Digital" className="hidden h-full w-full rounded-xl object-contain dark:block" />
            </div>
            <div>
              <p className="font-display text-xl font-semibold tracking-tight">Vellune Digital</p>
              <p className="mt-1 text-xs text-muted-foreground">Convites digitais com cuidado em cada detalhe</p>
            </div>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card/95 p-5 shadow-elevated backdrop-blur sm:p-8">
            <div className="border-b border-border/70 pb-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Área segura</p>
              <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
              {subtitle && <p className="mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{subtitle}</p>}
            </div>
            <div className="pt-6">{children}</div>
          </div>
          <p className="mt-5 text-center text-xs text-muted-foreground">Seus dados são tratados com segurança e privacidade.</p>
        </section>
      </div>
    </main>
  );
}
