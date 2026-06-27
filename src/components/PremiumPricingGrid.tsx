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
    <section className="mx-2 my-2" aria-label="Pacotes disponíveis">
      <div className="grid grid-cols-2 gap-2">
        {plans.map((p) => (
          <div
            key={p.id}
            className="rounded-xl p-3 flex flex-col"
            style={{
              background: "#0f0f10",
              border: `1px solid ${accent}55`,
              boxShadow: `0 0 14px ${accent}22`,
            }}
          >
            <div className="flex items-baseline gap-1">
              <span className="text-lg font-black text-white leading-none">{p.qty}</span>
              {p.fire && <span className="text-base leading-none">🔥</span>}
            </div>
            {unit && <span className="text-[9px] uppercase tracking-wider text-zinc-400 mt-0.5">{unit}</span>}
            <div
              className="mt-1 text-xl font-extrabold leading-tight"
              style={{ color: accent, textShadow: `0 0 10px ${accent}88` }}
            >
              {p.price}
            </div>
            <ul className="mt-2 space-y-0.5 text-[10px] text-zinc-300 leading-tight">
              <li>✓ Entrega: 0-2h</li>
              <li>✓ Alta Qualidade</li>
              <li>✓ Sem queda</li>
            </ul>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onBuy(p.id)}
              className="mt-2 w-full rounded-lg py-2 text-[11px] font-black uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: disabled ? "#222" : "#FFD60A",
                color: disabled ? "#888" : "#0a0a0a",
                boxShadow: disabled ? "none" : "0 0 14px #FFD60A99, 0 2px 6px rgba(0,0,0,0.4)",
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
