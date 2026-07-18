// v201 — Cross-sell entre landings SEO. Distribui link juice e aumenta pageviews/sessão.
import { useRouterState } from "@tanstack/react-router";

type Link = { href: string; title: string; desc: string };

const RELATED: Record<string, Link[]> = {
  // Instagram
  "/comprar-seguidores-instagram": [
    { href: "/comprar-curtidas-instagram", title: "Comprar Curtidas Instagram", desc: "Boost em posts específicos com entrega em minutos." },
    { href: "/comprar-seguidores-brasileiros", title: "Seguidores Brasileiros", desc: "Perfis BR reais pra quem vende no Brasil." },
    { href: "/kit-creator", title: "Kit Creator", desc: "Combo pra criador: seguidores + curtidas + views com desconto." },
  ],
  "/comprar-curtidas-instagram": [
    { href: "/comprar-seguidores-instagram", title: "Comprar Seguidores Instagram", desc: "Cresça sua base — Pix + entrega em minutos." },
    { href: "/engajamento-instagram", title: "Engajamento Instagram", desc: "Sinal pro algoritmo distribuir mais." },
    { href: "/ferramentas/calculadora-engajamento-instagram", title: "Calculadora de engajamento", desc: "Descubra se seu perfil está saudável." },
  ],
  "/comprar-seguidores-brasileiros": [
    { href: "/comprar-seguidores-instagram", title: "Seguidores Instagram", desc: "Mix internacional mais barato pra números altos." },
    { href: "/audiencia-brasileira", title: "Audiência Brasileira", desc: "Estratégia BR: seguidores, curtidas e views." },
    { href: "/comprar-curtidas-instagram", title: "Curtidas Instagram", desc: "Reforço em posts específicos." },
  ],
  "/comprar-seguidores-instagram-barato": [
    { href: "/promo-5reais", title: "Promo R$ 5", desc: "Teste o serviço pagando só 5 reais." },
    { href: "/comprar-seguidores-instagram", title: "Seguidores Instagram", desc: "Versão premium com entrega gradual." },
    { href: "/kit-creator", title: "Kit Creator", desc: "Combo criador com preço fechado." },
  ],
  // TikTok
  "/comprar-seguidores-tiktok": [
    { href: "/comprar-visualizacoes-tiktok", title: "Visualizações TikTok", desc: "Acelere o For You com views." },
    { href: "/turbinar-tiktok", title: "Turbinar TikTok", desc: "Combo de crescimento pra criadores." },
    { href: "/views-tiktok", title: "Views TikTok", desc: "Pacotes específicos de visualização." },
  ],
  "/comprar-visualizacoes-tiktok": [
    { href: "/comprar-seguidores-tiktok", title: "Seguidores TikTok", desc: "Base fiel pra novos vídeos performarem." },
    { href: "/turbinar-tiktok", title: "Turbinar TikTok", desc: "Estratégia completa: views + seguidores." },
    { href: "/views-tiktok", title: "Views TikTok", desc: "Mais pacotes de visualização." },
  ],
  "/turbinar-tiktok": [
    { href: "/comprar-seguidores-tiktok", title: "Seguidores TikTok", desc: "Base sólida pro algoritmo confiar." },
    { href: "/comprar-visualizacoes-tiktok", title: "Visualizações TikTok", desc: "Empurrão em vídeos específicos." },
    { href: "/views-tiktok", title: "Views TikTok", desc: "Pacotes específicos de views." },
  ],
  "/views-tiktok": [
    { href: "/comprar-visualizacoes-tiktok", title: "Comprar Visualizações TikTok", desc: "Página principal de views." },
    { href: "/comprar-seguidores-tiktok", title: "Seguidores TikTok", desc: "Cresça sua base." },
    { href: "/turbinar-tiktok", title: "Turbinar TikTok", desc: "Combo pra criadores." },
  ],
  // YouTube
  "/comprar-inscritos-youtube": [
    { href: "/crescer-youtube", title: "Crescer no YouTube", desc: "Estratégia completa pra canais." },
    { href: "/comprar-seguidores-instagram", title: "Seguidores Instagram", desc: "Divulgue seu canal do IG." },
    { href: "/comprar-seguidores-tiktok", title: "Seguidores TikTok", desc: "Chame público novo pelo TikTok." },
  ],
  "/crescer-youtube": [
    { href: "/comprar-inscritos-youtube", title: "Comprar Inscritos YouTube", desc: "Base inicial pra monetização." },
  ],
  // Topo de funil
  "/audiencia-brasileira": [
    { href: "/comprar-seguidores-brasileiros", title: "Seguidores Brasileiros", desc: "Compre agora com Pix." },
    { href: "/comprar-seguidores-instagram", title: "Seguidores Instagram", desc: "Pacotes maiores mix internacional." },
  ],
  "/engajamento-instagram": [
    { href: "/comprar-curtidas-instagram", title: "Comprar Curtidas Instagram", desc: "Empurre posts específicos." },
    { href: "/comprar-seguidores-instagram", title: "Seguidores Instagram", desc: "Base pra sustentar o engajamento." },
  ],
  "/impulsionar-instagram": [
    { href: "/comprar-seguidores-instagram", title: "Seguidores Instagram", desc: "Impulsione com base sólida." },
    { href: "/comprar-curtidas-instagram", title: "Curtidas Instagram", desc: "Sinal forte pro algoritmo." },
  ],
};

export function RelatedLinks({ accent = "#FFD700" }: { accent?: string }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const items = RELATED[path];
  if (!items || items.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="text-xl font-bold text-white mb-3">Você também pode gostar</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {items.map((it) => (
          <a
            key={it.href}
            href={it.href}
            className="rounded-xl p-4 block hover:opacity-90 transition-opacity"
            style={{ background: "#111", border: `1px solid ${accent}55` }}
          >
            <div className="font-bold text-white text-sm mb-1">{it.title}</div>
            <div className="text-zinc-400 text-xs leading-relaxed">{it.desc}</div>
          </a>
        ))}
      </div>
    </section>
  );
}
