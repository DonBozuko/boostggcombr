// v417 — SEO landing: "pix seguidores instagram" (Conversão Imediata)
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd, buildProductJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo-jsonld";

const URL = "https://www.boostgg.com.br/pix-seguidores-instagram";
const TITLE = "Pix Seguidores Instagram — Receba em Segundos | BoostGG";
const DESC =
  "Comprar seguidores no Instagram com Pix. O método mais rápido, seguro e barato de crescer seu perfil. Aprovação instantânea e início imediato.";

const FAQ = [
  {
    q: "O pagamento via Pix é seguro?",
    a: "Sim. Utilizamos as maiores integradoras de pagamento do Brasil. O QR Code é gerado na hora e a confirmação é automática e criptografada.",
  },
  {
    q: "Preciso enviar o comprovante?",
    a: "Não é necessário. Nosso sistema identifica o pagamento via Pix em segundos e já libera o seu pedido para a fila de envio automaticamente.",
  },
  {
    q: "Quais os benefícios de usar o Pix?",
    a: "Além da velocidade (início em minutos), o Pix não tem taxas de processamento como o cartão, o que nos permite oferecer preços muito mais baixos.",
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
        { name: "Pix Seguidores", url: URL },
      ]),
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoLanding
      accent="#32BCAD"
      h1="Pix Seguidores Instagram — Crescimento Instantâneo"
      subtitle="O jeito mais rápido de turbinar seu perfil"
      intro="Cansado de esperar dias para ver resultados? Com o Pix, seu pedido entra no sistema no exato segundo em que você paga. Sem burocracia, sem cadastro e sem espera."
      ctaHref="/?plan=p1k"
      ctaLabel="Comprar via Pix agora"
      benefits={[
        { icon: "zap", title: "Aprovação em 1s", text: "Pagou, caiu, começou. Simples assim." },
        { icon: "shield", title: "Compra Anônima", text: "Privacidade absoluta. Não salvamos dados sensíveis." },
        { icon: "check", title: "Melhor Preço", text: "Taxa zero no Pix = seguidores muito mais baratos." },
        { icon: "clock", title: "Início em Minutos", text: "A fila prioritária do Pix garante entrega recorde." },
      ]}
      pricingTitle="Ofertas Exclusivas Pix"
      pricingCategories={["instagram:seguidores"]}
      pricing={[
        { id: "p1k", qty: "1.000 seguidores", price: "R$ 18,00" },
        { id: "p5k", qty: "5.000 seguidores", price: "R$ 65,00", note: "Oferta Pix" },
        { id: "p10k", qty: "10.000 seguidores", price: "R$ 120,00" },
      ]}
      bodySections={[
        {
          h2: "Por que usar o Pix para comprar seguidores?",
          body: "O Pix revolucionou o mercado de serviços digitais no Brasil. Na BoostGG, integramos nossa API diretamente com o Banco Central para garantir que o seu crescimento comece no momento em que a transação é finalizada.\n\nDiferente do boleto (que demora 3 dias) ou do cartão (que pode entrar em análise), o Pix é 100% garantido e imediato. É a escolha inteligente para quem tem pressa em crescer.",
        },
      ]}
      faq={FAQ}
    />
  );
}
