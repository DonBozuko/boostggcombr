// v129 — JSON-LD Product + AggregateRating para rich snippets nas 6 rotas públicas.
export function buildProductJsonLd(opts: {
  network: string; // ex "Instagram"
  url: string; // absoluto
  description: string;
  priceFromBrl?: number;
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
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "BRL",
        lowPrice: (opts.priceFromBrl ?? 5).toFixed(2),
        highPrice: "9999.00",
        offerCount: "200",
        availability: "https://schema.org/InStock",
      },
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
