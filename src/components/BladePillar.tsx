import { Link } from "@tanstack/react-router";
import bladeAsset from "@/assets/jarvis-blade.png.asset.json";

/**
 * BladePillar — Vertical plasma blade fixed at the center of the viewport.
 * 5 clickable hotspots mapped over the engraved network icons act as the
 * official omnichannel selectors.
 *
 * Hotspots are positioned as % of the image height, sequentially along the
 * blade from top to bottom: Instagram → TikTok → YouTube → Facebook → Tráfego.
 */
const HOTSPOTS: Array<{ to: "/" | "/tiktok" | "/youtube" | "/facebook" | "/trafego"; label: string; top: string }> = [
  { to: "/",         label: "Instagram",   top: "22%" },
  { to: "/tiktok",   label: "TikTok",      top: "36%" },
  { to: "/youtube",  label: "YouTube",     top: "50%" },
  { to: "/facebook", label: "Facebook",    top: "64%" },
  { to: "/trafego",  label: "Tráfego Web", top: "78%" },
];

export function BladePillar() {
  return (
    <div
      className="fixed inset-y-0 left-1/2 -translate-x-1/2 z-0 pointer-events-none"
      aria-hidden={false}
    >
      <div className="relative h-full" style={{ width: "min(38vh, 260px)" }}>
        <img
          src={bladeAsset.url}
          alt="Espada de plasma omnichannel J.A.R.V.I.S."
          draggable={false}
          className="h-full w-full object-contain select-none"
          style={{ filter: "drop-shadow(0 0 24px rgba(255,80,0,0.55))" }}
        />
        {HOTSPOTS.map(({ to, label, top }) => (
          <Link
            key={to}
            to={to}
            aria-label={`Ir para ${label}`}
            className="pointer-events-auto absolute left-1/2 -translate-x-1/2 h-[9%] w-[42%] rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 hover:scale-110 transition-transform"
            style={{ top }}
          />
        ))}
      </div>
    </div>
  );
}
