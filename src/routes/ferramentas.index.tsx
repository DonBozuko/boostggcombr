import { createFileRoute, Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Calculator, Users, Sparkles, ArrowRight } from "lucide-react";

const CANON = "https://www.boostgg.com.br/ferramentas";
const TITLE = "Ferramentas Grátis para Instagram | BoostGG";
const DESC =
  "Ferramentas 100% grátis para creators: gerador de legenda com IA, contador de seguidores em tempo real e calculadora de engajamento do Instagram. Sem login.";

const TOOLS = [
  {
    to: "/ferramentas/gerador-legenda-instagram",
    icon: Sparkles,
    title: "Gerador de Legenda com IA",
    desc: "3 legendas persuasivas em segundos com gancho, CTA e hashtags. Grátis, sem login.",
  },
  {
    to: "/ferramentas/contador-seguidores",
    icon: Users,
    title: "Contador de Seguidores Instagram",
    desc: "Veja em tempo real quantos seguidores qualquer perfil público tem. Atualiza na hora, sem login.",
  },
  {
    to: "/ferramentas/calculadora-engajamento-instagram",
    icon: Calculator,
    title: "Calculadora de Engajamento",
    desc: "Descubra se um perfil tem engajamento real ou inflado. Cálculo instantâneo.",
  },
];

const OG_IMAGE = "https://www.boostgg.com.br/og-instagram.jpg";

export const Route = createFileRoute("/ferramentas/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: CANON },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_IMAGE },
      { property: "og:image:alt", content: TITLE },
      { property: "og:site_name", content: "BoostGG" },
      { property: "og:locale", content: "pt_BR" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { name: "twitter:image", content: OG_IMAGE },
    ],
    links: [{ rel: "canonical", href: CANON }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: TITLE,
          url: CANON,
          description: DESC,
          hasPart: TOOLS.map((t) => ({
            "@type": "WebApplication",
            name: t.title,
            url: `https://www.boostgg.com.br${t.to}`,
            applicationCategory: "UtilityApplication",
            operatingSystem: "Any",
            offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
          })),
        }),
      },
    ],
  }),
  component: FerramentasIndex,
});

function FerramentasIndex() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-12 sm:py-20">
        <header className="mb-12 text-center">
          <h1 className="text-3xl font-bold sm:text-5xl">Ferramentas Grátis para Instagram</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            Ferramentas 100% grátis, sem login, sem cadastro. Feitas pra creators que querem
            medir o que importa antes de investir.
          </p>
        </header>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <Link key={tool.to} to={tool.to} className="group block">
                <Card className="h-full p-6 transition-all hover:border-primary hover:shadow-lg">
                  <div className="mb-4 inline-flex rounded-lg bg-primary/10 p-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold">{tool.title}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{tool.desc}</p>
                  <div className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                    Abrir ferramenta
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        <section className="mt-16 rounded-lg border bg-card p-6 sm:p-8">
          <h2 className="text-2xl font-semibold">Por que ferramentas grátis?</h2>
          <p className="mt-3 text-muted-foreground">
            A gente sabe que 90% das "ferramentas grátis" pedem email, senha do Instagram ou
            travam num paywall depois de 1 uso. Aqui não. Você usa, mede, decide. Se depois
            quiser turbinar o perfil, a gente tem{" "}
            <Link to="/" className="text-primary underline">
              planos de seguidores e engajamento reais
            </Link>{" "}
            — mas isso é opcional.
          </p>
        </section>
      </div>
    </div>
  );
}
