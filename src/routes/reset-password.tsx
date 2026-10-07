import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard } from "@/components/auth-card";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { friendlyAuthError } from "@/lib/app-user";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({ meta: [{ title: "Definir nova senha — Vellune Digital" }, { name: "description", content: "Crie uma nova senha para sua conta." }] }),
  component: ResetPage,
});

function ResetPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery");
    const { data: sub } = supabase.auth.onAuthStateChange((event) => { if (event === "PASSWORD_RECOVERY") setReady(true); });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session && isRecovery) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("A senha deve ter pelo menos 8 caracteres.");
    if (password !== confirm) return setError("As senhas não coincidem.");
    setLoading(true); setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return setError(friendlyAuthError(error.message));
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <AuthCard title="Crie uma nova senha" subtitle="Escolha uma senha forte para manter sua conta protegida.">
      {!ready ? (
        <div className="space-y-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-5"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10 text-destructive"><ShieldCheck className="h-5 w-5" /></div><p className="text-sm leading-relaxed text-muted-foreground">Link inválido ou expirado. <Link to="/login?mode=recovery" className="font-semibold text-primary hover:underline">Solicite um novo link</Link>.</p></div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="space-y-2"><Label htmlFor="pw">Nova senha</Label><PasswordInput id="pw" autoComplete="new-password" value={password} maxLength={200} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo de 8 caracteres" /></div>
          <div className="space-y-2"><Label htmlFor="pw2">Confirmar nova senha</Label><PasswordInput id="pw2" autoComplete="new-password" value={confirm} maxLength={200} onChange={(e) => setConfirm(e.target.value)} placeholder="Digite novamente sua senha" /></div>
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary" /> Use pelo menos 8 caracteres.</p>
          {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">{error}</p>}
          <Button type="submit" className="h-11 w-full rounded-xl" disabled={loading}>{loading ? "Salvando senha..." : "Salvar nova senha"}</Button>
        </form>
      )}
    </AuthCard>
  );
}
