// v400 — Estúdio de Vídeo Faceless (narração IA + render real no navegador).
// Modular por contrato do Modo Torre: nasce em arquivo próprio, sem tocar motor.
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { gerarNarracao as gerarNarracaoFn } from "@/lib/jarvis-tts.functions";
import {
  facelessVideoSupport,
  renderFacelessVideo,
  type FacelessFormat,
  type FacelessScript,
} from "@/lib/faceless-render";

const VOZES = [
  { id: "onyx", label: "Onyx — masculina grave" },
  { id: "ash", label: "Ash — masculina jovem" },
  { id: "alloy", label: "Alloy — neutra" },
  { id: "nova", label: "Nova — feminina energética" },
  { id: "shimmer", label: "Shimmer — feminina suave" },
  { id: "echo", label: "Echo — masculina calma" },
] as const;

type Voz = (typeof VOZES)[number]["id"];

type Props = {
  script: FacelessScript | null;
  format: FacelessFormat;
  bgVideoUrl?: string;
};

export function FacelessVideoStudio({ script, format, bgVideoUrl }: Props) {
  const suporte = useMemo(() => facelessVideoSupport(), []);
  const runTts = useServerFn(gerarNarracaoFn);

  const [voz, setVoz] = useState<Voz>("onyx");
  const [narracao, setNarracao] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [ext, setExt] = useState<"mp4" | "webm">("mp4");
  const [etapa, setEtapa] = useState<string | null>(null);
  const [pct, setPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const urlsRef = useRef<string[]>([]);

  // Texto da narração acompanha o roteiro até o usuário editar
  const [tocado, setTocado] = useState(false);
  useEffect(() => {
    if (!script || tocado) return;
    setNarracao([script.hook, script.retention, script.cta].filter(Boolean).join(" "));
  }, [script, tocado]);

  useEffect(() => () => { urlsRef.current.forEach((u) => URL.revokeObjectURL(u)); }, []);

  const guardarUrl = (u: string) => { urlsRef.current.push(u); return u; };

  const gerarVoz = async () => {
    const texto = narracao.trim();
    if (texto.length < 3) { toast.error("Escreva ou gere o roteiro antes."); return; }
    setBusy(true); setErro(null); setEtapa("Gerando narração com IA…"); setPct(10);
    try {
      const r = await runTts({ data: { texto, voz } });
      if (!r.ok) { setErro(r.message); toast.error(r.message); return; }
      const bin = atob(r.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const url = guardarUrl(URL.createObjectURL(new Blob([bytes], { type: r.mime })));
      setAudioUrl(url);
      toast.success("Narração pronta. Ouça e depois gere o vídeo.");
    } catch (e) {
      const m = e instanceof Error ? e.message : "Falha ao gerar narração";
      setErro(m); toast.error(m);
    } finally {
      setBusy(false); setEtapa(null); setPct(0);
    }
  };

  const gerarVideo = async () => {
    if (!script) { toast.error("Gere o roteiro faceless primeiro."); return; }
    if (!suporte.ok) return;
    setBusy(true); setErro(null); setVideoUrl(null);
    try {
      const r = await renderFacelessVideo({
        script,
        format,
        bgVideoUrl,
        audioUrl: audioUrl ?? undefined,
        onProgress: (p, e) => { setPct(p); setEtapa(e); },
      });
      setExt(r.ext);
      setVideoUrl(guardarUrl(URL.createObjectURL(r.blob)));
      toast.success(`Vídeo pronto (${r.ext.toUpperCase()}, ${(r.blob.size / 1048576).toFixed(1)} MB).`);
    } catch (e) {
      const m = e instanceof Error ? e.message : "Falha ao gravar o vídeo";
      setErro(m); toast.error(m);
    } finally {
      setBusy(false); setEtapa(null); setPct(0);
    }
  };

  return (
    <div className="rounded-xl border border-fuchsia-400/30 bg-black/40 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-[10px] uppercase tracking-wider text-fuchsia-300/90">
          🎬 Estúdio de Vídeo Faceless (narração IA + render)
        </label>
        <span className="text-[9px] uppercase tracking-wider text-white/40">
          {format === "9:16" ? "720×1280" : "720×720"} · {suporte.ok ? suporte.ext.toUpperCase() : "indisponível"}
        </span>
      </div>

      {!suporte.ok ? (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-[11px] text-red-200">
          {suporte.motivo} Abra o painel no Chrome/Edge do computador para gravar o vídeo.
        </div>
      ) : !script ? (
        <div className="text-[11px] text-white/50">
          Gere o roteiro faceless acima. O vídeo usa Gancho → Retenção → CTA na tela, sincronizados com a narração.
        </div>
      ) : (
        <>
          <div>
            <label className="text-[10px] uppercase tracking-wider text-white/50">🗣️ Texto da narração</label>
            <textarea
              rows={3}
              value={narracao}
              onChange={(e) => { setTocado(true); setNarracao(e.target.value); }}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-[11px] font-mono"
            />
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <select
              value={voz}
              onChange={(e) => setVoz(e.target.value as Voz)}
              className="rounded-lg border border-white/10 bg-black/60 px-2 py-2 text-[11px]"
            >
              {VOZES.map((v) => (
                <option key={v.id} value={v.id}>{v.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={gerarVoz}
              disabled={busy}
              className="rounded-lg bg-fuchsia-500/20 border border-fuchsia-400/50 text-fuchsia-100 px-3 py-2 text-[11px] font-bold uppercase hover:bg-fuchsia-500/30 disabled:opacity-40"
            >
              🎙️ Gerar narração
            </button>
            <button
              type="button"
              onClick={gerarVideo}
              disabled={busy}
              className="rounded-lg bg-gradient-to-r from-cyan-500 to-fuchsia-500 text-black px-3 py-2 text-[11px] font-extrabold uppercase hover:brightness-110 disabled:opacity-40"
            >
              🎬 Gerar vídeo
            </button>
          </div>

          {audioUrl && (
            <audio controls src={audioUrl} className="w-full h-8">
              <track kind="captions" />
            </audio>
          )}

          {busy && (
            <div className="space-y-1">
              <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-400" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-[10px] text-cyan-200/80">{etapa} {pct}%</div>
            </div>
          )}

          {videoUrl && (
            <div className="space-y-2">
              <video
                src={videoUrl}
                controls
                playsInline
                className={`w-full rounded-lg border border-cyan-400/30 ${format === "9:16" ? "max-w-[220px] mx-auto" : ""}`}
              >
                <track kind="captions" />
              </video>
              <a
                href={videoUrl}
                download={`boostgg-faceless-${format === "9:16" ? "reels" : "feed"}.${ext}`}
                className="block text-center rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 px-3 py-2 text-[11px] font-extrabold uppercase hover:bg-emerald-500/30"
              >
                ⬇️ Baixar vídeo (.{ext})
              </a>
            </div>
          )}

          {erro && <div className="text-[11px] text-red-400">{erro}</div>}

          <p className="text-[10px] text-white/45">
            Grava em tempo real: um vídeo de 20s leva ~20s. Mantenha esta aba aberta e visível durante a gravação.
          </p>
        </>
      )}
    </div>
  );
}
