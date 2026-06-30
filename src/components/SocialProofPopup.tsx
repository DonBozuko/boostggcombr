import { useEffect, useState } from "react";

const NAMES = ["Rafael", "Juliana", "Carlos", "Bruna", "Marcos", "Fernanda", "Lucas", "Patrícia", "Thiago", "Aline", "Diego", "Camila", "André", "Larissa", "Vinícius", "Beatriz", "Gustavo", "Mariana", "Felipe", "Renata"];
const CITIES = ["Curitiba-PR", "São Paulo-SP", "Rio de Janeiro-RJ", "Belo Horizonte-MG", "Salvador-BA", "Fortaleza-CE", "Porto Alegre-RS", "Recife-PE", "Brasília-DF", "Manaus-AM", "Goiânia-GO", "Florianópolis-SC", "Campinas-SP", "Niterói-RJ", "Vitória-ES"];

const ACTIONS_BY_ROUTE: Record<string, string[]> = {
  "/": ["500 curtidas no Instagram", "1.000 seguidores no Instagram", "5.000 visualizações no Instagram", "2.000 seguidores no Instagram", "10.000 curtidas no Instagram"],
  "/tiktok": ["1.000 seguidores no TikTok", "10.000 curtidas no TikTok", "50.000 views no TikTok", "5.000 seguidores no TikTok"],
  "/youtube": ["500 inscritos no YouTube", "10.000 views no YouTube", "1.000 inscritos no YouTube", "50.000 views no YouTube"],
  "/facebook": ["1.000 seguidores no Facebook", "2.000 curtidas no Facebook", "5.000 seguidores no Facebook"],
  "/telegram": ["1.000 membros no Telegram", "5.000 membros no canal", "10.000 membros no grupo VIP"],
  "/trafego": ["10.000 visitas no site", "5.000 cliques Google", "20.000 visitas orgânicas"],
};

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

export function SocialProofPopup({ route = "/" }: { route?: string }) {
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const actions = ACTIONS_BY_ROUTE[route] ?? ACTIONS_BY_ROUTE["/"];
    let showTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;

    const cycle = () => {
      const ago = 1 + Math.floor(Math.random() * 8);
      setMsg(`🔥 ${pick(NAMES)} de ${pick(CITIES)} acabou de comprar ${pick(actions)} há ${ago} min`);
      hideTimer = setTimeout(() => setMsg(null), 4000);
      const next = 12000 + Math.floor(Math.random() * 6000);
      showTimer = setTimeout(cycle, next);
    };

    showTimer = setTimeout(cycle, 4000);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, [route]);

  if (!msg) return null;
  return (
    <div
      className="fixed bottom-4 left-3 z-40 max-w-[300px] rounded-xl border border-white/15 bg-black/85 backdrop-blur-md px-3 py-2 shadow-2xl animate-slide-up pointer-events-none"
      role="status"
      aria-live="polite"
      style={{ boxShadow: "0 8px 30px rgba(0,0,0,0.6), 0 0 12px rgba(255,255,255,0.05)" }}
    >
      <p className="text-[11px] md:text-xs font-medium text-white/90 leading-snug break-words">{msg}</p>
    </div>
  );
}
