import { createFileRoute, Link } from "@tanstack/react-router";
import { RefreshCw, Clock, ShieldCheck, XCircle, Wallet, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/reembolso")({
  head: () => ({
    meta: [
      { title: "Reembolso e Reposição — BoostGG" },
      {
        name: "description",
        content:
          "Política de reembolso e reposição da BoostGG: quando pedir, prazos, cobertura de queda natural e como solicitar.",
      },
    ],
  }),
  component: ReembolsoPage,
});

function ReembolsoPage() {
  return (
    <div className="dark min-h-screen text-foreground">
      <header className="sticky top-0 z-50 bg-background/95 border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-[image:var(--gradient-cta)] grid place-items-center shadow-glow">
              <TrendingUp className="size-4 text-background" />
            </div>
            <span className="font-display font-bold text-lg">BoostGG</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Voltar à página inicial
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16 max-w-3xl">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold">Reembolso e Reposição</h1>
          <p className="mt-4 text-muted-foreground">
            Regras claras para reembolso e reposição de pedidos. Última
            atualização: 2026.
          </p>
        </div>

        <div className="space-y-8">
          <Section icon={Wallet} title="Reembolso integral (100%)">
            Você tem direito a reembolso integral se: o pagamento foi
            confirmado mas o pedido não iniciou em até 24 horas; o perfil
            informado for público e válido e mesmo assim não recebermos
            entrega; ou se o pedido for cancelado por nós antes do início.
          </Section>

          <Section icon={RefreshCw} title="Reposição gratuita (queda natural)">
            Cobrimos queda natural de seguidores por 30 dias após a entrega
            completa. Se o número entregue cair abaixo do contratado nesse
            período, repomos gratuitamente. Basta enviar o ID do pagamento
            Mercado Pago pelo WhatsApp de atendimento.
          </Section>

          <Section icon={Clock} title="Prazos">
            Reembolsos aprovados são processados via Mercado Pago em até 5
            dias úteis. Reposições são iniciadas em até 24 horas após a
            solicitação válida.
          </Section>

          <Section icon={XCircle} title="Quando não há reembolso">
            Não há reembolso se: o perfil foi alterado para privado durante a
            entrega; o @ informado estava incorreto no ato do pedido; o pedido
            já foi entregue conforme contratado; a queda ocorreu por ação da
            própria rede social (banimento, alteração de conta) após a
            entrega.
          </Section>

          <Section icon={ShieldCheck} title="Como solicitar">
            Envie pelo WhatsApp de atendimento (mesmo canal usado no fluxo de
            compra) o ID do pagamento Mercado Pago que você recebeu e o motivo
            resumido. Respondemos em horário comercial.
          </Section>
        </div>

        <p className="mt-16 text-xs text-muted-foreground">
          Veja também nossos{" "}
          <Link to="/termos" className="underline hover:text-foreground">
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link to="/privacidade" className="underline hover:text-foreground">
            Política de Privacidade
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
