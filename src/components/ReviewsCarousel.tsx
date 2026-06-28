import { BadgeCheck } from "lucide-react";

const REVIEWS = [
  { n: "Camila R.", t: "Bati minha meta de 10k seguidores em 2 semanas. Surreal!", verified: true },
  { n: "Lucas M.", t: "Monetizei o canal em tempo recorde, meta batida.", verified: true },
  { n: "Priscila A.", t: "Atendimento humano e premium. Recomendo de olhos fechados." },
  { n: "Rodrigo S.", t: "Melhor custo-benefício que já testei no mercado." },
  { n: "Tatiana V.", t: "Resultado consistente, nada de queda. Top demais." },
];

export function ReviewsCarousel({ accent = "#00f2fe" }: { accent?: string }) {
  return (
    <section
      className="mx-2 mt-1 mb-0.5"
      aria-label="Avaliações de quem já cresceu"
    >
      <div className="flex items-center justify-between px-1 mb-1">
        <span
          className="text-[8px] font-black tracking-[0.3em] uppercase"
          style={{ color: accent, textShadow: `0 0 5px ${accent}` }}
        >
          ★★★★★ AVALIAÇÕES DE QUEM JÁ CRESCEU
        </span>
        <span className="text-[8px] text-white/40">arraste →</span>
      </div>
      <div
        className="flex gap-2 overflow-x-auto snap-x snap-mandatory pb-1 -mx-1 px-1"
        style={{ scrollbarWidth: "none" }}
      >
        {REVIEWS.map((r, i) => (
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
            <p className="text-[10px] leading-snug text-white/80">"{r.t}"</p>
          </article>
        ))}
      </div>
    </section>
  );
}
