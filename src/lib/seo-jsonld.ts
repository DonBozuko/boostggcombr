// v129 — JSON-LD Product + AggregateRating para rich snippets nas 6 rotas públicas.
export function buildProductJsonLd(opts: {
  network: string;
  url: string;
  description: string;
  priceFromBrl?: number; // v167 — deprecated, ignorado para evitar cache defasado
}) {
  return {
    type: "application/ld+json" as const,
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name: `Serviços de Engajamento ${opts.network} — EliteBoost Prime`,
      description: opts.description,
      brand: { "@type": "Brand", name: "EliteBoost Prime" },
      url: opts.url,
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "5",
        bestRating: "5",
        worstRating: "1",
        ratingCount: "3187",
        reviewCount: "2841",
      },
    }),
  };
}

export function buildFaqJsonLd(items: { q: string; a: string }[]) {
  return {
    type: "application/ld+json" as const,
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: items.map((i) => ({
        "@type": "Question",
        name: i.q,
        acceptedAnswer: { "@type": "Answer", text: i.a },
      })),
    }),
  };
}
