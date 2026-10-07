import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Mail, MailCheck, Sparkles } from "lucide-react";
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
      { title: "Primeiro acesso — Vellune Digital" },
      { name: "description", content: "Ative sua conta e crie sua senha." },
      { name: "theme-color", content: "#08090d" },
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
    if (!parsed.success) {
      setError("Informe um e-mail válido.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await request({ data: { email: parsed.data } });
      setSent(true);
    } catch {
      setError("Não foi possível processar agora. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title="Comece seu primeiro acesso"
      subtitle="Informe o e-mail cadastrado pelo administrador para ativar sua conta."
    >
      {sent ? (
        <div className="space-y-5 rounded-2xl border border-[#d4af37]/20 bg-[#d4af37]/[0.055] p-4 sm:p-5">
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d4af37]/25 bg-[#d4af37]/10 text-[#e5c66b]">
            <MailCheck className="h-5 w-5" />
          </div>

          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#d4af37]">
              Quase lá
            </p>
            <h2 className="font-display text-[24px] font-medium tracking-[-0.03em] text-white sm:text-[26px]">
              Link enviado com sucesso
            </h2>
            <p className="text-[13px] leading-5 text-white/45 sm:text-sm sm:leading-6">
              Se houver um cadastro para este e-mail, enviamos um link seguro para você criar sua senha.
            </p>
          </div>

          <p className="flex items-center gap-2 text-[11px] text-white/35 sm:text-xs">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#d4af37]" />
            Confira também a pasta de spam.
          </p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5" noValidate>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] px-4 py-3.5">
            <div className="flex items-center gap-2 text-xs font-medium text-white/75 sm:text-sm">
              <Sparkles className="h-4 w-4 shrink-0 text-[#d4af37]" />
              Sua conta já está esperando por você
            </div>
            <p className="mt-1.5 text-[11px] leading-5 text-white/35 sm:text-xs">
              Use o mesmo e-mail informado pelo administrador.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs font-medium text-white/65">
              E-mail cadastrado
            </Label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 z-20 h-4 w-4 -translate-y-1/2 text-white/25" />
              <Input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError(null);
                }}
                maxLength={255}
                placeholder="voce@empresa.com"
                className="relative z-10 h-12 rounded-xl border-white/[0.08] bg-[#111318]/90 pl-10 text-white placeholder:text-white/20 transition-[border-color,box-shadow,background-color] duration-300 focus-visible:border-[#d4af37]/55 focus-visible:ring-2 focus-visible:ring-[#d4af37]/12"
              />
            </div>
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl border border-red-300/15 bg-red-400/[0.07] px-4 py-3 text-[13px] leading-5 text-red-200"
            >
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="group mt-1 h-12 w-full rounded-xl bg-[#d4af37] font-semibold text-[#16130b] shadow-[0_12px_34px_rgba(212,175,55,0.10)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#e5c66b] hover:shadow-[0_16px_38px_rgba(212,175,55,0.16)] active:translate-y-0 disabled:cursor-default"
            disabled={loading}
          >
            {loading ? "Enviando link..." : "Receber link de acesso"}
          </Button>
        </form>
      )}

      <Link
        to="/login"
        className="mt-4 block text-center text-xs font-semibold text-white/45 transition-colors hover:text-[#e5c66b] hover:underline sm:mt-6 sm:text-sm"
      >
        Voltar ao login
      </Link>
    </AuthCard>
  );
}
