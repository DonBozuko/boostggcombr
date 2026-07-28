// v250 — SEO landing para a consulta real nº1 do Search Console: "pix seguidores" (27 impressões/semana)
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd, buildProductJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo-jsonld";

const URL = "https://boostgg.com.br/seguidores-pix";
const TITLE = "Seguidores no Pix — Elite Boost Prime | BoostGG";
const DESC =
  "Comprar seguidores pagando no Pix: aprovação na hora, entrega automática e reposição nos pacotes brasileiros. Sem cadastro, sem senha, sem cartão.";

const FAQ = [
  {
    q: "Consigo comprar seguidores pagando só no Pix?",
    a: "Sim. O Pix é o nosso método principal. Você escolhe o pacote, gera o QR Code, paga e a entrega começa automaticamente após a confirmação — normalmente em menos de 1 minuto.",
  },
  {
    q: "Preciso de cadastro ou cartão de crédito?",
    a: "Não. Nenhum cadastro, nenhum cartão. Só o @ do seu perfil e o pagamento via Pix.",
  },
  {
    q: "Em quanto tempo o Pix é confirmado?",
    a: "O Pix cai na hora. Assim que o banco confirma, o pedido entra em processamento automático, sem intervenção manual.",
  },
  {
    q: "E se eu pagar e não receber?",
    a: "O sistema reconcilia todo pedido pago a cada poucos minutos. Se o fornecedor falhar, tentamos outro automaticamente; se ainda assim não entregar, o estorno via Pix é feito na mesma chave que pagou.",
  },
  {
    q: "Dá pra pagar Pix e escolher seguidores brasileiros?",
    a: "Dá. Os pacotes com selo 🇧🇷 Brasileiro Real são perfis com localização BR, foto e postagens. Mesmo pagamento, mesma entrega automática.",
  },
];

export const Route = createFileRoute("/seguidores-pix")({
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
        { name: "Início", url: "https://boostgg.com.br/" },
        { name: "Seguidores no Pix", url: URL },
      ]),
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoLanding
      accent="#39ff14"
      h1="Comprar Seguidores no Pix — Aprovação na Hora"
      subtitle="Pix, entrega automática e reposição nos pacotes brasileiros"
      intro="Você escolhe o pacote, paga no Pix e a entrega começa sozinha assim que o pagamento é confirmado. Sem cadastro, sem cartão, sem falar com ninguém."
      ctaHref="/"
      ctaLabel="Gerar meu Pix agora"
      benefits={[
        { icon: "zap", title: "Pix confirmado na hora", text: "Pagou, o robô já dispara o pedido — sem espera manual." },
        { icon: "shield", title: "Sem senha e sem cadastro", text: "Só o @ público do seu perfil." },
        { icon: "check", title: "Pacotes BR ou Global", text: "Escolha entre perfis brasileiros reais ou mix internacional mais barato." },
        { icon: "clock", title: "Reposição 30 dias (BR)", text: "Pacotes 🇧🇷 Brasileiro Real: caiu no prazo, repomos sem custo. Nos Global, pedimos reposição ao fornecedor." },
      ]}
      pricingTitle="Preços — pagamento via Pix"
      pricingCategories={["instagram:seguidores"]}
      pricing={[
        { id: "p100", qty: "100 seguidores", price: "R$ 5,50" },
        { id: "p500", qty: "500 seguidores", price: "R$ 19,00", note: "Mais vendido" },
        { id: "p1k", qty: "1.000 seguidores", price: "R$ 23,47" },
        { id: "p5k", qty: "5.000 seguidores", price: "R$ 81,46" },
      ]}
      bodySections={[
        {
          h2: "Por que Pix é o melhor jeito de comprar seguidores",
          body: "Cartão de crédito em site de crescimento social costuma travar, pedir antifraude e às vezes gerar estorno indevido. O Pix resolve isso: compensa em segundos, não exige cadastro, não guarda dado sensível seu e permite estorno direto na mesma chave caso algo dê errado. É por isso que o Pix é o método principal aqui — e não um 'extra'.",
        },
        {
          h2: "O que acontece depois que você paga",
          body: "A confirmação do Pix aciona automaticamente o disparo do pedido para o fornecedor. Se o fornecedor principal estiver fora do ar ou sem estoque, o sistema tenta um segundo e um terceiro antes de qualquer intervenção humana. Todo pedido pago é reconciliado a cada poucos minutos: se não entregou, ele reaparece na fila até entregar ou ser estornado. Você não precisa cobrar ninguém.",
        },
        {
          h2: "Pix + seguidores brasileiros reais",
          body: "Se você vende no Brasil, escolha os pacotes com selo 🇧🇷. São perfis com localização BR, foto e postagens — engajam em stories, salvam post e podem virar cliente. O mix internacional continua disponível e sai bem mais barato quando o objetivo é volume/prova social.",
        },
      ]}
      faq={FAQ}
    />
  );
}
