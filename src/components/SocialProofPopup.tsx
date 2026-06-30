import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";

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
  { name: "Nickolas", avatar: "https://randomuser.me/api/portraits/men/36.jpg" },
  { name: "Gabriel", avatar: "https://randomuser.me/api/portraits/men/19.jpg" },
];

const CITIES = ["Curitiba-PR", "São Paulo-SP", "Rio de Janeiro-RJ", "Belo Horizonte-MG", "Salvador-BA", "Fortaleza-CE", "Porto Alegre-RS", "Recife-PE", "Brasília-DF", "Manaus-AM", "Goiânia-GO", "Florianópolis-SC", "Campinas-SP", "Niterói-RJ", "Vitória-ES"];

const QUANTITIES = [100, 250, 500, 1000, 2500, 5000, 10000];

const PRODUCT_BY_ROUTE: Record<string, string[]> = {
  "/": ["curtidas Instagram", "seguidores Instagram", "views Reels"],
  "/tiktok": ["seguidores TikTok", "curtidas TikTok", "views TikTok"],
  "/youtube": ["inscritos YouTube", "views YouTube"],
  "/facebook": ["seguidores Facebook", "curtidas Facebook"],
  "/telegram": ["membros Telegram", "membros canal VIP"],
  "/trafego": ["visitas no site", "cliques Google"],
};

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function fmt(n: number) { return n >= 1000 ? `${(n / 1000).toLocaleString("pt-BR")}.${String(n % 1000).padStart(3, "0")}`.replace(/\.000$/, ".000") : String(n); }

type Item = { person: typeof PEOPLE[number]; city: string; product: string; qty: number };

export function SocialProofPopup({ route = "/" }: { route?: string }) {
  const [item, setItem] = useState<Item | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const products = PRODUCT_BY_ROUTE[route] ?? PRODUCT_BY_ROUTE["/"];
    let showTimer: ReturnType<typeof setTimeout>;
    let hideTimer: ReturnType<typeof setTimeout>;

    const cycle = () => {
      setItem({ person: pick(PEOPLE), city: pick(CITIES), product: pick(products), qty: pick(QUANTITIES) });
      setVisible(true);
      hideTimer = setTimeout(() => setVisible(false), 3000);
      const nextDelay = 6000 + Math.floor(Math.random() * 2000); // 6-8s
      showTimer = setTimeout(cycle, nextDelay);
    };

    showTimer = setTimeout(cycle, 2500);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }, [route]);

  if (!item) return null;
  return (
    <div
      className="relative z-50 inline-flex shrink-0 pointer-events-none -translate-y-1 sm:-translate-y-2"
      role="status"
      aria-live="polite"
    >
      <div
        className="rounded-2xl border border-white/15 bg-black/85 backdrop-blur-md px-2.5 py-2 shadow-2xl flex items-center gap-2 min-w-[190px] max-w-[220px] sm:min-w-[230px] sm:max-w-[270px]"
        style={{
          boxShadow: "0 8px 30px rgba(0,0,0,0.7), 0 0 14px rgba(255,255,255,0.06)",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(8px)",
          transition: "opacity 450ms ease, transform 450ms ease",
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
          <span className="absolute -bottom-0.5 -left-0.5 bg-red-600 rounded-full h-4 w-4 ring-2 ring-black flex items-center justify-center">
            <ShoppingCart className="h-2.5 w-2.5 text-white" strokeWidth={3} />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-extrabold text-white leading-tight uppercase tracking-wide truncate">
            {item.person.name}
          </p>
          <p className="text-[10px] text-white/70 leading-tight truncate">{item.city}</p>
          <p className="text-[11px] font-semibold text-white leading-tight">
            <span className="text-red-500 font-extrabold">{fmt(item.qty)}</span> {item.product}
          </p>
        </div>
        <span className="bg-green-500 rounded-full h-2.5 w-2.5 animate-pulse shrink-0 ring-2 ring-black" />
      </div>
    </div>
  );
}
