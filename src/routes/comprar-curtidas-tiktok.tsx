// v401 — SEO landing: "comprar curtidas tiktok" (5.400/mês, KDI 20 — ALVO FÁCIL, Semrush BR)
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd, buildProductJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo-jsonld";

const URL = "https://www.boostgg.com.br/comprar-curtidas-tiktok";
const TITLE = "Comprar Curtidas TikTok via Pix — Entrega em Minutos | BoostGG";
const DESC =
  "Compre curtidas para vídeos do TikTok a partir de R$ 5. Entrega em minutos, sem senha, pagamento via Pix. Reforce o sinal de qualidade do algoritmo.";

const FAQ = [
  {
    q: "Curtidas compradas ajudam o vídeo a ir pro For You?",
    a: "Sim, mas de forma indireta. O TikTok compara a taxa de curtidas sobre views. Um vídeo com 10.000 views e 5 curtidas trava a distribuição; o mesmo vídeo com 300-500 curtidas continua sendo entregue. A curtida é o voto de qualidade que destrava o próximo lote de entrega.",
  },
  {
    q: "Preciso passar minha senha do TikTok?",
    a: "Não. Nunca pedimos senha nem login. Você cola apenas o link público do vídeo. Se algum site pedir sua senha para entregar curtidas, saia de lá — é golpe de sequestro de conta.",
  },
  {
    q: "Em quanto tempo as curtidas entram?",
    a: "A contagem começa a subir em 1-5 minutos após o Pix ser aprovado. Pacotes de até 1.000 curtidas fecham em cerca de 15 minutos; volumes maiores entram de forma gradual para parecer natural.",
  },
  {
    q: "Quantas curtidas devo comprar pro meu vídeo?",
    a: "Use a proporção real do TikTok: entre 3% e 8% das views. Se o vídeo tem 5.000 views, algo entre 150 e 400 curtidas é natural. Comprar 5.000 curtidas em um vídeo de 5.000 views é o erro clássico que denuncia compra e derruba entrega.",
  },
  {
    q: "Comprar curtidas pode derrubar minha conta?",
    a: "Não. A entrega é feita pela API pública de engajamento, sem acesso ao seu perfil. O que gera risco é proporção irreal (mais curtidas que views) ou volume gigante de uma vez — por isso trabalhamos com entrega gradual.",
  },
  {
    q: "Serve para vídeo antigo?",
    a: "Funciona, mas rende menos. O empurrão vale mais nas primeiras 24-48 horas do vídeo, quando o algoritmo ainda está decidindo se distribui. Vídeo com semanas de vida raramente reativa alcance.",
  },
];

export const Route = createFileRoute("/comprar-curtidas-tiktok")({
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
    scripts: [
      buildFaqJsonLd(FAQ),
      buildProductJsonLd({ network: "TikTok", url: URL, description: DESC }),
      buildBreadcrumbJsonLd([
        { name: "Início", url: "https://www.boostgg.com.br/" },
        { name: "Curtidas TikTok", url: URL },
      ]),
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoLanding
      accent="#00f2fe"
      h1="Comprar Curtidas TikTok — Likes Reais via Pix"
      subtitle="Curtidas que sustentam a entrega do seu vídeo"
      intro="Curtida no TikTok não é vaidade: é o sinal que o algoritmo lê pra decidir se continua mostrando seu vídeo. Compre com Pix, sem cadastro e sem senha — só o link do vídeo."
      ctaHref="/tiktok"
      ctaLabel="Comprar curtidas TikTok"
      benefits={[
        { icon: "zap", title: "Começa em 1-5 min", text: "Contagem sobe logo após o Pix aprovado." },
        { icon: "check", title: "Proporção natural", text: "Entrega gradual pra não destoar das views." },
        { icon: "shield", title: "Sem senha, sem risco", text: "Só o link público do vídeo. Nunca pedimos login." },
        { icon: "clock", title: "Pix 24 horas", text: "Aprovação instantânea, qualquer horário." },
      ]}
      pricingTitle="Tabela de preços — curtidas TikTok"
      pricingCategories={["tiktok:curtidas"]}
      pricing={[
        { id: "tl100", qty: "100 curtidas", price: "R$ 5,00" },
        { id: "tl500", qty: "500 curtidas", price: "R$ 10,00" },
        { id: "tl1k", qty: "1.000 curtidas", price: "R$ 15,00", note: "Mais vendido" },
        { id: "tl5k", qty: "5.000 curtidas", price: "R$ 51,84" },
      ]}
      bodySections={[
        {
          h2: "Por que curtida pesa mais que view no TikTok",
          body: "O TikTok entrega cada vídeo em lotes. No primeiro lote (200-500 pessoas) ele mede retenção, curtidas, comentários e compartilhamentos. View sozinha diz apenas que o vídeo apareceu; curtida diz que alguém gostou o suficiente pra agir. Por isso a taxa de curtidas sobre views é um dos filtros mais duros pra passar do primeiro lote — e é exatamente o número que trava a maioria dos criadores em 200 visualizações.",
        },
        {
          h2: "A proporção certa entre views e curtidas",
          body: "A média saudável no TikTok brasileiro fica entre 3% e 8% de curtidas sobre views. Abaixo de 2%, o algoritmo lê o vídeo como fraco e engaveta. Acima de 15%, o padrão fica artificial e pode acionar revisão. Se você comprar views, compre curtidas na mesma proporção — comprar só um dos dois costuma piorar a leitura do vídeo em vez de melhorar.",
        },
        {
          h2: "Curtidas compradas substituem conteúdo bom?",
          body: "Não, e quem promete isso está vendendo ilusão. Curtida compra distribuição inicial; retenção é o que sustenta. Se as pessoas saem nos primeiros 2 segundos, nenhum pacote salva o vídeo. O uso inteligente é: publique o vídeo que você já sabe que é bom, dê o empurrão nas primeiras horas e deixe o orgânico assumir a partir daí.",
        },
        {
          h2: "Como comprar passo a passo",
          body: "1) Copie o link do vídeo no TikTok (botão Compartilhar → Copiar link). 2) Escolha a quantidade de curtidas na tabela acima. 3) Cole o link e gere o Pix. 4) Pague — a aprovação é instantânea. 5) Acompanhe a entrega na página de rastreio com o código do pedido. Não é necessário criar conta nem informar senha em nenhuma etapa.",
        },
      ]}
      faq={FAQ}
    />
  );
}
