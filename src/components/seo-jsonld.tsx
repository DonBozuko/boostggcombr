interface ProductSchemaProps {
  name: string;
  description: string;
  price: string;
  priceCurrency: string;
  image?: string;
  sku?: string;
  reviewCount?: number;
  ratingValue?: number;
}

export function ProductSchema({
  name,
  description,
  price,
  priceCurrency = "BRL",
  image,
  sku,
  reviewCount = 124,
  ratingValue = 4.9
}: ProductSchemaProps) {
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": name,
    "description": description,
    "image": image,
    "sku": sku || name.toLowerCase().replace(/\s+/g, '-'),
    "brand": {
      "@type": "Brand",
      "name": "BOOSTGG"
    },
    "offers": {
      "@type": "Offer",
      "url": "https://www.boostgg.com.br",
      "priceCurrency": priceCurrency,
      "price": price,
      "availability": "https://schema.org/InStock",
      "seller": {
        "@type": "Organization",
        "name": "BOOSTGG"
      }
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": ratingValue,
      "bestRating": "5",
      "worstRating": "1",
      "ratingCount": reviewCount
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

