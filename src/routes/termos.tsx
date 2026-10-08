import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, FileText, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — Vellune Digital" },
      { name: "description", content: "Regras de uso da plataforma Vellune Digital." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <main className="min-h-[100svh] bg-background text-foreground">
      <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
        <Link to="/login" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao acesso
        </Link>

        <header className="mt-10 border-b border-border pb-8">
          <div className="mb-3 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-primary">
            <FileText className="h-3.5 w-3.5" /> Vellune Digital
          </div>
          <h1 className="font-display text-[clamp(2.2rem,6vw,4.5rem)] font-medium leading-[.96] tracking-[-.05em]">
            Termos de Uso
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
            Regras para utilização da plataforma, criação de convites e administração de contas empresariais.
          </p>
          <p className="mt-4 text-xs text-muted-foreground/70">Última atualização: 08/10/2026</p>
        </header>

        <div className="prose prose-invert mt-10 max-w-none prose-headings:font-display prose-headings:font-medium prose-p:text-muted-foreground prose-li:text-muted-foreground">
          <Section title="1. Acesso e contas">
            <p>O acesso às áreas internas é destinado a usuários previamente cadastrados e autorizados. A conta é pessoal e as credenciais devem ser mantidas sob sigilo.</p>
          </Section>

          <Section title="2. Uso adequado">
            <p>A plataforma deve ser utilizada de forma lícita e compatível com sua finalidade, inclusive para criação, publicação e gestão de convites digitais e confirmação de presença.</p>
            <p>É vedado utilizar a plataforma para conteúdo ilegal, fraude, abuso, tentativa de exploração de vulnerabilidades, envio automatizado de solicitações ou qualquer atividade que comprometa a experiência de outros usuários.</p>
          </Section>

          <Section title="3. Conteúdo dos convites">
            <p>O conteúdo inserido pelo cliente permanece sob sua responsabilidade. O cliente deve possuir os direitos e autorizações necessários para utilizar textos, imagens, marcas e demais materiais enviados à plataforma.</p>
          </Section>

          <Section title="4. Publicação e disponibilidade">
            <p>A Vellune Digital busca manter a plataforma disponível e estável, mas serviços digitais podem sofrer indisponibilidades temporárias por manutenção, falhas de terceiros ou eventos fora do controle operacional.</p>
          </Section>

          <Section title="5. Planos, assinatura e suporte">
            <p>Os recursos disponíveis variam conforme o plano contratado. Informações comerciais, limites e condições podem ser definidos no processo de contratação e administração da conta.</p>
            <p>O suporte operacional é prestado pelos canais disponibilizados pela Vellune Digital.</p>
          </Section>

          <Section title="6. Suspensão e encerramento">
            <p>O acesso poderá ser suspenso em caso de inadimplência, uso indevido, risco de segurança, violação destes termos ou solicitação do administrador responsável pela conta.</p>
          </Section>

          <Section title="7. Propriedade intelectual">
            <p>O software, a identidade visual da plataforma e os componentes próprios da Vellune Digital permanecem protegidos pelos direitos aplicáveis. O conteúdo inserido pelos clientes não é transferido à Vellune Digital por esse uso.</p>
          </Section>

          <Section title="8. Alterações">
            <p>Estes termos podem ser atualizados quando houver mudanças relevantes na plataforma ou na operação comercial. A versão publicada nesta página é a referência vigente.</p>
          </Section>

          <Section title="9. Contato">
            <div className="not-prose rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> Atendimento Vellune</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Para suporte, dúvidas ou solicitações relacionadas à conta, utilize o canal de suporte disponibilizado no acesso da plataforma.</p>
            </div>
          </Section>
        </div>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-2xl tracking-[-.03em]">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-7 sm:text-[15px]">{children}</div>
    </section>
  );
}
