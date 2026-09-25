import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AuthCard } from "@/components/auth-card";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signInWithPhone } from "@/lib/auth.functions";
import { canUseAdminArea, friendlyAuthError, homeFor, loadAppUser } from "@/lib/app-user";

export const Route = createFileRoute("/login")({
  validateSearch: z.object({ error: z.enum(["inactive"]).optional() }),
  head: () => ({
    meta: [
      { title: "Entrar — Vellune Digital" },
      { name: "description", content: "Acesse o painel do Vellune Digital." },
      { property: "og:title", content: "Entrar — Vellune Digital" },
      { property: "og:description", content: "Acesse o painel do Vellune Digital." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { error: reason } = Route.useSearch();
  const navigate = useNavigate();
  const phoneSignIn = useServerFn(signInWithPhone);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    reason === "inactive" ? "Sua conta está inativa. Fale com o administrador." : null,
  );
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const id = identifier.trim();
    if (!id || !password) return setError("Preencha e-mail/telefone e senha.");
    setLoading(true);
    try {
      if (id.includes("@")) {
        if (!z.string().email().safeParse(id).success) throw new Error("E-mail inválido.");
        const { error } = await supabase.auth.signInWithPassword({ email: id.toLowerCase(), password });
        if (error) throw new Error(friendlyAuthError(error.message));
      } else {
        const res = await phoneSignIn({ data: { phone: id, password } });
        if (!res.ok) throw new Error(res.error);
        const { error } = await supabase.auth.setSession(res);
        if (error) throw new Error(friendlyAuthError(error.message));
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

  return (
    <AuthCard title="Entrar" subtitle="Use seu e-mail ou telefone cadastrado.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label htmlFor="identifier">E-mail ou telefone</Label>
          <Input id="identifier" autoComplete="username" value={identifier} maxLength={255}
            onChange={(e) => setIdentifier(e.target.value)} placeholder="voce@empresa.com" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">Esqueci minha senha</Link>
          </div>
          <PasswordInput id="password" autoComplete="current-password" value={password} maxLength={200}
            onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
        <p className="text-center text-xs text-muted-foreground">
          Primeira vez aqui? <Link to="/first-access" className="text-primary hover:underline">Primeiro acesso</Link>
        </p>
      </form>
    </AuthCard>
  );
}
