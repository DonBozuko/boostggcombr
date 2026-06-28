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
    <section className="mx-2 my-2 w-full max-w-7xl mx-auto" aria-label="Pacotes disponíveis">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
        {plans.map((p) => (
          <div
            key={p.id}
            className="rounded-xl p-3 md:p-4 flex flex-col items-center text-center"
            style={{
              background: "#0f0f10",
              border: `1px solid ${accent}55`,
              boxShadow: `0 0 10px ${accent}22`,
            }}
          >
            <div className="flex items-baseline gap-1 justify-center">
              <span className="text-xl md:text-2xl lg:text-3xl font-black text-white leading-none">{p.qty}</span>
              {p.fire && <span className="text-base md:text-lg leading-none">🔥</span>}
            </div>
            {unit && (
              <span className="text-[9px] md:text-[11px] uppercase tracking-[0.18em] text-zinc-400 mt-1">
                {unit}
              </span>
            )}
            <div
              className="mt-1.5 text-2xl md:text-3xl lg:text-4xl font-extrabold leading-none"
              style={{ color: accent, textShadow: `0 0 10px ${accent}aa` }}
            >
              {p.price}
            </div>
            <ul className="mt-2 space-y-0.5 text-[10px] md:text-xs text-zinc-300 leading-tight">
              <li>✓ Entrega 0–2h</li>
              <li>✓ Alta Qualidade</li>
              <li>✓ Sem queda</li>
            </ul>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onBuy(p.id)}
              className="mt-2 w-full rounded-md py-2 md:py-2.5 text-[11px] md:text-sm font-black uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: disabled ? "#222" : "#FFD60A",
                color: disabled ? "#888" : "#0a0a0a",
                boxShadow: disabled ? "none" : "0 0 12px #FFD60Acc, 0 2px 4px rgba(0,0,0,0.4)",
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
