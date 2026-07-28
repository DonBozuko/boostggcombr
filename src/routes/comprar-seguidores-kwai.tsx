// v210 — Landing SEO: comprar seguidores no Kwai
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd, buildProductJsonLd } from "@/lib/seo-jsonld";

const URL = "https://boostgg.com.br/comprar-seguidores-kwai";

const faq = [
  { q: "Como funciona a compra de seguidores no Kwai?", a: "Você escolhe o pacote, informa o @ ou link do perfil e paga via Pix. Em minutos os seguidores começam a entrar de forma gradual pra manter o crescimento natural." },
  { q: "Seguidores do Kwai são brasileiros?", a: "Não. Os pacotes de Kwai hoje são 🌎 Global (alto volume) — o selo aparece em cada card. Linha 🇧🇷 Brasileiro Real existe em Instagram e TikTok." },
  { q: "Preciso da senha da minha conta Kwai?", a: "Não. Trabalhamos só com dados públicos (@ ou link). Nunca peça senha para nenhum fornecedor de crescimento — é golpe." },
  { q: "Em quanto tempo entrega?", a: "Início em 5-30 minutos após o Pix confirmado. Pacotes pequenos concluem no mesmo dia; acima de 10 mil, distribuímos em 2-5 dias." },
  { q: "E se cair seguidor?", a: "Nos pacotes Global do Kwai não há reposição garantida: solicitamos reposição ao fornecedor e, sem garantia disponível, avaliamos reenvio ou estorno. Abra chamado no WhatsApp com o link do perfil." },

];

export const Route = createFileRoute("/comprar-seguidores-kwai")({
  head: () => {
    const title = "Comprar Seguidores no Kwai via Pix — Elite Boost Prime | BoostGG";
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
      subtitle="Entrega automática · perfis brasileiros · reposição de 30 dias nos pacotes brasileiros"
      ctaHref="/kwai"
      ctaLabel="Ver planos e comprar agora"
      intro="Quer crescer no Kwai sem ficar refém do algoritmo? Nossa entrega de seguidores brasileiros dá o empurrão inicial de prova social pra vídeos ganharem tração — em minutos, com Pix e sem pedir sua senha. Mais de 3 mil pedidos entregues no Instagram, TikTok e YouTube; agora também no Kwai."
      benefits={[
        { icon: "zap", title: "Entrega em minutos", text: "Início em 5-30 min após o Pix confirmado." },
        { icon: "shield", title: "Sem senha", text: "Só o @ ou link do perfil. 100% seguro." },
        { icon: "check", title: "Reposição 30 dias", text: "Garantia nos pacotes brasileiros; nos Global pedimos ao fornecedor." },
        { icon: "clock", title: "Perfis brasileiros", text: "Audiência BR pra Kwai Rewards contar." },
      ]}
      pricingTitle="Preços (a partir de)"
      pricing={[
        { qty: "100 seguidores BR", price: "R$ 5,00", note: "Ideal pra testar" },
        { qty: "500 seguidores BR", price: "R$ 15,00" },
        { qty: "1.000 seguidores BR", price: "R$ 28,00", note: "Mais popular" },
        { qty: "5.000 seguidores BR", price: "R$ 110,00" },
        { qty: "10.000 seguidores BR", price: "R$ 210,00", note: "Prova social forte" },
      ]}
      bodySections={[
        {
          h2: "Por que comprar seguidores no Kwai vale a pena?",
          body: "O Kwai brasileiro cresceu explosivamente com o Kwai Rewards, e o algoritmo prioriza vídeos com engajamento inicial rápido. Quem começa do zero tem dificuldade de sair da vitrine 'sem visualizações'. Uma injeção controlada de seguidores brasileiros cria o efeito bola de neve: mais seguidor → mais indicação orgânica → mais views reais. Não é atalho mágico, é combustível pro que seu conteúdo já é.",
        },
        {
          h2: "É seguro? Kwai não pune?",
          body: "O Kwai não tem histórico de punir contas por crescimento pago, diferente do Instagram. Entregamos com perfis reais brasileiros (não bots vazios) e de forma gradual pra parecer orgânico. Nunca tivemos relato de suspensão em mais de 3.100 pedidos entre todas as plataformas. Se cair alguém, repomos por 30 dias.",
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
