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
    <section className="mx-2 my-1.5" aria-label="Pacotes disponíveis">
      <div className="grid grid-cols-2 gap-1.5">
        {plans.map((p) => (
          <div
            key={p.id}
            className="rounded-lg p-2 flex flex-col"
            style={{
              background: "#0f0f10",
              border: `1px solid ${accent}55`,
              boxShadow: `0 0 10px ${accent}22`,
            }}
          >
            <div className="flex items-baseline gap-1">
              <span className="text-base font-black text-white leading-none">{p.qty}</span>
              {p.fire && <span className="text-sm leading-none">🔥</span>}
            </div>
            {unit && <span className="text-[8px] uppercase tracking-wider text-zinc-400 mt-0.5">{unit}</span>}
            <div
              className="mt-0.5 text-lg font-extrabold leading-tight"
              style={{ color: accent, textShadow: `0 0 8px ${accent}88` }}
            >
              {p.price}
            </div>
            <ul className="mt-1 space-y-0 text-[9px] text-zinc-300 leading-tight">
              <li>✓ Entrega: 0-2h</li>
              <li>✓ Alta Qualidade</li>
              <li>✓ Sem queda</li>
            </ul>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onBuy(p.id)}
              className="mt-1.5 w-full rounded-md py-1.5 text-[10px] font-black uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: disabled ? "#222" : "#FFD60A",
                color: disabled ? "#888" : "#0a0a0a",
                boxShadow: disabled ? "none" : "0 0 10px #FFD60A99, 0 2px 4px rgba(0,0,0,0.4)",
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
