// v200 — SEO landing: "comprar inscritos youtube"
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd } from "@/lib/seo-jsonld";

const URL = "https://boostgg.com.br/comprar-inscritos-youtube";
const TITLE = "Comprar Inscritos YouTube Reais — Monetização e Pix";
const DESC =
  "Compre inscritos para canal do YouTube com entrega gradual, sem senha e via Pix. Acelere os 1.000 inscritos do Programa de Parcerias.";

const FAQ = [
  {
    q: "Comprar inscritos ajuda a monetizar o YouTube?",
    a: "Ajuda a acelerar o requisito de 1.000 inscritos do Programa de Parcerias. Mas monetizar também exige 4.000 horas de watch time (ou 10 milhões de views em Shorts nos últimos 90 dias) — inscritos são só uma parte do quebra-cabeça.",
  },
  {
    q: "O YouTube desmonetiza canal que compra inscritos?",
    a: "Se detectar inscritos claramente falsos e em massa, pode. Por isso trabalhamos com entrega gradual e perfis com aparência real. Não recomendamos comprar 50.000 inscritos de uma vez em um canal com 200 — o padrão é suspeito.",
  },
  {
    q: "Quanto tempo demora a entrega?",
    a: "Entrega gradual em 24-96 horas dependendo do tamanho do pacote. Pacotes menores (até 500) saem em algumas horas.",
  },
  {
    q: "Precisa da senha do canal?",
    a: "Nunca. Só do link do canal (URL pública).",
  },
  {
    q: "Vem com reposição?",
    a: "Sim, 30 dias de reposição em caso de queda.",
  },
];

export const Route = createFileRoute("/comprar-inscritos-youtube")({
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
      route="/comprar-inscritos-youtube"
      accent="#ff0000"
      h1="Comprar Inscritos YouTube — Reais, Gradual, via Pix"
      subtitle="Acelere seus 1.000 inscritos para monetizar"
      intro="Chegue mais rápido nos 1.000 inscritos do Programa de Parcerias do YouTube. Entrega gradual, perfis reais, sem senha, pagamento via Pix."
      ctaHref="/youtube"
      ctaLabel="Comprar inscritos YouTube"
      benefits={[
        { icon: "check", title: "Perfis com aparência real", text: "Não são bots crus — reduzem risco de flag." },
        { icon: "clock", title: "Entrega gradual", text: "24-96h para simular crescimento orgânico." },
        { icon: "shield", title: "Sem senha", text: "Só precisamos do link público do canal." },
        { icon: "zap", title: "Pix instantâneo", text: "Aprovação 24/7, sem taxa, sem cartão." },
      ]}
      pricingTitle="Tabela de preços — inscritos YouTube"
      pricing={[
        { qty: "100 inscritos", price: "R$ 19,90" },
        { qty: "500 inscritos", price: "R$ 79,90", note: "Mais vendido" },
        { qty: "1.000 inscritos", price: "R$ 149,90" },
        { qty: "5.000 inscritos", price: "R$ 599,90" },
      ]}
      bodySections={[
        {
          h2: "A verdade sobre comprar inscritos no YouTube",
          body: "Comprar inscritos NÃO substitui conteúdo. O YouTube monetiza baseado em watch time e retenção — inscritos comprados não assistem seus vídeos e não geram receita direta. O que eles fazem: quebrar a barreira do 'canal vazio' que afasta gente real de se inscrever. Combine com conteúdo bom e ganhe momentum.",
        },
        {
          h2: "Como não queimar o canal",
          body: "1. Nunca compre mais que 30-50% do total atual de inscritos de uma vez.\n2. Escolha entrega gradual (nunca instantânea).\n3. Continue postando conteúdo real em paralelo.\n4. Não misture com views compradas em massa — o mismatch views/inscritos vira flag.\n5. Prefira pacotes menores em intervalos que big-bang.",
        },
      ]}
      faq={FAQ}
    />
  );
}
