// v413 — SEO landing: "comprar seguidores reais brasil" (Prioridade Máxima)
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd, buildProductJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo-jsonld";

const URL = "https://www.boostgg.com.br/comprar-seguidores-reais-brasil";
const TITLE = "Comprar Seguidores Reais Brasil | Entrega Rápida via Pix — BoostGG";
const DESC =
  "Compre seguidores reais brasileiros para seu Instagram. Entrega imediata via Pix, perfis ativos com foto e postagens. Alta retenção e reposição garantida.";

const FAQ = [
  {
    q: "Os seguidores são realmente brasileiros?",
    a: "Sim. Nossos pacotes de Seguidores Reais Brasil são compostos exclusivamente por perfis nacionais ativos, com fotos, biografias e postagens reais.",
  },
  {
    q: "Qual a vantagem dos seguidores brasileiros?",
    a: "Seguidores brasileiros trazem engajamento qualificado e não 'sujam' seu algoritmo com contas estrangeiras, ajudando o Instagram a recomendar seu perfil para mais pessoas no Brasil.",
  },
  {
    q: "Em quanto tempo recebo os seguidores reais?",
    a: "A entrega começa em 1 a 5 minutos após o Pix. Para manter a segurança da conta, a entrega de pacotes reais é feita de forma natural e gradual.",
  },
  {
    q: "Existe risco de queda?",
    a: "Por serem perfis reais, pequenas oscilações podem ocorrer. Por isso, oferecemos reposição automática de 30 dias para qualquer queda nos pacotes brasileiros.",
  },
];

export const Route = createFileRoute("/comprar-seguidores-reais-brasil/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      buildFaqJsonLd(FAQ),
      buildProductJsonLd({ network: "Instagram", url: URL, description: DESC }),
      buildBreadcrumbJsonLd([
        { name: "Início", url: "https://www.boostgg.com.br/" },
        { name: "Seguidores Reais Brasil", url: URL },
      ]),
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoLanding
      accent="#e1306c"
      h1="Comprar Seguidores Reais Brasil — Entrega Imediata e Pix"
      subtitle="Fortaleça seu perfil com seguidores brasileiros ativos"
      intro="A BoostGG é líder em seguidores nacionais. Ative sua prova social com perfis reais do Brasil, sem senha e com garantia total de reposição."
      ctaHref="/"
      ctaLabel="Ver pacotes brasileiros"
      benefits={[
        { icon: "zap", title: "Pix Instantâneo", text: "Pagou, começou. Sistema 100% automático 24h por dia." },
        { icon: "check", title: "Perfis Nacionais", text: "Seguidores brasileiros com foto, bio e engajamento real." },
        { icon: "shield", title: "Reposição 30 dias", text: "Garantia total contra quedas nos pacotes brasileiros." },
        { icon: "clock", title: "Crescimento Natural", text: "Entrega inteligente para não disparar filtros do algoritmo." },
      ]}
      pricingTitle="Tabela de preços — Seguidores Brasileiros"
      pricingCategories={["instagram:seguidores:br"]}
      pricing={[
        { id: "p100_br", qty: "100 seguidores reais", price: "R$ 9,90" },
        { id: "p500_br", qty: "500 seguidores reais", price: "R$ 29,90", note: "Alta Conversão" },
        { id: "p1k_br", qty: "1.000 seguidores reais", price: "R$ 49,90" },
        { id: "p5k_br", qty: "5.000 seguidores reais", price: "R$ 189,90" },
      ]}
      bodySections={[
        {
          h2: "A importância de comprar seguidores brasileiros",
          body: "Se o seu público é do Brasil, comprar seguidores internacionais pode prejudicar seu alcance. O Instagram entende quem é seu público através dos seus seguidores. Com seguidores reais brasileiros, você sinaliza para o algoritmo que seu conteúdo deve ser entregue para o público nacional, aumentando suas chances de viralizar nos Reels e na aba Explorar do Brasil.",
        },
        {
          h2: "BoostGG: O melhor site para comprar seguidores reais brasil",
          body: "Não somos apenas um painel automático. Somos uma agência de crescimento que prioriza a segurança da sua conta. Nosso sistema de entrega utiliza IPs brasileiros e perfis reais que interagem com a rede social, garantindo que seu crescimento pareça 100% orgânico tanto para o Instagram quanto para suas parcerias e marcas.",
        },
      ]}
      faq={FAQ}
    />
  );
}
