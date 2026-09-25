import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestFirstAccess } from "@/lib/auth.functions";

export const Route = createFileRoute("/first-access")({
  head: () => ({
    meta: [
      { title: "Primeiro acesso — Convitely" },
      { name: "description", content: "Ative sua conta e crie sua senha." },
      { property: "og:title", content: "Primeiro acesso — Convitely" },
      { property: "og:description", content: "Ative sua conta e crie sua senha." },
    ],
  }),
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
    setLoading(true);
    setError(null);
    try {
      await request({ data: { email: parsed.data, origin: window.location.origin } });
      setSent(true);
    } catch {
      setError("Não foi possível processar agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Primeiro acesso" subtitle="Informe o e-mail cadastrado pelo administrador.">
      {sent ? (
        <p className="text-sm text-muted-foreground">
          Se houver um cadastro para este e-mail, enviamos um link para você criar sua senha.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} />
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Enviando..." : "Receber link"}</Button>
        </form>
      )}
      <Link to="/login" className="mt-4 block text-center text-xs text-primary hover:underline">Voltar ao login</Link>
    </AuthCard>
  );
}
