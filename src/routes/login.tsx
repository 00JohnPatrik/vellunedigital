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
    <main className="relative min-h-screen overflow-hidden bg-[#070b16] text-white selection:bg-cyan-300/30">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(34,211,238,0.14),transparent_32%),radial-gradient(circle_at_88%_82%,rgba(129,96,255,0.18),transparent_35%),linear-gradient(135deg,#070b16_0%,#0b1224_52%,#080b17_100%)]" />
      <div className="pointer-events-none absolute -left-24 top-20 h-80 w-80 rounded-full border border-cyan-300/10 bg-cyan-300/[0.03] blur-sm" />
      <div className="pointer-events-none absolute right-[-8rem] top-[-5rem] h-[30rem] w-[30rem] rounded-full border border-violet-300/10 bg-violet-400/[0.04] blur-3xl" />
      <div className="pointer-events-none absolute bottom-[-12rem] left-1/3 h-96 w-96 rounded-full bg-cyan-500/[0.06] blur-3xl" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.045] [background-image:linear-gradient(rgba(255,255,255,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:72px_72px]" />

      <div className="relative z-10 mx-auto grid min-h-screen w-full max-w-7xl items-center gap-12 px-5 py-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(390px,470px)] lg:gap-20 lg:px-12 lg:py-12">
        <section className="hidden max-w-xl lg:block" aria-label="Vellune Digital">
          <div className="mb-20 flex items-center">
            <Logo className="h-12 text-white" />
          </div>

          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-200/15 bg-cyan-200/[0.07] px-4 py-2 text-xs font-medium tracking-wide text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" /> Experiências digitais memoráveis
            </div>
            <h1 className="max-w-lg font-display text-5xl font-semibold leading-[1.08] tracking-[-0.04em] text-white xl:text-6xl">
              Momentos especiais merecem uma presença à altura.
            </h1>
            <p className="max-w-md text-base leading-8 text-slate-300/75">
              Crie convites digitais sofisticados, personalizados e feitos para transformar cada celebração em uma experiência inesquecível.
            </p>
          </div>

          <div className="mt-16 flex items-center gap-8 text-sm text-slate-300/65">
            <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-cyan-300" /> Ambiente protegido</span>
            <span className="h-1 w-1 rounded-full bg-cyan-300/50" />
            <span className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-cyan-300" /> Acesso seguro</span>
          </div>
        </section>

        <section className="w-full max-w-[470px] justify-self-center">
          <div className="mb-8 flex items-center justify-center lg:hidden">
            <Logo className="h-9 text-white" />
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/[0.14] bg-white/[0.075] p-6 shadow-[0_24px_90px_rgba(0,0,0,0.42)] backdrop-blur-2xl sm:p-9">
            {mode === "recovery" ? (
              <div>
                <button type="button" onClick={showLogin} className="mb-8 text-xs font-medium text-slate-400 transition-colors hover:text-cyan-200">← Voltar ao login</button>
                {recoverySent ? (
                  <div className="space-y-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-200/20 bg-cyan-300/10 text-cyan-200"><MailCheck className="h-5 w-5" /></div>
                    <div><h1 className="font-display text-2xl font-semibold tracking-tight">Verifique seu e-mail</h1><p className="mt-3 text-sm leading-6 text-slate-300/70">Se o endereço estiver cadastrado, você receberá um link seguro para redefinir sua senha.</p></div>
                    <p className="flex items-center gap-2 text-xs text-slate-400"><CheckCircle2 className="h-4 w-4 text-cyan-300" /> O link é válido por tempo limitado.</p>
                  </div>
                ) : (
                  <form onSubmit={onRecovery} className="space-y-6" noValidate>
                    <div><p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">Recuperação</p><h1 className="font-display text-2xl font-semibold tracking-tight">Recupere seu acesso</h1><p className="mt-3 text-sm leading-6 text-slate-300/70">Informe o e-mail vinculado à sua conta e enviaremos as instruções.</p></div>
                    <div className="space-y-2"><Label htmlFor="recovery-email" className="text-slate-200">E-mail cadastrado</Label><div className="relative"><Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input id="recovery-email" type="email" inputMode="email" autoComplete="email" value={recoveryEmail} onChange={(e) => setRecoveryEmail(e.target.value)} onBlur={() => setTouched(true)} placeholder="voce@empresa.com" aria-invalid={recoveryInvalid} className="h-12 border-white/10 bg-black/20 pl-10 text-white placeholder:text-slate-500 focus-visible:border-cyan-300/60 focus-visible:ring-cyan-300/20" /></div></div>
                    {error && <div role="alert" className="rounded-xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-200">{error}</div>}
                    <Button type="submit" disabled={loading} className="h-12 w-full rounded-xl bg-cyan-300 font-semibold text-slate-950 shadow-[0_0_25px_rgba(103,232,249,0.18)] transition-all hover:-translate-y-0.5 hover:bg-cyan-200">{loading ? "Enviando link..." : "Enviar link de recuperação"}</Button>
                  </form>
                )}
              </div>
            ) : (
              <form onSubmit={onLogin} className="space-y-6" noValidate>
                <div className="mb-8"><p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200/80">Área exclusiva</p><h1 className="font-display text-3xl font-semibold tracking-[-0.03em]">Bem-vindo de volta</h1><p className="mt-3 text-sm leading-6 text-slate-300/70">Entre para continuar criando experiências memoráveis.</p></div>
                <div className="space-y-2"><Label htmlFor="identifier" className="text-slate-200">E-mail ou telefone</Label><div className="relative"><UserRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input id="identifier" autoFocus autoComplete="username" value={identifier} maxLength={255} onChange={(e) => setIdentifier(e.target.value)} onBlur={() => setTouched(true)} placeholder="voce@empresa.com" aria-invalid={identifierInvalid} aria-describedby="identifier-help" className="h-12 border-white/10 bg-black/20 pl-10 text-white placeholder:text-slate-500 focus-visible:border-cyan-300/60 focus-visible:ring-cyan-300/20" /></div><p id="identifier-help" className="text-xs text-slate-500">Use os dados vinculados à sua conta.</p></div>
                <div className="space-y-2"><div className="flex items-center justify-between gap-3"><Label htmlFor="password" className="text-slate-200">Senha</Label><button type="button" onClick={() => { setMode("recovery"); setError(null); setTouched(false); }} className="text-xs font-medium text-cyan-200 transition-colors hover:text-cyan-100 hover:underline">Esqueci minha senha</button></div><div className="relative"><LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} maxLength={200} onChange={(e) => setPassword(e.target.value)} onBlur={() => setTouched(true)} aria-invalid={passwordInvalid} className="h-12 border-white/10 bg-black/20 pl-10 pr-11 text-white placeholder:text-slate-500 focus-visible:border-cyan-300/60 focus-visible:ring-cyan-300/20" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"} className="absolute right-0 top-0 flex h-12 w-11 items-center justify-center text-slate-400 transition-colors hover:text-cyan-200">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
                {error && <div role="alert" className="rounded-xl border border-red-300/20 bg-red-400/10 px-4 py-3 text-sm leading-6 text-red-200">{error}</div>}
                <Button type="submit" disabled={loading} className="group h-12 w-full rounded-xl bg-cyan-300 font-semibold text-slate-950 shadow-[0_0_25px_rgba(103,232,249,0.18)] transition-all hover:-translate-y-0.5 hover:bg-cyan-200">{loading ? "Entrando..." : <span className="flex items-center justify-center gap-2">Entrar na conta <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>}</Button>
                <div className="flex items-center gap-3 text-[11px] text-slate-500"><span className="h-px flex-1 bg-white/10" /><span>ACESSO PRIVADO</span><span className="h-px flex-1 bg-white/10" /></div>
                <p className="text-center text-sm text-slate-400">Primeira vez aqui? <a href="/first-access" className="font-semibold text-cyan-200 transition-colors hover:text-cyan-100 hover:underline">Faça seu primeiro acesso</a></p>
              </form>
            )}
          </div>
          <p className="mt-6 text-center text-[10px] font-medium tracking-[0.22em] text-slate-500">Vellune Digital · v1.5</p>
        </section>
      </div>
    </main>
  );
}
