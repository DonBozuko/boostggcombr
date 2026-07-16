// v165 — Cabeçalho de marca serif ouro (identidade oficial BoostGG).
export function BrandHeader({ subtitle }: { subtitle: string }) {
  return (
    <div className="flex flex-col items-center leading-tight">
      <span
        className="font-serif font-bold tracking-[0.14em] text-[17px] bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 bg-clip-text text-transparent drop-shadow-[0_0_6px_rgba(234,179,8,0.35)]"
        style={{ fontFamily: "'Cinzel', 'Playfair Display', serif" }}
      >
        BOOSTGG
      </span>
      <span
        className="font-sans font-light tracking-wide text-[10px] text-white/70 mt-[1px]"
        style={{ fontFamily: "'Inter', 'Montserrat', sans-serif" }}
      >
        {subtitle}
      </span>
    </div>
  );
}
