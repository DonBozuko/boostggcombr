type CatItem = {
  key: string;
  label: string;
  emoji?: string;
  badge?: string;
  badgeColor?: string;
};

export function PremiumCategorySelector({
  items,
  active,
  onChange,
  accent = "#FFD700",
}: {
  items: CatItem[];
  active: string;
  onChange: (key: string) => void;
  accent?: string;
}) {
  return (
    <section
      className="sticky top-0 z-40 px-2 py-2 backdrop-blur-md"
      style={{ background: "rgba(10,10,10,0.92)", borderBottom: `1px solid ${accent}33` }}
      aria-label="Selecionar categoria"
    >
      <div className="grid grid-cols-3 gap-2">
        {items.map((it) => {
          const isActive = it.key === active;
          return (
            <button
              key={it.key}
              type="button"
              onClick={() => onChange(it.key)}
              className="relative rounded-xl px-2 py-3 text-center transition-all min-h-[78px] flex flex-col items-center justify-center"
              style={{
                background: isActive ? `${accent}18` : "rgba(255,255,255,0.03)",
                border: `1.5px solid ${isActive ? accent : `${accent}44`}`,
                boxShadow: isActive ? `0 0 18px ${accent}99, inset 0 0 12px ${accent}33` : "none",
              }}
            >
              {it.badge && (
                <span
                  className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider whitespace-nowrap"
                  style={{
                    background: "#0a0a0a",
                    color: it.badgeColor ?? "#39ff14",
                    border: `1px solid ${it.badgeColor ?? "#39ff14"}`,
                    boxShadow: `0 0 8px ${it.badgeColor ?? "#39ff14"}99`,
                  }}
                >
                  {it.badge}
                </span>
              )}
              {it.emoji && <span className="text-2xl leading-none">{it.emoji}</span>}
              <span
                className="mt-1 text-[11px] font-black uppercase tracking-wide leading-tight"
                style={{ color: isActive ? accent : "#fff", textShadow: isActive ? `0 0 6px ${accent}` : "none" }}
              >
                {it.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
