import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X } from "lucide-react";
import type { FabianoVariant } from "./FabianoBadge";
import armorAsset from "@/assets/jarvis-armor.png.asset.json";
import { consultarPedidoPublico } from "@/lib/consulta-pedido.functions";
import { registerJarvisAudio, stopAllJarvis } from "@/hooks/useJarvis";

const SPEECH_BY_VARIANT: Record<FabianoVariant, string> = {
  instagram: "Diretor, o algoritmo do Instagram está aquecido. Seguidores reais, curtidas e visualizações entregues em minutos para escalar este perfil ao topo da explore page.",
  tiktok:    "Senhor, o For You Page do TikTok favorece engajamento explosivo. Disparando seguidores, curtidas e views virais para detonar o algoritmo agora.",
  youtube:   "Diretor, o YouTube recompensa retenção e inscritos ativos. Subindo o canal nas recomendações com inscritos reais e views de alta qualidade.",
  facebook:  "Senhor, o Facebook ainda domina a confiança de compra. Reforçando seguidores e curtidas para blindar a autoridade da página imediatamente.",
  telegram:  "Diretor, o Telegram é o canal de conversão mais alto do mercado. Inflando membros reais para destravar prova social e vendas no grupo.",
  trafego:   "Senhor, tráfego web qualificado em rota. Visitantes reais direcionados ao funil para multiplicar conversão e ranqueamento orgânico.",
};

// Rotação dinâmica de mensagens persuasivas legítimas por rede.
const ROTATING: Record<FabianoVariant, string[]> = {
  instagram: [
    "Detectei janela ótima: perfis que sobem 1k seguidores nesta semana ganham +38% de alcance no Explore.",
    "Recomendo blindar com curtidas e views junto — o algoritmo penaliza seguidores sem engajamento proporcional.",
    "Cupom PRIME10 ativo: 10% off imediato no Pix. Aplique no checkout para garantir.",
  ],
  tiktok: [
    "O FYP do TikTok premia 3 sinais em conjunto: seguidores, curtidas e watch-time. Pacotes combinados rendem 2,4× mais.",
    "Vídeos com >5k views nas primeiras 6h têm 71% mais chance de viralizar. Acelere com views agora.",
    "Cupom PRIME10 destrava 10% off imediato. Não perca a janela.",
  ],
  youtube: [
    "Inscritos sem retenção derrubam o canal. Combine inscritos + views de qualidade para subir nas recomendações.",
    "Canais que atingem 1k inscritos destravam monetização. Está perto? Eu acelero hoje.",
    "PRIME10 reduz 10% do valor no Pix — válido só para sessão atual.",
  ],
  facebook: [
    "Páginas com mais de 1k seguidores convertem 3× mais em anúncios. Aposta de retorno previsível.",
    "Curtidas e seguidores juntos reforçam autoridade — algoritmo Meta prioriza esse par.",
    "Cupom PRIME10: -10% imediato. Use antes de finalizar.",
  ],
  telegram: [
    "Grupos com 500+ membros têm taxa de conversão de vendas 4,7× maior. Prova social pesa.",
    "Membros reais brasileiros entregues em até 24h — sem queda.",
    "PRIME10 ativo: -10% no Pix. Aplique no checkout.",
  ],
  trafego: [
    "Tráfego BR converte melhor para e-commerce; tráfego global é ideal para SEO e ranqueamento.",
    "Volumes de 5k+ visitas aceleram indexação no Google em até 60%.",
    "Cupom PRIME10 ativo — 10% off direto no Pix.",
  ],
};

const UPSELL_BY_VARIANT: Record<FabianoVariant, string> = {
  instagram: "⚡ Atenção, Diretor: seguidores sem curtidas/views ficam expostos ao algoritmo. Recomendo adicionar um pacote de curtidas no mesmo checkout — economia de R$ 12 vs comprar separado.",
  tiktok:    "⚡ Senhor, seguidores TikTok rendem 3× mais com views complementares no mesmo dia. Posso reservar agora com desconto combinado.",
  youtube:   "⚡ Inscritos sem views = canal estagnado. Recomendo combo inscritos+views para destravar recomendações.",
  facebook:  "⚡ Seguidores blindados por curtidas geram autoridade real. Adicione no mesmo Pix e economize.",
  telegram:  "⚡ Membros + reações = grupo ativo aos olhos do Telegram. Combo blinda contra purgas.",
  trafego:   "⚡ Tráfego puro converte pouco sem retargeting. Posso somar visitas globais para reforçar a base.",
};

const AUDIO_BY_VARIANT: Record<FabianoVariant, string> = {
  instagram: "/api/public/sfx/jarvis-instagram.mp3?v=34",
  tiktok:    "/api/public/sfx/jarvis-tiktok.mp3?v=34",
  youtube:   "/api/public/sfx/jarvis-youtube.mp3?v=34",
  facebook:  "/api/public/sfx/jarvis-facebook.mp3?v=34",
  telegram:  "/api/public/sfx/jarvis-telegram.mp3?v=34",
  trafego:   "/api/public/sfx/jarvis-trafego.mp3?v=34",
};
const AUTO_FIRE_MS = 2000;

// Dynamic Omnichannel Glow Filters por rede social.
// `filter` aplica matiz/saturação sobre a armadura base (vermelha+dourada).
// `arc` é a cor do reator + LEDs. `ring` controla o halo externo.
const SKINS: Record<FabianoVariant, { filter: string; arc: string; ring: string; border: string; accent: string; glow: string; bubble: string }> = {
  instagram: {
    filter: "none",
    arc: "#ffffff",
    ring: "0 0 32px rgba(255,0,40,0.85), 0 0 14px rgba(255,215,0,0.6)",
    border: "border-red-500/90",
    accent: "text-red-400",
    glow: "drop-shadow-[0_0_8px_rgba(255,0,40,1)]",
    bubble: "bg-red-950/30 border-red-500/40",
  },
  tiktok: {
    filter: "hue-rotate(280deg) saturate(1.4)",
    arc: "#00f2fe",
    ring: "0 0 32px rgba(0,242,254,0.85), 0 0 18px rgba(254,9,121,0.7)",
    border: "border-[#00f2fe]/90",
    accent: "text-[#00f2fe]",
    glow: "drop-shadow-[0_0_8px_rgba(0,242,254,1)]",
    bubble: "bg-[#1a0a2a]/40 border-[#00f2fe]/40",
  },
  youtube: {
    filter: "hue-rotate(-10deg) saturate(1.6) brightness(1.05)",
    arc: "#ffffff",
    ring: "0 0 34px rgba(255,0,0,0.95)",
    border: "border-red-600/90",
    accent: "text-red-500",
    glow: "drop-shadow-[0_0_8px_rgba(255,0,0,1)]",
    bubble: "bg-red-950/30 border-red-600/40",
  },
  facebook: {
    filter: "hue-rotate(190deg) saturate(1.3)",
    arc: "#1877F2",
    ring: "0 0 32px rgba(24,119,242,0.95)",
    border: "border-[#1877F2]/90",
    accent: "text-[#4ea0ff]",
    glow: "drop-shadow-[0_0_8px_rgba(24,119,242,1)]",
    bubble: "bg-blue-950/30 border-[#1877F2]/40",
  },
  telegram: {
    filter: "hue-rotate(210deg) saturate(1.2) brightness(0.95)",
    arc: "#22d3ee",
    ring: "0 0 32px rgba(34,211,238,0.85), 0 0 14px rgba(15,42,112,0.8)",
    border: "border-cyan-300/90",
    accent: "text-cyan-300",
    glow: "drop-shadow-[0_0_8px_rgba(34,211,238,1)]",
    bubble: "bg-[#06143a]/40 border-cyan-300/40",
  },
  trafego: {
    filter: "hue-rotate(90deg) saturate(1.5)",
    arc: "#22ff7a",
    ring: "0 0 32px rgba(34,255,122,0.9)",
    border: "border-green-400/90",
    accent: "text-green-400",
    glow: "drop-shadow-[0_0_8px_rgba(34,255,122,1)]",
    bubble: "bg-green-950/30 border-green-400/40",
  },
};

export function JarvisBadge({ variant = "instagram", inline = false }: { variant?: FabianoVariant; inline?: boolean }) {
  const t = SKINS[variant];
  const [open, setOpen] = useState(false);
  const [speech, setSpeech] = useState(SPEECH_BY_VARIANT[variant] ?? SPEECH_BY_VARIANT.instagram);
  const [pedidoId, setPedidoId] = useState("");
  const [consulting, setConsulting] = useState(false);
  const firedRef = useRef(false);
  const lockOpenRef = useRef(false);
  const errorTimerRef = useRef<number | null>(null);
  const consultar = useServerFn(consultarPedidoPublico);

  const safeClose = () => {
    if (lockOpenRef.current) return;
    setOpen(false);
  };
  const clearAutoClose = () => {
    lockOpenRef.current = true;
    if (errorTimerRef.current != null) {
      window.clearTimeout(errorTimerRef.current);
      errorTimerRef.current = null;
    }
    setOpen(true);
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    stopAllJarvis();

    const audio = new Audio(AUDIO_BY_VARIANT[variant] ?? AUDIO_BY_VARIANT.instagram);
    audio.crossOrigin = "anonymous";
    audio.preload = "auto";
    audio.volume = 0.95;
    const unregister = registerJarvisAudio(audio);

    const fire = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      setOpen(true);
      audio.onended = () => safeClose();
      audio.onerror = () => { errorTimerRef.current = window.setTimeout(safeClose, 12000); };
      const p = audio.play();
      if (p && typeof p.catch === "function") {
        p.catch(() => { firedRef.current = false; safeClose(); });
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
    return () => {
      cleanup();
      if (errorTimerRef.current != null) window.clearTimeout(errorTimerRef.current);
      try { audio.pause(); audio.currentTime = 0; } catch {}
      unregister();
    };
  }, []);

  // Rotação dinâmica de mensagens persuasivas (a cada 11s, só quando o balão está aberto e não consultando).
  useEffect(() => {
    const pool = ROTATING[variant] ?? [];
    if (pool.length === 0) return;
    let idx = 0;
    const id = window.setInterval(() => {
      if (!open || consulting) return;
      idx = (idx + 1) % pool.length;
      setSpeech(pool[idx]);
    }, 11_000);
    return () => window.clearInterval(id);
  }, [variant, open, consulting]);

  // Gatilho de upsell: rotas disparam `eliteboost:upsell-intent` ao clicar pacote de seguidores.
  useEffect(() => {
    const onUpsell = () => {
      lockOpenRef.current = true;
      setOpen(true);
      setSpeech(UPSELL_BY_VARIANT[variant] ?? UPSELL_BY_VARIANT.instagram);
      window.setTimeout(() => { lockOpenRef.current = false; }, 8000);
    };
    window.addEventListener("eliteboost:upsell-intent", onUpsell);
    return () => window.removeEventListener("eliteboost:upsell-intent", onUpsell);
  }, [variant]);

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
    <>
      <style>{`
        @keyframes jb-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
        @keyframes jb-arc { 0%,100% { opacity:.85; transform: translate(-50%,-50%) scale(1) } 50% { opacity:1; transform: translate(-50%,-50%) scale(1.18) } }
      `}</style>
      <div
        className={inline
          ? "inline-flex items-center gap-2 flex-row-reverse align-middle"
          : "fixed top-16 z-40 flex flex-col-reverse items-end gap-1"}
        style={inline ? undefined : { right: "max(8px, calc(50% - 225px))" }}
      >
        <div
          aria-label="J.A.R.V.I.S."
          className={`relative h-16 w-16 rounded-full overflow-hidden border-2 ${t.border} ring-2 ring-white/10 bg-black`}
          style={{ boxShadow: t.ring, animation: "jb-float 3.4s ease-in-out infinite" }}
        >
          <img
            src={armorAsset.url}
            alt="J.A.R.V.I.S. Armor"
            draggable={false}
            loading="lazy"
            width={64}
            height={64}
            className="h-full w-full object-cover"
            style={{ filter: t.filter }}
          />
          {/* Arc Reactor pulsante */}
          <span
            aria-hidden
            className="absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: 10,
              height: 10,
              background: t.arc,
              boxShadow: `0 0 12px ${t.arc}, 0 0 4px #fff inset`,
              animation: "jb-arc 1.6s ease-in-out infinite",
            }}
          />
        </div>
        <div
          role="status"
          aria-live="polite"
          className={`relative max-w-[204px] sm:max-w-[221px] rounded-2xl px-3 py-2 pr-7 text-[11px] leading-snug backdrop-blur-xl ${t.bubble} border shadow-2xl transition-all duration-500 ease-out ${
            open ? "opacity-100 translate-x-0 scale-100" : "opacity-0 translate-x-2 scale-90 pointer-events-none"
          }`}
        >
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => { lockOpenRef.current = false; if (errorTimerRef.current != null) { window.clearTimeout(errorTimerRef.current); errorTimerRef.current = null; } setOpen(false); }}
            className="absolute top-1 right-1 h-5 w-5 grid place-items-center rounded-full bg-white/10 hover:bg-white/25 text-white/80 hover:text-white"
          >
            <X className="h-3 w-3" />
          </button>
          <span className={`absolute -right-1.5 bottom-4 h-3 w-3 rotate-45 ${t.bubble} border-r border-b`} aria-hidden />
          <div className={`font-semibold ${t.accent} ${t.glow}`}>J.A.R.V.I.S.</div>
          <div className="text-white/95 mt-0.5">{speech}</div>
          <form onSubmit={handleConsult} className="mt-1.5 flex gap-1">
            <input
              value={pedidoId}
              onChange={(e) => setPedidoId(e.target.value)}
              onFocus={clearAutoClose}
              onPointerDown={clearAutoClose}
              placeholder="ID do pedido"
              className="flex-1 min-w-0 rounded bg-black/50 border border-white/20 px-1.5 py-0.5 text-[10px] text-white placeholder:text-white/40 outline-none focus:border-white/50"
            />
            <button
              type="submit"
              disabled={consulting}
              onPointerDown={clearAutoClose}
              className="rounded bg-white/15 hover:bg-white/25 px-1.5 py-0.5 text-[10px] font-bold text-white disabled:opacity-50"
            >
              {consulting ? "…" : "Ver ID"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
