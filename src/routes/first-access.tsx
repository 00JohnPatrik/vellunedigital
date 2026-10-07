import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, MailCheck, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestFirstAccess } from "@/lib/auth.functions";

export const Route = createFileRoute("/first-access")({
  head: () => ({ meta: [{ title: "Primeiro acesso — Vellune Digital" }, { name: "description", content: "Ative sua conta e crie sua senha." }] }),
  component: FirstAccessPage,
});

function FirstAccessPage() {
  const request = useServerFn(requestFirstAccess);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = z.string().trim().toLowerCase().email().max(255).safeParse(email);
    if (!parsed.success) return setError("Informe um e-mail válido.");
    setLoading(true); setError(null);
    try { await request({ data: { email: parsed.data } }); setSent(true); }
    catch { setError("Não foi possível processar agora. Tente novamente."); }
    finally { setLoading(false); }
  }

  return (
    <AuthCard title="Comece seu primeiro acesso" subtitle="Informe o e-mail cadastrado pelo administrador para ativar sua conta.">
      {sent ? (
        <div className="space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-5"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary"><MailCheck className="h-5 w-5" /></div><div className="space-y-2"><h2 className="font-semibold">Link enviado com sucesso</h2><p className="text-sm leading-relaxed text-muted-foreground">Se houver um cadastro para este e-mail, enviamos um link para você criar sua senha.</p></div><p className="flex items-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-4 w-4 text-primary" /> Confira também a pasta de spam.</p></div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="rounded-xl bg-primary/5 px-4 py-3 text-sm text-muted-foreground"><span className="flex items-center gap-2 font-medium text-foreground"><Sparkles className="h-4 w-4 text-primary" /> Sua conta já está esperando por você</span><span className="mt-1 block text-xs">Use o mesmo e-mail informado pelo administrador.</span></div>
          <div className="space-y-2"><Label htmlFor="email">E-mail cadastrado</Label><Input id="email" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} placeholder="voce@empresa.com" className="h-11 bg-background/70" /></div>
          {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-3.5 py-3 text-sm text-destructive">{error}</p>}
          <Button type="submit" className="h-11 w-full rounded-xl" disabled={loading}>{loading ? "Enviando link..." : "Receber link de acesso"}</Button>
        </form>
      )}
      <Link to="/login" className="mt-6 block text-center text-sm font-semibold text-primary transition-colors hover:text-primary/80 hover:underline">Voltar ao login</Link>
    </AuthCard>
  );
}
