// v419 — SEO landing: "comprar seguidores reais brasil" (Termo de maior autoridade)
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd, buildProductJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo-jsonld";

const URL = "https://www.boostgg.com.br/comprar-seguidores-reais-brasil";
const TITLE = "Comprar Seguidores Reais Brasil — Alta Qualidade | BoostGG";
const DESC =
  "Seguidores brasileiros reais para Instagram. Perfis com foto, biografia e postagens. Alta retenção, reposição de 30 dias e entrega via Pix.";

const FAQ = [
  {
    q: "Os seguidores são realmente brasileiros?",
    a: "Sim. Nossos pacotes de Seguidores Brasileiros Reais são compostos por perfis com localização no Brasil, nomes em português, fotos reais e, na maioria das vezes, postagens ativas. É a melhor opção para quem vende produtos ou serviços no mercado nacional.",
  },
  {
    q: "Qual a diferença entre seguidores brasileiros e globais?",
    a: "Seguidores globais são um mix internacional, ótimos para volume e prova social barata. Já os seguidores brasileiros são focados em autoridade nacional. Para o algoritmo do Instagram, ter seguidores do seu próprio país ajuda a recomendar seu conteúdo para mais pessoas na sua região.",
  },
  {
    q: "Os seguidores brasileiros podem cair?",
    a: "Oscilações naturais podem ocorrer em qualquer plataforma social. Por isso, oferecemos reposição automática de 30 dias nos pacotes brasileiros. Se o número baixar, nosso sistema identifica e recompõe sem custo adicional.",
  },
  {
    q: "Preciso seguir ninguém de volta?",
    a: "Não. Você não precisa seguir ninguém, curtir fotos ou realizar qualquer ação. A entrega é unilateral para o seu perfil.",
  },
];

export const Route = createFileRoute("/comprar-seguidores-reais-brasil")({
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
      h1="Seguidores Brasileiros Reais — Autoridade Máxima"
      subtitle="Perfis reais com foto e biografia no Instagram"
      intro="Se o seu público está no Brasil, você precisa de seguidores brasileiros. Aumente sua prova social com perfis reais que passam credibilidade para quem visita sua página. Entrega via Pix em minutos."
      ctaHref="/"
      ctaLabel="Ver pacotes brasileiros"
      benefits={[
        { icon: "check", title: "100% Brasileiros", text: "Nomes e perfis reais do Brasil." },
        { icon: "zap", title: "Entrega Rápida", text: "Início imediato após confirmação do Pix." },
        { icon: "shield", title: "Privacidade Total", text: "Sem login, sem senha, sem riscos." },
        { icon: "clock", title: "Reposição 30 dias", text: "Garantia contra quedas nos pacotes BR." },
      ]}
      pricingTitle="Tabela Seguidores Brasileiros (BR)"
      pricingCategories={["instagram:seguidores"]}
      pricing={[
        { id: "p100", qty: "100 seguidores BR", price: "R$ 5,50" },
        { id: "p500", qty: "500 seguidores BR", price: "R$ 19,00" },
        { id: "p1k", qty: "1.000 seguidores BR", price: "R$ 23,47", note: "Destaque" },
        { id: "p5k", qty: "5.000 seguidores BR", price: "R$ 81,46" },
        { id: "p10k", qty: "10.000 seguidores BR", price: "R$ 130,94" },
      ]}
      bodySections={[
        {
          h2: "Por que investir em Seguidores Brasileiros?",
          body: "Ter um grande número de seguidores é bom, mas ter seguidores do seu país é melhor. Para empresas locais, influenciadores brasileiros e profissionais liberais, a procedência dos seguidores afeta diretamente a percepção de valor da marca.\n\nQuando um cliente em potencial vê que você é seguido por brasileiros, a barreira da desconfiança cai instantaneamente. É a prova social aplicada ao seu mercado local.",
        },
        {
          h2: "Qualidade vs Quantidade",
          body: "Na BoostGG, priorizamos a qualidade dos perfis brasileiros. Nossos fornecedores mantêm redes de alta retenção, garantindo que o seu perfil não apenas cresça em números, mas mantenha uma aparência profissional e orgânica.",
        },
      ]}
      faq={FAQ}
    />
  );
}
