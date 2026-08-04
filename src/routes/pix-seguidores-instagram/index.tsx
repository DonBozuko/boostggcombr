// v413 — SEO landing: "pix seguidores instagram" (Alta Conversão)
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd, buildProductJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo-jsonld";

const URL = "https://www.boostgg.com.br/pix-seguidores-instagram";
const TITLE = "Pix Seguidores Instagram — Entrega em Minutos 24h | BoostGG";
const DESC =
  "Compre seguidores Instagram com Pix e receba agora. A forma mais rápida e segura de turbinar seu perfil. Sem taxas e disponível 24/7.";

const FAQ = [
  {
    q: "Como comprar seguidores com Pix?",
    a: "É simples: escolha seu pacote, informe seu @ do Instagram e o sistema gerará um QR Code ou chave Copia e Cola do Mercado Pago. O processamento é instantâneo após o pagamento.",
  },
  {
    q: "O Pix seguidores funciona de madrugada?",
    a: "Sim. Nosso sistema é 100% automático. Não dependemos de aprovação manual, então você pode comprar a qualquer hora do dia ou da noite, inclusive feriados.",
  },
  {
    q: "O Pix tem taxa?",
    a: "Não. Diferente do cartão de crédito, o Pix não possui taxas bancárias ou de processamento na BoostGG, garantindo sempre o menor preço possível.",
  },
];

export const Route = createFileRoute("/pix-seguidores-instagram/")({
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
        { name: "Pix Seguidores", url: URL },
      ]),
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoLanding
      accent="#00d2ff"
      h1="Pix Seguidores Instagram — Receba na Hora"
      subtitle="O método de pagamento preferido para resultados rápidos"
      intro="Turbine seu perfil com a velocidade do Pix. A BoostGG processa seu pedido em tempo real, garantindo que os seguidores entrem em minutos após a confirmação."
      ctaHref="/"
      ctaLabel="Comprar com Pix agora"
      benefits={[
        { icon: "zap", title: "Velocidade Pix", text: "Entrega relâmpago 24h por dia, 7 dias por semana." },
        { icon: "shield", title: "Sem Cadastro", text: "Privacidade total. Só precisamos do seu @ e e-mail." },
        { icon: "check", title: "Aprovação Imediata", text: "Sem esperas bancárias. O sistema detecta o pagamento na hora." },
        { icon: "clock", title: "Suporte Dedicado", text: "Qualquer dúvida, nosso time responde rápido no WhatsApp." },
      ]}
      pricingTitle="Melhores Ofertas via Pix"
      pricingCategories={["instagram:seguidores"]}
      pricing={[
        { id: "p1k", qty: "1.000 Seguidores", price: "R$ 18,00", note: "Melhor Preço" },
        { id: "p5k", qty: "5.000 Seguidores", price: "R$ 65,00" },
        { id: "p10k", qty: "10.000 Seguidores", price: "R$ 120,00" },
      ]}
      bodySections={[
        {
          h2: "Por que escolher o Pix para comprar seguidores?",
          body: "O Pix revolucionou o mercado de SMM (Social Media Marketing). Antes, pagamentos via boleto levavam dias para compensar e o cartão podia ter taxas altas ou recusar a transação. Com o Pix Seguidores da BoostGG, você tem a garantia de que seu investimento será processado imediatamente pelo menor preço do mercado brasileiro.",
        },
      ]}
      faq={FAQ}
    />
  );
}
