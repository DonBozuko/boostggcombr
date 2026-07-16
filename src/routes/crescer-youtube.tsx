// v201 — Ad-safe landing paralela
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd } from "@/lib/seo-jsonld";

const URL = "https://boostgg.com.br/crescer-youtube";
const TITLE = "Crescer no YouTube — Gestão de Audiência para Canais — Elite Boost Prime | BoostGG";
const DESC =
  "Gestão profissional de crescimento para canais YouTube. Amplie audiência, monetização e alcance com pagamento via Pix.";

const FAQ = [
  { q: "Como funciona?", a: "Gestão profissional de audiência. Você informa a URL pública do canal, sem senha." },
  { q: "Tempo?", a: "Início em 15-60 min após o Pix. YouTube processa mais devagar que Instagram/TikTok." },
  { q: "Ajuda a monetizar?", a: "Ajuda a atingir o requisito de inscritos, mas horas de watch time precisam ser conquistadas com conteúdo real." },
  { q: "Garantia?", a: "Reposição por 30 dias." },
  { q: "Pagamento?", a: "Somente Pix." },
  { q: "É seguro?", a: "Sim, sem senha, entrega gradual." },
];

export const Route = createFileRoute("/crescer-youtube")({
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
      accent="#FF0000"
      h1="Crescer no YouTube — Gestão de Audiência"
      subtitle="Amplie seu canal com estratégia profissional"
      intro="Gestão de crescimento para canais YouTube. Sem senha, resultado em horas, garantia de 30 dias."
      ctaHref="/youtube"
      ctaLabel="Crescer agora"
      benefits={[
        { icon: "zap", title: "Início rápido", text: "Processo começa em 15-60 min." },
        { icon: "shield", title: "Sem senha", text: "Só a URL pública do canal." },
        { icon: "check", title: "Garantia 30 dias", text: "Reposição automática." },
        { icon: "clock", title: "Pix 24/7", text: "Aprovação instantânea." },
      ]}
      pricingTitle="Planos de crescimento — YouTube"
      pricing={[
        { qty: "Starter", price: "R$ 9,90" },
        { qty: "Essencial", price: "R$ 29,90", note: "Mais escolhido" },
        { qty: "Pro", price: "R$ 79,90" },
        { qty: "Elite", price: "R$ 199,90" },
      ]}
      bodySections={[
        { h2: "Por que investir em gestão de crescimento no YouTube", body: "Canal com 50 inscritos não vira recomendação. YouTube usa autoridade como sinal para recomendar. Empurrão inicial cria a base pro algoritmo começar a levar seus vídeos pra sugeridos e Home de mais gente." },
        { h2: "Como funciona", body: "1. Escolha o plano.\n2. Cole a URL do canal.\n3. Pague o Pix.\n4. Início em 15-60 min.\n5. Garantia 30 dias." },
      ]}
      faq={FAQ}
    />
  );
}
