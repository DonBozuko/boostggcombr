import { createFileRoute, Link } from "@tanstack/react-router";
import { TrendingUp } from "lucide-react";

const BASE = "https://boostgg.com.br";

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
    slug: "seguidores-instagram-baratos",
    title: "Seguidores Instagram Baratos: Vale a Pena? O Que Observar",
    excerpt: "Barato demais quase sempre é bot. Como diferenciar preço justo de armadilha.",
  },
];

export const Route = createFileRoute("/blog/")({
  head: () => ({
    meta: [
      { title: "Blog EliteBoost Prime — Crescimento no Instagram" },
      {
        name: "description",
        content:
          "Guias práticos sobre crescer no Instagram, comprar seguidores com segurança e escolher os melhores serviços em 2026.",
      },
      { property: "og:title", content: "Blog EliteBoost Prime" },
      { property: "og:description", content: "Guias práticos sobre crescimento no Instagram." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: `${BASE}/blog` },
    ],
    links: [{ rel: "canonical", href: `${BASE}/blog` }],
  }),
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
            <span className="font-display font-bold text-lg">EliteBoost Prime</span>
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
          © 2026 EliteBoost Prime.
        </div>
      </footer>
    </div>
  );
}
