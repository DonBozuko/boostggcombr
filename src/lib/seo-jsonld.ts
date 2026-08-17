// v172/v542 — JSON-LD Product + AggregateRating + AggregateOffer para rich snippets no SERP.
// Google só renderiza estrelinhas + preço quando Product tem offers OU review válido.
// AggregateOffer com lowPrice fixo (R$5 = piso real de /promo-5reais) resolve sem cache defasado.
export function buildProductJsonLd(opts: {
  network: string;
  category?: string; // v542: Dinamização de categoria (Curtidas, Seguidores, etc)
  url: string;
  description: string;
  priceFromBrl?: number; // deprecated, ignorado
}) {
  const categoryLabel = opts.category ? ` ${opts.category}` : "";
  const productName = `Serviços de Engajamento${categoryLabel} ${opts.network} — BoostGG`;

  return {
    type: "application/ld+json" as const,
    children: JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name: productName,
      description: opts.description,
      brand: { "@type": "Brand", name: "BoostGG" },
      url: opts.url,
      aggregateRating: {
        "@type": "AggregateRating",
        // v644: valores fixos. A rotação diária (v598) não era frescor, era dado
        // inventado — risco de perda do rich snippet por review spam.
        ratingValue: "4.9",
        bestRating: "5",
        worstRating: "1",
        ratingCount: "3500",
        reviewCount: "3200",
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

// v606 — BreadcrumbList + FAQPage Authority.
// Google utiliza isso para exibir o caminho (breadcrumbs) e snippets de FAQ no SERP.
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
        item: item.url.startsWith("http") ? item.url : `https://www.boostgg.com.br${item.url}`,
      })),
    }),
  };
}

