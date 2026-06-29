import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "@tanstack/react-router";
import bladeAsset from "@/assets/jarvis-blade.png.asset.json";

/**
 * BladePillar — Vertical plasma blade fixed at the center of the viewport.
 * Rendered via portal to document.body so it lives on its own root stacking
 * context (z-0) BEHIND the MobileFrame (z-10). It must never cover the
 * selling square or the plan buttons.
 */
const HOTSPOTS: Array<{ to: "/" | "/tiktok" | "/youtube" | "/facebook" | "/trafego"; label: string; top: string }> = [
  { to: "/",         label: "Instagram",   top: "22%" },
  { to: "/tiktok",   label: "TikTok",      top: "36%" },
  { to: "/youtube",  label: "YouTube",     top: "50%" },
  { to: "/facebook", label: "Facebook",    top: "64%" },
  { to: "/trafego",  label: "Tráfego Web", top: "78%" },
];

export function BladePillar() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      aria-hidden={false}
      className="fixed left-1/2 top-0 -translate-x-1/2 h-screen pointer-events-none"
      style={{ zIndex: 0, width: "min(34vh, 220px)" }}
    >
      <div className="relative h-full w-full">
        <img
          src={bladeAsset.url}
          alt="Espada de plasma omnichannel J.A.R.V.I.S."
          draggable={false}
          className="h-full w-full object-contain select-none opacity-70"
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
    </div>,
    document.body,
  );
}
