// v524 — CONSOLIDAÇÃO SEO: esta landing canibalizava /comprar-seguidores-brasileiros
// (34 visitas, 26 orgânicas) enquanto ela mesma nunca recebeu 1 visita sequer.
// Pior: prometia "100% brasileiros" mas puxava preço da categoria global
// (instagram:seguidores, R$ 23,47/1k) em vez da BR real (R$ 212,50/1k).
// Mantida como redirect 301 permanente para não gerar 404 em link externo/sitemap antigo.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/comprar-seguidores-reais-brasil")({
  beforeLoad: () => {
    throw redirect({
      to: "/comprar-seguidores-brasileiros",
      statusCode: 301,
      replace: true,
    });
  },
});
