import { useEffect, useMemo, useState } from "react";

type GridPlan = {
  id: string;
  qty: string;
  price: string;
  fire?: boolean;
};

type Cols = 2 | 3 | 6;

// v51 — Omnichannel 3D Dense Grid Canvas
// Grade rígida de 3 colunas com vidro neon, ancoragem 3x, prova social
// dinâmica e cronômetro regressivo compartilhado de 14min em loop.

const COUNTDOWN_SECONDS = 14 * 60;

function useCountdown(seconds: number): string {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    const t = setInterval(() => {
      setLeft((s) => (s <= 1 ? seconds : s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [seconds]);
  const m = Math.floor(left / 60).toString().padStart(2, "0");
  const s = (left % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}


function parseBRL(p: string): number {
  const n = parseFloat(
    p.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."),
  );
  return Number.isFinite(n) ? n : 0;
}

function fmtBRL(v: number): string {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

function tonePalette(id: string, fire?: boolean): { border: string; glow: string; chip: string; label: string } {
  if (/^br-pro/i.test(id)) return { border: "#F5D061", glow: "#F5D061cc", chip: "#F5D061", label: "PREMIUM BR" };
  if (fire) return { border: "#FFD60A", glow: "#FFD60Acc", chip: "#FFD60A", label: "RELÂMPAGO" };
  if (/^(v|tv|yv)\d/i.test(id)) return { border: "#A855F7", glow: "#A855F7cc", chip: "#A855F7", label: "VIEWS" };
  return { border: "#38BDF8", glow: "#38BDF8aa", chip: "#38BDF8", label: "ECONÔMICO" };
}

// v245 — Selo de origem: transparência sobre nacionalidade do serviço.
// v257 — Nível Premium BR: reposição de 90 dias declarada pelo fornecedor.
type Origin = "br" | "brpro" | "global" | "views";
function detectOrigin(id: string): Origin {
  if (/^br-pro/i.test(id)) return "brpro";
  if (/^(v|tv|yv)\d/i.test(id)) return "views";
  if (/^(br-|wbr)/i.test(id)) return "br";
  return "global";
}
function isSeguidoresBR(id: string): boolean {
  return /^(br-tf|wbr)/i.test(id);
}



export function PremiumPricingGrid({
  cols = 3,
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
  void cols;
  const countdown = useCountdown(COUNTDOWN_SECONDS);
  // v89 — Anti-Scale Responsive Enforcer: grade nativa responsiva, sem
  // encolhimento artificial. Cards quebram para baixo automaticamente.
  const gridCols = "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4";


  const enriched = useMemo(() => {
    return (plans ?? []).map((p) => {
      const real = parseBRL(p.price);
      const anchor = real > 0 ? real * 3 : 0;
      return { ...p, real, anchor };
    });
  }, [plans]);

  if (!plans || plans.length === 0) {
    return (
      <section
        className="mx-auto my-2 w-full px-3"
        aria-label="Carregando pacotes"
      >
        <div className={`grid ${gridCols} auto-rows-fr`}>
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="rounded-lg p-1.5 h-full min-h-[120px] animate-pulse backdrop-blur-md"
              style={{
                background: "rgba(15,15,16,0.55)",
                border: `1px solid ${accent}33`,
                boxShadow: `0 0 8px ${accent}11`,
              }}
            >
              <div className="h-3 w-3/4 mx-auto rounded bg-zinc-800 mb-2" />
              <div className="h-2 w-1/2 mx-auto rounded bg-zinc-800/60 mb-2" />
              <div className="h-4 w-2/3 mx-auto rounded bg-zinc-800 mb-2" />
              <div className="h-5 w-full rounded bg-zinc-800" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section
      className="mx-auto my-2 w-full px-3"
      aria-label="Pacotes disponíveis"
    >
      <div className={`grid ${gridCols} auto-rows-fr`}>
        {enriched.map((p) => {
          const tone = tonePalette(p.id, p.fire);
          const origin = detectOrigin(p.id);
          const recommendedBR = isSeguidoresBR(p.id);
          return (
            <div
              key={p.id}
              className="relative rounded-xl p-3 pt-5 flex flex-col items-center text-center h-full min-h-[200px] justify-between backdrop-blur-md overflow-hidden"
              style={{
                background: "rgba(12,12,14,0.62)",
                border: `1.5px solid ${recommendedBR ? "#16a34a" : tone.border}`,
                boxShadow: `0 0 10px ${recommendedBR ? "#16a34a" : tone.border}55, inset 0 0 18px ${tone.border}14`,
              }}
            >
              <div
                className="absolute top-0 left-0 right-0 text-[10px] font-black tracking-[0.14em] py-[2px]"
                style={{
                  background: `linear-gradient(90deg, ${tone.border}cc, ${tone.border}55)`,
                  color: "#0a0a0a",
                }}
              >
                {p.fire ? `⚡ ${tone.label} ${countdown}` : tone.label}
              </div>

              {recommendedBR && (
                <div className="absolute -right-8 top-3 rotate-45 bg-emerald-500 text-black text-[9px] font-black tracking-wider px-8 py-0.5 shadow-md">
                  RECOMENDADO
                </div>
              )}

              <div className="mt-4 flex items-baseline gap-1 justify-center">
                <span className="text-xl md:text-2xl font-black text-white leading-none">{p.qty}</span>
                {p.fire && <span className="text-sm leading-none">🔥</span>}
              </div>
              {unit && (
                <span className="text-[10px] uppercase tracking-[0.14em] text-zinc-400 leading-none">
                  {unit}
                </span>
              )}

              {/* Selo de origem — transparência real p/ o cliente */}
              {origin === "br" && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                  title="Perfis brasileiros reais com reposição garantida"
                >
                  🇧🇷 Brasileiro Real · c/ reposição
                </span>
              )}
              {origin === "global" && (
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-500/50 bg-sky-500/10 text-sky-300"
                  title="Perfis mundiais — padrão do mercado, melhor custo-benefício"
                >
                  🌎 Global · alto volume
                </span>
              )}

              {p.anchor > 0 && (
                <span className="text-[11px] text-zinc-500 line-through leading-none">
                  de {fmtBRL(p.anchor)}
                </span>
              )}
              <div
                className="text-xl md:text-2xl font-extrabold leading-none"
                style={{ color: tone.chip, textShadow: `0 0 10px ${tone.glow}` }}
              >
                {p.price}
              </div>


              

              <button
                type="button"
                disabled={disabled}
                onClick={() => onBuy(p.id)}
                className="mt-2 w-full rounded-md py-2 text-[12px] font-black uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: disabled
                    ? "#222"
                    : "linear-gradient(180deg, #16a34a 0%, #14532d 100%)",
                  color: disabled ? "#888" : "#fff",
                  boxShadow: disabled
                    ? "none"
                    : "0 0 12px #16a34acc, 0 2px 3px rgba(0,0,0,0.45)",
                  textShadow: "0 1px 1px rgba(0,0,0,0.45)",
                }}
              >
                {disabled ? (disabledLabel ?? "Indisponível") : "Comprar Agora"}
              </button>
              {/* accent é usado apenas como hint global; descartado em favor do tone */}
              <span className="hidden" data-accent={accent} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
