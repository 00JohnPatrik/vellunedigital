import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, MailCheck, UserRound } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithPhone, requestPasswordReset } from "@/lib/auth.functions";
import { canUseAdminArea, friendlyAuthError, homeFor, loadAppUser } from "@/lib/app-user";
import Logo from "@/components/Logo";

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
  const [phoneCooldown, setPhoneCooldown] = useState(0);
  const passwordRef = useRef<HTMLInputElement | null>(null);

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
    if (phoneCooldown <= 0) return;
    const timer = window.setTimeout(() => setPhoneCooldown((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [phoneCooldown]);

  function formatBrazilianPhone(value: string) {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (!digits) return "";
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  const trimmedIdentifier = identifier.trim();
  const identifierDigits = trimmedIdentifier.replace(/\D/g, "");
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
    setTouched(true);
    setError(null);
    const id = identifier.trim();
    const localDigits = id.replace(/\D/g, "");
    const invalidIdentifier =
      !id ||
      (id.includes("@") && !z.string().email().safeParse(id).success) ||
      (!id.includes("@") && (localDigits.length < 10 || localDigits.length > 11));
    if (invalidIdentifier || !password) return;

    setLoading(true);
    try {
      if (id.includes("@")) {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: id.toLowerCase(), password });
        if (authError) throw new Error(friendlyAuthError(authError.message));
      } else {
        const res = await phoneSignIn({ data: { phone: id, password } });
        if (!res.ok) throw new Error(res.error);
        const { error: sessionError } = await supabase.auth.setSession(res);
        if (sessionError) throw new Error(friendlyAuthError(sessionError.message));
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
      await new Promise((resolve) => window.setTimeout(resolve, 480));
      navigate({ to: homeFor(appUser), replace: true });
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : friendlyAuthError();
      if (!id.includes("@")) {
        setPhoneCooldown(/muitas|rate|too many/i.test(message) ? 15 : 2);
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function onRecovery(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);
    const parsed = z.string().trim().toLowerCase().email().max(255).safeParse(recoveryEmail);
    if (!parsed.success) return;

    setLoading(true);
    await resetPassword({ data: { email: parsed.data } }).catch(() => null);
    setLoading(false);
    setRecoverySent(true);
  }

  function showLogin() {
    setMode("login");
    setError(null);
    setTouched(false);
    setRecoverySent(false);
    setLoginSuccess(false);
    navigate({ to: "/login", replace: true });
  }

  return (
    <main className="vellune-login-root fixed inset-0 h-[100dvh] w-full max-w-full overflow-hidden overflow-x-clip overscroll-none bg-[#08090d] text-white selection:bg-[#d4af37]/25">
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

      <div className="relative z-10 mx-auto grid min-h-full w-full max-w-[1440px] grid-cols-1 lg:h-full lg:grid-cols-[1.15fr_0.85fr] vellune-motion" style={{ animation: "velluneFadeUp 650ms cubic-bezier(.22,1,.36,1)" }}>
        {/* Brand side */}
        <section className="relative hidden min-h-0 flex-col justify-between overflow-hidden px-12 py-10 lg:flex xl:px-20 vellune-motion" style={{ animation: "velluneFadeUp 750ms cubic-bezier(.22,1,.36,1)" }}>
          <div>
            <Logo className="h-12 w-[248px] text-white transition-opacity duration-500 hover:opacity-90" />
          </div>

          <div className="max-w-[650px] pb-10 xl:pb-16">
            <div className="mb-7 flex items-center gap-3">
              <span className="h-px w-10 bg-[#d4af37]/70" />
              <span className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#e5c66b]">Convites digitais</span>
            </div>
            <h1 className="max-w-[620px] font-display text-[clamp(3.25rem,5vw,5.6rem)] font-medium leading-[0.98] tracking-[-0.055em] text-white">
              Seu momento.
              <br />
              <span className="text-white/55">Do seu jeito.</span>
            </h1>
            <p className="mt-8 max-w-[500px] text-[15px] leading-7 text-white/45">
              Uma experiência elegante para criar, personalizar e compartilhar convites que fazem cada celebração começar antes mesmo do evento.
            </p>
          </div>

          <div className="flex items-center gap-7 text-[10px] font-medium uppercase tracking-[0.2em] text-white/30">
            <span>Experiência Vellune</span>
            <span className="h-px w-8 bg-white/10" />
            <span>Acesso protegido</span>
          </div>
        </section>

        {/* Authentication side */}
        <section className="flex h-full min-h-0 items-center justify-center overflow-hidden px-3 py-3 sm:px-8 sm:py-5 lg:h-full lg:min-h-0 lg:border-l lg:border-white/[0.045] lg:bg-white/[0.012] xl:px-16">
          <div className="w-full max-w-[430px] py-1 sm:py-2">
            <div className="mb-4 flex w-full shrink-0 justify-center lg:hidden sm:mb-9">
              <Logo className="h-12 w-auto max-w-[78vw] text-white transition-opacity duration-500 hover:opacity-90 sm:h-16" />
            </div>

            <div className="relative max-h-full w-full overflow-hidden rounded-[20px] border border-white/[0.075] bg-[#111318]/94 p-4 shadow-[0_30px_100px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.035)] ring-1 ring-white/[0.018] backdrop-blur-xl sm:rounded-[28px] sm:p-9 vellune-motion" style={{ animation: "velluneFadeUp 800ms cubic-bezier(.22,1,.36,1)" }}>
              <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-[#d4af37]/35 to-transparent" />
              <div className="pointer-events-none absolute -right-24 -top-24 h-48 w-48 rounded-full bg-[#d4af37]/[0.035] blur-3xl" style={{ animation: "velluneGlow 7s ease-in-out infinite" }} />
              <div key={`${mode}-${recoverySent ? "sent" : "form"}`} className="vellune-auth-panel-motion">
              {mode === "recovery" ? (
                <div>
                  <button type="button" onClick={showLogin} className="mb-9 text-xs font-medium text-white/40 transition-colors hover:text-[#e5c66b]">
                    ← Voltar ao login
                  </button>
                  {recoverySent ? (
                    <div className="space-y-6">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d4af37]/25 bg-[#d4af37]/10 text-[#e5c66b]">
                        <MailCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#d4af37]">Quase lá</p>
                        <h1 className="font-display text-[30px] font-medium tracking-[-0.035em]">Verifique seu e-mail</h1>
                        <p className="mt-3 text-sm leading-6 text-white/45">Se o endereço estiver cadastrado, você receberá um link seguro para redefinir sua senha.</p>
                      </div>
                      <p className="flex items-center gap-2 text-xs text-white/35"><CheckCircle2 className="h-4 w-4 text-[#d4af37]" /> O link é válido por tempo limitado.</p>
                    </div>
                  ) : (
                    <form onSubmit={onRecovery} className="space-y-6" noValidate>
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
                          <Input id="recovery-email" type="email" inputMode="email" autoComplete="email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} onFocus={() => setFocusedField("recovery-email")} onBlur={() => { setFocusedField(null); setTouched(true); }} placeholder="voce@empresa.com" aria-invalid={recoveryInvalid} aria-describedby={recoveryError ? "recovery-email-error" : undefined} className="relative z-10 h-12 rounded-xl border-white/[0.08] bg-[#111318]/90 pl-10 text-white placeholder:text-white/20 transition-[border-color,box-shadow,background-color] duration-300 focus-visible:border-[#d4af37]/55 focus-visible:ring-2 focus-visible:ring-[#d4af37]/12 focus-visible:shadow-[0_0_0_1px_rgba(212,175,55,0.14),0_10px_35px_rgba(212,175,55,0.05)]" />
                        </div>
                        {recoveryError && <p id="recovery-email-error" className="text-[11px] text-red-300/90">{recoveryError}</p>}
                      </div>
                  {error && <div role="alert" className="rounded-xl border border-red-300/15 bg-red-400/[0.07] px-4 py-3 text-sm leading-6 text-red-200">{error}</div>}
                      <Button type="submit" disabled={loading} className="group h-12 w-full rounded-xl bg-[#d4af37] font-semibold text-[#16130b] shadow-[0_12px_34px_rgba(212,175,55,0.10)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#e5c66b] hover:shadow-[0_16px_38px_rgba(212,175,55,0.16)] active:translate-y-0">
                        {loading ? "Enviando link..." : "Enviar link de recuperação"}
                      </Button>
                    </form>
                  )}
                </div>
              ) : (
                <form onSubmit={onLogin} className="space-y-5" noValidate>
                  <div className="mb-8">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#d4af37]">Área exclusiva</p>
                    <h1 className="font-display text-[32px] font-medium tracking-[-0.04em]">Bem-vindo de volta</h1>
                    <p className="mt-3 text-sm leading-6 text-white/45">Entre para continuar criando experiências memoráveis.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="identifier" className="text-xs font-medium text-white/65">E-mail ou telefone</Label>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                      <Input
                        id="identifier"
                        type="text"
                        autoComplete="username"
                        inputMode="email"
                        enterKeyHint="next"
                        autoCapitalize="none"
                        autoCorrect="off"
                        spellCheck={false}
                        value={identifier}
                        maxLength={255}
                        onChange={(e) => setIdentifier(e.target.value)}
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
                    {identifierError && <p id="identifier-error" className="text-[11px] text-red-300/90">{identifierError}</p>}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="password" className="text-xs font-medium text-white/65">Senha</Label>
                      <button type="button" onClick={() => { setMode("recovery"); setRecoveryEmail(identifier.includes("@") ? identifier.trim() : ""); setError(null); setTouched(false); }} className="rounded-md px-1.5 py-1 text-xs font-medium text-[#d4af37] transition-[color,background-color] duration-200 hover:bg-[#d4af37]/[0.06] hover:text-[#e5c66b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37]/20">Esqueci minha senha</button>
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
                        onChange={(e) => setPassword(e.target.value)}
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
                      <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute right-0 top-0 flex h-12 w-11 items-center justify-center text-white/30 transition-colors hover:text-[#e5c66b]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                    </div>
                    {capsLockOn && <p className="flex items-center gap-2 text-[11px] text-[#e5c66b]" role="status"><span className="h-1.5 w-1.5 rounded-full bg-[#d4af37] shadow-[0_0_8px_rgba(212,175,55,0.75)]" />Caps Lock está ativado.</p>}
                    {passwordError && <p id="password-error" className="text-[11px] text-red-300/90">{passwordError}</p>}
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


                  {error && <div role="alert" className="rounded-xl border border-red-300/15 bg-red-400/[0.07] px-4 py-3 text-sm leading-6 text-red-200">{error}</div>}

                  <Button type="submit" disabled={loading || phoneCooldown > 0} className="group mt-2 h-12 w-full rounded-xl bg-[#d4af37] font-semibold text-[#16130b] shadow-[0_12px_34px_rgba(212,175,55,0.10)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#e5c66b] hover:shadow-[0_16px_38px_rgba(212,175,55,0.16)] active:translate-y-0 disabled:cursor-default disabled:opacity-100">
                    {loginSuccess ? (
                      <span className="flex items-center justify-center gap-2">
                        <CheckCircle2 className="h-4 w-4" style={{ animation: "velluneSuccess 260ms cubic-bezier(.22,1,.36,1)" }} />
                        Acesso confirmado
                      </span>
                    ) : loading ? "Entrando..." : phoneCooldown > 0 ? `Aguarde ${phoneCooldown}s...` : <span className="flex items-center justify-center gap-2">Entrar na conta <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" /></span>}
                  </Button>

                  <p className="text-center text-xs text-white/35">Primeira vez aqui? <a href="/first-access" className="font-semibold text-white/65 transition-colors hover:text-[#e5c66b]">Faça seu primeiro acesso</a></p>
                </form>
              )}
              </div>
            </div>

            <p className="mt-2 shrink-0 text-center text-[9px] font-medium uppercase tracking-[0.24em] text-white/20">Vellune Digital · v1.7</p>
          </div>
        </section>
      </div>
    </main>
  );
}
