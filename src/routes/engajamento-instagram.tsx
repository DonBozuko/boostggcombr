// v201 — Ad-safe landing paralela
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd } from "@/lib/seo-jsonld";

const URL = "https://boostgg.com.br/engajamento-instagram";
const TITLE = "Engajamento Instagram — Boost de Curtidas e Interação — Elite Boost Prime | BoostGG";
const DESC =
  "Boost de engajamento profissional para posts do Instagram. Aumente curtidas, sinal para o algoritmo e alcance orgânico com pagamento via Pix.";

const FAQ = [
  { q: "Como funciona o boost de engajamento?", a: "Ampliamos as interações do seu post para acelerar a distribuição pelo algoritmo do Instagram. Você informa o link do post, sem senha." },
  { q: "Em quanto tempo aparece?", a: "As primeiras interações entram em 1-3 minutos após o Pix aprovado." },
  { q: "É seguro?", a: "Sim. Entrega gradual, sem senha, respeitando os limites da plataforma." },
  { q: "Tem garantia?", a: "Sim, reposição automática por 30 dias." },
  { q: "Serve para Reels e Fotos?", a: "Sim — posts, Reels e carrosséis." },
  { q: "Pagamento?", a: "Somente Pix, aprovação instantânea 24/7." },
];

export const Route = createFileRoute("/engajamento-instagram")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { name: "robots", content: "noindex, nofollow" },
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
      h1="Engajamento Instagram — Boost Profissional"
      subtitle="Mais curtidas, mais sinal para o algoritmo, mais alcance"
      intro="Boost de engajamento em posts, Reels e carrosséis. Entrega em minutos, sem senha, com garantia de 30 dias."
      ctaHref="/"
      ctaLabel="Aumentar engajamento"
      benefits={[
        { icon: "zap", title: "Rápido", text: "Interações entram em 1-3 min após Pix." },
        { icon: "shield", title: "Sem senha", text: "Só o link do post público." },
        { icon: "check", title: "Garantia", text: "Reposição por 30 dias." },
        { icon: "clock", title: "Pix 24/7", text: "Aprovação instantânea." },
      ]}
      pricingTitle="Planos de engajamento — Instagram"
      pricing={[
        { qty: "Starter", price: "R$ 3,90" },
        { qty: "Essencial", price: "R$ 9,90", note: "Mais escolhido" },
        { qty: "Pro", price: "R$ 19,90" },
        { qty: "Elite", price: "R$ 49,90" },
      ]}
      bodySections={[
        { h2: "Por que engajamento importa mais que seguidor", body: "O algoritmo do Instagram distribui conteúdo com base em taxa de engajamento nas primeiras horas. Post que recebe interação rápida vira Explorar e Reels em destaque. Boost inicial acelera essa janela crítica." },
        { h2: "Como funciona", body: "1. Escolha o plano.\n2. Cole o link do post.\n3. Pague o Pix.\n4. Interações em 1-3 min.\n5. Garantia 30 dias." },
      ]}
      faq={FAQ}
    />
  );
}
