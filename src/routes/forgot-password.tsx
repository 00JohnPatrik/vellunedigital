import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, MailCheck } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { requestPasswordReset } from "@/lib/auth.functions";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Recuperar senha — Vellune Digital" },
      { name: "description", content: "Receba um link para redefinir sua senha." },
      { property: "og:title", content: "Recuperar senha — Vellune Digital" },
      { property: "og:description", content: "Receba um link para redefinir sua senha." },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const reset = useServerFn(requestPasswordReset);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.string().trim().toLowerCase().email().max(255).safeParse(email);
    if (!parsed.success) return setError("Informe um e-mail válido.");
    setLoading(true);
    setError(null);
    await reset({ data: { email: parsed.data, origin: window.location.origin } }).catch(() => null);
    setLoading(false);
    setSent(true);
  }

  return (
    <AuthCard title="Recupere seu acesso" subtitle="Informe seu e-mail e enviaremos um link seguro para redefinir sua senha.">
      {sent ? (
        <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary"><MailCheck className="h-5 w-5" /></div>
          <div className="space-y-2"><h2 className="font-semibold">Verifique sua caixa de entrada</h2><p className="text-sm leading-relaxed text-muted-foreground">Se o e-mail estiver cadastrado, você receberá um link em instantes.</p></div>
          <p className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary" /> O link é válido por tempo limitado.</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="space-y-2"><Label htmlFor="email">E-mail cadastrado</Label><Input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} placeholder="voce@empresa.com" className="h-11 bg-background/70" /></div>
          {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">{error}</p>}
          <Button type="submit" className="h-11 w-full rounded-xl" disabled={loading}>{loading ? "Enviando link..." : "Enviar link de recuperação"}</Button>
        </form>
      )}
      <Link to="/login" className="mt-6 block text-center text-sm font-semibold text-primary transition-colors hover:text-primary/80 hover:underline">Voltar ao login</Link>
    </AuthCard>
  );
}
