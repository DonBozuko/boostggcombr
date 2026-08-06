// v525 — SEO landing: "comprar seguidores 1 real" (12.100/mês).
// Intenção de preço-âncora. NÃO existe SKU de R$1 (piso real da vitrine = R$5,00 / p50).
// Página honesta: explica por que R$1 não existe e converte para o piso real.
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd, buildProductJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo-jsonld";

const URL = "https://www.boostgg.com.br/comprar-seguidores-1-real";
const TITLE = "Comprar Seguidores por 1 Real: Existe? A Verdade | BoostGG";
const DESC =
  "Seguidor por R$1 não existe — só golpe ou bot que cai. O piso real é R$5 no Pix (50 seguidores, R$0,10 cada), entrega em minutos e sem senha.";

const FAQ = [
  {
    q: "Dá pra comprar seguidores por 1 real?",
    a: "Não. Nenhum painel sério entrega por R$1. O custo de rede, servidor e reposição já consome mais que isso. Quem anuncia R$1 faz uma de duas coisas: some com o seu Pix, ou entrega bot descartável que o Instagram derruba em 48h. O piso honesto no Brasil é R$5.",
  },
  {
    q: "Qual é o pacote mais barato da BoostGG?",
    a: "R$5,00 por 50 seguidores no Instagram (R$0,10 por seguidor) ou R$5,50 por 100. Pagamento via Pix, entrega começa em 1 a 5 minutos e não pedimos senha em nenhum momento.",
  },
  {
    q: "Por que vocês não fazem um pacote de R$1?",
    a: "Porque seria mentira comercial. Com taxa de pagamento, custo de fornecedor e reposição de 30 dias, um pedido de R$1 dá prejuízo — e produto que dá prejuízo é descontinuado ou entregue mal. Preferimos manter o piso em R$5 e entregar de verdade a vender promessa.",
  },
  {
    q: "R$5 é seguro? Não vou tomar golpe?",
    a: "Pix é gerado pelo Mercado Pago, com CNPJ 47.363.210/0001-08 emitindo a cobrança. Você recebe o link de rastreio do pedido e pode acompanhar a entrega. Nunca pedimos senha — só o @ público.",
  },
  {
    q: "E os sites que anunciam '100 seguidores por R$1'?",
    a: "Quase sempre é isca: você entra, paga o R$1 e descobre que era 'teste' de 10 seguidores, ou que precisa assinar algo. O outro cenário é pior — a conta recebe bots reciclados, o Instagram limpa em dois dias e o alcance do perfil cai junto.",
  },
  {
    q: "Quanto custa cada seguidor de verdade?",
    a: "Na BoostGG o custo por seguidor cai conforme o volume: R$0,10 no pacote de 50, R$0,038 nos 500 e R$0,023 nos 1.000. Ou seja: quanto maior o pacote, mais perto de 'centavos por seguidor' você chega — legalmente e com entrega real.",
  },
];

export const Route = createFileRoute("/comprar-seguidores-1-real")({
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
        { name: "Seguidores por 1 Real", url: URL },
      ]),
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoLanding
      accent="#e1306c"
      h1="Comprar Seguidores por 1 Real: existe ou é golpe?"
      subtitle="Resposta curta: não existe. O piso real é R$5 — e a gente mostra a conta"
      intro="Se você pesquisou 'seguidores por 1 real', é porque quer testar gastando quase nada. Justo. Mas nenhum painel entrega por R$1 sem sumir com o dinheiro ou mandar bot descartável. Aqui o piso é R$5 no Pix — 50 seguidores, R$0,10 cada, entrega em minutos, sem senha."
      ctaHref="/"
      ctaLabel="Ver pacotes a partir de R$5"
      benefits={[
        { icon: "zap", title: "Piso R$5", text: "50 seguidores por R$5,00 — R$0,10 cada. O mais barato honesto do mercado." },
        { icon: "shield", title: "Sem senha, com CNPJ", text: "Só o @ público. Cobrança emitida por CNPJ real via Mercado Pago." },
        { icon: "check", title: "Reposição 30 dias", text: "Garantida nos pacotes brasileiros. Bot de R$1 não tem reposição nenhuma." },
        { icon: "clock", title: "Pix 24h", text: "Aprovou, começa a entregar em 1 a 5 minutos. Madrugada e feriado incluídos." },
      ]}
      pricingTitle="Quanto custa de verdade — tabela e custo por seguidor"
      pricingCategories={["instagram:seguidores"]}
      pricing={[
        { id: "p50", qty: "50 seguidores", price: "R$ 5,00", note: "Piso real — R$0,10 por seguidor" },
        { id: "p100", qty: "100 seguidores", price: "R$ 5,50", note: "R$0,055 por seguidor" },
        { id: "p500", qty: "500 seguidores", price: "R$ 19,00", note: "R$0,038 — mais vendido" },
        { id: "p1k", qty: "1.000 seguidores", price: "R$ 23,47", note: "R$0,023 por seguidor" },
        { id: "p5k", qty: "5.000 seguidores", price: "R$ 81,46", note: "R$0,016 por seguidor" },
      ]}
      bodySections={[
        {
          h2: "Por que R$1 é matematicamente impossível",
          body: "Todo pedido tem três custos fixos: a taxa do meio de pagamento, o custo do fornecedor que entrega os perfis e a reserva de reposição por 30 dias. Só a taxa de Pix já morde parte de um pagamento de R$1. Some o custo de entrega e a reposição e o pedido nasce no vermelho. Empresa que vende no vermelho não repõe seguidor que cai, não responde suporte e some em poucos meses. O 'R$1' não é preço — é isca.",
        },
        {
          h2: "Os dois finais de quem paga R$1",
          body: "Final A: o site cobra e não entrega. Você perde R$1 e o número do Pix vira lista de spam.\n\nFinal B: entrega bots reciclados. Nas primeiras horas o número sobe e parece que deu certo. Em 24 a 72 horas o Instagram limpa a conta, o número volta ao que era e — pior — seu alcance orgânico cai, porque a plataforma passa a ler o perfil como suspeito. O prejuízo real não é R$1, é o alcance do seu perfil.",
        },
        {
          h2: "Como chegar em 'centavos por seguidor' sem golpe",
          body: "Quanto maior o pacote, menor o custo unitário. Nos 50 seguidores você paga R$0,10 por seguidor; nos 1.000, R$0,023; nos 5.000, R$0,016. É aí que mora o barato de verdade: não no ticket de R$1, mas no custo por seguidor de um pacote entregue de fato, com reposição. Se o orçamento hoje é mínimo, comece pelos R$5 — é o menor teste possível com entrega garantida.",
        },
        {
          h2: "Checklist antes de pagar qualquer painel",
          body: "1. Pede senha do Instagram? É golpe — saia.\n2. A cobrança sai no nome de um CNPJ? Se não, não há a quem reclamar.\n3. Existe página de rastreio do pedido? Sem rastreio, você não prova nada.\n4. Tem política de reposição escrita? Sem isso, seguidor que cai é problema seu.\n5. O preço é bom demais? Preço abaixo do custo operacional é sempre pago de outra forma — geralmente com o seu alcance.",
        },
      ]}
      faq={FAQ}
    />
  );
}
