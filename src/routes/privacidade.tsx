import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Lock, Database, Mail, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Privacidade e Segurança — EliteBoost Prime" },
      {
        name: "description",
        content:
          "Como a EliteBoost Prime coleta, usa e protege seus dados. Página mantida pela EliteBoost Prime para esclarecer dúvidas sobre privacidade e segurança.",
      },
    ],
  }),
  component: TrustPage,
});

function TrustPage() {
  return (
    <div className="dark min-h-screen text-foreground">
      <header className="sticky top-0 z-50 bg-background/95 border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-[image:var(--gradient-cta)] grid place-items-center shadow-glow">
              <TrendingUp className="size-4 text-background" />
            </div>
            <span className="font-display font-bold text-lg">EliteBoost Prime</span>
          </Link>
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Voltar à página inicial
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16 max-w-3xl">
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold">
            Privacidade & Segurança
          </h1>
          <p className="mt-4 text-muted-foreground">
            Esta página é mantida pela EliteBoost Prime para responder dúvidas comuns
            sobre segurança e privacidade no uso dos nossos serviços. Não é uma
            certificação independente.
          </p>
        </div>

        <div className="space-y-8">
          <Section
            icon={Database}
            title="Quais dados coletamos"
          >
            Para processar um pedido, coletamos apenas três informações
            fornecidas voluntariamente no formulário: o pacote escolhido, o @
            ou link público do perfil de Instagram e um número de WhatsApp
            para contato. Não pedimos e nunca armazenamos a senha da sua
            conta de Instagram.
          </Section>

          <Section icon={Lock} title="Como esses dados são protegidos">
            Os dados do pedido são armazenados em banco de dados gerenciado
            com acesso restrito ao backend da EliteBoost Prime. O acesso público de
            leitura está bloqueado por políticas explícitas — nenhum visitante
            consegue listar pedidos de outros clientes pelo navegador.
          </Section>

          <Section icon={ShieldCheck} title="Acesso ao seu perfil">
            Nunca solicitaremos sua senha. Trabalhamos exclusivamente com o @
            público do perfil. Sua conta nunca é acessada por nós, nem é
            necessário conceder qualquer permissão dentro do Instagram.
          </Section>

          <Section icon={Mail} title="Uso do WhatsApp informado">
            O número de WhatsApp é utilizado apenas para enviar o Pix de
            pagamento, o comprovante e atualizações sobre o pedido. Não é
            usado para marketing de terceiros e não é compartilhado.
          </Section>

          <Section icon={Database} title="Retenção e exclusão">
            Mantemos os dados do pedido pelo tempo necessário para atendimento,
            suporte e obrigações fiscais. Para solicitar a exclusão dos seus
            dados, entre em contato pelo WhatsApp informado no momento do
            pedido.
          </Section>

          <Section icon={ShieldCheck} title="Contato de segurança">
            Encontrou um problema de segurança ou tem dúvidas sobre o
            tratamento dos seus dados? Fale com a equipe da EliteBoost Prime pelo
            mesmo WhatsApp de atendimento usado no fluxo de compra.
          </Section>
        </div>

        <p className="mt-16 text-xs text-muted-foreground">
          EliteBoost Prime não é afiliada ao Instagram ou à Meta. Esta página descreve
          práticas atuais da EliteBoost Prime e pode ser atualizada conforme o serviço
          evolui.
        </p>
      </main>

      <footer className="border-t border-border py-10 mt-8">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-md bg-[image:var(--gradient-cta)]" />
            <span className="font-display font-semibold text-foreground">
              EliteBoost Prime
            </span>
          </div>
          <p>© 2026 EliteBoost Prime. Não somos afiliados ao Instagram ou Meta.</p>
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
