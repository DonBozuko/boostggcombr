// v414 — SEO landing: "comprar seguidores instagram" (Landing Principal de Conversão)
import { createFileRoute } from "@tanstack/react-router";
import { SeoLanding } from "@/components/SeoLanding";
import { buildFaqJsonLd, buildProductJsonLd, buildBreadcrumbJsonLd } from "@/lib/seo-jsonld";

const URL = "https://www.boostgg.com.br/comprar-seguidores-instagram";
const TITLE = "Comprar Seguidores Instagram — Preços e Pacotes | BoostGG";
const DESC =
  "Compre seguidores para Instagram com entrega em minutos, pagamento via Pix e reposição nos pacotes brasileiros. Perfis brasileiros, sem senha, 100% seguro.";

const FAQ = [
  {
    q: "Comprar seguidores é permitido?",
    a: "Cada rede social possui seus próprios termos de uso e políticas para interação na plataforma. Por esse motivo, é importante conhecer as regras da rede social utilizada antes de contratar qualquer serviço. Neste conteúdo, o termo plataforma refere-se exclusivamente às redes sociais, como Instagram, TikTok, YouTube, Facebook, X, Twitch, Telegram e Kwai.",
  },
  {
    q: "Preciso informar minha senha?",
    a: "Os serviços de compra de seguidores normalmente solicitam apenas o nome de usuário ou o link do perfil público para identificar o destino da entrega. Nunca compartilhe sua senha ou códigos de autenticação com terceiros durante o processo de contratação.",
  },
  {
    q: "Quanto tempo demora para receber os seguidores?",
    a: "O prazo varia conforme o serviço contratado, a plataforma escolhida e a demanda existente no momento da compra. Alguns pedidos iniciam rapidamente, enquanto outros seguem uma entrega distribuída ao longo do tempo. Verifique sempre as informações apresentadas na página do serviço antes de finalizar o pedido.",
  },
  {
    q: "Posso comprar seguidores para qualquer rede social?",
    a: "Isso depende da disponibilidade de serviços para cada plataforma. Muitas empresas oferecem soluções para Instagram, TikTok, YouTube, Facebook, X, Telegram, Twitch, Kwai e outras redes sociais. Antes da contratação, confirme se a rede desejada faz parte do catálogo disponível.",
  },
  {
    q: "Comprar seguidores substitui uma estratégia de marketing?",
    a: "Não. Comprar seguidores funciona como um recurso complementar dentro de uma estratégia de crescimento digital. Resultados mais consistentes costumam ser alcançados quando essa ação é combinada com produção de conteúdo relevante, SEO, identidade visual, anúncios, gestão de redes sociais e relacionamento com a audiência.",
  },
];

export const Route = createFileRoute("/comprar-seguidores-instagram")({
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
      buildProductJsonLd({ network: "Instagram", url: URL, description: DESC }),
      buildBreadcrumbJsonLd([
        { name: "Início", url: "https://www.boostgg.com.br/" },
        { name: "Seguidores Instagram", url: URL },
      ]),
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <SeoLanding
      accent="#e1306c"
      h1="Comprar Seguidores Instagram — Reais, Baratos e com Pix"
      subtitle="Seguidores Instagram entregues em minutos"
      intro="Aumente sua audiência no Instagram sem enrolação: pague com Pix, receba em minutos e conte com reposição de 30 dias nos pacotes brasileiros. Sem senha, sem risco, sem cadastro."
      ctaHref="/"
      ctaLabel="Comprar seguidores agora"
      benefits={[
        { icon: "zap", title: "Entrega em minutos", text: "Primeiros seguidores em 1-5 min após Pix aprovado." },
        { icon: "shield", title: "100% seguro", text: "Não pedimos sua senha. Só precisamos do @ público." },
        { icon: "check", title: "Reposição 30 dias (BR)", text: "Pacotes 🇧🇷 Brasileiro Real têm reposição garantida." },
        { icon: "clock", title: "Pix 24 horas", text: "Aprovação instantânea, funciona madrugada e feriado." },
      ]}
      pricingTitle="Tabela de preços — seguidores Instagram"
      pricingCategories={["instagram:seguidores"]}
      pricing={[
        { id: "p100", qty: "100 seguidores", price: "R$ 5,50" },
        { id: "p500", qty: "500 seguidores", price: "R$ 19,00", note: "Mais vendido" },
        { id: "p1k", qty: "1.000 seguidores", price: "R$ 23,47" },
        { id: "p5k", qty: "5.000 seguidores", price: "R$ 81,46" },
        { id: "p10k", qty: "10.000 seguidores", price: "R$ 130,94" },
      ]}
      bodySections={[
        {
          h2: "Por que Escolher a BoostGG para Comprar Seguidores",
          body: "Plataforma especializada em crescimento para redes sociais\n\nA BoostGG reúne serviços voltados ao fortalecimento da presença digital em diferentes redes sociais. O catálogo contempla soluções para Instagram, TikTok, YouTube, Facebook, X, Twitch, Telegram, Kwai e outras plataformas. Isso permite concentrar diferentes estratégias de crescimento em um único ambiente.\n\nProcesso de compra simples e rápido\n\nO fluxo de compra foi desenvolvido para facilitar a contratação dos serviços. O usuário escolhe o pacote desejado, informa o nome de usuário ou o link do perfil público, realiza o pagamento e acompanha o processamento do pedido. Esse procedimento reduz etapas desnecessárias e melhora a experiência durante a compra.\n\nDiversidade de serviços para diferentes objetivos\n\nAlém de seguidores, a plataforma disponibiliza opções relacionadas a curtidas, visualizações, inscritos, comentários, compartilhamentos, horas de exibição e outras métricas específicas de cada rede social. Cada serviço atende um objetivo diferente dentro da estratégia de crescimento digital.\n\nSuporte e transparência durante a contratação\n\nTer acesso a informações claras sobre cada serviço ajuda o cliente a tomar decisões mais conscientes. Descrições completas, especificações do serviço e canais de atendimento contribuem para uma experiência mais segura durante todo o processo de compra.\n\nSolução para criadores, empresas e profissionais\n\nA BoostGG atende diferentes perfis de usuários. Criadores de conteúdo buscam ampliar o alcance das publicações. Empresas fortalecem sua presença digital para aumentar reconhecimento da marca. Profissionais utilizam as redes sociais para desenvolver autoridade em seus nichos e ampliar oportunidades de negócios.",
        },
        {
          h2: "Conclusão",
          body: "Comprar seguidores pode fazer parte da sua estratégia digital\n\nComprar seguidores é uma alternativa para quem deseja fortalecer a presença nas redes sociais e acelerar o desenvolvimento de um perfil. Quando integrada a uma estratégia de marketing digital, essa ação pode contribuir para ampliar a visibilidade da marca, aumentar o reconhecimento e gerar mais oportunidades de crescimento.\n\nO crescimento sustentável depende de uma estratégia completa\n\nOs melhores resultados acontecem quando diferentes ações trabalham em conjunto. Produção de conteúdo de qualidade, SEO, gestão de redes sociais, anúncios, identidade visual, interação com a audiência e análise de métricas formam uma base sólida para o crescimento contínuo de um perfil.\n\nEscolha uma plataforma especializada\n\nAo selecionar um serviço para comprar seguidores, priorize plataformas que apresentem informações claras, variedade de serviços, suporte ao cliente e um processo de compra simples. Avaliar esses fatores ajuda a tomar uma decisão mais consciente e alinhada aos seus objetivos.\n\nInvista no fortalecimento da sua presença digital\n\nSe você procura uma plataforma especializada para comprar seguidores, curtidas, visualizações, inscritos e outros serviços para redes sociais, a BoostGG oferece soluções para diferentes plataformas e objetivos. Escolher o serviço adequado para sua estratégia pode ajudar a fortalecer sua presença digital e ampliar o potencial de crescimento do seu perfil.",
        },
      ]}
      faq={FAQ}
    />
  );
}
