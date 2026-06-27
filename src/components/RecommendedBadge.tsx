/**
 * Etiqueta neon "Recomendado pelo J.A.R.V.I.S." — injetar no plano de
 * maior margem real (menor custo_real / maior taxa de sucesso).
 * Uso: <RecommendedBadge color="#00f2fe" /> dentro do card de preço.
 */
export function RecommendedBadge({ color = "#FF0028" }: { color?: string }) {
  return (
    <div
      className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.18em] whitespace-nowrap animate-pulse"
      style={{
        background: `linear-gradient(90deg, ${color}33, ${color}66)`,
        border: `1px solid ${color}`,
        color,
        textShadow: `0 0 6px ${color}`,
        boxShadow: `0 0 12px ${color}88`,
      }}
    >
      ⚡ Recomendado pelo J.A.R.V.I.S.
    </div>
  );
}
