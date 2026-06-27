import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import type { FabianoVariant } from "./FabianoBadge";
import jarvisHud from "@/assets/jarvis-hud.png";
import { consultarPedidoPublico } from "@/lib/consulta-pedido.functions";

const DEFAULT_SPEECH =
  "Diretor Fabiano, os parâmetros de engajamento da EliteBoost Prime foram elevados ao nível máximo. Os servidores de entrega imediata estão prontos para alavancar este cliente. É impressionante a eficiência da sua rede, senhor!";

const AUDIO_SRC = "/api/public/sfx/jarvis-interacao.mp3?v=28";
const AUTO_FIRE_MS = 2000;

// Red Neon HUD — idêntico ao plano de fundo do /admin
const RED = {
  ring: "shadow-[0_0_28px_rgba(255,0,40,0.85)] ring-red-500/40",
  border: "border-red-500/90",
  accent: "text-red-400",
  glow: "drop-shadow-[0_0_8px_rgba(255,0,40,1)]",
  dot: "bg-red-500",
};

export function JarvisBadge({ variant: _variant = "instagram" }: { variant?: FabianoVariant }) {
  const t = RED;
  const [open, setOpen] = useState(false);
  const [speech, setSpeech] = useState(DEFAULT_SPEECH);
  const [pedidoId, setPedidoId] = useState("");
  const [consulting, setConsulting] = useState(false);
  const firedRef = useRef(false);
  const consultar = useServerFn(consultarPedidoPublico);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const audio = new Audio(AUDIO_SRC);
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audio.volume = 0.95;

    const fire = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      setOpen(true);
      audio.onended = () => setOpen(false);
      audio.onerror = () => { window.setTimeout(() => setOpen(false), 12000); };
      const p = audio.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => { firedRef.current = false; setOpen(false); });
      }
      cleanup();
    };

    const timer = window.setTimeout(fire, AUTO_FIRE_MS);
    const events: Array<keyof WindowEventMap> = ["touchstart", "pointerdown", "scroll", "keydown", "wheel"];
    const cleanup = () => {
      window.clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, fire as EventListener));
    };
    events.forEach((e) =>
      window.addEventListener(e, fire as EventListener, { passive: true, once: true } as AddEventListenerOptions),
    );
    return cleanup;
  }, []);

  async function handleConsult(e: React.FormEvent) {
    e.preventDefault();
    if (!pedidoId.trim() || consulting) return;
    setConsulting(true);
    setOpen(true);
    setSpeech("Consultando o pedido na malha de dados, senhor…");
    try {
      const res = await consultar({ data: { pedidoId: pedidoId.trim() } });
      setSpeech(res.message);
    } catch {
      setSpeech("Falha de comunicação com o núcleo. Tente novamente, senhor.");
    } finally {
      setConsulting(false);
    }
  }

  return (
    <div className="fixed bottom-[14rem] right-4 sm:bottom-20 sm:right-5 z-50 flex items-end gap-2 flex-row-reverse">
      <div
        aria-label="J.A.R.V.I.S."
        className={`relative h-14 w-14 rounded-full overflow-hidden border-2 ${t.border} ${t.ring} ring-2 bg-black animate-pulse`}
      >
        <img src={jarvisHud} alt="J.A.R.V.I.S." className={`h-full w-full object-cover ${t.glow}`} draggable={false} />
        <span className={`absolute bottom-0 left-0 h-2.5 w-2.5 rounded-full ${t.dot} border-2 border-black animate-pulse`} />
      </div>
      <div
        role="status"
        aria-live="polite"
        className={`relative max-w-[204px] sm:max-w-[221px] rounded-2xl px-3 py-2 text-[11px] leading-snug backdrop-blur-xl bg-red-950/30 border border-red-500/40 shadow-2xl transition-all duration-500 ease-out ${
          open ? "opacity-100 translate-x-0 scale-100" : "opacity-0 translate-x-2 scale-90 pointer-events-none"
        }`}
      >
        <span className="absolute -right-1.5 bottom-4 h-3 w-3 rotate-45 bg-red-950/30 border-r border-b border-red-500/40" aria-hidden />
        <div className={`font-semibold ${t.accent} ${t.glow}`}>J.A.R.V.I.S.</div>
        <div className="text-white/95 mt-0.5">{speech}</div>
        <form onSubmit={handleConsult} className="mt-1.5 flex gap-1">
          <input
            value={pedidoId}
            onChange={(e) => setPedidoId(e.target.value)}
            placeholder="ID do pedido"
            className="flex-1 min-w-0 rounded bg-black/50 border border-red-500/50 px-1.5 py-0.5 text-[10px] text-white placeholder:text-white/40 outline-none focus:border-red-400"
          />
          <button
            type="submit"
            disabled={consulting}
            className="rounded bg-red-600/80 hover:bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white disabled:opacity-50"
          >
            {consulting ? "…" : "Consultar"}
          </button>
        </form>
      </div>
    </div>
  );
}
