// v401 — SEO landing: "seguidores reais instagram" (1.900/mês, KDI 21 — Semrush BR)
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd, buildProductJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo-jsonld";

const URL = "https://www.boostgg.com.br/seguidores-reais-instagram";
const TITLE = "Seguidores Reais no Instagram — Perfis Brasileiros | BoostGG";
const DESC =
  "Seguidores reais e brasileiros no Instagram, com reposição de 30 dias e entrega gradual via Pix. Sem bot, sem senha e sem queda no dia seguinte.";

const FAQ = [
  {
    q: "O que é um seguidor 'real' de verdade?",
    a: "É um perfil com foto, publicações e histórico de atividade, vindo de campanhas de incentivo — não de contas geradas em massa. É diferente do seguidor global barato, que é uma conta vazia criada só para inflar número. No BoostGG os pacotes com selo 🇧🇷 Brasileiro Real são desse tipo.",
  },
  {
    q: "Qual a diferença para o pacote global mais barato?",
    a: "Preço e comportamento. O global custa poucos reais por mil e serve para prova social de número; o brasileiro real custa mais, mantém a base estável e não destoa do seu público quando alguém abre sua lista de seguidores. Se você vende para brasileiros, a base precisa parecer brasileira.",
  },
  {
    q: "Esses seguidores curtem meus posts?",
    a: "Alguns interagem, mas não vendemos engajamento garantido junto — seria promessa falsa. O que o pacote entrega é base real e estável. Para engajamento, o caminho honesto é combinar com curtidas nos posts que você quer destacar.",
  },
  {
    q: "Eles caem depois de alguns dias?",
    a: "Toda base perde uma fração natural com o tempo, inclusive a orgânica. Por isso os pacotes brasileiros têm reposição de 30 dias: se houver queda dentro do prazo, repomos sem custo. Nos pacotes globais, a reposição é solicitada ao fornecedor automaticamente.",
  },
  {
    q: "Preciso deixar o perfil público?",
    a: "Sim, durante a entrega. Perfil privado bloqueia a solicitação de seguir e o pedido fica em espera. Depois de concluído, você pode fechar o perfil normalmente.",
  },
  {
    q: "Preciso informar minha senha?",
    a: "Nunca. Pedimos apenas o @ do seu perfil. Qualquer serviço que peça senha do Instagram está pedindo acesso à sua conta — é o principal vetor de sequestro de perfil no Brasil.",
  },
];

export const Route = createFileRoute("/seguidores-reais-instagram")({
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
        { name: "Seguidores Reais Instagram", url: URL },
      ]),
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoLanding
      accent="#e1306c"
      h1="Seguidores Reais no Instagram — Perfis Brasileiros de Verdade"
      subtitle="Base que não some no dia seguinte"
      intro="Perfis brasileiros com foto, posts e histórico — entrega gradual, reposição de 30 dias e pagamento via Pix. Sem senha, sem bot e sem promessa que não se cumpre."
      ctaHref="/"
      ctaLabel="Ver pacotes brasileiros"
      benefits={[
        { icon: "check", title: "Perfis brasileiros", text: "Base coerente com quem fala português e compra no Brasil." },
        { icon: "shield", title: "Reposição de 30 dias", text: "Caiu dentro do prazo nos pacotes BR, repomos sem custo." },
        { icon: "clock", title: "Entrega gradual", text: "Distribuída ao longo de horas pra não destoar do orgânico." },
        { icon: "zap", title: "Pix com aprovação na hora", text: "Sem cadastro e sem informar senha." },
      ]}
      pricingTitle="Tabela de preços — seguidores brasileiros reais"
      pricingCategories={["instagram:seguidores:br"]}
      pricing={[
        { id: "br-p100", qty: "100 seguidores BR", price: "R$ 25,50" },
        { id: "br-p250", qty: "250 seguidores BR", price: "R$ 60,13" },
        { id: "br-p500", qty: "500 seguidores BR", price: "R$ 113,00", note: "Mais vendido" },
        { id: "br-p1k", qty: "1.000 seguidores BR", price: "R$ 163,59" },
      ]}
      bodySections={[
        {
          h2: "Seguidor real x seguidor de número: a diferença que decide venda",
          body: "Existem dois mercados dentro do mesmo serviço. O primeiro vende número: contas vazias, internacionais, que só servem pra sua bio não parecer nova. O segundo vende base: perfis brasileiros com atividade, que sustentam a leitura de que sua conta é relevante para o público local. Os dois têm uso legítimo — o erro é pagar preço de um esperando o resultado do outro. Se seu objetivo é vender para brasileiros, a base internacional barata trabalha contra você, porque o Instagram passa a mostrar seus posts para um público que nunca vai comprar.",
        },
        {
          h2: "Por que entrega gradual importa mais que velocidade",
          body: "Ganhar 1.000 seguidores em três minutos é o padrão mais fácil de detectar que existe. Uma conta que cresce em degrau vertical e depois congela sinaliza compra. Por isso distribuímos a entrega ao longo de horas, respeitando o ritmo que um crescimento orgânico forte teria. Você recebe o mesmo total, apenas com uma curva que não denuncia a origem.",
        },
        {
          h2: "O que nenhum painel honesto pode prometer",
          body: "Ninguém entrega seguidor que comenta, salva e compra. Quem promete isso está vendendo bot com script de comentário genérico — o que piora seu perfil. O que um serviço sério entrega é prova social e alcance inicial. A conversão continua sendo trabalho do seu conteúdo, e é justamente por isso que a base precisa ser do país certo: conteúdo em português para público brasileiro converte; para público indiano, não.",
        },
        {
          h2: "Como comprar com segurança",
          body: "1) Deixe seu perfil público durante a entrega. 2) Informe apenas o @ — nunca a senha. 3) Escolha um pacote com selo 🇧🇷 Brasileiro Real se quiser reposição de 30 dias. 4) Pague via Pix, com aprovação instantânea. 5) Acompanhe pelo rastreio do pedido. Se em algum momento um site pedir seu login, encerre — não existe serviço legítimo de seguidores que precise da sua senha.",
        },
      ]}
      faq={FAQ}
    />
  );
}
