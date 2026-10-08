import { AlertTriangle, ArrowRight, RefreshCw, ShieldCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import Logo from "@/components/Logo";
import { AuthCommercialFooter } from "@/components/auth-commercial-footer";

export function AuthUnavailableState({
  title = "O acesso está temporariamente indisponível",
  description = "O serviço de autenticação não respondeu como esperado. Seus dados continuam protegidos. Tente novamente em instantes.",
  onRetry,
  compact = false,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <div className={["flex w-full items-center justify-center text-white", compact ? "min-h-[340px]" : "min-h-[100dvh] px-4 py-8"].join(" ")}>
      <div className={compact ? "w-full max-w-[430px]" : "w-full max-w-[560px]"}>
        <div className="relative overflow-hidden rounded-[24px] border border-white/[0.075] bg-[#111318]/94 p-5 text-center shadow-[0_30px_100px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.035)] ring-1 ring-white/[0.018] backdrop-blur-xl sm:rounded-[28px] sm:p-8">
          <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/35 to-transparent" />
          <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-[#d4af37]/[0.035] blur-3xl" />
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-[#d4af37]/20 bg-[#d4af37]/[0.07] text-[#e5c66b] shadow-[0_0_30px_rgba(212,175,55,0.08)]">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="mt-6 flex flex-col items-center">
            <Logo markOnly className="h-12 w-12 opacity-90" title="Vellune Digital" />
            <p className="mt-5 text-[9px] font-semibold uppercase tracking-[0.28em] text-[#d4af37]">Acesso protegido</p>
            <h1 className="mt-2 max-w-[460px] font-display text-[25px] font-medium leading-tight tracking-[-0.035em] text-white sm:text-[30px]">{title}</h1>
            <p className="mt-3 max-w-[460px] text-[13px] leading-6 text-white/45 sm:text-sm">{description}</p>
          </div>
          <div className="mt-6 rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3.5 text-left">
            <div className="flex items-center gap-2 text-xs font-semibold text-white/70"><ShieldCheck className="h-4 w-4 shrink-0 text-[#d4af37]" />Ambiente protegido</div>
            <p className="mt-1.5 text-[11px] leading-5 text-white/35">Não é necessário repetir seus dados enquanto verificamos o serviço.</p>
          </div>
          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
            <button type="button" onClick={onRetry ?? (() => window.location.reload())} className="vellune-auth-cta inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#d4af37] px-5 text-sm font-semibold text-[#16130b] shadow-[0_12px_34px_rgba(212,175,55,0.10)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#e5c66b] hover:shadow-[0_16px_38px_rgba(212,175,55,0.16)] active:translate-y-0">
              <RefreshCw className="h-4 w-4" />Tentar novamente
            </button>
            <Link to="/login" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 text-sm font-semibold text-white/65 transition-colors hover:border-[#d4af37]/20 hover:text-[#e5c66b]">Voltar ao acesso<ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="mt-5 flex items-center justify-center gap-2 text-[8px] font-medium uppercase tracking-[0.2em] text-white/20 sm:text-[9px]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#d4af37]/55" />VELLUNE SECURE
          </div>
          <AuthCommercialFooter />
        </div>
      </div>
    </div>
  );
}
