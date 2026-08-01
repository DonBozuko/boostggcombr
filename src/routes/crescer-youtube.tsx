// v201 — Ad-safe landing paralela
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd } from "@/lib/seo-jsonld";

const URL = "https://www.boostgg.com.br/crescer-youtube";
const TITLE = "Crescer no YouTube — Gestão de Audiência | BoostGG";
const DESC =
  "Gestão profissional de crescimento para canais YouTube. Amplie audiência, monetização e alcance com pagamento via Pix.";

const FAQ = [
  { q: "Como funciona?", a: "Gestão profissional de audiência. Você informa a URL pública do canal, sem senha." },
  { q: "Tempo?", a: "Início em 15-60 min após o Pix. YouTube processa mais devagar que Instagram/TikTok." },
  { q: "Ajuda a monetizar?", a: "Ajuda a atingir o requisito de inscritos, mas horas de watch time precisam ser conquistadas com conteúdo real." },
  { q: "Garantia?", a: "A linha de YouTube é 100% Global e hoje não tem reposição garantida. Se houver queda, abrimos pedido de reposição ao fornecedor — sem promessa de prazo." },
  { q: "Pagamento?", a: "Somente Pix." },
  { q: "É seguro?", a: "Sim, sem senha, entrega gradual." },
];

export const Route = createFileRoute("/crescer-youtube")({
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
      accent="#FF0000"
      h1="Crescer no YouTube — Gestão de Audiência"
      subtitle="Amplie seu canal com estratégia profissional"
      intro="Gestão de crescimento para canais YouTube. Sem senha, resultado em horas e acompanhamento do pedido do início ao fim."
      ctaHref="/youtube"
      ctaLabel="Crescer agora"
      benefits={[
        { icon: "zap", title: "Início rápido", text: "Processo começa em 15-60 min." },
        { icon: "shield", title: "Sem senha", text: "Só a URL pública do canal." },
        { icon: "check", title: "Pedido acompanhado", text: "Status em tempo real até concluir." },
        { icon: "clock", title: "Pix 24/7", text: "Aprovação instantânea." },
      ]}
      pricingTitle="Planos de crescimento — YouTube"
      pricingCategories={["youtube:inscritos"]}
      pricing={[
        { id: "ys100", qty: "100 inscritos", price: "R$ 39,90" },
        { id: "ys500", qty: "500 inscritos", price: "R$ 138,80", note: "Mais escolhido" },
        { id: "ys1k", qty: "1.000 inscritos", price: "R$ 223,54" },
        { id: "ys2k", qty: "2.000 inscritos", price: "R$ 358,65" },
      ]}
      bodySections={[
        { h2: "Por que investir em gestão de crescimento no YouTube", body: "Canal com 50 inscritos não vira recomendação. YouTube usa autoridade como sinal para recomendar. Empurrão inicial cria a base pro algoritmo começar a levar seus vídeos pra sugeridos e Home de mais gente." },
        { h2: "Como funciona", body: "1. Escolha o plano.\n2. Cole a URL do canal.\n3. Pague o Pix.\n4. Início em 15-60 min.\n5. Acompanhe o status em /rastrear até concluir." },
      ]}
      faq={FAQ}
    />
  );
}
