import { useState } from "react";
import fabiano from "@/assets/fabiano.png.asset.json";

export function FabianoBadge() {
  const [open, setOpen] = useState(false);
  return (
    <div className="fixed bottom-5 left-5 z-50 flex items-end gap-3">
      <button
        type="button"
        aria-label="Fabiano Santiago — Suporte"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        className="relative h-14 w-14 rounded-full overflow-hidden border-2 border-emerald-400/80 shadow-[0_0_24px_rgba(16,185,129,0.55)] ring-2 ring-emerald-400/20 hover:scale-105 transition-transform"
      >
        <img src={fabiano.url} alt="Fabiano Santiago" className="h-full w-full object-cover" />
        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-400 border-2 border-black animate-pulse" />
      </button>
      <div
        className={`max-w-[240px] rounded-xl px-3 py-2 text-xs leading-snug backdrop-blur-xl bg-white/10 border border-white/20 shadow-2xl transition-all duration-200 ${
          open ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-2 pointer-events-none"
        }`}
        role="tooltip"
      >
        <div className="font-semibold text-emerald-400 drop-shadow-[0_0_6px_rgba(16,185,129,0.7)]">
          Fabiano Santiago
        </div>
        <div className="text-white/90">
          Diretor de Crescimento Online
          <br />
          <span className="text-emerald-300">(Suporte Ativo via WhatsApp)</span>
        </div>
      </div>
    </div>
  );
}
