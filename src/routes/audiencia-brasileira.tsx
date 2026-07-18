// v201 — Ad-safe landing paralela
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd } from "@/lib/seo-jsonld";

const URL = "https://boostgg.com.br/audiencia-brasileira";
const TITLE = "Audiência Brasileira — Perfis 100% Nacionais — Elite Boost Prime | BoostGG";
const DESC =
  "Amplie seu perfil com audiência 100% brasileira, real e engajada. Ideal para quem vende no Brasil. Pagamento via Pix.";

const FAQ = [
  { q: "Diferença pra audiência internacional?", a: "Perfis brasileiros com foto, bio e postagens reais. Engajam de verdade, comentam em português. Ideal se seu negócio é local." },
  { q: "Tempo?", a: "Início em 5-15 min após o Pix. Entrega mais lenta que mix internacional por segurança." },
  { q: "Preço maior?", a: "Sim, audiência qualificada custa mais que mix internacional — mas converte muito mais para quem vende no Brasil." },
  { q: "Garantia?", a: "Reposição por 30 dias." },
  { q: "Serve pra Instagram e TikTok?", a: "Sim, ambos." },
  { q: "Pagamento?", a: "Somente Pix, 24/7." },
];

export const Route = createFileRoute("/audiencia-brasileira")({
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
      accent="#009c3b"
      h1="Audiência Brasileira — 100% Nacional e Engajada"
      subtitle="Perfis reais brasileiros para quem vende no Brasil"
      intro="Amplie sua audiência com perfis 100% brasileiros — foto, bio e postagens reais. Ideal para negócios locais que precisam converter."
      ctaHref="/"
      ctaLabel="Contratar audiência BR"
      benefits={[
        { icon: "zap", title: "Entrega em minutos", text: "Início em 5-15 min após Pix." },
        { icon: "shield", title: "Sem senha", text: "Só o @ público." },
        { icon: "check", title: "Perfis reais", text: "Foto, bio e postagens reais." },
        { icon: "clock", title: "Pix 24/7", text: "Aprovação instantânea." },
      ]}
      pricingTitle="Planos audiência brasileira"
      pricing={[
        { qty: "Starter", price: "R$ 9,90" },
        { qty: "Essencial", price: "R$ 29,90", note: "Mais escolhido" },
        { qty: "Pro", price: "R$ 49,90" },
        { qty: "Elite", price: "R$ 149,90" },
      ]}
      bodySections={[
        { h2: "Por que audiência brasileira converte mais", body: "Vender no Brasil com audiência de índia, indonésia e russa não fecha venda. Comentário em português, DM em português, seguidor que entende sua oferta. Custa mais, mas o ROI é outro." },
        { h2: "Como funciona", body: "1. Escolha o plano.\n2. Cole o @ (IG ou TikTok).\n3. Pague o Pix.\n4. Entrega em 5-15 min.\n5. Garantia 30 dias." },
      ]}
      faq={FAQ}
    />
  );
}
