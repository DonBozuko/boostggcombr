// v210 — Landing SEO: comprar seguidores no Kwai
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd, buildProductJsonLd } from "@/lib/seo-jsonld";

const URL = "https://www.boostgg.com.br/comprar-seguidores-kwai";

const faq = [
  { q: "Como funciona a compra de seguidores no Kwai?", a: "Você escolhe o pacote, informa o @ ou link do perfil e paga via Pix. Em minutos os seguidores começam a entrar de forma gradual pra manter o crescimento natural." },
  { q: "Seguidores do Kwai são brasileiros?", a: "Não. Os pacotes de Kwai hoje são 🌎 Global (alto volume) — o selo aparece em cada card. Linha 🇧🇷 Brasileiro Real existe em Instagram e TikTok." },
  { q: "Preciso da senha da minha conta Kwai?", a: "Não. Trabalhamos só com dados públicos (@ ou link). Nunca peça senha para nenhum fornecedor de crescimento — é golpe." },
  { q: "Em quanto tempo entrega?", a: "Início em 5-30 minutos após o Pix confirmado. Pacotes pequenos concluem no mesmo dia; acima de 10 mil, distribuímos em 2-5 dias." },
  { q: "E se cair seguidor?", a: "Nos pacotes Global do Kwai não há reposição garantida: solicitamos reposição ao fornecedor e, sem garantia disponível, avaliamos reenvio ou estorno. Abra chamado no WhatsApp com o link do perfil." },

];

export const Route = createFileRoute("/comprar-seguidores-kwai")({
  head: () => {
    const title = "Comprar Seguidores Kwai Baratos via Pix | BoostGG";
    const description =
      "Compre seguidores no Kwai via Pix. Entrega gradual em minutos, sem senha e com acompanhamento do pedido. A partir de R$ 5.";

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: URL },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: URL }],
      scripts: [
        buildProductJsonLd({ network: "Kwai", url: URL, description }),
        buildFaqJsonLd(faq),
      ],
    };
  },
  component: () => (
    <SeoLanding
      accent="#ff6600"
      h1="Comprar Seguidores no Kwai via Pix"
      subtitle="Entrega automática · gradual · sem senha"
      ctaHref="/kwai"
      ctaLabel="Ver planos e comprar agora"
      intro="Quer crescer no Kwai sem ficar refém do algoritmo? A entrega de seguidores dá o empurrão inicial de prova social pra vídeos ganharem tração — em minutos, com Pix e sem pedir sua senha. Mais de 3 mil pedidos entregues no Instagram, TikTok e YouTube; agora também no Kwai."
      benefits={[
        { icon: "zap", title: "Entrega em minutos", text: "Início em 5-30 min após o Pix confirmado." },
        { icon: "shield", title: "Sem senha", text: "Só o @ ou link do perfil. 100% seguro." },
        { icon: "check", title: "Suporte no WhatsApp", text: "Deu problema, a gente reenvia ou estorna." },
        { icon: "clock", title: "Entrega gradual", text: "Distribuída pra parecer crescimento orgânico." },
      ]}

      pricingTitle="Preços (a partir de)"
      pricingCategories={["kwai:seguidores"]}
      pricing={[
        { id: "kf100", qty: "100 seguidores", price: "R$ 5,00", note: "Ideal pra testar" },
        { id: "kf500", qty: "500 seguidores", price: "R$ 19,00" },
        { id: "kf1k", qty: "1.000 seguidores", price: "R$ 53,70", note: "Mais popular" },
        { id: "kf5k", qty: "5.000 seguidores", price: "R$ 264,82" },
        { id: "kf10k", qty: "10.000 seguidores", price: "R$ 660,66", note: "Prova social forte" },
      ]}

      bodySections={[
        {
          h2: "Por que comprar seguidores no Kwai vale a pena?",
          body: "O Kwai brasileiro cresceu explosivamente com o Kwai Rewards, e o algoritmo prioriza vídeos com engajamento inicial rápido. Quem começa do zero tem dificuldade de sair da vitrine 'sem visualizações'. Uma injeção controlada de seguidores cria o efeito bola de neve: mais seguidor → mais indicação orgânica → mais views reais. Não é atalho mágico, é combustível pro que seu conteúdo já é.",
        },
        {
          h2: "É seguro? Kwai não pune?",
          body: "O Kwai não tem histórico de punir contas por crescimento pago, diferente do Instagram. A entrega é gradual, pra parecer orgânica, e nunca tivemos relato de suspensão em mais de 3.100 pedidos entre todas as plataformas. Os pacotes de Kwai são da linha Global: havendo queda relevante, solicitamos reposição ao fornecedor e, sem garantia, avaliamos reenvio ou estorno.",

        },
        {
          h2: "Seguidor comprado ajuda no Kwai Rewards?",
          body: "Indiretamente sim. O Rewards paga por views e retenção real; ter base de seguidores maior aumenta o alcance inicial, o que puxa views orgânicas. Combine com bons vídeos (retenção >40%) e o crescimento pago vira multiplicador.",
        },
      ]}
      faq={faq}
    />
  ),
});
