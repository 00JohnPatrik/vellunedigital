import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Eye, EyeOff, LoaderCircle, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { friendlyAuthError, isAuthServiceUnavailable } from "@/lib/app-user";
import { AuthJourneySteps } from "@/components/auth-journey";
import { AuthUnavailableState } from "@/components/auth-unavailable-state";
import { AuthSuccessTransition } from "@/components/auth-success-transition";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Definir nova senha — Vellune Digital" },
      { name: "description", content: "Crie uma nova senha para sua conta." },
      { name: "theme-color", content: "#08090d" },
    ],
  }),
  component: ResetPage,
});

function PasswordField({
  id,
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
  inputRef,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoComplete: string;
  error?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type={visible ? "text" : "password"}
        name={id === "pw" ? "new-password" : "confirm-password"}
        autoComplete={autoComplete}
        enterKeyHint={id === "pw" ? "next" : "done"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={200}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        aria-invalid={error}
        className="h-12 w-full rounded-xl border border-white/[0.08] bg-[#111318]/90 px-4 pr-11 text-sm text-white placeholder:text-white/20 outline-none transition-[border-color,box-shadow,background-color] duration-300 focus:border-[#d4af37]/55 focus:ring-2 focus:ring-[#d4af37]/12 focus:shadow-[0_0_0_1px_rgba(212,175,55,0.14),0_10px_35px_rgba(212,175,55,0.05)]"
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        className="absolute right-0 top-0 flex h-12 w-11 items-center justify-center text-white/30 transition-colors hover:text-[#e5c66b]"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function ResetPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [authUnavailable, setAuthUnavailable] = useState(false);
  const [passwordUpdated, setPasswordUpdated] = useState(false);
  const passwordRef = useRef<HTMLInputElement | null>(null);
  const confirmRef = useRef<HTMLInputElement | null>(null);
  const requestLockRef = useRef(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && isRecovery) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const passwordTooShort = password.length > 0 && password.length < 8;
  const confirmMismatch = confirm.length > 0 && password !== confirm;
  const strengthScore = [
    password.length >= 8,
    /[A-ZÀ-Ý]/.test(password) && /[a-zà-ÿ]/.test(password),
    /\d/.test(password),
    /[^A-Za-zÀ-ÿ0-9]/.test(password),
  ].filter(Boolean).length;
  const strengthLabel = strengthScore <= 1 ? "Fraca" : strengthScore === 2 ? "Média" : strengthScore === 3 ? "Boa" : "Forte";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (requestLockRef.current) return;
    setError(null);

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      window.setTimeout(() => passwordRef.current?.focus(), 0);
      return;
    }
    if (password !== confirm) {
      setError("As senhas não coincidem.");
      window.setTimeout(() => confirmRef.current?.focus(), 0);
      return;
    }

    requestLockRef.current = true;
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        if (isAuthServiceUnavailable(updateError)) setAuthUnavailable(true);
        setError(friendlyAuthError(updateError.message));
        return;
      }

      setPasswordUpdated(true);
      await supabase.auth.signOut();
      const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
      await new Promise((resolve) => window.setTimeout(resolve, prefersReducedMotion ? 420 : 1250));
      navigate({ to: "/login", replace: true });
    } catch (err) {
      if (isAuthServiceUnavailable(err)) setAuthUnavailable(true);
      setError(friendlyAuthError(err instanceof Error ? err.message : undefined));
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
    <>
    <AuthCard title="Crie uma nova senha" subtitle="Escolha uma senha forte para manter sua conta protegida.">
      {!ready ? (
        <div>
          <AuthJourneySteps activeStep={2} labels={["Solicitar", "Verificar", "Redefinir"]} />
          <div className="space-y-4 rounded-2xl border border-red-300/15 bg-red-400/[0.07] p-3.5 sm:space-y-5 sm:p-5" role="alert">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-red-300/15 bg-red-400/[0.07] text-red-200">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-red-200/80">Link indisponível</p>
            <h2 className="mt-1 font-display text-[22px] font-medium tracking-[-0.025em] text-white">Este link não é mais válido</h2>
            <p className="mt-2 text-[13px] leading-5 text-red-100/55">O link pode ter expirado ou não foi possível validar sua sessão de recuperação.</p>
          </div>
            <Link to="/login" search={{ mode: "recovery" }} className="inline-flex text-xs font-semibold text-[#e5c66b] transition-colors hover:text-white">
              Solicitar novo link →
            </Link>
          </div>
        </div>
      ) : (
        <div>
          <AuthJourneySteps activeStep={3} labels={["Solicitar", "Verificar", "Redefinir"]} />
          <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3.5">
            <div className="flex items-center gap-2 text-xs font-medium text-white/75 sm:text-sm">
              <ShieldCheck className="h-4 w-4 text-[#d4af37]" />
              Sua nova senha será protegida pela Vellune.
            </div>
            <p className="mt-1.5 text-[11px] leading-5 text-white/35 sm:text-xs">Use 8+ caracteres, misturando letras, números e símbolos.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pw" className="text-xs font-medium text-white/65">Nova senha</Label>
            <PasswordField
              id="pw"
              inputRef={passwordRef}
              autoComplete="new-password"
              value={password}
              onChange={setPassword}
              placeholder="Mínimo de 8 caracteres"
              error={passwordTooShort}
            />
            {passwordTooShort && <p className="flex items-center gap-1.5 text-[11px] text-red-300/90"><AlertCircle className="h-3.5 w-3.5" />A senha precisa ter pelo menos 8 caracteres.</p>}
            <div className="pt-1">
              <div className="mb-1.5 flex items-center justify-between text-[9px] font-semibold uppercase tracking-[0.14em]"><span className="text-white/25">Força da senha</span><span className={strengthScore >= 3 ? "text-[#e5c66b]" : "text-white/35"}>{password ? strengthLabel : "—"}</span></div>
              <div className="grid grid-cols-4 gap-1">{[1,2,3,4].map((level)=><span key={level} className={`h-1 rounded-full transition-all duration-300 ${password && strengthScore >= level ? "bg-[#d4af37]" : "bg-white/[0.07]"}`} />)}</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pw2" className="text-xs font-medium text-white/65">Confirmar nova senha</Label>
            <PasswordField
              id="pw2"
              inputRef={confirmRef}
              autoComplete="new-password"
              value={confirm}
              onChange={setConfirm}
              placeholder="Digite novamente sua senha"
              error={confirmMismatch}
            />
            {confirmMismatch && <p className="flex items-center gap-1.5 text-[11px] text-red-300/90"><AlertCircle className="h-3.5 w-3.5" />As senhas ainda não coincidem.</p>}
          </div>

          <p className="flex items-center gap-2 text-xs text-white/35">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#d4af37]" />
            Mínimo de 8 caracteres.
          </p>

          {error && (
            <div role="alert" aria-live="assertive" className="vellune-auth-error flex items-start gap-2.5 rounded-xl border border-red-300/15 bg-red-400/[0.07] px-3.5 py-2.5 text-[12.5px] leading-5 text-red-200">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-red-200/10 bg-red-200/[0.06]">
                <AlertCircle className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="font-medium text-red-100/95">Não foi possível salvar</p>
                <p className="mt-0.5 text-[12px] leading-5 text-red-200/75">{error}</p>
              </div>
            </div>
          )}

          <Button type="submit" className="vellune-auth-cta group relative flex h-12 min-h-12 w-full items-center justify-center overflow-hidden rounded-xl bg-[#d4af37] font-semibold text-[#16130b] shadow-[0_12px_34px_rgba(212,175,55,0.10)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#e5c66b] hover:shadow-[0_16px_38px_rgba(212,175,55,0.16)] active:translate-y-0 disabled:cursor-default disabled:opacity-100" disabled={loading}>
            {loading ? (
              <span className="flex items-center justify-center gap-2"><LoaderCircle className="h-4 w-4 animate-spin" />Salvando senha...</span>
            ) : (
              <span className="flex items-center justify-center gap-2">Salvar nova senha <span aria-hidden="true">→</span></span>
            )}
          </Button>
          </form>
        </div>
      )}
    </AuthCard>
    <AuthSuccessTransition
      open={passwordUpdated}
      eyebrow="Senha atualizada"
      title="Seu acesso está protegido"
      ariaLabel="Senha atualizada. Seu acesso está protegido. Retornando ao login."
    />
    </>
  );
}
