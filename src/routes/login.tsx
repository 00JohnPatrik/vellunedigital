import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, ArrowRight, CheckCircle2, Eye, EyeOff, LoaderCircle, LockKeyhole, Mail, MailCheck, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithPhone, requestPasswordReset } from "@/lib/auth.functions";
import { canUseAdminArea, friendlyAuthError, homeFor, isAuthServiceUnavailable, loadAppUser } from "@/lib/app-user";
import Logo from "@/components/Logo";
import { AuthPremiumVisual } from "@/components/auth-premium-visual";
import { AuthSuccessTransition } from "@/components/auth-success-transition";
import { AuthJourneySteps } from "@/components/auth-journey";
import { AuthUnavailableState } from "@/components/auth-unavailable-state";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ error: z.enum(["inactive"]).optional(), mode: z.enum(["recovery"]).optional() }),
  head: () => ({
    meta: [
      { title: "Entrar — Vellune Digital" },
      { name: "description", content: "Acesse sua conta Vellune Digital." },
      { property: "og:title", content: "Entrar — Vellune Digital" },
      { property: "og:description", content: "Acesse sua conta Vellune Digital." },
      { name: "theme-color", content: "#08090d" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { error: reason, mode: requestedMode } = Route.useSearch();
  const navigate = useNavigate();
  const phoneSignIn = useServerFn(signInWithPhone);
  const resetPassword = useServerFn(requestPasswordReset);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "recovery">(requestedMode === "recovery" ? "recovery" : "login");
  const [recoverySent, setRecoverySent] = useState(false);
  const [error, setError] = useState<string | null>(
    reason === "inactive" ? "Sua conta está inativa. Fale com o administrador." : null,
  );
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);
  const [rememberAccess, setRememberAccess] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [loginCooldown, setLoginCooldown] = useState(0);
  const [recoveryCooldown, setRecoveryCooldown] = useState(0);
  const [authUnavailable, setAuthUnavailable] = useState(false);
  const identifierRef = useRef<HTMLInputElement | null>(null);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const recoveryEmailRef = useRef<HTMLInputElement | null>(null);
  const authScrollRef = useRef<HTMLElement | null>(null);
  const requestLockRef = useRef(false);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const previous = {
      htmlBackground: html.style.backgroundColor,
      bodyBackground: body.style.backgroundColor,
      htmlColorScheme: html.style.colorScheme,
      bodyColorScheme: body.style.colorScheme,
    };
    html.style.backgroundColor = "#08090d";
    body.style.backgroundColor = "#08090d";
    html.style.colorScheme = "dark";
    body.style.colorScheme = "dark";
    return () => {
      html.style.backgroundColor = previous.htmlBackground;
      body.style.backgroundColor = previous.bodyBackground;
      html.style.colorScheme = previous.htmlColorScheme;
      body.style.colorScheme = previous.bodyColorScheme;
    };
  }, []);

  useEffect(() => {
    if (requestedMode === "recovery") return;

    let cancelled = false;
    const checkExistingSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session || cancelled) return;
        const appUser = await loadAppUser(data.session.user.id);
        if (cancelled) return;
        if (canUseAdminArea(appUser)) {
          navigate({ to: homeFor(appUser), replace: true });
          return;
        }
        await supabase.auth.signOut();
      } catch {
        // Login remains available when the session check is unavailable.
      }
    };

    void checkExistingSession();
    return () => {
      cancelled = true;
    };
  }, [navigate, requestedMode]);

  useEffect(() => {
    try {
      const savedIdentifier = window.localStorage.getItem("vellune-login-identifier");
      if (savedIdentifier) {
        setIdentifier(savedIdentifier);
        setRememberAccess(true);
      }
    } catch {
      // Ignore storage restrictions (private mode, blocked storage, etc.).
    }
  }, []);

  useEffect(() => {
    if (loginCooldown <= 0) return;
    const timer = window.setTimeout(() => setLoginCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [loginCooldown]);

  useEffect(() => {
    const key = "vellune-recovery-cooldown-until";
    const refreshCooldown = () => {
      try {
        const until = Number(window.sessionStorage.getItem(key) ?? "0");
        const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
        setRecoveryCooldown(remaining);
        if (!remaining) window.sessionStorage.removeItem(key);
      } catch {
        // Session storage may be unavailable; the local cooldown still works.
      }
    };
    refreshCooldown();
    const timer = window.setInterval(refreshCooldown, 1000);
    return () => window.clearInterval(timer);
  }, []);

  function formatBrazilianPhone(value: string) {
    let digits = value.replace(/\D/g, "");
    if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
      digits = digits.slice(2);
    }
    digits = digits.slice(0, 11);
    if (!digits) return "";
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  const trimmedIdentifier = identifier.trim();
  const identifierDigits = trimmedIdentifier.replace(/\D/g, "");
  const isPhoneLike = trimmedIdentifier.length > 0 && /^[0-9\s()+-]+$/.test(trimmedIdentifier);
  const identifierInvalid =
    touched &&
    (!trimmedIdentifier ||
      (trimmedIdentifier.includes("@") && !z.string().email().safeParse(trimmedIdentifier).success) ||
      (!trimmedIdentifier.includes("@") && (identifierDigits.length < 10 || identifierDigits.length > 11)));
  const passwordInvalid = touched && !password;
  const recoveryInvalid = touched && !z.string().email().safeParse(recoveryEmail.trim()).success;

  const identifierError = !touched
    ? null
    : !trimmedIdentifier
      ? "Informe seu e-mail ou telefone."
      : trimmedIdentifier.includes("@") && !z.string().email().safeParse(trimmedIdentifier).success
        ? "Informe um e-mail válido."
        : !trimmedIdentifier.includes("@") && (identifierDigits.length < 10 || identifierDigits.length > 11)
          ? "Informe um telefone válido com DDD."
          : null;
  const passwordError = passwordInvalid ? "Informe sua senha." : null;
  const recoveryError = recoveryInvalid ? "Informe um e-mail válido." : null;

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    if (requestLockRef.current) return;
    setTouched(true);
    setError(null);
    const id = identifier.trim();
    const localDigits = id.replace(/\D/g, "");
    const invalidIdentifier =
      !id ||
      (id.includes("@") && !z.string().email().safeParse(id).success) ||
      (!id.includes("@") && (localDigits.length < 10 || localDigits.length > 11));
    if (invalidIdentifier || !password) {
      if (invalidIdentifier) {
        window.setTimeout(() => identifierRef.current?.focus(), 0);
      } else {
        window.setTimeout(() => passwordRef.current?.focus(), 0);
      }
      return;
    }
    if (loginCooldown > 0) return;

    requestLockRef.current = true;
    setLoading(true);
    try {
      if (id.includes("@")) {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: id.toLowerCase(), password });
        if (authError) {
          if (isAuthServiceUnavailable(authError)) setAuthUnavailable(true);
          throw new Error(friendlyAuthError(authError.message));
        }
      } else {
        const res = await phoneSignIn({ data: { phone: id, password } });
        if (!res.ok) throw new Error(res.error);
        const { error: sessionError } = await supabase.auth.setSession(res);
        if (sessionError) {
          if (isAuthServiceUnavailable(sessionError)) setAuthUnavailable(true);
          throw new Error(friendlyAuthError(sessionError.message));
        }
      }

      const { data } = await supabase.auth.getUser();
      const appUser = data.user ? await loadAppUser(data.user.id) : null;
      if (!canUseAdminArea(appUser)) {
        await supabase.auth.signOut();
        throw new Error("Sua conta está inativa ou sem acesso. Fale com o administrador.");
      }
      try {
        if (rememberAccess) {
          window.localStorage.setItem("vellune-login-identifier", id);
        } else {
          window.localStorage.removeItem("vellune-login-identifier");
        }
      } catch {
        // Login must continue even if browser storage is unavailable.
      }
      setLoginSuccess(true);
      const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      await new Promise((resolve) => window.setTimeout(resolve, prefersReducedMotion ? 420 : 1250));
      navigate({ to: homeFor(appUser), replace: true });
    } catch (err) {
      if (isAuthServiceUnavailable(err)) {
        setAuthUnavailable(true);
      }
      const message = err instanceof Error && err.message ? err.message : friendlyAuthError();
      setLoginCooldown(/muitas|rate|too many/i.test(message) ? 15 : 2);
      setError(message);
    } finally {
      setLoading(false);
      requestLockRef.current = false;
    }
  }

  async function onRecovery(e: React.FormEvent) {
    e.preventDefault();
    if (requestLockRef.current) return;
    if (recoveryCooldown > 0) return;
    setTouched(true);
    setError(null);
    const parsed = z.string().trim().toLowerCase().email().max(255).safeParse(recoveryEmail);
    if (!parsed.success) {
      window.setTimeout(() => recoveryEmailRef.current?.focus(), 0);
      return;
    }

    requestLockRef.current = true;
    setLoading(true);
    try {
      await resetPassword({ data: { email: parsed.data } });
      setRecoverySent(true);
      setRecoveryCooldown(30); try { window.sessionStorage.setItem("vellune-recovery-cooldown-until", String(Date.now() + 30000)); } catch {}
    } catch (err) {
      if (isAuthServiceUnavailable(err)) {
        setAuthUnavailable(true);
        return;
      }
      // Preserve account-enumeration resistance: non-service errors still use the same neutral confirmation.
      setRecoverySent(true);
      setRecoveryCooldown(30);
    } finally {
      setLoading(false);
      requestLockRef.current = false;
    }
  }

  function showLogin() {
    setMode("login");
    setError(null);
    setTouched(false);
    setRecoverySent(false);
    setRecoveryCooldown(0);
    try { window.sessionStorage.removeItem("vellune-recovery-cooldown-until"); } catch {}
    setAuthUnavailable(false);
    setLoginSuccess(false);
    navigate({ to: "/login", replace: true });
  }

  function maskEmail(value: string) {
    const [local, domain] = value.split("@");
    if (!local || !domain) return value;
    const visible = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
    return visible + "•••@" + domain;
  }

  async function resendRecovery() {
    if (loading || recoveryCooldown > 0 || requestLockRef.current) return;
    const parsed = z.string().trim().toLowerCase().email().max(255).safeParse(recoveryEmail);
    if (!parsed.success) return;
    requestLockRef.current = true;
    setLoading(true);
    try {
      await resetPassword({ data: { email: parsed.data } });
      setRecoveryCooldown(30);
      try { window.sessionStorage.setItem("vellune-recovery-cooldown-until", String(Date.now() + 30000)); } catch {}
    } catch (err) {
      if (isAuthServiceUnavailable(err)) setAuthUnavailable(true);
    } finally {
      setLoading(false);
      requestLockRef.current = false;
    }
  }

  if (authUnavailable) {
    return (
      <main className="vellune-login-root fixed inset-0 h-[100dvh] w-full overflow-hidden bg-[#08090d] text-white">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_18%,rgba(212,175,55,0.10),transparent_34%),radial-gradient(ellipse_at_82%_78%,rgba(74,64,43,0.16),transparent_38%),linear-gradient(135deg,#08090d_0%,#0d0f15_52%,#08090d_100%)]" />
        <div className="relative z-10 h-full w-full">
          <AuthUnavailableState onRetry={() => { setAuthUnavailable(false); window.location.reload(); }} />
        </div>
      </main>
    );
  }

  return (
    <main className="vellune-login-root fixed inset-0 h-[100dvh] w-full max-w-full overflow-hidden bg-[#08090d] overscroll-none text-white selection:bg-[#d4af37]/25" style={{ colorScheme: "dark" }}>
      <style>{`
        @keyframes velluneFadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes velluneGlow {
          0%, 100% { opacity: .55; transform: scale(1); }
          50% { opacity: .85; transform: scale(1.02); }
        }
        @keyframes velluneSuccess {
          from { opacity: 0; transform: scale(.86); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes velluneAuthPanel {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .vellune-auth-panel-motion {
          animation: velluneAuthPanel 280ms cubic-bezier(.22,1,.36,1);
        }
        @media (prefers-reduced-motion: reduce) {
          .vellune-auth-panel-motion { animation: none !important; }
          .vellune-motion { animation: none !important; transition: none !important; }
        }
      `}</style>
      {/* Premium, restrained background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_18%,rgba(212,175,55,0.10),transparent_34%),radial-gradient(ellipse_at_82%_78%,rgba(74,64,43,0.16),transparent_38%),linear-gradient(135deg,#08090d_0%,#0d0f15_52%,#08090d_100%)]" />
      <div className="pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full border border-[#d4af37]/10" />
      <div className="pointer-events-none absolute -right-40 -bottom-40 h-[34rem] w-[34rem] rounded-full border border-white/[0.035]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.018)_50%,transparent_100%)]" />

      <div className="relative z-10 mx-auto grid h-full min-h-0 w-full max-w-[1440px] grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] vellune-motion" style={{ animation: "velluneFadeUp 650ms cubic-bezier(.22,1,.36,1)" }}>
        <AuthPremiumVisual />

        {/* Authentication side */}
        <section ref={authScrollRef} className="flex h-full min-h-0 items-stretch justify-start overflow-x-clip bg-[#08090d] overflow-y-auto overscroll-contain px-3 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-8 sm:py-5 lg:h-full lg:min-h-0 lg:items-stretch lg:justify-start lg:overflow-y-auto lg:border-l lg:border-white/[0.045] lg:bg-white/[0.012] xl:px-16">
          <div className="my-auto mx-auto w-full max-w-[430px] shrink-0 py-1 sm:py-2">
            <div className="mb-4 flex w-full shrink-0 flex-col items-center justify-center lg:hidden sm:mb-9">
              <Logo className="h-12 w-auto max-w-[78vw] text-white transition-opacity duration-500 hover:opacity-90 sm:h-16" />
              <span className="mt-2 text-[8px] font-semibold uppercase tracking-[0.28em] text-white/25">Seu espaço de criação</span>
            </div>

            <div className="relative w-full overflow-hidden rounded-[20px] border border-white/[0.075] bg-[#111318]/94 p-4 shadow-[0_30px_100px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.035)] ring-1 ring-white/[0.018] backdrop-blur-xl sm:rounded-[28px] sm:p-9 vellune-motion" style={{ animation: "velluneFadeUp 800ms cubic-bezier(.22,1,.36,1)" }}>
              <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/35 to-transparent" />
              <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-[#d4af37]/[0.035] blur-3xl" style={{ animation: "velluneGlow 7s ease-in-out infinite" }} />
              <div key={`${mode}-${recoverySent ? "sent" : "form"}`} className="vellune-auth-panel-motion">
              {mode === "recovery" ? (
                <div>
                  <button type="button" onClick={showLogin} className="mb-5 text-xs font-medium text-white/40 transition-colors hover:text-[#e5c66b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/20 rounded-md px-1 py-1">
                    ← Voltar ao login
                  </button>
                  {recoverySent ? (
                    <div>
                      <AuthJourneySteps activeStep={2} labels={["Solicitar", "Verificar", "Redefinir"]} />
                      <div className="space-y-5">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d4af37]/25 bg-[#d4af37]/10 text-[#e5c66b]">
                        <MailCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#d4af37]">Quase lá</p>
                        <h1 className="font-display text-[30px] font-medium tracking-[-0.035em]">Verifique seu e-mail</h1>
                        <p className="mt-3 text-sm leading-6 text-white/45">Se o endereço estiver cadastrado, você receberá um link seguro para redefinir sua senha.</p>
                      </div>
                        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 text-left">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/25">Enviamos para</p>
                          <p className="mt-1 truncate text-sm font-medium text-white/70">{maskEmail(recoveryEmail)}</p>
                        </div>
                        <p className="flex items-center gap-2 text-xs text-white/35"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#d4af37]" /> O link é válido por tempo limitado.</p>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <button type="button" disabled={loading || recoveryCooldown > 0} onClick={resendRecovery} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[#d4af37]/18 bg-[#d4af37]/[0.045] px-4 text-xs font-semibold text-[#e5c66b] transition-colors hover:bg-[#d4af37]/[0.08] disabled:cursor-default disabled:opacity-45">
                            {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                            {recoveryCooldown > 0 ? `Reenviar em ${recoveryCooldown}s` : "Reenviar e-mail"}
                          </button>
                          <button type="button" onClick={() => { setRecoverySent(false); setRecoveryCooldown(0); setError(null); setTouched(false); }} className="inline-flex h-11 flex-1 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 text-xs font-semibold text-white/50 transition-colors hover:border-white/[0.12] hover:text-white/75">Usar outro e-mail</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                    <AuthJourneySteps activeStep={2} labels={["Solicitar", "Verificar", "Redefinir"]} />
                    <form onSubmit={onRecovery} className="space-y-5" noValidate>
                      <div>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#d4af37]">Recuperação</p>
                        <h1 className="font-display text-[30px] font-medium tracking-[-0.035em]">Recupere seu acesso</h1>
                        <p className="mt-3 text-sm leading-6 text-white/45">Informe o e-mail vinculado à sua conta e enviaremos as instruções.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="recovery-email" className="text-xs font-medium text-white/65">E-mail cadastrado</Label>
                        <div className="relative">
                          <span className={`pointer-events-none absolute -inset-1 rounded-2xl bg-[radial-gradient(circle_at_18%_50%,rgba(212,175,55,0.12),transparent_58%)] blur-md transition-opacity duration-300 ${focusedField === "recovery-email" ? "opacity-100" : "opacity-0"}`} />
                          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                          <Input ref={recoveryEmailRef} id="recovery-email" type="email" inputMode="email" autoComplete="email" value={recoveryEmail} onChange={(e) => { setRecoveryEmail(e.target.value); if (error) setError(null); }} onFocus={() => setFocusedField("recovery-email")} onBlur={() => { setFocusedField(null); setTouched(true); }} placeholder="voce@empresa.com" aria-invalid={recoveryInvalid} aria-describedby={recoveryError ? "recovery-email-error" : undefined} className="relative z-10 h-12 rounded-xl border-white/[0.08] bg-[#111318]/90 pl-10 text-white placeholder:text-white/20 transition-[border-color,box-shadow,background-color] duration-300 focus-visible:border-[#d4af37]/55 focus-visible:ring-2 focus-visible:ring-[#d4af37]/12 focus-visible:shadow-[0_0_0_1px_rgba(212,175,55,0.14),0_10px_35px_rgba(212,175,55,0.05)]" />
                        </div>
                        {recoveryError && <p id="recovery-email-error" role="alert" className="flex items-center gap-1.5 text-[11px] text-red-300/90"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{recoveryError}</p>}
                      </div>
                  {error && (
                    <div role="alert" aria-live="assertive" className="flex items-start gap-3 rounded-xl border border-red-300/15 bg-red-400/[0.07] px-3.5 py-2.5 text-[13px] leading-5 text-red-200">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-red-200/10 bg-red-200/[0.06]">
                        <AlertCircle className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="font-medium text-red-100/95">Não foi possível enviar</p>
                        <p className="mt-0.5 text-[12px] leading-5 text-red-200/75">{error}</p>
                      </div>
                    </div>
                  )}
                      <Button type="submit" disabled={loading} className="group h-12 w-full rounded-xl bg-[#d4af37] font-semibold text-[#16130b] shadow-[0_12px_34px_rgba(212,175,55,0.10)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#e5c66b] hover:shadow-[0_16px_38px_rgba(212,175,55,0.16)] active:translate-y-0">
                        {loading ? (
                          <span className="flex items-center justify-center gap-2">
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            Enviando link...
                          </span>
                        ) : "Enviar link de recuperação"}
                      </Button>
                    </form>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                <AuthJourneySteps activeStep={1} compact />
                <form onSubmit={onLogin} className="space-y-4 sm:space-y-5" noValidate>
                  <div className="mb-5 sm:mb-8">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#d4af37]">Área exclusiva</p>
                    <h1 className="font-display text-[32px] font-medium tracking-[-0.04em]">Bem-vindo de volta</h1>
                    <p className="mt-3 text-sm leading-6 text-white/45">Entre para continuar criando experiências memoráveis.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="identifier" className="text-xs font-medium text-white/65">E-mail ou telefone</Label>
                    <div className="relative">
                      {isPhoneLike ? <Smartphone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" /> : <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />}
                      <Input
                        ref={identifierRef}
                        id="identifier"
                        type="text"
                        autoComplete="username"
                        inputMode="text"
                        enterKeyHint="next"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={identifier}
                        maxLength={255}
                        onChange={(e) => {
                          const nextValue = e.target.value;
                          // Keep the identifier raw while typing. Formatting is applied on blur only
                          // when the value is clearly a phone number, preventing numeric-prefixed
                          // email addresses from being corrupted by the phone mask.
                          setIdentifier(nextValue);
                          if (error) setError(null);
                        }}
                        onFocus={() => setFocusedField("identifier")}
                        onBlur={() => {
                          setFocusedField(null);
                          const value = identifier.trim();
                          if (value && !value.includes("@")) {
                            setIdentifier(formatBrazilianPhone(value));
                          }
                          setTouched(true);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && !password) {
                            event.preventDefault();
                            passwordRef.current?.focus();
                          }
                        }}
                        placeholder="E-mail ou (11) 99999-9999"
                        aria-invalid={identifierInvalid}
                        aria-describedby={identifierError ? "identifier-error" : undefined}
                        className="relative z-10 h-12 rounded-xl border-white/[0.08] bg-[#111318]/90 text-white placeholder:text-white/20 transition-[border-color,box-shadow,background-color] duration-300 focus-visible:border-[#d4af37]/55 focus-visible:ring-2 focus-visible:ring-[#d4af37]/12 focus-visible:shadow-[0_0_0_1px_rgba(212,175,55,0.14),0_10px_35px_rgba(212,175,55,0.05)] hover:border-white/[0.12] pl-10"
                      />
                    </div>
                    {identifierError && <p id="identifier-error" role="alert" className="flex items-center gap-1.5 text-[11px] text-red-300/90"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{identifierError}</p>}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="password" className="text-xs font-medium text-white/65">Senha</Label>
                      <button type="button" onClick={() => { setMode("recovery"); setRecoveryEmail(identifier.includes("@") ? identifier.trim() : ""); setError(null); setTouched(false); setAuthUnavailable(false); window.requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" })); }} className="rounded-md px-1.5 py-1 text-xs font-medium text-[#d4af37] transition-[color,background-color] duration-200 hover:bg-[#d4af37]/[0.06] hover:text-[#e5c66b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/20">Esqueci minha senha</button>
                    </div>
                    <div className="relative">
                      <span className={`pointer-events-none absolute -inset-1 rounded-2xl bg-[radial-gradient(circle_at_18%_50%,rgba(212,175,55,0.12),transparent_58%)] blur-md transition-opacity duration-300 ${focusedField === "password" ? "opacity-100" : "opacity-0"}`} />
                      <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                      <Input
                        ref={passwordRef}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="current-password"
                        value={password}
                        maxLength={200}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (error) setError(null);
                        }}
                        onFocus={() => {
                          setFocusedField("password");
                          setCapsLockOn(false);
                        }}
                        onBlur={() => {
                          setFocusedField(null);
                          setCapsLockOn(false);
                          setTouched(true);
                        }}
                        onKeyDown={(event) => setCapsLockOn(event.getModifierState("CapsLock"))}
                        onKeyUp={(event) => setCapsLockOn(event.getModifierState("CapsLock"))}
                        aria-invalid={passwordInvalid}
                        aria-describedby={passwordError ? "password-error" : undefined}
                        className="relative z-10 h-12 rounded-xl border-white/[0.08] bg-[#111318]/90 text-white placeholder:text-white/20 transition-[border-color,box-shadow,background-color] duration-300 focus-visible:border-[#d4af37]/55 focus-visible:ring-2 focus-visible:ring-[#d4af37]/12 focus-visible:shadow-[0_0_0_1px_rgba(212,175,55,0.14),0_10px_35px_rgba(212,175,55,0.05)] hover:border-white/[0.12] pl-10 pr-11"
                      />
                      <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute right-0 top-0 z-20 flex h-12 w-11 items-center justify-center text-white/30 transition-colors hover:text-[#e5c66b]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                    </div>
                    {capsLockOn && <p className="flex items-center gap-2 text-[11px] text-[#e5c66b]" role="status"><span className="h-1.5 w-1.5 rounded-full bg-[#d4af37] shadow-[0_0_8px_rgba(212,175,55,0.75)]" />Caps Lock está ativado.</p>}
                    {passwordError && <p id="password-error" role="alert" className="flex items-center gap-1.5 text-[11px] text-red-300/90"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{passwordError}</p>}
                  </div>

                      <label className="flex min-h-8 cursor-pointer items-center gap-3 py-1 text-xs text-white/40 select-none transition-colors hover:text-white/55">
                    <span className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                      <input
                        type="checkbox"
                        checked={rememberAccess}
                        onChange={(e) => setRememberAccess(e.target.checked)}
                        className="peer absolute inset-0 z-10 h-4 w-4 cursor-pointer opacity-0"
                      />
                      <span className="flex h-4 w-4 items-center justify-center rounded-[5px] border border-white/[0.12] bg-white/[0.035] transition-all peer-checked:border-[#d4af37]/70 peer-checked:bg-[#d4af37] peer-focus-visible:ring-2 peer-focus-visible:ring-[#d4af37]/25">
                        {rememberAccess && (
                          <svg viewBox="0 0 16 16" className="h-3 w-3 text-[#16130b]" aria-hidden="true">
                            <path d="M3.2 8.2 6.6 11.3 12.8 4.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                    </span>
                    <span>Lembrar e-mail ou telefone neste dispositivo</span>
                  </label>


                  {error && (
                    <div role="alert" aria-live="assertive" className="flex items-start gap-3 rounded-xl border border-red-300/15 bg-red-400/[0.07] px-3.5 py-2.5 text-[12.5px] leading-5 text-red-200">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-red-200/10 bg-red-200/[0.06]">
                        <AlertCircle className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="font-medium text-red-100/95">Não conseguimos entrar</p>
                        <p className="mt-0.5 text-[12px] leading-5 text-red-200/75">{error}</p>
                      </div>
                    </div>
                  )}

                  <Button type="submit" disabled={loading || loginCooldown > 0} className="group mt-2 flex h-12 w-full min-h-12 items-center justify-center rounded-xl bg-[#d4af37] font-semibold text-[#16130b] shadow-[0_12px_34px_rgba(212,175,55,0.10)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#e5c66b] hover:shadow-[0_16px_38px_rgba(212,175,55,0.16)] active:translate-y-0 disabled:cursor-default disabled:opacity-100">
                    {loginSuccess ? (
                      <span className="flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-4 w-4" style={{ animation: "velluneSuccess 260ms cubic-bezier(.22,1,.36,1)" }} />
                        Acesso confirmado
                      </span>
                    ) : loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <LoaderCircle className="h-4 w-4 animate-spin" />
                        Entrando...
                      </span>
                    ) : loginCooldown > 0 ? (
                      <span className="flex items-center justify-center gap-2">Aguarde {loginCooldown}s</span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        Entrar na conta
                        <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                      </span>
                    )}
                  </Button>

                  <div className="space-y-1.5 sm:space-y-2.5">
                    <p className="flex items-center justify-center gap-2 text-center text-[10px] uppercase tracking-[0.16em] text-white/25">
                      <ShieldCheck className="h-3.5 w-3.5 text-[#d4af37]/60" />
                      Vellune Secure · Ambiente protegido
                    </p>
                    <p className="text-center text-[11px] leading-5 text-white/35 sm:text-xs">Primeira vez aqui? <a href="/first-access" className="font-semibold text-white/65 transition-colors hover:text-[#e5c66b]">Faça seu primeiro acesso</a></p>
                  </div>
                </form>
                </div>
              )}
              </div>
            </div>

            <AuthSuccessTransition open={loginSuccess} />
            <p className="mt-2 shrink-0 text-center text-[9px] font-medium uppercase tracking-[0.24em] text-white/20">Vellune Digital · v2.0</p>
          </div>
        </section>
      </div>
    </main>
  );
}
