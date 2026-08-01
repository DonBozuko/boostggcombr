// v201 — Ad-safe landing paralela (TikTok Ads / Google Ads)
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd } from "@/lib/seo-jsonld";

const URL = "https://www.boostgg.com.br/impulsionar-instagram";
const TITLE = "Impulsionar Instagram — Gestão de Crescimento | BoostGG";
const DESC =
  "Serviço de gestão e impulsionamento de perfil no Instagram. Alcance mais pessoas, aumente a prova social e acelere seu crescimento com pagamento via Pix.";

const FAQ = [
  {
    q: "Como funciona o serviço de impulsionamento?",
    a: "Nós ampliamos o alcance do seu perfil por meio de gestão de audiência qualificada. Você informa apenas o @ público, sem senha, e nossa infraestrutura distribui o crescimento de forma gradual.",
  },
  {
    q: "Em quanto tempo vejo resultado?",
    a: "O impulsionamento começa entre 1 e 5 minutos após confirmação do Pix. Planos maiores são distribuídos em algumas horas para preservar a saúde da conta.",
  },
  {
    q: "É seguro para minha conta?",
    a: "Sim. Não pedimos senha nem acesso ao perfil. Trabalhamos com entrega escalonada que respeita os limites do algoritmo.",
  },
  {
    q: "Existe garantia?",
    a: "Nos pacotes 🇧🇷 Brasileiro Real sim: reposição garantida por 30 dias. Nos pacotes 🌎 Global pedimos reposição ao fornecedor automaticamente e, quando não há garantia, avaliamos reenvio ou estorno.",
  },
  {
    q: "Preciso deixar o perfil aberto?",
    a: "Apenas durante o processamento. Depois de recebido, você pode fechar o perfil normalmente.",
  },
  {
    q: "Qual o método de pagamento?",
    a: "Exclusivamente Pix — aprovação instantânea 24/7, sem taxa.",
  },
];

export const Route = createFileRoute("/impulsionar-instagram")({
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
      h1="Impulsionar Instagram — Gestão de Crescimento com Pix"
      subtitle="Amplie seu alcance e prova social em minutos"
      intro="Serviço profissional de gestão de crescimento para Instagram. Sem senha, sem cadastro, com resultado em minutos e garantia de reposição de 30 dias nos pacotes brasileiros."
      ctaHref="/"
      ctaLabel="Impulsionar agora"
      benefits={[
        { icon: "zap", title: "Resultado em minutos", text: "Impulsionamento inicia em 1-5 min após Pix." },
        { icon: "shield", title: "Sem senha", text: "Só o @ público. Zero risco de acesso." },
        { icon: "check", title: "Garantia 30 dias", text: "Garantida nos pacotes brasileiros; nos Global pedimos ao fornecedor." },
        { icon: "clock", title: "Pix 24/7", text: "Aprovação instantânea, madrugada e feriado." },
      ]}
      pricingTitle="Planos de impulsionamento — Instagram"
      pricingCategories={["instagram:seguidores"]}
      pricing={[
        { id: "p100", qty: "100 seguidores", price: "R$ 5,50" },
        { id: "p500", qty: "500 seguidores", price: "R$ 19,00", note: "Mais escolhido" },
        { id: "p1k", qty: "1.000 seguidores", price: "R$ 23,47" },
        { id: "p5k", qty: "5.000 seguidores", price: "R$ 81,46" },
        { id: "p10k", qty: "10.000 seguidores", price: "R$ 130,94" },
      ]}
      bodySections={[
        {
          h2: "Por que investir em gestão de crescimento",
          body: "Perfil pequeno perde antes de ser lido — prova social invertida. Um empurrão profissional quebra essa barreira: sua conta ganha percepção de autoridade, o algoritmo passa a distribuir mais, e cada Reels chega em mais gente. Não substitui conteúdo bom, acelera o efeito dele.",
        },
        {
          h2: "Como funciona",
          body: "1. Escolha o plano ideal.\n2. Cole o @ do seu Instagram (sem senha).\n3. Pague o Pix — QR Code ou copia e cola.\n4. Em 1-5 minutos o impulsionamento inicia.\n5. Garantia de reposição de 30 dias nos pacotes brasileiros.",
        },
        {
          h2: "Audiência nacional vs internacional",
          body: "Alcance internacional: entrega mais rápida, ideal para viralizar e provar valor de marca. Audiência nacional qualificada: perfis brasileiros com engajamento real, ideal para quem vende no Brasil.",
        },
      ]}
      faq={FAQ}
    />
  );
}
