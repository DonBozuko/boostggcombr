// v417 — SEO landing: "comprar seguidores reais brasil" (Alta Conversão)
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd, buildProductJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo-jsonld";

const URL = "https://www.boostgg.com.br/comprar-seguidores-reais-brasil";
const TITLE = "Comprar Seguidores Reais Brasil — 100% Brasileiros | BoostGG";
const DESC =
  "Compre seguidores reais e brasileiros para Instagram. Perfis ativos, entrega via Pix em minutos e reposição garantida. O melhor site para seguidores Brasil.";

const FAQ = [
  {
    q: "Os seguidores são realmente brasileiros?",
    a: "Sim. Nossos pacotes de seguidores reais Brasil utilizam perfis com nomes, fotos e bio em português, garantindo a máxima naturalidade para o seu perfil.",
  },
  {
    q: "Existe risco de queda?",
    a: "Como são perfis reais, pequenas oscilações podem ocorrer. Por isso, oferecemos reposição automática de 30 dias para garantir que seu número permaneça estável.",
  },
  {
    q: "Como funciona a entrega via Pix?",
    a: "O Pix é aprovado instantaneamente. Assim que o pagamento cai, nosso sistema dispara a ordem para os servidores e você começa a ver o crescimento em minutos.",
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
      accent="#009739"
      h1="Comprar Seguidores Reais Brasil — Perfis Ativos e Brasileiros"
      subtitle="Qualidade premium com entrega instantânea via Pix"
      intro="Se o seu público-alvo é o Brasil, você precisa de seguidores brasileiros. Na BoostGG, entregamos perfis reais com fotos e nomes nacionais para aumentar sua autoridade e engajamento."
      ctaHref="/?plan=p500"
      ctaLabel="Garantir seguidores brasileiros"
      benefits={[
        { icon: "zap", title: "Velocidade Pix", text: "Aprovação imediata e início em menos de 5 minutos." },
        { icon: "shield", title: "Privacidade Total", text: "Zero senhas. Só precisamos do seu @usuário público." },
        { icon: "check", title: "Foco em Brasil", text: "Perfis com nomes e fotos brasileiras (Alta Retenção)." },
        { icon: "clock", title: "Suporte 24/7", text: "Time de especialistas pronto para ajudar no WhatsApp." },
      ]}
      pricingTitle="Planos de Seguidores Brasileiros"
      pricingCategories={["instagram:seguidores:br"]}
      pricing={[
        { id: "br-100", qty: "100 Seguidores BR", price: "R$ 9,90" },
        { id: "br-500", qty: "500 Seguidores BR", price: "R$ 29,90", note: "Recomendado" },
        { id: "br-1k", qty: "1.000 Seguidores BR", price: "R$ 49,90" },
        { id: "br-5k", qty: "5.000 Seguidores BR", price: "R$ 199,00" },
      ]}
      bodySections={[
        {
          h2: "Por que Seguidores Brasileiros são melhores para o seu perfil?",
          body: "Ter seguidores de outros países pode prejudicar a sua entrega orgânica se o seu conteúdo for em português. O algoritmo do Instagram entende que seu perfil não é relevante para o público local.\n\nAo comprar seguidores brasileiros reais, você sinaliza para a plataforma que sua conta tem autoridade no Brasil. Isso ajuda a impulsionar seus posts para a aba Explorar e para o Reels de usuários que realmente podem se tornar seus clientes ou fãs.",
        },
      ]}
      faq={FAQ}
    />
  );
}
