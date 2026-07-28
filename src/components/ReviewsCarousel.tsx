import { BadgeCheck } from "lucide-react";

type RouteKey = "/" | "/tiktok" | "/youtube" | "/facebook" | "/telegram" | "/trafego" | "/kwai";

type Review = { n: string; t: string; verified?: boolean };

// v201 — Reviews segmentados por rede: cada landing mostra depoimentos alinhados
// ao objetivo do visitante (monetização, alcance, membros, etc). Reduz sensação
// de template e aumenta prova social contextual.
const REVIEWS_BY_ROUTE: Record<RouteKey, Review[]> = {
  "/": [
    { n: "Camila R.", t: "Bati minha meta de 10k seguidores no Insta em 2 semanas. Surreal!", verified: true },
    { n: "Priscila A.", t: "Perfil bombou e ainda ganhei engajamento orgânico depois.", verified: true },
    { n: "Rodrigo S.", t: "Melhor custo-benefício de seguidores BR que já testei.", verified: true },
    { n: "Tatiana V.", t: "Sem queda depois de 3 meses. Suporte no Pix responde na hora." },
    { n: "Bruno L.", t: "Comprei no domingo à noite, caiu antes de dormir. Automático mesmo." },
  ],
  "/tiktok": [
    { n: "Larissa M.", t: "Vídeo com 5k views virou 80k orgânico. Empurrão inicial funciona.", verified: true },
    { n: "Diego P.", t: "Seguidores TikTok BR consistente, sem drop nos 30 dias.", verified: true },
    { n: "Aline C.", t: "Consegui a marca de 1k pra abrir Live. Valeu cada centavo." },
    { n: "Wesley R.", t: "Preço honesto e entrega em minutos. Voltarei." },
    { n: "Nathalia B.", t: "Views deram tração no FYP. Passei a receber propostas." },
  ],
  "/youtube": [
    { n: "Lucas M.", t: "Monetizei o canal em tempo recorde, bati os 1.000 subs.", verified: true },
    { n: "Fernanda K.", t: "Watch time subiu junto com inscritos, algoritmo entendeu.", verified: true },
    { n: "André T.", t: "Suporte me orientou sobre entrega gradual pra não dar flag." },
    { n: "Mariana O.", t: "Canal saiu de 200 pra 3k subs em 1 mês. Recomendo." },
    { n: "Roger S.", t: "Views nos Shorts alavancaram meu canal do zero." },
  ],
  "/facebook": [
    { n: "Rafael D.", t: "Página da loja física passou de 500 pra 15k curtidas. Cliente confia mais.", verified: true },
    { n: "Juliana P.", t: "Prova social ajudou a fechar mais orçamento pelo WhatsApp.", verified: true },
    { n: "Marcos V.", t: "Fanpage de imobiliária cresceu e virou canal de leads." },
    { n: "Beatriz N.", t: "Entrega em horas e gradual, do jeito que combinaram." },
    { n: "Anderson L.", t: "Perfil pessoal com 5k seguidores rapidinho, valeu." },
  ],
  "/telegram": [
    { n: "Renata F.", t: "Canal VIP saiu de 80 pra 3k membros em uma semana.", verified: true },
    { n: "Igor M.", t: "Grupo de sinais cripto ganhou credibilidade na hora.", verified: true },
    { n: "Sabrina R.", t: "Membros silenciosos são exatamente o que eu precisava pra prova social." },
    { n: "Vinicius A.", t: "Entrega em minutos, nem precisei falar com o suporte." },
    { n: "Camila O.", t: "Canal de notícias esportivas: 10k membros entregues sem enrolação." },
  ],
  "/trafego": [
    { n: "Carolina T.", t: "Loja Shopify recebeu 25k visitas BR reais. GA registrou tudo.", verified: true },
    { n: "Henrique B.", t: "Blog saiu do zero em cliques. Tráfego orgânico bem segmentado.", verified: true },
    { n: "Paula S.", t: "Landing de infoproduto testada com tráfego real antes de rodar ad." },
    { n: "Thiago M.", t: "Preferi o plano orgânico. Analytics não filtrou como bot." },
    { n: "Vanessa L.", t: "Site de afiliado subiu em ranking depois do tráfego constante." },
  ],
  "/kwai": [
    { n: "Thiago F.", t: "Reels no Kwai bombou depois de 500 views compradas.", verified: true },
    { n: "Amanda C.", t: "Perfil saiu do zero rápido. Entrega gradual, não levantou suspeita.", verified: true },
    { n: "Douglas R.", t: "Kwai Rewards liberou pagamento depois que meu canal cresceu." },
    { n: "Patricia N.", t: "Melhor preço de Kwai que achei no mercado. Entrega rápida." },
    { n: "Wellington A.", t: "Turbina inicial que faltava pra sair do zero na plataforma." },
  ],
};

export function ReviewsCarousel({
  accent = "#00f2fe",
  route = "/",
}: {
  accent?: string;
  route?: RouteKey;
}) {
  const reviews = REVIEWS_BY_ROUTE[route] ?? REVIEWS_BY_ROUTE["/"];
  return (
    <section
      className="mx-2 mt-1 mb-0.5"
      aria-label="Avaliações de quem já cresceu"
    >
      <div className="flex items-center justify-between px-1 mb-1">
        <span
          className="text-[10px] font-black tracking-[0.2em] uppercase whitespace-nowrap"
          style={{ color: accent, textShadow: `0 0 5px ${accent}` }}
        >
          ★★★★★ AVALIAÇÕES
        </span>
        <span className="text-[10px] text-white/40 ml-2 shrink-0">deslize →</span>
      </div>
      <div
        className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1"
        style={{ scrollbarWidth: "none" }}
      >
        {reviews.map((r, i) => (
          <article
            key={i}
            className="snap-start shrink-0 w-[78%] rounded-lg p-2 pt-3 backdrop-blur-md border relative"
            style={{
              background: "rgba(255,255,255,0.04)",
              borderColor: `${accent}33`,
              boxShadow: `0 0 10px ${accent}1f inset`,
              isolation: "isolate",
            }}
          >
            <div className="flex items-center gap-2 mb-1.5 relative z-10">
              <div
                className="h-7 w-7 shrink-0 rounded-full grid place-items-center text-[11px] font-black text-black"
                style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
              >
                {r.n[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold text-white truncate leading-tight flex items-center gap-1">
                  {r.n}
                  {r.verified && (
                    <BadgeCheck
                      size={10}
                      className="shrink-0"
                      style={{ color: accent, filter: `drop-shadow(0 0 3px ${accent})` }}
                    />
                  )}
                </p>
                <p className="text-[8px] tracking-widest leading-tight" style={{ color: accent }}>★★★★★</p>
              </div>
            </div>
            <p className="text-[10px] leading-snug text-white/80 mt-1 relative z-0">"{r.t}"</p>
          </article>
        ))}
      </div>
    </section>
  );
}
