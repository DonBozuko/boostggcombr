import { ShieldCheck, Zap, TrendingUp, Sparkles, Headphones } from "lucide-react";

const ITEMS = [
  { Icon: ShieldCheck, label: "SEGURANÇA TOTAL" },
  { Icon: Zap, label: "ENTREGA AUTOMÁTICA" },
  { Icon: TrendingUp, label: "CRESCIMENTO CONSISTENTE" },
  { Icon: Sparkles, label: "QUALIDADE PREMIUM" },
  { Icon: Headphones, label: "SUPORTE ESPECIALIZADO" },
];

export function TrustBadges({ accent = "#FFD700" }: { accent?: string }) {
  return (
    <section className="mx-auto w-full max-w-7xl px-2 mt-1 mb-1" aria-label="Por que escolher a BoostGG">

      <p
        className="text-center text-[8px] font-black tracking-[0.3em] mb-1"
        style={{ color: accent, textShadow: `0 0 6px ${accent}` }}
      >
        POR QUE ESCOLHER A ELITEBOOST?
      </p>
      <div className="grid grid-cols-5 gap-1">
        {ITEMS.map(({ Icon, label }) => (
          <div
            key={label}
            className="flex flex-col items-center gap-0.5 rounded-md px-1 py-1.5 border backdrop-blur-md"
            style={{
              borderColor: `${accent}33`,
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <Icon
              size={14}
              style={{ color: accent, filter: `drop-shadow(0 0 4px ${accent})` }}
            />
            <span className="text-[7px] font-bold text-white/85 leading-tight text-center">
              {label}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
