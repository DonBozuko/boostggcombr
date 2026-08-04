import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://www.boostgg.com.br";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const sitemapHeaders = () => {
  const headers = new Headers();
  headers.set("Content-Type", "application/xml; charset=utf-8");
  headers.set("Cache-Control", "public, max-age=86400, s-maxage=86400, stale-while-revalidate=43200"); // v417+ — Cache 24h + 12h SWR para economia de infra
  headers.set("X-Content-Type-Options", "nosniff");
  return headers;
};

const buildSitemapXml = () => {
  const entries: SitemapEntry[] = [
    { path: "/", changefreq: "daily", priority: "1.0" },
    { path: "/comprar-seguidores-instagram", changefreq: "daily", priority: "1.0" },
    { path: "/tiktok", changefreq: "weekly", priority: "0.9" },
    { path: "/youtube", changefreq: "weekly", priority: "0.9" },
    { path: "/facebook", changefreq: "weekly", priority: "0.9" },
    { path: "/trafego", changefreq: "weekly", priority: "0.8" },
    { path: "/telegram", changefreq: "weekly", priority: "0.7" },
    
    { path: "/blog", changefreq: "weekly", priority: "0.7" },
    { path: "/blog/como-ganhar-seguidores-instagram", changefreq: "monthly", priority: "0.6" },
    { path: "/blog/e-seguro-comprar-seguidores", changefreq: "monthly", priority: "0.6" },
    { path: "/blog/melhor-site-comprar-seguidores", changefreq: "monthly", priority: "0.6" },
    { path: "/blog/comprar-seguidores-pix", changefreq: "monthly", priority: "0.6" },
    { path: "/blog/comprar-seguidores-cai", changefreq: "monthly", priority: "0.6" },
    { path: "/blog/boostgg-nao-e-boost-de-jogos", changefreq: "monthly", priority: "0.7" },
    { path: "/blog/seguidores-instagram-baratos", changefreq: "monthly", priority: "0.6" },
    { path: "/blog/como-tirar-instagram-privado", changefreq: "monthly", priority: "0.6" },
    { path: "/ferramentas", changefreq: "weekly", priority: "0.8" },
    { path: "/revenda", changefreq: "monthly", priority: "0.8" },
    { path: "/afiliados", changefreq: "monthly", priority: "0.8" },
    { path: "/api-revenda", changefreq: "monthly", priority: "0.6" },
    { path: "/painel-smm", changefreq: "monthly", priority: "0.8" },
    { path: "/revender-seguidores", changefreq: "monthly", priority: "0.7" },
    { path: "/ferramentas/calculadora-lucro-revenda", changefreq: "monthly", priority: "0.6" },
    
    { path: "/ferramentas/contador-seguidores", changefreq: "weekly", priority: "0.7" },
    { path: "/ferramentas/contador-inscritos-youtube", changefreq: "weekly", priority: "0.7" },
    { path: "/ferramentas/calculadora-engajamento-instagram", changefreq: "weekly", priority: "0.7" },
    { path: "/ferramentas/gerador-legenda-instagram", changefreq: "weekly", priority: "0.8" },
    { path: "/kit-creator", changefreq: "weekly", priority: "0.9" },
    { path: "/promo-5reais", changefreq: "weekly", priority: "0.8" },
    { path: "/rastrear", changefreq: "monthly", priority: "0.5" },
    // v200 — SEO landings (keyword-alvo)
    { path: "/seguidores-pix", changefreq: "daily", priority: "0.9" },
    { path: "/pix-seguidores-instagram", changefreq: "daily", priority: "0.9" },
    { path: "/comprar-seguidores-instagram", changefreq: "daily", priority: "1.0" },
    { path: "/comprar-seguidores-reais-brasil", changefreq: "daily", priority: "1.0" },
    { path: "/comprar-seguidores-instagram-barato", changefreq: "daily", priority: "0.9" },
    { path: "/comprar-curtidas-instagram", changefreq: "weekly", priority: "0.9" },
    { path: "/comprar-seguidores-tiktok", changefreq: "weekly", priority: "0.9" },
    { path: "/comprar-seguidores-brasileiros", changefreq: "daily", priority: "1.0" },
    { path: "/comprar-visualizacoes-tiktok", changefreq: "weekly", priority: "0.9" },
    // v401 — landings novas (Semrush BR: 5.400/mês KDI 20 e 1.900/mês KDI 21)
    { path: "/comprar-curtidas-tiktok", changefreq: "weekly", priority: "0.9" },
    { path: "/seguidores-reais-instagram", changefreq: "weekly", priority: "0.9" },
    { path: "/comprar-inscritos-youtube", changefreq: "weekly", priority: "0.9" },
    { path: "/audiencia-brasileira", changefreq: "weekly", priority: "0.8" },
    { path: "/crescer-youtube", changefreq: "weekly", priority: "0.8" },
    { path: "/engajamento-instagram", changefreq: "weekly", priority: "0.8" },
    { path: "/impulsionar-instagram", changefreq: "weekly", priority: "0.8" },
    { path: "/turbinar-tiktok", changefreq: "weekly", priority: "0.8" },
    { path: "/views-tiktok", changefreq: "weekly", priority: "0.8" },
    { path: "/kwai", changefreq: "weekly", priority: "0.9" },
    { path: "/comprar-seguidores-kwai", changefreq: "weekly", priority: "0.9" },
    { path: "/avaliacoes", changefreq: "weekly", priority: "0.7" },


    // v404 — /privacidade, /termos, /reembolso agora noindex (páginas legais competiam com a home na busca de marca)
    // v207 — removidos: /admin, /login, /mcp, /diagnostico (todos noindex — sitemap contraditório desperdiça crawl budget)
  ];


  // v308 — lastmod removido: data de build em todas as URLs é sinal falso de frescor
  // e faz o Google desconfiar do sitemap inteiro. Só volta com timestamp real por página.
  const urls = entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
      e.priority ? `    <priority>${e.priority}</priority>` : null,
      `  </url>`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
};

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        return new Response(buildSitemapXml(), { status: 200, headers: sitemapHeaders() });
      },
      HEAD: async () => {
        return new Response(null, { status: 200, headers: sitemapHeaders() });
      },
    },
  },
});
