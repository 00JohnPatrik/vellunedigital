import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, MailCheck, ShieldCheck, Sparkles, UserRound } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithPhone, requestPasswordReset } from "@/lib/auth.functions";
import { canUseAdminArea, friendlyAuthError, homeFor, loadAppUser } from "@/lib/app-user";
import Logo from "@/components/Logo";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ error: z.enum(["inactive"]).optional() }),
  head: () => ({
    meta: [
      { title: "Entrar — Vellune Digital" },
      { name: "description", content: "Acesse sua conta Vellune Digital." },
      { property: "og:title", content: "Entrar — Vellune Digital" },
      { property: "og:description", content: "Acesse sua conta Vellune Digital." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { error: reason } = Route.useSearch();
  const navigate = useNavigate();
  const phoneSignIn = useServerFn(signInWithPhone);
  const resetPassword = useServerFn(requestPasswordReset);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState<"login" | "recovery">("login");
  const [recoverySent, setRecoverySent] = useState(false);
  const [error, setError] = useState<string | null>(
    reason === "inactive" ? "Sua conta está inativa. Fale com o administrador." : null,
  );
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState(false);

  const identifierInvalid = touched && (!identifier.trim() || (identifier.includes("@") && !z.string().email().safeParse(identifier.trim()).success));
  const passwordInvalid = touched && !password;
  const recoveryInvalid = touched && !z.string().email().safeParse(recoveryEmail.trim()).success;

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);
    const id = identifier.trim();
    if (!id || !password) return setError("Preencha seus dados para continuar.");
    if (id.includes("@") && !z.string().email().safeParse(id).success) return setError("Informe um e-mail válido.");

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
      navigate({ to: homeFor(appUser), replace: true });
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : friendlyAuthError());
    } finally {
      setLoading(false);
    }
  }

  async function onRecovery(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);
    const parsed = z.string().trim().toLowerCase().email().max(255).safeParse(recoveryEmail);
    if (!parsed.success) return setError("Informe um e-mail válido.");

    setLoading(true);
    await resetPassword({ data: { email: parsed.data, origin: window.location.origin } }).catch(() => null);
    setLoading(false);
    setRecoverySent(true);
  }

  function showLogin() {
    setMode("login");
    setError(null);
    setTouched(false);
    setRecoverySent(false);
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-[#08090d] text-white selection:bg-[#d4af37]/25">
      {/* Premium, restrained background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_18%_18%,rgba(212,175,55,0.10),transparent_34%),radial-gradient(ellipse_at_82%_78%,rgba(74,64,43,0.16),transparent_38%),linear-gradient(135deg,#08090d_0%,#0d0f15_52%,#08090d_100%)]" />
      <div className="pointer-events-none absolute -left-32 -top-32 h-[28rem] w-[28rem] rounded-full border border-[#d4af37]/10" />
      <div className="pointer-events-none absolute -right-40 -bottom-40 h-[34rem] w-[34rem] rounded-full border border-white/[0.035]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.018)_50%,transparent_100%)]" />

      <div className="relative z-10 mx-auto grid h-full w-full max-w-[1440px] grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]">
        {/* Brand side */}
        <section className="relative hidden min-h-0 flex-col justify-between overflow-hidden px-12 py-10 lg:flex xl:px-20">
          <div>
            <Logo className="h-12 w-[248px] text-white" />
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
        <section className="flex h-full min-h-0 items-center justify-center px-5 py-6 sm:px-8 lg:border-l lg:border-white/[0.045] lg:bg-white/[0.012] xl:px-16">
          <div className="w-full max-w-[430px]">
            <div className="mb-8 flex justify-center lg:hidden">
              <Logo className="h-11 w-[225px] text-white" />
            </div>

            <div className="rounded-[28px] border border-white/[0.07] bg-[#111318]/90 p-6 shadow-[0_30px_100px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-9">
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
                          <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                          <Input id="recovery-email" type="email" inputMode="email" autoComplete="email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} onBlur={() => setTouched(true)} placeholder="voce@empresa.com" aria-invalid={recoveryInvalid} className="h-12 rounded-xl border-white/[0.08] bg-white/[0.035] pl-10 text-white placeholder:text-white/20 focus-visible:border-[#d4af37]/50 focus-visible:ring-[#d4af37]/10" />
                        </div>
                      </div>
                      {error && <div role="alert" className="rounded-xl border border-red-300/15 bg-red-400/[0.07] px-4 py-3 text-sm leading-6 text-red-200">{error}</div>}
                      <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-[#d4af37] font-semibold text-[#16130b] shadow-[0_10px_30px_rgba(212,175,55,0.12)] transition-all hover:-translate-y-0.5 hover:bg-[#e5c66b]">
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
                      <Input id="identifier" autoFocus autoComplete="username" value={identifier} maxLength={255} onChange={(e) => setIdentifier(e.target.value)} onBlur={() => setTouched(true)} placeholder="voce@empresa.com" aria-invalid={identifierInvalid} aria-describedby="identifier-help" className="h-12 rounded-xl border-white/[0.08] bg-white/[0.035] pl-10 text-white placeholder:text-white/20 focus-visible:border-[#d4af37]/50 focus-visible:ring-[#d4af37]/10" />
                    </div>
                    <p id="identifier-help" className="text-[11px] text-white/25">Use os dados vinculados à sua conta.</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="password" className="text-xs font-medium text-white/65">Senha</Label>
                      <button type="button" onClick={() => { setMode("recovery"); setError(null); setTouched(false); }} className="text-xs font-medium text-[#d4af37] transition-colors hover:text-[#e5c66b] hover:underline">Esqueci minha senha</button>
                    </div>
                    <div className="relative">
                      <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                      <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} maxLength={200} onChange={(e) => setPassword(e.target.value)} onBlur={() => setTouched(true)} aria-invalid={passwordInvalid} className="h-12 rounded-xl border-white/[0.08] bg-white/[0.035] pl-10 pr-11 text-white placeholder:text-white/20 focus-visible:border-[#d4af37]/50 focus-visible:ring-[#d4af37]/10" />
                      <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute right-0 top-0 flex h-12 w-11 items-center justify-center text-white/30 transition-colors hover:text-[#e5c66b]">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                    </div>
                  </div>

                  {error && <div role="alert" className="rounded-xl border border-red-300/15 bg-red-400/[0.07] px-4 py-3 text-sm leading-6 text-red-200">{error}</div>}

                  <Button type="submit" disabled={loading} className="group mt-2 h-12 w-full rounded-xl bg-[#d4af37] font-semibold text-[#16130b] shadow-[0_10px_30px_rgba(212,175,55,0.12)] transition-all hover:-translate-y-0.5 hover:bg-[#e5c66b]">
                    {loading ? "Entrando..." : <span className="flex items-center justify-center gap-2">Entrar na conta <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>}
                  </Button>

                  <div className="flex items-center gap-3 pt-1 text-[9px] font-medium tracking-[0.25em] text-white/20"><span className="h-px flex-1 bg-white/[0.07]" /><span>ACESSO PRIVADO</span><span className="h-px flex-1 bg-white/[0.07]" /></div>

                  <p className="text-center text-xs text-white/35">Primeira vez aqui? <a href="/first-access" className="font-semibold text-white/65 transition-colors hover:text-[#e5c66b]">Faça seu primeiro acesso</a></p>
                </form>
              )}
            </div>

            <p className="mt-5 text-center text-[9px] font-medium uppercase tracking-[0.24em] text-white/20">Vellune Digital · v1.5</p>
          </div>
        </section>
      </div>
    </main>
  );}
