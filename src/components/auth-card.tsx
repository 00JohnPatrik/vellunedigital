import type { ReactNode } from "react";
import { Mail } from "lucide-react";

export function AuthCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-auth px-4 py-8 sm:px-6 sm:py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
            <Mail className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-xl font-semibold tracking-tight">Vellune Digital</p>
            <p className="mt-1 text-xs text-muted-foreground">Convites digitais com cuidado em cada detalhe</p>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-6 shadow-elevated sm:p-8">
          <div className="border-b pb-5">
            <h1 className="font-display text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="pt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-xs text-muted-foreground">Acesso seguro para sua equipe</p>
      </div>
    </div>
  );
}
