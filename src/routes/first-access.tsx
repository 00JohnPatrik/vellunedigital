import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, LoaderCircle, Mail, MailCheck, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestFirstAccess } from "@/lib/auth.functions";
import { isAuthServiceUnavailable } from "@/lib/app-user";
import { AuthJourneySteps } from "@/components/auth-journey";
import { AuthUnavailableState } from "@/components/auth-unavailable-state";

export const Route = createFileRoute("/first-access")({
  head: () => ({
    meta: [
      { title: "Primeiro acesso — Vellune Digital" },
      { name: "description", content: "Ative sua conta e crie sua senha." },
      { name: "theme-color", content: "#08090d" },
    ],
  }),
  component: FirstAccessPage,
});

function FirstAccessPage() {
  const request = useServerFn(requestFirstAccess);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorIsValidation, setErrorIsValidation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [authUnavailable, setAuthUnavailable] = useState(false);
  const emailRef = useRef<HTMLInputElement | null>(null);
  const requestLockRef = useRef(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = window.setTimeout(() => setResendCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  async function resendLink() {
    if (loading || resendCooldown > 0 || requestLockRef.current) return;
    const normalizedEmail = email.trim().toLowerCase();
    const parsed = z.string().email().max(255).safeParse(normalizedEmail);
    if (!parsed.success) {
      setError("Digite um e-mail válido, como voce@empresa.com.");
      setErrorIsValidation(true);
      return;
    }
    setEmail(parsed.data);
    requestLockRef.current = true;
    setLoading(true);
    setError(null);
    setErrorIsValidation(false);
    try {
      await request({ data: { email: parsed.data } });
      setResendCooldown(30);
    } catch (err) {
      if (isAuthServiceUnavailable(err)) setAuthUnavailable(true);
    } finally {
      setLoading(false);
      requestLockRef.current = false;
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (requestLockRef.current) return;
    const normalizedEmail = email.trim().toLowerCase();
    const parsed = z.string().email().max(255).safeParse(normalizedEmail);
    if (!parsed.success) {
      setError("Digite um e-mail válido, como voce@empresa.com.");
      setErrorIsValidation(true);
      return;
    }
    setEmail(parsed.data);

    if (resendCooldown > 0) return;
    setLoading(true);
    setError(null);
    setErrorIsValidation(false);

    try {
      await request({ data: { email: parsed.data } });
      setSent(true);
      setResendCooldown(30);
    } catch (err) {
      if (isAuthServiceUnavailable(err)) {
        setAuthUnavailable(true);
        return;
      }
      setError("Não foi possível processar agora. Tente novamente.");
    } finally {
      setLoading(false);
      requestLockRef.current = false;
    }
  }

  if (authUnavailable) {
    return (
      <main className="vellune-auth-root fixed inset-0 h-[100dvh] w-full overflow-hidden bg-[#08090d] text-white">
        <AuthUnavailableState onRetry={() => { setAuthUnavailable(false); window.location.reload(); }} />
      </main>
    );
  }

  return (
    <AuthCard
      title="Comece seu primeiro acesso"
      subtitle="Use o e-mail cadastrado pelo administrador para ativar sua conta."
    >
      {sent ? (
        <div role="status" aria-live="polite">
          <AuthJourneySteps activeStep={2} labels={["Solicitar", "Verificar", "Criar senha"]} />
          <div className="space-y-4 rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/[0.055] p-4 sm:space-y-5 sm:p-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d4af37]/25 bg-[#d4af37]/10 text-[#e5c66b]">
              <MailCheck className="h-5 w-5" />
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#d4af37]">Etapa 2 · Verificação</p>
              <h2 className="font-display text-[23px] font-medium leading-[1.12] tracking-[-0.03em] text-white sm:text-[26px]">Confira seu e-mail</h2>
              <p className="text-[13px] leading-5 text-white/45 sm:text-sm sm:leading-6">Enviamos um link seguro para o e-mail informado pelo administrador. Abra-o para continuar e criar sua senha.</p>
            </div>
            <p className="flex items-center gap-2 text-[11px] text-white/35 sm:text-xs">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-[#d4af37]" />
              Confira também a pasta de spam.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" disabled={loading || resendCooldown > 0} onClick={() => void resendLink()} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#d4af37]/18 bg-[#d4af37]/[0.045] px-4 text-xs font-semibold text-[#e5c66b] transition-colors hover:bg-[#d4af37]/[0.08] disabled:cursor-default disabled:opacity-45">
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : "Reenviar link"}
              </button>
              <button type="button" onClick={() => { setSent(false); setResendCooldown(0); setError(null); setErrorIsValidation(false); }} className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 text-xs font-semibold text-white/50 transition-colors hover:border-white/[0.12] hover:text-white/75">Usar outro e-mail</button>
            </div>
          </div>
        </div>
      ) : (
        <>
        <AuthJourneySteps activeStep={1} labels={["Solicitar", "Verificar", "Criar senha"]} />

<form onSubmit={onSubmit} className="space-y-3.5 pt-1 sm:space-y-5 sm:pt-2" noValidate>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] px-3.5 py-3 sm:px-4 sm:py-3.5">
            <div className="flex items-center gap-2 text-xs font-medium text-white/75 sm:text-sm">
              <Sparkles className="h-4 w-4 shrink-0 text-[#d4af37]" />
              Conta criada pelo administrador
            </div>
            <p className="mt-1.5 text-[11px] leading-5 text-white/35 sm:text-xs">Use o mesmo e-mail informado no cadastro.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-medium text-white/65">E-mail cadastrado</Label>
            <div className="relative">
              <span className="pointer-events-none absolute -inset-1 rounded-2xl bg-[radial-gradient(circle_at_18%_50%,rgba(212,175,55,0.12),transparent_58%)] blur-md opacity-0 transition-opacity duration-300 peer-focus-within:opacity-100" />
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 z-20 h-4 w-4 -translate-y-1/2 text-white/25" />
              <Input
                id="email"
                type="email"
                ref={emailRef}
                enterKeyHint="send"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (error) setError(null); setErrorIsValidation(false); }}
                onBlur={() => { if (email.trim() && !z.string().email().safeParse(email.trim()).success) { setError("Digite um e-mail válido, como voce@empresa.com."); setErrorIsValidation(true); } }}
                maxLength={255}
                placeholder="voce@empresa.com"
                aria-invalid={errorIsValidation}
                aria-describedby={errorIsValidation ? "first-access-error" : undefined}
                className="peer relative z-10 h-12 rounded-xl border-white/[0.08] bg-[#111318]/90 pl-10 text-white placeholder:text-white/20 transition-[border-color,box-shadow,background-color] duration-300 focus-visible:border-[#d4af37]/55 focus-visible:ring-2 focus-visible:ring-[#d4af37]/12 focus-visible:shadow-[0_0_0_1px_rgba(212,175,55,0.14),0_10px_35px_rgba(212,175,55,0.05)]"
              />
            </div>
          </div>

          {error && errorIsValidation && (
            <p id="first-access-error" role="alert" aria-live="assertive" className="flex items-center gap-1.5 text-[11px] leading-5 text-red-300/90">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </p>
          )}

          {error && !errorIsValidation && (
            <div id="first-access-error" role="alert" aria-live="assertive" className="vellune-auth-error flex items-start gap-2.5 rounded-xl border border-red-300/15 bg-red-400/[0.07] px-3.5 py-2.5 text-[12.5px] leading-5 text-red-200">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-red-200/10 bg-red-200/[0.06]">
                <AlertCircle className="h-3 w-3" />
              </span>
              <div>
                <p className="font-medium text-red-100/95">Não foi possível enviar</p>
                <p className="mt-0.5 text-[12px] text-red-200/75">{error}</p>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="group relative mt-1 h-12 w-full overflow-hidden rounded-xl bg-[#d4af37] font-semibold text-[#16130b] shadow-[0_12px_34px_rgba(212,175,55,0.10)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#e5c66b] hover:shadow-[0_16px_38px_rgba(212,175,55,0.16)] active:translate-y-0 disabled:cursor-default disabled:opacity-100"
            disabled={loading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Enviando link...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">Receber link de acesso <span aria-hidden="true">→</span></span>
            )}
          </Button>
        </form>
        </>
      )}

      <Link
        to="/login"
        className="mt-3 block text-center text-xs font-semibold text-white/45 transition-colors hover:text-[#e5c66b] hover:underline sm:mt-6 sm:text-sm"
      >
        Voltar ao login
      </Link>
    </AuthCard>
  );
}
