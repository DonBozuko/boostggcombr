// v419 — SEO landing: "pix seguidores instagram" (Consulta de alta conversão)
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd, buildProductJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo-jsonld";

const URL = "https://www.boostgg.com.br/pix-seguidores-instagram";
const TITLE = "Seguidores Instagram via Pix — Entrega Imediata | BoostGG";
const DESC =
  "Compre seguidores no Instagram pagando via Pix. Aprovação instantânea, entrega automática e reposição nos pacotes brasileiros. Seguro e sem senha.";

const FAQ = [
  {
    q: "Como comprar seguidores no Instagram com Pix?",
    a: "É simples: escolha seu pacote na BoostGG, informe seu @ de usuário e selecione o Pix como forma de pagamento. Assim que você pagar o QR Code ou Copia e Cola, nosso sistema identifica o pagamento na hora e inicia o envio dos seguidores automaticamente.",
  },
  {
    q: "O Pix é seguro para comprar seguidores?",
    a: "Sim, é o método mais seguro e rápido. Diferente do cartão, você não precisa digitar dados sensíveis. Além disso, a aprovação é imediata em qualquer dia ou horário, inclusive fins de semana e feriados.",
  },
  {
    q: "Quanto tempo demora o Pix para seguidores?",
    a: "A confirmação é instantânea. O sistema da BoostGG recebe o sinal do banco em menos de 10 segundos e já coloca seu pedido na fila de entrega. Os primeiros seguidores começam a chegar em 1 a 5 minutos.",
  },
  {
    q: "Posso comprar seguidores brasileiros no Pix?",
    a: "Com certeza. Todos os nossos pacotes, incluindo os de Seguidores Brasileiros Reais, aceitam pagamento via Pix com a mesma velocidade de processamento.",
  },
];

export const Route = createFileRoute("/pix-seguidores-instagram")({
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
        { name: "Seguidores via Pix", url: URL },
      ]),
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoLanding
      accent="#39ff14"
      h1="Seguidores Instagram via Pix — Receba Agora"
      subtitle="Pagamento instantâneo, entrega automática"
      intro="Não espere compensação de boleto ou análise de cartão. Com o Pix, seus seguidores no Instagram são liberados pelo sistema no momento em que você paga. Simples, rápido e 100% seguro."
      ctaHref="/"
      ctaLabel="Comprar com Pix agora"
      benefits={[
        { icon: "zap", title: "Pix Automático", text: "Pagou, o sistema dispara. Sem espera humana." },
        { icon: "shield", title: "Sem Senha", text: "Só precisamos do seu @usuário público." },
        { icon: "check", title: "Alta Retenção", text: "Seguidores brasileiros de qualidade superior." },
        { icon: "clock", title: "Suporte 24h", text: "Dúvidas no Pix? Cham no WhatsApp a qualquer hora." },
      ]}
      pricingTitle="Planos Instagram — Pagamento Pix"
      pricingCategories={["instagram:seguidores"]}
      pricing={[
        { id: "p100", qty: "100 seguidores", price: "R$ 5,50" },
        { id: "p500", qty: "500 seguidores", price: "R$ 19,00", note: "Popular" },
        { id: "p1k", qty: "1.000 seguidores", price: "R$ 23,47" },
        { id: "p5k", qty: "5.000 seguidores", price: "R$ 81,46" },
        { id: "p10k", qty: "10.000 seguidores", price: "R$ 130,94" },
      ]}
      bodySections={[
        {
          h2: "A Revolução do Pix na Compra de Seguidores",
          body: "Antigamente, comprar seguidores exigia paciência para compensar o boleto ou sorte para o cartão não ser bloqueado pelo antifraude. Com o Pix, a BoostGG eliminou a fricção. Você gera o código, paga no app do seu banco e, antes de fechar o app, o sistema já iniciou a entrega.\n\nEssa velocidade é crucial para quem precisa de resultados imediatos em campanhas, lançamentos ou apenas para fortalecer o perfil rapidamente antes de um evento importante.",
        },
        {
          h2: "Segurança Total no Pagamento",
          body: "Ao escolher o Pix, você não compartilha dados de cartão de crédito em nossa plataforma. Isso garante uma camada extra de privacidade. Além disso, cada transação gera um comprovante oficial no seu banco, oferecendo total transparência e segurança jurídica para a sua compra.",
        },
      ]}
      faq={FAQ}
    />
  );
}
