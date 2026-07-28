// v201 — Ad-safe landing paralela
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd } from "@/lib/seo-jsonld";

const URL = "https://boostgg.com.br/turbinar-tiktok";
const TITLE = "Turbinar TikTok — Gestão de Crescimento de Perfil — Elite Boost Prime | BoostGG";
const DESC =
  "Gestão profissional de crescimento para perfis TikTok. Amplie audiência, prova social e alcance com pagamento via Pix e resultado em minutos.";

const FAQ = [
  { q: "Como funciona?", a: "Serviço de gestão de audiência qualificada. Você informa o @ público, sem senha." },
  { q: "Tempo de entrega?", a: "Início em 1-10 min após Pix. Planos grandes escalonados." },
  { q: "É seguro?", a: "Sim. Sem senha, entrega gradual, respeita limites da plataforma." },
  { q: "Garantia?", a: "Reposição de 30 dias garantida nos pacotes 🇧🇷 Brasileiro Real; nos Global, solicitada ao fornecedor automaticamente." },
  { q: "Perfil precisa estar público?", a: "Sim, apenas durante o processamento." },
  { q: "Pagamento?", a: "Somente Pix, 24/7." },
];

export const Route = createFileRoute("/turbinar-tiktok")({
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
      h1="Turbinar TikTok — Gestão de Crescimento com Pix"
      subtitle="Amplie sua audiência e prova social em minutos"
      intro="Gestão profissional de crescimento para TikTok. Sem senha, resultado em minutos, garantia de 30 dias nos pacotes brasileiros."
      ctaHref="/tiktok"
      ctaLabel="Turbinar agora"
      benefits={[
        { icon: "zap", title: "Rápido", text: "Início em 1-10 min após Pix." },
        { icon: "shield", title: "Sem senha", text: "Só o @ público." },
        { icon: "check", title: "Garantia 30 dias", text: "Reposição automática." },
        { icon: "clock", title: "Pix 24/7", text: "Aprovação instantânea." },
      ]}
      pricingTitle="Planos de turbinamento — TikTok"
      pricingCategories={["tiktok:seguidores"]}
      pricing={[
        { id: "tf100", qty: "100 seguidores", price: "R$ 9,87" },
        { id: "tf500", qty: "500 seguidores", price: "R$ 45,70", note: "Mais escolhido" },
        { id: "tf1k", qty: "1.000 seguidores", price: "R$ 81,49" },
        { id: "tf5k", qty: "5.000 seguidores", price: "R$ 245,88" },
      ]}
      bodySections={[
        { h2: "Por que investir em gestão de crescimento no TikTok", body: "TikTok distribui via For You com base em sinais rápidos. Perfil pequeno tem menos chance de entrar na roda. Um empurrão profissional inicial cria a base pra o algoritmo levar seu conteúdo pra mais gente." },
        { h2: "Como funciona", body: "1. Escolha o plano.\n2. Cole o @ do TikTok.\n3. Pague o Pix.\n4. Resultado em minutos.\n5. Garantia de 30 dias nos pacotes brasileiros." },
      ]}
      faq={FAQ}
    />
  );
}
