import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://eliteboostprime.lovable.app";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

const sitemapHeaders = () => {
  const headers = new Headers();
  headers.set("Content-Type", "application/xml; charset=utf-8");
  headers.set("Cache-Control", "public, max-age=3600");
  headers.set("X-Content-Type-Options", "nosniff");
  return headers;
};

const buildSitemapXml = () => {
  const entries: SitemapEntry[] = [
    { path: "/", changefreq: "weekly", priority: "1.0" },
    { path: "/tiktok", changefreq: "weekly", priority: "0.9" },
    { path: "/youtube", changefreq: "weekly", priority: "0.9" },
    { path: "/facebook", changefreq: "weekly", priority: "0.9" },
    { path: "/trafego", changefreq: "weekly", priority: "0.8" },
    { path: "/telegram", changefreq: "weekly", priority: "0.7" },
    { path: "/privacidade", changefreq: "yearly", priority: "0.3" },
    { path: "/blog", changefreq: "weekly", priority: "0.7" },
    { path: "/blog/como-ganhar-seguidores-instagram", changefreq: "monthly", priority: "0.6" },
    { path: "/blog/e-seguro-comprar-seguidores", changefreq: "monthly", priority: "0.6" },
    { path: "/blog/melhor-site-comprar-seguidores", changefreq: "monthly", priority: "0.6" },
    { path: "/blog/comprar-seguidores-pix", changefreq: "monthly", priority: "0.6" },
    { path: "/blog/seguidores-instagram-baratos", changefreq: "monthly", priority: "0.6" },
  ];

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
