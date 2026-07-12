const MESSAGES = [
  "Raquel acabou de comprar 1.000 seguidores",
  "Fabrício comprou 100 seguidores",
  "Débora comprou 5.000 seguidores",
  "Anderson comprou 100 curtidas",
];

export function LivePurchasesTicker({ accent = "#00f2fe" }: { accent?: string }) {
  const loop = [...MESSAGES, ...MESSAGES];
  return (
    <div
      className="mx-2 mt-1 mb-1 overflow-hidden rounded-lg border bg-black/70"
      style={{
        borderColor: `${accent}40`,
        background: "rgba(255,255,255,0.03)",
        boxShadow: `0 0 12px ${accent}22 inset`,
      }}
      aria-label="Compras em tempo real"
    >
      <div className="flex items-center gap-1.5 px-2 py-0.5 border-b border-white/5">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: accent, boxShadow: `0 0 6px ${accent}` }}
        />
        <span
          className="text-[8px] font-bold tracking-[0.3em] uppercase"
          style={{ color: accent, textShadow: `0 0 4px ${accent}` }}
        >
          Compras ao vivo
        </span>
      </div>
      <div className="relative h-5 overflow-hidden">
        <div
          className="absolute left-0 top-0 flex whitespace-nowrap will-change-transform"
          style={{ animation: "lp-marquee 28s linear infinite" }}
        >
          {loop.map((m, i) => (
            <span
              key={i}
              className="px-4 py-1 text-[10px] font-medium text-white/85"
              style={{ textShadow: `0 0 6px ${accent}55` }}
            >
              ✦ {m}
            </span>
          ))}
        </div>
      </div>
      <style>{`@keyframes lp-marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}`}</style>
    </div>
  );
}
