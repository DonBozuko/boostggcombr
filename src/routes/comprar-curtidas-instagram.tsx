// v202 — SEO landing: "comprar curtidas instagram" (9.900/mês, KDI 17)
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd, buildProductJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo-jsonld";

const URL = "https://www.boostgg.com.br/comprar-curtidas-instagram";
const TITLE = "Comprar Curtidas Instagram via Pix — Elite Boost Prime | BoostGG";
const DESC =
  "Curtidas no Instagram a partir de R$ 5,00 (50 curtidas), entrega em 1 a 5 minutos após o Pix. Sem senha, com reposição garantida por 30 dias. Cole o link do post.";



const FAQ = [
  {
    q: "Comprar curtidas no Instagram funciona?",
    a: "Sim. As curtidas atuam como prova social: posts com mais reações são interpretados pelo algoritmo como conteúdo relevante e ganham mais distribuição no feed e no Reels.",
  },
  {
    q: "Em quanto tempo as curtidas entram?",
    a: "Após o Pix aprovado, as curtidas começam em 1 a 5 minutos. Posts e Reels recebem de forma gradual para manter a naturalidade.",
  },
  {
    q: "Preciso passar a senha do Instagram?",
    a: "Não. Nunca pedimos senha. Basta enviar o link do post ou Reel que você quer impulsionar.",
  },
  {
    q: "As curtidas são de perfis brasileiros?",
    a: "Oferecemos mix internacional e brasileiro. Na hora da compra você escolhe a melhor opção para o seu objetivo e orçamento.",
  },
  {
    q: "Se cair curtida, tem reposição?",
    a: "Sim. Garantia de reposição por 30 dias. Se houver queda, abra um ticket e recompomos sem custo adicional.",
  },
  {
    q: "Posso dividir as curtidas entre vários posts?",
    a: "Cada pacote é vinculado a um link por vez. Para dividir, basta fazer pedidos menores separados — cada um com o link do post desejado.",
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
    scripts: [buildFaqJsonLd(FAQ), buildProductJsonLd({ network: "Instagram", url: URL, description: DESC }), buildBreadcrumbJsonLd([{ name: "Início", url: "https://www.boostgg.com.br/" }, { name: "Curtidas Instagram", url: URL }])],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoLanding
      accent="#e1306c"
      h1="Comprar Curtidas Instagram — Reais, Rápidas e com Pix"
      subtitle="Curtidas para posts e Reels entregues em minutos"
      intro="Dê aquele empurrão nos seus posts e Reels: pague com Pix, receba curtidas em minutos e aumente o alcance orgânico. Sem senha, sem risco, sem cadastro."
      ctaHref="/"
      ctaLabel="Comprar curtidas agora"
      benefits={[
        { icon: "zap", title: "Entrega em minutos", text: "Primeiras curtidas em 1-5 min após Pix aprovado." },
        { icon: "shield", title: "100% seguro", text: "Não pedimos senha. Só o link do post ou Reel público." },
        { icon: "check", title: "Reposição garantida", text: "Qualquer queda dentro de 30 dias nós recolocamos." },
        { icon: "clock", title: "Pix 24 horas", text: "Aprovação instantânea, funciona madrugada e feriado." },
      ]}
      pricingTitle="Tabela de preços — curtidas Instagram"
      pricing={[
        { qty: "100 curtidas", price: "R$ 3,90" },
        { qty: "500 curtidas", price: "R$ 9,90", note: "Mais vendido" },
        { qty: "1.000 curtidas", price: "R$ 14,90" },
        { qty: "5.000 curtidas", price: "R$ 49,90" },
        { qty: "10.000 curtidas", price: "R$ 89,90" },
      ]}
      bodySections={[
        {
          h2: "Por que comprar curtidas Instagram faz diferença",
          body: "O algoritmo do Instagram distribui conteúdo que já mostra engajamento. Post com zero curtida morre no feed; post com centenas de reações ganha velocidade e aparece para mais pessoas. Comprar curtidas é o gatilho inicial que quebra o ciclo: prova social atrai prova social. Não substitui boa criação, mas amplia quem chega até você.",
        },
        {
          h2: "Como funciona a compra na BoostGG",
          body: "1. Escolha o pacote (100 a 10.000 curtidas).\n2. Cole o link do post ou Reel público.\n3. Pague o Pix — QR Code ou copia e cola.\n4. Em 1-5 minutos as curtidas começam a entrar.\n5. Reposição automática por 30 dias se cair qualquer coisa.",
        },
        {
          h2: "Curtidas em posts ou Reels: qual escolher?",
          body: "Curtidas em posts aumentam a autoridade do perfil e melhoram a impressão de quem visita seu feed. Curtidas em Reels são ideais para viralização: o algoritmo entende o sinal como sinal de qualidade e pode impulsionar sua distribuição no Explore. Ambos funcionam — escolha de acordo com o objetivo do momento.",
        },
      ]}
      faq={FAQ}
    />
  );
}
