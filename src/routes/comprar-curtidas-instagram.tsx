// v202 — SEO landing: "comprar curtidas instagram" (9.900/mês, KDI 17)
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd, buildProductJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo-jsonld";

const URL = "https://www.boostgg.com.br/comprar-curtidas-instagram";
const TITLE = "Curtidas no Instagram: Como Aumentar o Alcance com Prova Social";
const DESC =
  "Entenda como curtidas influenciam o algoritmo do Instagram. Pacotes de engajamento a partir de R$ 5,00 com entrega automática e garantia de 30 dias.";



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
    a: "Sim. Garantia de reposição de 30 dias nos pacotes brasileiros. Se houver queda, abra um ticket e recompomos sem custo adicional.",
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
      h1="Como Aumentar o Alcance no Instagram com Curtidas Reais via Pix"
      subtitle="Engajamento estratégico para posts e Reels"
      intro="O algoritmo do Instagram prioriza conteúdos com sinais rápidos de interesse. Nosso sistema entrega curtidas reais em minutos para validar sua prova social e destravar a distribuição orgânica. Tudo via Pix, sem senha e com total segurança."
      ctaHref="/"
      ctaLabel="Comprar curtidas agora"
      benefits={[
        { icon: "zap", title: "Entrega em minutos", text: "Primeiras curtidas em 1-5 min após Pix aprovado." },
        { icon: "shield", title: "100% seguro", text: "Não pedimos senha. Só o link do post ou Reel público." },
        { icon: "check", title: "Reposição 30 dias (BR)", text: "Pacotes 🇧🇷 Brasileiro Real têm reposição garantida; nos Global pedimos ao fornecedor." },
        { icon: "clock", title: "Pix 24 horas", text: "Aprovação instantânea, funciona madrugada e feriado." },
      ]}
      pricingTitle="Tabela de preços — curtidas Instagram"
      pricingCategories={["instagram:curtidas"]}
      pricing={[
        { id: "l100", qty: "100 curtidas", price: "R$ 5,50" },
        { id: "l500", qty: "500 curtidas", price: "R$ 7,00", note: "Mais vendido" },
        { id: "l1k", qty: "1.000 curtidas", price: "R$ 9,00" },
        { id: "l5k", qty: "5.000 curtidas", price: "R$ 38,40" },
        { id: "l10k", qty: "10.000 curtidas", price: "R$ 54,40" },
      ]}
      bodySections={[
        {
          h2: "Como o algoritmo do Instagram lê as curtidas em 2026",
          body: "As curtidas deixaram de ser apenas métrica de vaidade e se tornaram um sinal de retenção e relevância. Quando um post recebe engajamento rápido, o algoritmo interpreta que o conteúdo é valioso para aquele nicho e amplia a entrega no Explore e Reels. Nossa entrega estratégica foca em validar esse sinal inicial, funcionando como um catalisador para o seu alcance orgânico.",
        },
        {
          h2: "A diferença entre Curtidas Reais e Bots",
          body: "O Google e o Instagram penalizam conteúdos associados a redes de bots óbvios. Por isso, a BoostGG utiliza um sistema de entrega gradual com perfis que possuem histórico e foto. Isso garante que o engajamento seja visto como legítimo, protegendo a integridade da sua conta enquanto você escala seu perfil.",
        },
        {
          h2: "Estratégia: Curtidas em Reels vs Posts",
          body: "Para viralizar no Reels, o volume de curtidas nos primeiros 60 minutos é crucial. Já em posts de feed, as curtidas servem como prova social duradoura para converter visitantes em seguidores. Recomendamos dividir sua estratégia entre os dois formatos para uma autoridade de perfil completa.",
        },
      ]}
      faq={FAQ}
    />
  );
}
