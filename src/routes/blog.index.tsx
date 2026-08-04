import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";

const BASE = "https://www.boostgg.com.br";

const POSTS = [
  {
    slug: "como-ganhar-seguidores-instagram",
    title: "Como Ganhar Seguidores no Instagram em 2026",
    excerpt: "Estratégias reais que funcionam hoje — orgânicas e pagas — sem cair em promessas vazias.",
  },
  {
    slug: "e-seguro-comprar-seguidores",
    title: "É Seguro Comprar Seguidores no Instagram?",
    excerpt: "O que muda entre serviços sérios e serviços que travam a conta. Como identificar.",
  },
  {
    slug: "melhor-site-comprar-seguidores",
    title: "Melhor Site Para Comprar Seguidores: Critérios Que Importam",
    excerpt: "Cinco critérios objetivos para escolher onde comprar sem perder dinheiro.",
  },
  {
    slug: "comprar-seguidores-pix",
    title: "Comprar Seguidores no Pix: Como Funciona e Por Que É a Forma Mais Segura",
    excerpt: "Por que pagar seguidores via Pix é mais rápido, rastreável e seguro que cartão ou boleto.",
  },
  {
    slug: "boostgg-nao-e-boost-de-jogos",
    title: "BoostGG Não é Boost de Jogos: Entenda a Diferença",
    excerpt: "A BoostGG é crescimento social para Instagram, TikTok e YouTube. Não vendemos Elo boosting, ranqueada ou serviços de games.",
  },
  {
    slug: "comprar-seguidores-cai",
    title: "Comprar Seguidores no Instagram Cai? O Que Acontece Depois",
    excerpt: "Entenda retenção, reposição e os sinais de que seu serviço entregou seguidores reais — ou bots descartáveis.",
  },
  {
    slug: "seguidores-instagram-baratos",
    title: "Seguidores Instagram Baratos: Vale a Pena? O Que Observar",
    excerpt: "Barato demais quase sempre é bot. Como diferenciar preço justo de armadilha.",
  },
  {
    slug: "como-tirar-instagram-privado",
    title: "Como Tirar o Instagram do Privado: Passo a Passo (iOS e Android)",
    excerpt: "Guia rápido para deixar seu perfil público — requisito obrigatório para receber seguidores e aparecer no Explorar.",
  },
  {
    slug: "como-instagram-detecta-seguidores",
    title: "Como o Instagram Detecta Seguidores em 2026",
    excerpt: "Entenda os padrões que a Meta usa para identificar crescimento artificial e como se proteger.",
  },
  {
    slug: "shadowban-mito-ou-realidade",
    title: "Shadowban: Mito ou Realidade ao Comprar Seguidores?",
    excerpt: "Sua conta corre risco? Analisamos o que realmente causa o bloqueio de alcance.",
  },
  {
    slug: "guia-bio-perfeita-instagram",
    title: "O Guia da Bio Perfeita: Converta Visitantes em Vendas",
    excerpt: "Não adianta ter seguidores se o perfil não converte. Aprenda a estruturar sua bio.",
  },
  {
    slug: "instagram-vs-tiktok-onde-crescer",
    title: "Instagram vs TikTok: Onde é mais rápido crescer do zero?",
    excerpt: "Comparamos os algoritmos para você decidir onde focar seu esforço e investimento.",
  },
  {
    slug: "por-que-entrega-gradual-e-segura",
    title: "Por que a Entrega Gradual é o Único Caminho Seguro",
    excerpt: "A diferença entre um perfil banido e um perfil de autoridade está na velocidade.",
  },
  {
    slug: "guia-seguranca-comprar-seguidores",
    title: "Guia Completo: Como Comprar Seguidores com Segurança",
    excerpt: "Tudo o que você precisa saber sobre segurança, métodos de pagamento e como proteger seu perfil.",
  },
  {
    slug: "como-escolher-site-confiavel-seguidores",
    title: "Como Escolher um Site Confiável para Comprar Seguidores",
    excerpt: "Critérios de credibilidade, suporte e garantias que separam os profissionais dos amadores.",
  },
  {
    slug: "potencializar-resultados-pos-compra",
    title: "Como Potencializar Resultados após Comprar Seguidores",
    excerpt: "Estratégias de conteúdo e engajamento para transformar números em autoridade real.",
  },
];

const OG_IMAGE = "https://www.boostgg.com.br/og-instagram.jpg";

export const Route = createFileRoute("/blog/")({
  head: () => {
    const title = "Blog BoostGG — Crescimento no Instagram";
    const description = "Guias práticos sobre crescer no Instagram, comprar seguidores com segurança e escolher os melhores serviços em 2026.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { name: "robots", content: "index, follow" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: `${BASE}/blog` },
        { property: "og:image", content: OG_IMAGE },
        { property: "og:image:alt", content: title },
        { property: "og:site_name", content: "BoostGG" },
        { property: "og:locale", content: "pt_BR" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: OG_IMAGE },
      ],
      links: [{ rel: "canonical", href: `${BASE}/blog` }],
    };
  },
  component: BlogIndex,
});

function BlogIndex() {
  return (
    <div className="dark min-h-screen text-foreground">
      <header className="sticky top-0 z-50 bg-background/95 border-b border-border">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-8 rounded-lg bg-[image:var(--gradient-cta)] grid place-items-center shadow-glow">
              <TrendingUp className="size-4 text-background" />
            </div>
            <span className="font-display font-bold text-lg">BoostGG</span>
          </Link>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
            Voltar
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-16 max-w-3xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">Blog</h1>
        <p className="text-lg text-muted-foreground mb-10">
          Estratégias e análises honestas sobre crescimento no Instagram.
        </p>

        <div className="space-y-4">
          {POSTS.map((p) => (
            <Link
              key={p.slug}
              to="/blog/$slug"
              params={{ slug: p.slug }}
              className="block rounded-2xl border border-border bg-card/60 p-6 hover:border-primary transition"
            >
              <h2 className="font-display font-bold text-xl text-foreground mb-2">{p.title}</h2>
              <p className="text-muted-foreground">{p.excerpt}</p>
            </Link>
          ))}
        </div>
      </main>

      <footer className="border-t border-border py-10 mt-8">
        <div className="container mx-auto px-6 text-center text-sm text-muted-foreground">
          © 2026 BoostGG. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
