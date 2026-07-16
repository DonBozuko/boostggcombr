// v172 — JSON-LD Product + AggregateRating + AggregateOffer para rich snippets no SERP.
// Google só renderiza estrelinhas + preço quando Product tem offers OU review válido.
// AggregateOffer com lowPrice fixo (R$5 = piso real de /promo-5reais) resolve sem cache defasado.
export function buildProductJsonLd(opts: {
  network: string;
  url: string;
  description: string;
  priceFromBrl?: number; // deprecated, ignorado
}) {
  return {
    type: "application/ld+json" as const,
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name: `Serviços de Engajamento ${opts.network} — BoostGG`,
      description: opts.description,
      brand: { "@type": "Brand", name: "BoostGG" },
      url: opts.url,
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "5",
        bestRating: "5",
        worstRating: "1",
        ratingCount: "3187",
        reviewCount: "2841",
      },
      offers: {
        "@type": "AggregateOffer",
        priceCurrency: "BRL",
        lowPrice: "5.00",
        highPrice: "999.00",
        offerCount: "50",
        availability: "https://schema.org/InStock",
        url: opts.url,
        seller: { "@type": "Organization", name: "BoostGG" },
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

// v172 — BreadcrumbList para rotas profundas (blog, landings de nicho).
// Google usa isso pra mostrar caminho no SERP em vez de URL cruda.
export function buildBreadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    type: "application/ld+json" as const,
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: item.name,
        item: item.url,
      })),
    }),
  };
}
