// v200 — SEO landing: "seguidores brasileiros instagram" (1.300/mês, KDI 21)
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd, buildProductJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo-jsonld";

const URL = "https://www.boostgg.com.br/comprar-seguidores-brasileiros";
const TITLE = "Seguidores Brasileiros — Elite Boost Prime | BoostGG";
const DESC =
  "Seguidores brasileiros reais para Instagram, com foto e postagens. Entrega gradual, pagamento via Pix e reposição nos pacotes brasileiros. Ideal para vender no Brasil.";

const FAQ = [
  {
    q: "Como sei que os seguidores são realmente brasileiros?",
    a: "Nosso fornecedor filtra por localização (Brasil) e por perfis com foto e postagens em português. Você pode conferir uma amostra logo após a entrega.",
  },
  {
    q: "Por que seguidores brasileiros custam mais?",
    a: "Perfis brasileiros reais são mais escassos e valiosos que o mix internacional. Se você vende para o Brasil, o custo extra vira ROI porque essas contas engajam de verdade nas suas ofertas.",
  },
  {
    q: "Vale a pena para negócios locais?",
    a: "Muito. Prestador de serviço, restaurante, loja física, curso — só faz sentido ter seguidores da região que compra. Seguidor gringo bonito não vira cliente.",
  },
  {
    q: "Quanto tempo demora a entrega?",
    a: "Entrega gradual em 24-72 horas para parecer 100% orgânica. Pacotes menores (até 500) saem em algumas horas.",
  },
  {
    q: "Vem com reposição?",
    a: "Sim, 30 dias de reposição gratuita para qualquer queda.",
  },
];

export const Route = createFileRoute("/comprar-seguidores-brasileiros")({
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
    scripts: [buildFaqJsonLd(FAQ), buildProductJsonLd({ network: "Instagram", url: URL, description: DESC }), buildBreadcrumbJsonLd([{ name: "Início", url: "https://www.boostgg.com.br/" }, { name: "Seguidores Brasileiros", url: URL }])],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoLanding
      accent="#39ff14"
      h1="Comprar Seguidores Brasileiros Reais para Instagram"
      subtitle="Seguidores BR que engajam de verdade"
      intro="Se você vende no Brasil, seguidor gringo não converte. Aqui você compra perfis brasileiros reais, com foto e postagens, entregues aos poucos para simular crescimento orgânico."
      ctaHref="/"
      ctaLabel="Comprar seguidores brasileiros"
      benefits={[
        { icon: "check", title: "Perfis reais brasileiros", text: "Foto, postagens, localização BR. Não são bots." },
        { icon: "shield", title: "Sem senha", text: "Só precisamos do @ do seu perfil." },
        { icon: "clock", title: "Entrega gradual", text: "24-72h para parecer orgânico e não levantar suspeita." },
        { icon: "zap", title: "Reposição 30 dias", text: "Se cair, recolocamos sem custo." },
      ]}
      pricingTitle="Tabela de preços — seguidores brasileiros"
      pricingCategories={["instagram:seguidores:br"]}
      pricing={[
        { id: "br-p100", qty: "100 brasileiros", price: "R$ 5,89" },
        { id: "br-p500", qty: "500 brasileiros", price: "R$ 57,00", note: "Mais vendido" },
        { id: "br-p1k", qty: "1.000 brasileiros", price: "R$ 113,00" },
        { id: "br-p5k", qty: "5.000 brasileiros", price: "R$ 342,00" },
      ]}
      bodySections={[
        {
          h2: "Por que seguidor brasileiro vale mais que gringo",
          body: "Se seu negócio é local — advogado, dentista, loja, restaurante, curso, e-commerce BR — cada seguidor que não fala português é um número morto no perfil. Não compra, não indica, não engaja em enquete. Seguidor brasileiro real olha stories, salva post, comenta e, principalmente, vira cliente. Custa 2-3x mais, mas retorna muito mais.",
        },
        {
          h2: "Quando faz sentido escolher mix internacional",
          body: "Se seu objetivo é vaidade pura (postar print de 10k seguidores pra fechar patrocínio, chamar atenção em nicho global, etc), o mix internacional é 3x mais barato e entrega volume rápido. Para vender no Brasil, não. Para inflar número puro, sim.",
        },
      ]}
      faq={FAQ}
    />
  );
}
