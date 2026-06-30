import { useEffect, useState } from "react";

const PEOPLE: { name: string; avatar: string }[] = [
  { name: "Rodrigo", avatar: "https://randomuser.me/api/portraits/men/32.jpg" },
  { name: "Juliana", avatar: "https://randomuser.me/api/portraits/women/44.jpg" },
  { name: "Carlos", avatar: "https://randomuser.me/api/portraits/men/45.jpg" },
  { name: "Bruna", avatar: "https://randomuser.me/api/portraits/women/68.jpg" },
  { name: "Marcos", avatar: "https://randomuser.me/api/portraits/men/12.jpg" },
  { name: "Fernanda", avatar: "https://randomuser.me/api/portraits/women/22.jpg" },
  { name: "Lucas", avatar: "https://randomuser.me/api/portraits/men/76.jpg" },
  { name: "Patrícia", avatar: "https://randomuser.me/api/portraits/women/8.jpg" },
  { name: "Thiago", avatar: "https://randomuser.me/api/portraits/men/54.jpg" },
  { name: "Aline", avatar: "https://randomuser.me/api/portraits/women/31.jpg" },
  { name: "Diego", avatar: "https://randomuser.me/api/portraits/men/91.jpg" },
  { name: "Camila", avatar: "https://randomuser.me/api/portraits/women/57.jpg" },
  { name: "André", avatar: "https://randomuser.me/api/portraits/men/23.jpg" },
  { name: "Larissa", avatar: "https://randomuser.me/api/portraits/women/12.jpg" },
  { name: "Vinícius", avatar: "https://randomuser.me/api/portraits/men/64.jpg" },
  { name: "Beatriz", avatar: "https://randomuser.me/api/portraits/women/85.jpg" },
  { name: "Gustavo", avatar: "https://randomuser.me/api/portraits/men/41.jpg" },
  { name: "Mariana", avatar: "https://randomuser.me/api/portraits/women/72.jpg" },
  { name: "Felipe", avatar: "https://randomuser.me/api/portraits/men/15.jpg" },
  { name: "Renata", avatar: "https://randomuser.me/api/portraits/women/49.jpg" },
  { name: "Pedro", avatar: "https://randomuser.me/api/portraits/men/82.jpg" },
  { name: "Isabela", avatar: "https://randomuser.me/api/portraits/women/33.jpg" },
  { name: "Rafael", avatar: "https://randomuser.me/api/portraits/men/7.jpg" },
  { name: "Carolina", avatar: "https://randomuser.me/api/portraits/women/90.jpg" },
];

const CITIES = ["Curitiba-PR", "São Paulo-SP", "Rio de Janeiro-RJ", "Belo Horizonte-MG", "Salvador-BA", "Fortaleza-CE", "Porto Alegre-RS", "Recife-PE", "Brasília-DF", "Manaus-AM", "Goiânia-GO", "Florianópolis-SC", "Campinas-SP", "Niterói-RJ", "Vitória-ES"];

const ACTIONS_BY_ROUTE: Record<string, string[]> = {
  "/": ["500 curtidas no Instagram", "1.000 seguidores no Instagram", "5.000 visualizações para Reels", "2.000 seguidores no Instagram", "10.000 curtidas no Instagram"],
  "/tiktok": ["1.000 seguidores no TikTok", "10.000 curtidas no TikTok", "50.000 views no TikTok", "5.000 seguidores no TikTok"],
  "/youtube": ["500 inscritos no YouTube", "10.000 views no YouTube", "1.000 inscritos no YouTube", "50.000 views no YouTube"],
  "/facebook": ["1.000 seguidores no Facebook", "2.000 curtidas no Facebook", "5.000 seguidores no Facebook"],
  "/telegram": ["1.000 membros no Telegram", "5.000 membros no canal", "10.000 membros no grupo VIP"],
  "/trafego": ["10.000 visitas no site", "5.000 cliques Google", "20.000 visitas orgânicas"],
};

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

type Item = { person: typeof PEOPLE[number]; city: string; action: string; ago: string };

export function SocialProofPopup({ route = "/" }: { route?: string }) {
  const [item, setItem] = useState<Item | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const actions = ACTIONS_BY_ROUTE[route] ?? ACTIONS_BY_ROUTE["/"];
    let showTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;

    const cycle = () => {
      const seconds = Math.random() < 0.4;
      const ago = seconds ? `há ${15 + Math.floor(Math.random() * 45)}s` : `há ${1 + Math.floor(Math.random() * 14)} min`;
      setItem({ person: pick(PEOPLE), city: pick(CITIES), action: pick(actions), ago });
      setVisible(true);
      hideTimer = setTimeout(() => setVisible(false), 5000);
      showTimer = setTimeout(cycle, 14000);
    };

    showTimer = setTimeout(cycle, 4000);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, [route]);

  if (!item) return null;
  return (
    <div
      className="fixed bottom-4 left-3 z-40 max-w-[300px] rounded-2xl border border-white/15 bg-black/80 backdrop-blur-md px-3 py-2 shadow-2xl pointer-events-none flex items-center gap-2.5"
      role="status"
      aria-live="polite"
      style={{
        boxShadow: "0 8px 30px rgba(0,0,0,0.6), 0 0 12px rgba(255,255,255,0.05)",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 600ms ease, transform 600ms ease",
      }}
    >
      <div className="relative shrink-0">
        <img
          src={item.person.avatar}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-10 w-10 rounded-full object-cover border border-white/20"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = "hidden"; }}
        />
        <span className="absolute -bottom-0.5 -right-0.5 bg-green-500 rounded-full h-2.5 w-2.5 ring-2 ring-black animate-pulse" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[10px] text-white/70 font-medium">
          <span className="bg-green-500 rounded-full h-2 w-2 animate-pulse" />
          <span>{item.ago}</span>
        </div>
        <p className="text-[11px] md:text-xs font-semibold text-white leading-snug break-words">
          🔥 {item.person.name} de {item.city} comprou {item.action}
        </p>
      </div>
    </div>
  );
}
