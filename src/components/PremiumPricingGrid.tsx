type GridPlan = {
  id: string;
  qty: string;
  price: string;
  fire?: boolean;
};

type Cols = 2 | 6;

export function PremiumPricingGrid({
  cols = 2,
  plans,
  onBuy,
  disabled,
  disabledLabel,
  accent,
  unit = "",
}: {
  cols?: Cols;
  plans: GridPlan[];
  onBuy: (id: string) => void;
  disabled?: boolean;
  disabledLabel?: string;
  accent: string;
  unit?: string;
}) {
  // Strict Multi-Route UI Mirroring Shell: 2 colunas verticais simétricas em TODAS as rotas.
  void cols;
  const gridCols = "grid-cols-2 gap-4";
  // Hydration Guard: se a esteira chegar vazia (race condition / fetch atrasado),
  // segura o espaço físico com skeleton animado mantendo a grade simétrica.
  if (!plans || plans.length === 0) {
    return (
      <section className="mx-auto my-1 w-full max-w-7xl px-2" aria-label="Carregando pacotes">
        <div className={`grid ${gridCols} auto-rows-fr`}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg px-2 py-2 h-full min-h-[140px] animate-pulse"
              style={{
                background: "#0f0f10",
                border: `1px solid ${accent}33`,
                boxShadow: `0 0 8px ${accent}11`,
              }}
            >
              <div className="h-4 w-3/4 mx-auto rounded bg-zinc-800 mb-2" />
              <div className="h-2 w-1/2 mx-auto rounded bg-zinc-800/60 mb-3" />
              <div className="h-6 w-2/3 mx-auto rounded bg-zinc-800 mb-3" />
              <div className="h-6 w-full rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      </section>
    );
  }
  return (
    <section className="mx-auto my-1 w-full max-w-7xl px-2" aria-label="Pacotes disponíveis">
      <div className={`grid ${gridCols} auto-rows-fr`}>

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

