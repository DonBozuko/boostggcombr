type RouteKey = "/" | "/tiktok" | "/youtube" | "/facebook" | "/telegram" | "/trafego" | "/kwai";

const NETWORK_BENEFIT: Record<RouteKey, string> = {
  "/": "Seguidores Brasileiros e Curtidas",
  "/tiktok": "Seguidores Brasileiros e Curtidas",
  "/youtube": "Inscritos e Watch Time",
  "/facebook": "Seguidores e Curtidas",
  "/telegram": "Membros e Visualizações",
  "/trafego": "Visitas Geo-segmentadas",
  "/kwai": "Seguidores e Views Kwai",
};

// v329 — só Instagram e TikTok têm linha 🇧🇷 Brasileiro Real com reposição no
// catálogo. Prometer "perfis brasileiros" e "reposição" nas outras rotas é
// promessa que o fornecedor não cumpre → estorno e má fama. Selo segue o real.
const HAS_BR_LINE: Record<RouteKey, boolean> = {
  "/": true,
  "/tiktok": true,
  "/youtube": false,
  "/facebook": false,
  "/telegram": false,
  "/trafego": false,
  "/kwai": false,
};

export function BenefitsGrid({
  route = "/",
  accent = "#FFD700",
}: {
  route?: RouteKey;
  accent?: string;
}) {
  const temBR = HAS_BR_LINE[route] ?? false;
  const items = [
    temBR ? "Perfis Brasileiros" : "Entrega Gradual",
    "Entrega Automática",
    "Pagamento via Pix",
    "Sem solicitar senha",
    temBR ? "Reposição nos pacotes BR" : "Suporte no WhatsApp",
    NETWORK_BENEFIT[route] ?? "Crescimento Real",
  ];

  return (
    <section className="mx-2 mt-1 mb-1" aria-label="Benefícios BoostGG">
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
