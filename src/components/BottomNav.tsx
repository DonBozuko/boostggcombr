import { Link } from "@tanstack/react-router";
import { LivePurchasesTicker } from "./LivePurchasesTicker";

type Route = "/" | "/tiktok" | "/youtube" | "/facebook" | "/telegram" | "/trafego";

/* Brand SVG marks (simple-icons paths, 24x24 viewBox) */
const IconIG = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <defs>
      <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#FFD700" />
        <stop offset="50%" stopColor="#FF1F8F" />
        <stop offset="100%" stopColor="#7B2CBF" />
      </linearGradient>
    </defs>
    <path fill="url(#ig-grad)" d="M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.22.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.05.41 2.22.06 1.26.07 1.64.07 4.83s0 3.57-.07 4.83c-.05 1.17-.25 1.8-.41 2.22a3.7 3.7 0 0 1-.9 1.38c-.42.42-.82.68-1.38.9-.42.16-1.05.36-2.22.41-1.26.06-1.64.07-4.85.07s-3.59 0-4.85-.07c-1.17-.05-1.8-.25-2.22-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.05-.41-2.22C2.2 15.57 2.2 15.19 2.2 12s0-3.57.07-4.83c.05-1.17.25-1.8.41-2.22.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.05-.36 2.22-.41C8.41 2.2 8.79 2.2 12 2.2Zm0 1.95c-3.14 0-3.51 0-4.75.06-1.07.05-1.65.23-2.04.38-.51.2-.88.44-1.27.83-.39.39-.63.76-.83 1.27-.15.39-.33.97-.38 2.04C2.67 9.97 2.66 10.34 2.66 12s0 2.03.06 3.27c.05 1.07.23 1.65.38 2.04.2.51.44.88.83 1.27.39.39.76.63 1.27.83.39.15.97.33 2.04.38 1.24.06 1.61.06 4.75.06s3.51 0 4.75-.06c1.07-.05 1.65-.23 2.04-.38.51-.2.88-.44 1.27-.83.39-.39.63-.76.83-1.27.15-.39.33-.97.38-2.04.06-1.24.06-1.61.06-3.27s0-2.03-.06-3.27c-.05-1.07-.23-1.65-.38-2.04a3.4 3.4 0 0 0-.83-1.27 3.4 3.4 0 0 0-1.27-.83c-.39-.15-.97-.33-2.04-.38C15.51 4.16 15.14 4.15 12 4.15Zm0 3.32a4.53 4.53 0 1 1 0 9.06 4.53 4.53 0 0 1 0-9.06Zm0 1.95a2.58 2.58 0 1 0 0 5.16 2.58 2.58 0 0 0 0-5.16Zm4.75-2.18a1.06 1.06 0 1 1 0 2.12 1.06 1.06 0 0 1 0-2.12Z" />
  </svg>
);

const IconTT = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path fill="#00f2fe" d="M19.6 6.3a5 5 0 0 1-3-1V15a6 6 0 1 1-6-6v2.6a3.4 3.4 0 1 0 2.4 3.3V2h2.6a5 5 0 0 0 4 4Z" transform="translate(-1 0)" />
    <path fill="#fe0979" d="M20.6 7.3a5 5 0 0 1-3-1V16a6 6 0 1 1-6-6v2.6a3.4 3.4 0 1 0 2.4 3.3V3h2.6a5 5 0 0 0 4 4Z" transform="translate(1 0)" opacity="0.85" style={{ mixBlendMode: "screen" }} />
    <path fill="#fff" d="M20 6.8a5 5 0 0 1-3-1V15.5a6 6 0 1 1-6-6v2.6a3.4 3.4 0 1 0 2.4 3.3V2.5H16a5 5 0 0 0 4 4Z" />
  </svg>
);

const IconYT = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path fill="#FF0000" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8Z" />
    <path fill="#fff" d="m9.6 15.6 6.3-3.6-6.3-3.6z" />
  </svg>
);

const IconFB = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path fill="#1877F2" d="M24 12a12 12 0 1 0-13.9 11.9V15.5H7.1V12h3V9.4c0-3 1.8-4.6 4.5-4.6 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.3l-.5 3.5h-2.8v8.4A12 12 0 0 0 24 12Z" />
  </svg>
);

const IconTG = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <defs>
      <linearGradient id="tg-grad" x1="50%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stopColor="#37BBFE" />
        <stop offset="100%" stopColor="#007DBB" />
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="12" fill="url(#tg-grad)" />
    <path fill="#fff" d="m5.5 11.7 12-4.6c.6-.2 1.1.1.9.9l-2 9.6c-.1.6-.5.8-1 .5l-2.9-2.1-1.4 1.3c-.2.2-.3.3-.6.3l.2-3 5.5-5c.2-.2 0-.3-.3-.1l-6.8 4.3-2.9-.9c-.6-.2-.6-.6.3-1Z" />
  </svg>
);

const IconWeb = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="none" stroke="#A855F7" strokeWidth="1.8" />
    <ellipse cx="12" cy="12" rx="4" ry="10" fill="none" stroke="#A855F7" strokeWidth="1.8" />
    <path d="M2 12h20M4 6h16M4 18h16" stroke="#A855F7" strokeWidth="1.8" fill="none" />
  </svg>
);

const items: { to: Route; Icon: React.FC; label: string; full: string; color: string }[] = [
  { to: "/", Icon: IconIG, label: "IG", full: "Instagram", color: "#FF1F8F" },
  { to: "/tiktok", Icon: IconTT, label: "TT", full: "TikTok", color: "#00f2fe" },
  { to: "/youtube", Icon: IconYT, label: "YT", full: "YouTube", color: "#FF0000" },
  { to: "/facebook", Icon: IconFB, label: "FB", full: "Facebook", color: "#1877F2" },
  { to: "/telegram", Icon: IconTG, label: "TG", full: "Telegram", color: "#37BBFE" },
  { to: "/trafego", Icon: IconWeb, label: "WEB", full: "Tráfego Web", color: "#A855F7" },
];

export function BottomNav({ active, accent }: { active: Route; accent?: string }) {
  const activeColor = accent ?? items.find((i) => i.to === active)?.color ?? "#ffffff";
  return (
    <div
      className="fixed bottom-0 left-0 right-0 w-full z-50 backdrop-blur-xl bg-black/80 border-t border-white/10"
    >
      <nav className="w-full" aria-label="Navegação principal entre redes">
        <ul className="grid grid-cols-6 h-16 w-full max-w-7xl mx-auto px-2">
          {items.map(({ to, Icon, label, full, color }) => {
            const isActive = active === to;
            return (
              <li key={to} className="flex">
                <Link
                  to={to}
                  className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-black rounded-md"
                  style={{
                    color: isActive ? color : "#9ca3af",
                    ['--tw-ring-color' as string]: color,
                  }}
                  aria-label={`Ir para ${full}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span
                    style={{
                      filter: isActive
                        ? `drop-shadow(0 0 6px ${color}) drop-shadow(0 0 12px ${color})`
                        : "grayscale(0.4) opacity(0.75)",
                      transition: "filter 200ms ease",
                    }}
                  >
                    <Icon />
                  </span>
                  <span className="text-[9px] font-bold tracking-wider">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="w-full max-w-7xl mx-auto">
        <LivePurchasesTicker accent={activeColor} />
      </div>
    </div>
  );
}
