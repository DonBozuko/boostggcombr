// v201 — Ad-safe landing paralela
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd } from "@/lib/seo-jsonld";

const URL = "https://www.boostgg.com.br/views-tiktok";
const TITLE = "Views TikTok — Amplifique o Alcance dos Seus Vídeos — Elite Boost Prime | BoostGG";
const DESC =
  "Amplifique o alcance dos seus vídeos no TikTok. Boost profissional de views para acelerar o For You com pagamento via Pix.";

const FAQ = [
  { q: "Como funciona o boost de views?", a: "Ampliamos as visualizações do vídeo para acelerar a distribuição pelo For You. Você informa apenas o link do vídeo público." },
  { q: "Tempo?", a: "Views começam em 1-3 min após o Pix." },
  { q: "É seguro?", a: "Sim, sem senha e sem risco à conta." },
  { q: "Vídeo antigo funciona?", a: "Funciona, mas o efeito no algoritmo é maior nas primeiras 24-48h de postagem." },
  { q: "Pagamento?", a: "Somente Pix, 24/7." },
  { q: "Garantia?", a: "Sim, nos pacotes 🇧🇷 Brasileiro Real a reposição é garantida por 30 dias. Nos pacotes 🌎 Global pedimos reposição ao fornecedor automaticamente." },
];

export const Route = createFileRoute("/views-tiktok")({
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
      accent="#25F4EE"
      h1="Views TikTok — Amplifique Seu Alcance"
      subtitle="Boost profissional de visualizações para acelerar o For You"
      intro="Ampliamos as views do seu vídeo para acelerar a distribuição pelo algoritmo. Entrega em minutos, sem senha, com garantia de 30 dias nos pacotes brasileiros."
      ctaHref="/tiktok"
      ctaLabel="Amplificar views"
      benefits={[
        { icon: "zap", title: "Rápido", text: "Views começam em 1-3 min." },
        { icon: "shield", title: "Sem senha", text: "Só o link do vídeo." },
        { icon: "check", title: "Garantia", text: "Reposição de 30 dias nos pacotes 🇧🇷 Brasileiro Real; nos Global, solicitada ao fornecedor automaticamente." },
        { icon: "clock", title: "Pix 24/7", text: "Aprovação instantânea." },
      ]}
      pricingTitle="Planos de views — TikTok"
      pricingCategories={["tiktok:visualizacoes"]}
      pricing={[
        { id: "tv1k", qty: "1.000 views", price: "R$ 6,00" },
        { id: "tv2k", qty: "2.000 views", price: "R$ 18,00", note: "Mais escolhido" },
        { id: "tv5k", qty: "5.000 views", price: "R$ 27,00" },
        { id: "tv10k", qty: "10.000 views", price: "R$ 54,40" },
      ]}
      bodySections={[
        { h2: "Por que boost de views acelera o For You", body: "O algoritmo do TikTok testa vídeos novos em pequenos grupos. Se performar, distribui pra mais. Boost inicial de views manda sinal forte nas primeiras horas — a janela em que vídeo decide se vira viral ou morre." },
        { h2: "Como funciona", body: "1. Escolha o plano.\n2. Cole o link do vídeo.\n3. Pague o Pix.\n4. Views em 1-3 min.\n5. Garantia de 30 dias nos pacotes brasileiros." },
      ]}
      faq={FAQ}
    />
  );
}
