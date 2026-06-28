type GridPlan = {
  id: string;
  qty: string;
  price: string;
  fire?: boolean;
};

export function PremiumPricingGrid({
  plans,
  onBuy,
  disabled,
  disabledLabel,
  accent,
  unit = "",
}: {
  plans: GridPlan[];
  onBuy: (id: string) => void;
  disabled?: boolean;
  disabledLabel?: string;
  accent: string;
  unit?: string;
}) {
  return (
    <section className="mx-auto my-1 w-full max-w-7xl px-2" aria-label="Pacotes disponíveis">
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 lg:gap-4 auto-rows-fr">
        {plans.map((p) => (
          <div
            key={p.id}
            className="rounded-lg px-2 py-2 flex flex-col items-center text-center h-full min-h-[140px] justify-between"
            style={{
              background: "#0f0f10",
              border: `1px solid ${accent}55`,
              boxShadow: `0 0 8px ${accent}22`,
            }}
          >
            <div className="flex items-baseline gap-1 justify-center">
              <span className="text-base md:text-xl font-black text-white leading-none">{p.qty}</span>
              {p.fire && <span className="text-xs md:text-sm leading-none">🔥</span>}
            </div>
            {unit && (
              <span className="text-[8px] md:text-[10px] uppercase tracking-[0.16em] text-zinc-400 mt-0.5">
                {unit}
              </span>
            )}
            <div
              className="mt-0.5 text-lg md:text-2xl font-extrabold leading-none"
              style={{ color: accent, textShadow: `0 0 8px ${accent}aa` }}
            >
              {p.price}
            </div>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onBuy(p.id)}
              className="mt-1 w-full rounded-md py-1 md:py-1.5 text-[10px] md:text-xs font-black uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: disabled ? "#222" : "#FFD60A",
                color: disabled ? "#888" : "#0a0a0a",
                boxShadow: disabled ? "none" : "0 0 10px #FFD60Acc, 0 2px 3px rgba(0,0,0,0.4)",
              }}
            >
              {disabled ? (disabledLabel ?? "Indisponível") : "Comprar Agora"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

