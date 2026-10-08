import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, LockKeyhole, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/protecao-dados")({
  head: () => ({
    meta: [
      { title: "Proteção de Dados — Vellune Digital" },
      { name: "description", content: "Como a Vellune Digital trata dados na plataforma." },
    ],
  }),
  component: DataProtectionPage,
});

function DataProtectionPage() {
  return (
    <main className="min-h-[100svh] bg-background text-foreground">
      <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao acesso
        </Link>
        <header className="mt-10 border-b border-border pb-8">
          <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Vellune Digital
          </div>
          <h1 className="font-display text-[clamp(2.2rem,6vw,4.5rem)] font-medium leading-[.96] tracking-[-.05em]">Proteção de Dados</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            Esta página explica, de forma objetiva, quais dados podem ser tratados na plataforma, para quais finalidades e como o acesso é protegido.
          </p>
          <p className="mt-4 text-xs text-muted-foreground/70">Última atualização: 08/10/2026</p>
        </header>
        <div className="mt-10 max-w-none">
          <Section title="1. Dados tratados">
            <p>Podemos tratar dados necessários para criar e administrar contas, empresas, clientes, convidados, convites digitais, confirmações de presença e configurações de marca.</p>
            <p>Também podem ser tratados dados técnicos e de segurança, como identificadores de sessão, registros de acesso, informações do dispositivo e eventos necessários para manter a plataforma estável e protegida.</p>
          </Section>
          <Section title="2. Finalidades">
            <p>Os dados são utilizados para autenticar usuários, entregar os recursos contratados, publicar e administrar convites, processar confirmações de presença, prestar suporte, prevenir abuso e manter a segurança da plataforma.</p>
          </Section>
          <Section title="3. Compartilhamento">
            <p>Dados podem ser processados por provedores técnicos utilizados para hospedagem, autenticação, banco de dados, armazenamento e comunicação, sempre na medida necessária à operação da Vellune Digital.</p>
          </Section>
          <Section title="4. Segurança e acesso">
            <div className="my-5 grid gap-3 sm:grid-cols-2">
              <InfoCard icon={<LockKeyhole className="h-4 w-4" />} title="Acesso protegido" text="Autenticação, sessões e permissões são verificadas antes do acesso às áreas internas." />
              <InfoCard icon={<ShieldCheck className="h-4 w-4" />} title="Proteção contra abuso" text="Os fluxos de autenticação e recuperação possuem controles de frequência para reduzir automações abusivas." />
            </div>
          </Section>
          <Section title="5. Retenção">
            <p>Os dados permanecem pelo período necessário à prestação do serviço, às rotinas operacionais e às obrigações aplicáveis. Dados excluídos podem permanecer temporariamente em rotinas técnicas de segurança e recuperação.</p>
          </Section>
          <Section title="6. Solicitações">
            <p>Solicitações relacionadas a dados pessoais podem ser encaminhadas ao suporte da Vellune Digital. A solicitação será analisada conforme a natureza do dado, a relação contratual e as obrigações aplicáveis.</p>
          </Section>
          <Section title="7. Cookies e armazenamento local">
            <p>A aplicação pode utilizar armazenamento local ou de sessão do navegador para preferências, continuidade de fluxos e controles de segurança, como lembretes de identificador e temporizadores de recuperação.</p>
          </Section>
          <Section title="8. Atualizações">
            <p>Esta página pode ser atualizada para refletir alterações no produto, nos processos operacionais ou nos requisitos aplicáveis. A versão publicada nesta página é a referência vigente.</p>
          </Section>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-2xl font-display font-medium tracking-[-.03em]">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground sm:text-[15px]">{children}</div>
    </section>
  );
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">{icon}{title}</div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}
