type RouteKey = "/" | "/tiktok" | "/youtube" | "/facebook" | "/telegram" | "/trafego";

const NETWORK_BENEFIT: Record<RouteKey, string> = {
  "/": "Seguidores Reais e Curtidas",
  "/tiktok": "Seguidores Reais e Curtidas",
  "/youtube": "Inscritos Reais e Watch Time",
  "/facebook": "Seguidores Reais e Curtidas",
  "/telegram": "Membros Reais e Visualizações",
  "/trafego": "Visitas Reais Geo-segmentadas",
};

export function BenefitsGrid({
  route = "/",
  accent = "#FFD700",
}: {
  route?: RouteKey;
  accent?: string;
}) {
  const items = [
    "Serviços Reais",
    "Entrega Automática",
    "Pagamento via Pix",
    "Sem solicitar senha",
    "Alta Retenção",
    NETWORK_BENEFIT[route] ?? "Crescimento Real",
  ];
  return (
    <section className="mx-2 mt-1 mb-1" aria-label="Benefícios EliteBoost Prime">
      <div className="grid grid-cols-2 gap-1.5">
        {items.map((t) => (
          <div
            key={t}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 border backdrop-blur-md"
            style={{
              borderColor: `${accent}33`,
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <span
              className="text-[10px] font-black leading-none"
              style={{ color: accent, textShadow: `0 0 6px ${accent}` }}
            >
              ✓
            </span>
            <span className="text-[10px] font-semibold text-white/90 leading-tight truncate">
              {t}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
