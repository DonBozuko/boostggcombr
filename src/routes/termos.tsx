import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, ShieldCheck, CreditCard, AlertTriangle, Scale, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Uso — BoostGG" },
      {
        name: "description",
        content:
          "Termos de uso da Elite Boost Prime: regras de contratação, entrega, responsabilidades do cliente e limites do serviço.",
      },
    ],
  }),
  component: TermosPage,
});

function TermosPage() {
  return (
    <div className="dark min-h-screen text-foreground">
      <header className="sticky top-0 z-50 bg-background/95 border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-[image:var(--gradient-cta)] grid place-items-center shadow-glow">
              <TrendingUp className="size-4 text-background" />
            </div>
            <span className="font-display font-bold text-lg">Elite Boost Prime</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Voltar à página inicial
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16 max-w-3xl">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold">Termos de Uso</h1>
          <p className="mt-4 text-muted-foreground">
            Ao contratar um pacote da Elite Boost Prime, você concorda com os
            termos abaixo. Última atualização: 2026.
          </p>
        </div>

        <div className="space-y-8">
          <Section icon={FileText} title="O que é o serviço">
            A Elite Boost Prime intermedia a entrega de engajamento social
            (seguidores, curtidas, visualizações) em perfis públicos. Somos um
            serviço de marketing digital independente, não afiliado ao
            Instagram, TikTok, YouTube, Facebook, Telegram ou Meta.
          </Section>

          <Section icon={CreditCard} title="Pagamento e ativação">
            O pagamento é feito via Pix pelo Mercado Pago. O pedido é ativado
            automaticamente após a confirmação do pagamento pelo Mercado Pago.
            O prazo típico de início é de minutos; a entrega completa varia
            conforme o volume contratado.
          </Section>

          <Section icon={ShieldCheck} title="Responsabilidades do cliente">
            O perfil informado deve estar público durante a entrega. Você
            declara ser titular do perfil ou ter autorização para contratar o
            serviço para ele. Nunca solicitamos senha — informar dados de login
            é responsabilidade sua e não faz parte do serviço.
          </Section>

          <Section icon={AlertTriangle} title="Limites e recusas">
            Recusamos pedidos para perfis privados, inexistentes, com conteúdo
            ilegal ou que violem os termos da rede social de destino. A
            Elite Boost Prime pode cancelar e reembolsar pedidos que
            identifiquem risco de bloqueio para o cliente ou para o serviço.
          </Section>

          <Section icon={Scale} title="Isenção de garantias da plataforma">
            Não temos controle sobre políticas do Instagram/TikTok/Meta e
            eventuais alterações nelas. Reposição em caso de queda natural
            segue a política de reembolso e reposição.
          </Section>

          <Section icon={FileText} title="Foro e lei aplicável">
            Estes termos são regidos pela legislação brasileira. Fica eleito o
            foro do domicílio do consumidor para dirimir controvérsias.
          </Section>
        </div>

        <p className="mt-16 text-xs text-muted-foreground">
          Veja também nossa{" "}
          <Link to="/privacidade" className="underline hover:text-foreground">
            Política de Privacidade
          </Link>{" "}
          e a{" "}
          <Link to="/reembolso" className="underline hover:text-foreground">
            Política de Reembolso e Reposição
          </Link>
          .
        </p>
      </main>

      <footer className="border-t border-border py-10 mt-8">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-[image:var(--gradient-cta)]" />
            <span className="font-display font-semibold text-foreground">Elite Boost Prime</span>
          </div>
          <p>© 2026 Elite Boost Prime. Não somos afiliados ao Instagram ou Meta.</p>
        </div>
      </footer>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card/60 p-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="size-10 rounded-lg bg-[image:var(--gradient-cta)] grid place-items-center shadow-glow">
          <Icon className="size-5 text-background" />
        </div>
        <h2 className="font-display font-bold text-xl">{title}</h2>
      </div>
      <p className="text-muted-foreground leading-relaxed">{children}</p>
    </section>
  );
}
