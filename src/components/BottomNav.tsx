import { Link } from "@tanstack/react-router";
import { Instagram, Music2, Youtube, Facebook, Send, Globe2 } from "lucide-react";

type Route = "/" | "/tiktok" | "/youtube" | "/facebook" | "/telegram" | "/trafego";

const items: { to: Route; icon: typeof Instagram; label: string; color: string }[] = [
  { to: "/", icon: Instagram, label: "IG", color: "#FFD700" },
  { to: "/tiktok", icon: Music2, label: "TT", color: "#00f2fe" },
  { to: "/youtube", icon: Youtube, label: "YT", color: "#FF0000" },
  { to: "/facebook", icon: Facebook, label: "FB", color: "#1877F2" },
  { to: "/telegram", icon: Send, label: "TG", color: "#00B5E2" },
  { to: "/trafego", icon: Globe2, label: "WEB", color: "#A855F7" },
];

export function BottomNav({ active }: { active: Route }) {
  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[450px] z-50 backdrop-blur-xl bg-black/80 border-t border-white/10"
      aria-label="App navigation"
    >
      <ul className="grid grid-cols-6 h-16">
        {items.map(({ to, icon: Icon, label, color }) => {
          const isActive = active === to;
          return (
            <li key={to} className="flex">
              <Link
                to={to}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-transform hover:scale-110"
                style={{ color: isActive ? color : "#9ca3af" }}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  size={20}
                  style={{
                    filter: isActive ? `drop-shadow(0 0 6px ${color})` : undefined,
                  }}
                />
                <span className="text-[9px] font-bold tracking-wider">{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
