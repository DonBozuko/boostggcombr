// v200 — SEO landing: "comprar curtidas instagram" (9.900/mês, KDI 17 — ALVO PRINCIPAL)
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd } from "@/lib/seo-jsonld";

const URL = "https://boostgg.com.br/comprar-curtidas-instagram";
const TITLE = "Comprar Curtidas Instagram — Elite Boost Prime | BoostGG";
const DESC =
  "Compre curtidas para posts do Instagram a partir de R$ 2,90. Entrega em segundos, sem senha, com reposição garantida. Pague via Pix.";

const FAQ = [
  {
    q: "As curtidas entram em qual post?",
    a: "Você cola o link exato do post (feed, Reels ou carrossel) que quer receber as curtidas. Só entram nesse post, não em outros.",
  },
  {
    q: "Quanto tempo leva pra receber?",
    a: "Curtidas entram em segundos após o Pix aprovado. Um pedido de 1.000 curtidas fica completo em 3-8 minutos, com velocidade natural.",
  },
  {
    q: "Comprar curtidas pode banir minha conta?",
    a: "Não. Não temos acesso ao seu perfil (não pedimos senha) e usamos entrega gradual. O Instagram não bane contas por receber curtidas — ele só bane quem envia spam.",
  },
  {
    q: "As curtidas ficam permanentes?",
    a: "Sim. Todo pacote acompanha reposição por 30 dias caso caia alguma curtida.",
  },
  {
    q: "Posso comprar curtidas para Reels?",
    a: "Pode. Curtidas em Reels contam do mesmo jeito e ajudam no ranking. Cole o link do Reels no campo do pedido.",
  },
  {
    q: "É melhor comprar curtidas ou seguidores?",
    a: "Depende do objetivo. Curtidas mostram que o post é bom (empurra no algoritmo, aumenta alcance orgânico). Seguidores mostram autoridade da conta. O ideal é combinar: seguidores base + curtidas nos posts recentes.",
  },
];

export const Route = createFileRoute("/comprar-curtidas-instagram")({
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
    scripts: [buildFaqJsonLd(FAQ)],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoLanding
      accent="#e1306c"
      h1="Comprar Curtidas Instagram — Entrega em Segundos via Pix"
      subtitle="Curtidas Instagram instantâneas"
      intro="Boost de curtidas em qualquer post do Instagram (feed, Reels, carrossel). Pague com Pix, receba em segundos e ganhe alcance orgânico automático pelo algoritmo."
      ctaHref="/"
      ctaLabel="Comprar curtidas agora"
      benefits={[
        { icon: "zap", title: "Segundos, não minutos", text: "Curtidas começam a cair em <60s após o Pix." },
        { icon: "shield", title: "Sem senha", text: "Só precisamos do link do post. Sua conta segue segura." },
        { icon: "check", title: "Empurra o algoritmo", text: "Curtidas altas nos primeiros minutos = mais alcance orgânico." },
        { icon: "clock", title: "Reposição 30 dias", text: "Se cair, recolocamos sem cobrar de novo." },
      ]}
      pricingTitle="Tabela de preços — curtidas Instagram"
      pricing={[
        { qty: "100 curtidas", price: "R$ 2,90" },
        { qty: "500 curtidas", price: "R$ 9,90", note: "Mais vendido" },
        { qty: "1.000 curtidas", price: "R$ 17,90" },
        { qty: "5.000 curtidas", price: "R$ 69,90" },
        { qty: "10.000 curtidas", price: "R$ 129,90" },
      ]}
      bodySections={[
        {
          h2: "Por que curtidas no Instagram valem mais que parecem",
          body: "O algoritmo do Instagram decide se vai mostrar seu post pra mais gente nos primeiros 30-60 minutos. Se nesse intervalo o post recebe muitas curtidas, ele viaja pra explore, sugestões, hashtags. Se recebe pouca, morre. Comprar curtidas nesse primeiro momento é literalmente comprar o gatilho de distribuição.",
        },
        {
          h2: "Como comprar curtidas Instagram na BoostGG",
          body: "1. Escolha a quantidade (100 a 100.000).\n2. Cole o link do post que quer turbinar.\n3. Pague o Pix (QR Code ou copia e cola).\n4. Em segundos as curtidas começam a entrar.\n5. Se cair, reposição automática por 30 dias.",
        },
        {
          h2: "Curtidas em Reels vs. feed vs. carrossel",
          body: "Todos funcionam. Curtidas em Reels ainda são o formato de maior peso no algoritmo (Reels é a prioridade da Meta). Se o objetivo é viralizar, invista em curtidas + views nos Reels. Se é prova social num post-vitrine (produto, portfólio), curtidas no feed já resolvem.",
        },
      ]}
      faq={FAQ}
    />
  );
}
