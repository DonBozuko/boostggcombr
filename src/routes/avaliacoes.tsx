import { createFileRoute, Link } from "@tanstack/react-router";
import { Star, MessageSquare, ExternalLink, ShieldCheck, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/avaliacoes")({
  head: () => ({
    meta: [
      { title: "Avalie a BoostGG — Sua opinião fortalece a marca" },
      {
        name: "description",
        content:
          "Veja onde deixar sua avaliação sobre a BoostGG. Sua experiência ajuda outras pessoas a confiarem no serviço.",
      },
      { property: "og:url", content: "https://boostgg.com.br/avaliacoes" },
    ],
    links: [{ rel: "canonical", href: "https://boostgg.com.br/avaliacoes" }],
  }),
  component: AvaliacoesPage,
});

function AvaliacoesPage() {
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
          <h1 className="text-4xl md:text-5xl font-bold">Sua avaliação vale ouro</h1>
          <p className="mt-4 text-muted-foreground">
            A cada review sincero, a BoostGG fica mais visível no Google, nas IAs e para
            quem ainda está decidindo se confia no serviço. Leva menos de 1 minuto.
          </p>
        </div>

        <div className="space-y-6">
          <ReviewCard
            icon={Star}
            title="Trustpilot"
            description="Plataforma internacional de reviews. Ideal para quem busca o serviço no Google e nas IAs."
            cta="Deixar avaliação no Trustpilot"
            href="https://br.trustpilot.com/evaluate/www.boostgg.com.br"
            status="ativo"
          />
          <ReviewCard
            icon={MessageSquare}
            title="Reclame Aqui"
            description="Perfil oficial no RA. Avaliações aqui são muito consultadas no Brasil."
            cta="Ver perfil no Reclame Aqui"
            href="https://www.reclameaqui.com.br/elite-boost-prime/"
            status="em-configuracao"
          />
          <ReviewCard
            icon={ShieldCheck}
            title="Google Reviews"
            description="Review no Google Business. Aparece direto nos resultados de busca."
            cta="Avaliar no Google"
            href="https://g.page/r/CfK8x9v1z1bREAI/review"
            status="placeholder"
          />
        </div>

        <div className="mt-16 rounded-2xl border border-border bg-card/60 p-6">
          <h2 className="font-display font-bold text-xl mb-3">
            Por que isso ajuda tanto?
          </h2>
          <ul className="space-y-3 text-muted-foreground">
            <li className="flex gap-3">
              <span className="text-emerald-400">✓</span>
              <span>
                Reviews são sinais de confiança que o Google e as IAs usam para ranquear
                e recomendar marcas.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400">✓</span>
              <span>
                Quem compra seguidores no Pix quer ver que outras pessoas já compraram e
                deram certo.
              </span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400">✓</span>
              <span>
                Mais avaliações = menos atrito na venda e menor custo por cliente novo.
              </span>
            </li>
          </ul>
        </div>
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

function ReviewCard({
  icon: Icon,
  title,
  description,
  cta,
  href,
  status,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  cta: string;
  href: string;
  status: "ativo" | "em-configuracao" | "placeholder";
}) {
  const statusLabel = {
    ativo: "Pronto",
    "em-configuracao": "Em configuração",
    placeholder: "Substituir pelo link real",
  }[status];

  const badgeColor = {
    ativo: "bg-emerald-500/10 text-emerald-400",
    "em-configuracao": "bg-amber-500/10 text-amber-400",
    placeholder: "bg-muted text-muted-foreground",
  }[status];

  return (
    <section className="rounded-2xl border border-border bg-card/60 p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-xl bg-[image:var(--gradient-cta)] grid place-items-center shadow-glow">
            <Icon className="size-6 text-background" />
          </div>
          <div>
            <h2 className="font-display font-bold text-xl">{title}</h2>
            <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${badgeColor}`}>
              {statusLabel}
            </span>
          </div>
        </div>
      </div>
      <p className="mt-4 text-muted-foreground leading-relaxed">{description}</p>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[image:var(--gradient-cta)] px-5 py-3 text-sm font-semibold text-background shadow-glow hover:opacity-90 transition-opacity"
      >
        {cta}
        <ExternalLink className="size-4" />
      </a>
    </section>
  );
}
