// v201 — SEO landing: "comprar seguidores instagram barato" (1.300/mês, KDI 29)
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd } from "@/lib/seo-jsonld";

const URL = "https://boostgg.com.br/comprar-seguidores-instagram-barato";
const TITLE = "Comprar Seguidores Instagram Barato — R$5 via Pix";
const DESC =
  "Seguidores Instagram barato de verdade: pacote inicial a partir de R$5 no Pix, entrega em minutos e reposição por 30 dias. Sem senha, sem enrolação.";

const FAQ = [
  {
    q: "Por que não existe seguidor por R$1?",
    a: "Existe promessa, mas não entrega. Um seguidor válido tem custo real de rede, servidor e reposição. Sites que anunciam R$1 ou somem com seu Pix, ou entregam bot que cai em 48h e derruba seu alcance. Nosso piso é R$5 pra 100 seguidores exatamente porque abaixo disso é golpe ou lixo.",
  },
  {
    q: "R$5 é o mais barato mesmo?",
    a: "Sim. R$5 são 100 seguidores mix internacional com reposição 30 dias. Se o objetivo é só quebrar a barreira do 'perfil vazio' pra parecer ativo, esse pacote resolve. Quer brasileiro real com foto e post? Aí sobe pra R$14,90 os 500.",
  },
  {
    q: "Barato significa fake?",
    a: "Barato significa mix internacional em vez de brasileiro premium. São perfis reais com foto, mas de outros países. Servem pra número (prova social, brand deal, algoritmo). Se você vende no Brasil e precisa de engajamento em português, pega o pacote brasileiro.",
  },
  {
    q: "Em quanto tempo entra?",
    a: "Pix aprovado → primeiros seguidores em 1 a 5 minutos. Pacotes maiores (5k+) são entregues escalonados em algumas horas pra não disparar filtro do Instagram.",
  },
  {
    q: "Se cair, tem reposição?",
    a: "Sim, 30 dias em todos os pacotes — inclusive nos mais baratos. Cai, você abre ticket, a gente recompõe sem custo.",
  },
  {
    q: "Precisa da minha senha?",
    a: "Não. Nunca. Só o @ público do seu Instagram. Qualquer site que pede senha pra entregar seguidor é golpe — sai correndo.",
  },
];

export const Route = createFileRoute("/comprar-seguidores-instagram-barato")({
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
      h1="Comprar Seguidores Instagram Barato — a partir de R$5 no Pix"
      subtitle="Piso real de mercado, sem golpe de R$1"
      intro="Quer seguidor no Instagram barato de verdade? Aqui o piso é R$5 pelos 100 primeiros — com Pix instantâneo, entrega em minutos e reposição por 30 dias. Nada de site que promete R$1 e some com seu dinheiro."
      ctaHref="/"
      ctaLabel="Comprar a partir de R$5"
      benefits={[
        { icon: "zap", title: "A partir de R$5", text: "100 seguidores no pacote de entrada. Piso real, sem pegadinha." },
        { icon: "shield", title: "Sem senha", text: "Só o @ público. Site que pede senha é golpe." },
        { icon: "check", title: "Reposição 30 dias", text: "Vale até no pacote mais barato. Caiu, a gente recompõe." },
        { icon: "clock", title: "Pix 24h", text: "Aprovação instantânea, funciona madrugada e feriado." },
      ]}
      pricingTitle="Tabela — seguidores Instagram baratos"
      pricing={[
        { qty: "100 seguidores", price: "R$ 4,90", note: "Piso — quebra o 'perfil vazio'" },
        { qty: "500 seguidores", price: "R$ 14,90", note: "Mais vendido" },
        { qty: "1.000 seguidores", price: "R$ 24,90" },
        { qty: "5.000 seguidores", price: "R$ 89,90" },
        { qty: "10.000 seguidores", price: "R$ 169,90" },
      ]}
      bodySections={[
        {
          h2: "Por que 'seguidor por R$1' é sempre golpe",
          body: "Servidor, rede de perfis e reposição de 30 dias têm custo fixo. Ninguém entrega isso por R$1 e continua no ar 6 meses depois. O que acontece nesses sites: (1) somem com seu Pix, ou (2) mandam bot descartável que o Instagram derruba em 48h — e o efeito colateral é seu alcance despencar. Barato de verdade começa em R$5 os 100 e sobe daí. Abaixo disso, você paga com o alcance do seu perfil.",
        },
        {
          h2: "Como funciona a compra barata na BoostGG",
          body: "1. Escolhe o pacote de R$5 (ou maior).\n2. Cola o @ do Instagram (sem senha).\n3. Paga o Pix — QR Code ou copia-e-cola.\n4. 1-5 min depois os seguidores começam a cair.\n5. Reposição automática por 30 dias.",
        },
        {
          h2: "Barato ≠ ruim: quando o pacote de R$5 resolve",
          body: "Se o objetivo é sair do 'perfil de 40 seguidores que ninguém segue', o pacote de R$5 já quebra a barreira. Prova social funciona por múltiplos de 10: 200 seguidores parece mais ativo que 40, mesmo sendo mix internacional. Agora, se você vende no Brasil e precisa de curtida/comentário em português, aí compensa subir pra brasileiros reais (R$14,90 os 500).",
        },
      ]}
      faq={FAQ}
    />
  );
}
