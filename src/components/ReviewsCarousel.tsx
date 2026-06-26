const REVIEWS = [
  { n: "Camila R.", t: "Entrega absurda de rápida, meu Insta bombou em horas." },
  { n: "Lucas M.", t: "Engajamento real, fechei parceria na semana seguinte." },
  { n: "Priscila A.", t: "Atendimento humano e premium. Recomendo de olhos fechados." },
  { n: "Rodrigo S.", t: "Melhor custo-benefício que já testei no mercado." },
  { n: "Tatiana V.", t: "Resultado consistente, nada de queda. Top demais." },
];

export function ReviewsCarousel({ accent = "#00f2fe" }: { accent?: string }) {
  return (
    <section
      className="mx-3 mt-3 mb-1"
      aria-label="Avaliações 5 estrelas de clientes"
    >
      <div className="flex items-center justify-between px-1 mb-2">
        <span
          className="text-[10px] font-black tracking-[0.35em] uppercase"
          style={{ color: accent, textShadow: `0 0 6px ${accent}` }}
        >
          ★★★★★ Mural Premium
        </span>
        <span className="text-[10px] text-white/40">arraste →</span>
      </div>
      <div
        className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-1 px-1"
        style={{ scrollbarWidth: "none" }}
      >
        {REVIEWS.map((r, i) => (
          <article
            key={i}
            className="snap-start shrink-0 w-[78%] rounded-xl p-3 backdrop-blur-md border"
            style={{
              background: "rgba(255,255,255,0.04)",
              borderColor: `${accent}33`,
              boxShadow: `0 0 14px ${accent}1f inset`,
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className="h-7 w-7 rounded-full grid place-items-center text-[11px] font-black text-black"
                style={{ background: accent, boxShadow: `0 0 8px ${accent}` }}
              >
                {r.n[0]}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold text-white truncate">{r.n}</p>
                <p className="text-[9px] tracking-widest" style={{ color: accent }}>★★★★★</p>
              </div>
            </div>
            <p className="text-[11px] leading-snug text-white/80">"{r.t}"</p>
          </article>
        ))}
      </div>
    </section>
  );
}
