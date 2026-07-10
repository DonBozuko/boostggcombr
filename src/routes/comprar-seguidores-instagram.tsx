// v200 — SEO landing: "comprar seguidores instagram" (12.100/mês, KDI 27)
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd } from "@/lib/seo-jsonld";

const URL = "https://boostgg.com.br/comprar-seguidores-instagram";
const TITLE = "Comprar Seguidores Instagram Reais e Baratos — Entrega Imediata via Pix";
const DESC =
  "Compre seguidores para Instagram com entrega em minutos, pagamento via Pix e reposição garantida. Perfis brasileiros, sem senha, 100% seguro.";

const FAQ = [
  {
    q: "É seguro comprar seguidores para Instagram?",
    a: "Sim. Não pedimos sua senha nem acesso ao perfil — apenas o @ público. Usamos entrega gradual para simular crescimento orgânico e não disparar filtros do Instagram.",
  },
  {
    q: "Em quanto tempo os seguidores entram?",
    a: "Após o Pix aprovado, os primeiros seguidores começam a entrar em 1 a 5 minutos. Pedidos grandes (10k+) são entregues de forma escalonada em algumas horas para segurança da conta.",
  },
  {
    q: "Os seguidores são reais ou robôs?",
    a: "Oferecemos duas linhas: mix internacional (mais barato, alta velocidade) e brasileiros reais (perfis com foto e postagens, valor um pouco maior). Você escolhe no checkout.",
  },
  {
    q: "Se cair seguidor, tem reposição?",
    a: "Sim. Todos os pacotes acompanham garantia de reposição por 30 dias. Se cair, você abre um ticket e nós recompomos sem custo.",
  },
  {
    q: "Preciso deixar o perfil público?",
    a: "Sim, apenas durante a entrega. Perfis privados não permitem que a entrega processe. Depois de recebido, você pode fechar de novo.",
  },
  {
    q: "Aceita quais formas de pagamento?",
    a: "Trabalhamos exclusivamente com Pix — aprovação instantânea, sem taxa e disponível 24 horas por dia, inclusive fins de semana e feriados.",
  },
];

export const Route = createFileRoute("/comprar-seguidores-instagram")({
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
      route="/comprar-seguidores-instagram"
      accent="#e1306c"
      h1="Comprar Seguidores Instagram — Reais, Baratos e com Pix"
      subtitle="Seguidores Instagram entregues em minutos"
      intro="Aumente sua audiência no Instagram sem enrolação: pague com Pix, receba em minutos e conte com reposição por 30 dias. Sem senha, sem risco, sem cadastro."
      ctaHref="/"
      ctaLabel="Comprar seguidores agora"
      benefits={[
        { icon: "zap", title: "Entrega em minutos", text: "Primeiros seguidores em 1-5 min após Pix aprovado." },
        { icon: "shield", title: "100% seguro", text: "Não pedimos sua senha. Só precisamos do @ público." },
        { icon: "check", title: "Reposição garantida", text: "Qualquer queda dentro de 30 dias nós recolocamos." },
        { icon: "clock", title: "Pix 24 horas", text: "Aprovação instantânea, funciona madrugada e feriado." },
      ]}
      pricingTitle="Tabela de preços — seguidores Instagram"
      pricing={[
        { qty: "100 seguidores", price: "R$ 4,90" },
        { qty: "500 seguidores", price: "R$ 14,90", note: "Mais vendido" },
        { qty: "1.000 seguidores", price: "R$ 24,90" },
        { qty: "5.000 seguidores", price: "R$ 89,90" },
        { qty: "10.000 seguidores", price: "R$ 169,90" },
      ]}
      bodySections={[
        {
          h2: "Por que comprar seguidores Instagram vale a pena",
          body: "Perfil pequeno perde antes mesmo de ser lido. Ninguém segue quem tem 40 seguidores — é prova social invertida. Comprar seguidores no Instagram é um empurrão inicial que quebra essa barreira: sua conta passa a parecer confiável, o algoritmo começa a distribuir mais, e cada novo Reels chega em mais gente. Não substitui conteúdo bom, mas acelera o efeito.",
        },
        {
          h2: "Como funciona a compra na EliteBoost",
          body: "1. Escolha o pacote (100 a 100.000 seguidores).\n2. Cole o @ do seu Instagram (sem senha).\n3. Pague o Pix — QR Code ou copia e cola.\n4. Em 1-5 minutos os primeiros seguidores começam a entrar.\n5. Reposição automática por 30 dias se cair qualquer coisa.",
        },
        {
          h2: "Diferença entre seguidores brasileiros e mix internacional",
          body: "Mix internacional: mais barato, entrega mais rápida, ideal pra quem quer números altos rápido (viralizar, brand deal, etc). Brasileiros reais: perfis com foto, postagens e engajamento real, mais caros mas dão engajamento genuíno. Se seu objetivo é vender no Brasil, escolha brasileiros.",
        },
      ]}
      faq={FAQ}
    />
  );
}
