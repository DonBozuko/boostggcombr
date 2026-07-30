// v200 — SEO landing: "comprar seguidores tiktok" (3.600/mês, KDI 23)
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd, buildProductJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo-jsonld";

const URL = "https://www.boostgg.com.br/comprar-seguidores-tiktok";
const TITLE = "Comprar Seguidores TikTok — Elite Boost Prime | BoostGG";
const DESC =
  "Compre seguidores para TikTok com entrega imediata, pagamento via Pix e reposição de 30 dias nos pacotes brasileiros. Sem senha, sem risco, a partir de R$ 4,90.";

const FAQ = [
  {
    q: "Comprar seguidores no TikTok ajuda a viralizar?",
    a: "Ajuda indiretamente. Um perfil com 30 seguidores dificilmente pega recomendação. Com 500-1.000 base, o algoritmo do TikTok começa a testar seus vídeos em audiências maiores e o pulo pra viralizar fica muito mais provável.",
  },
  {
    q: "Preciso da minha senha do TikTok?",
    a: "Não. Nunca pedimos senha. Só precisamos do @ público do seu perfil.",
  },
  {
    q: "Em quanto tempo entram os seguidores?",
    a: "Após Pix aprovado, os primeiros seguidores caem em 5-15 minutos. Pacotes acima de 5.000 são entregues em algumas horas para simular crescimento orgânico.",
  },
  {
    q: "Os seguidores caem depois?",
    a: "Uma taxa natural de queda existe em qualquer serviço. Nos pacotes 🇧🇷 Brasileiro Real a reposição é garantida por 30 dias; nos Global, pedimos reposição ao fornecedor automaticamente.",
  },
  {
    q: "O TikTok bane conta que compra seguidores?",
    a: "Não. O TikTok não bane quem recebe seguidores — apenas quem envia spam. Como não temos acesso ao seu perfil, sua conta continua 100% segura.",
  },
];

export const Route = createFileRoute("/comprar-seguidores-tiktok")({
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
    scripts: [buildFaqJsonLd(FAQ), buildProductJsonLd({ network: "TikTok", url: URL, description: DESC }), buildBreadcrumbJsonLd([{ name: "Início", url: "https://www.boostgg.com.br/" }, { name: "Seguidores TikTok", url: URL }])],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoLanding
      accent="#00f2fe"
      h1="Comprar Seguidores TikTok — Baratos, Rápido, com Pix"
      subtitle="Seguidores TikTok em minutos"
      intro="Cresça no TikTok sem esperar viralização por sorte. Base de seguidores ativa em minutos, pagamento via Pix, reposição de 30 dias nos pacotes brasileiros e nenhum acesso à sua conta."
      ctaHref="/tiktok"
      ctaLabel="Comprar seguidores TikTok"
      benefits={[
        { icon: "zap", title: "Entrega em minutos", text: "Primeiros seguidores caem em 5-15 min." },
        { icon: "shield", title: "Sem senha, sem risco", text: "Só pedimos o @. Sua conta continua segura." },
        { icon: "check", title: "Reposição por 30 dias", text: "Garantida nos pacotes brasileiros; nos Global, pedimos ao fornecedor." },
        { icon: "clock", title: "Pix 24/7", text: "Compra a hora que quiser, aprovação instantânea." },
      ]}
      pricingTitle="Tabela de preços — seguidores TikTok"
      pricingCategories={["tiktok:seguidores"]}
      pricing={[
        { id: "tf100", qty: "100 seguidores", price: "R$ 9,87" },
        { id: "tf500", qty: "500 seguidores", price: "R$ 45,70", note: "Mais vendido" },
        { id: "tf1k", qty: "1.000 seguidores", price: "R$ 81,49" },
        { id: "tf5k", qty: "5.000 seguidores", price: "R$ 245,88" },
      ]}
      bodySections={[
        {
          h2: "Por que seguidores no TikTok mudam o jogo",
          body: "O TikTok é o algoritmo mais generoso da rede — vídeo de conta pequena pode viralizar. Mas quando alguém entra no seu perfil e vê 12 seguidores, fecha e vai embora. Ter uma base decente (500-2.000) é a diferença entre alguém apertar seguir ou não. Você compra o gatilho de conversão do perfil.",
        },
        {
          h2: "Como comprar seguidores TikTok aqui",
          body: "1. Escolha o pacote no /tiktok.\n2. Cole o @ do seu perfil.\n3. Pague o Pix.\n4. Em 5-15 min os primeiros entram.\n5. Reposição de 30 dias garantida nos pacotes 🇧🇷 Brasileiro Real; nos Global, solicitada ao fornecedor automaticamente.",
        },
      ]}
      faq={FAQ}
    />
  );
}
