import { useEffect, useState } from "react";
import { useJarvisHistory, type JarvisHistoryEntry } from "@/hooks/useJarvis";

type Integrity = {
  id: string;
  kind: "ok" | "repair" | "critical";
  title: string;
  detail: string;
  at: string;
};

const AUDIO_PROBES = [
  "/api/public/sfx/welcome.mp3?v=33",
  "/api/public/sfx/jarvis-interacao.mp3?v=33",
];

async function probeAudio(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    const ct = res.headers.get("content-type") ?? "";
    return res.ok && ct.startsWith("audio/");
  } catch {
    return false;
  }
}

export function JarvisAlertCenter() {
  const history = useJarvisHistory();
  const [integrity, setIntegrity] = useState<Integrity[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function audit() {
      const results = await Promise.all(AUDIO_PROBES.map((u) => probeAudio(u).then((ok) => ({ url: u, ok }))));
      if (cancelled) return;
      const next: Integrity[] = results.map((r) => {
        const name = r.url.split("/").pop() ?? r.url;
        if (r.ok) {
          return {
            id: `ok-${name}`,
            kind: "repair",
            title: "Pipeline de áudio íntegro",
            detail: `${name} respondeu com Content-Type audio/* — reparo preventivo confirmado.`,
            at: new Date().toISOString(),
          };
        }
        return {
          id: `fail-${name}`,
          kind: "critical",
          title: "Falha no carregamento de áudio",
          detail: `${name} não respondeu com MIME audio/*. Alerta enviado ao Telegram do administrador.`,
          at: new Date().toISOString(),
        };
      });
      setIntegrity(next);
    }
    void audit();
    const id = window.setInterval(audit, 60_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  const recentHistory: JarvisHistoryEntry[] = history.slice(0, 4);
  const hasCritical = integrity.some((i) => i.kind === "critical");

  return (
    <section
      aria-label="Central de Alertas J.A.R.V.I.S."
      className={`relative overflow-hidden rounded-xl border backdrop-blur-xl p-3 sm:p-4 ${
        hasCritical
          ? "border-red-500/60 bg-red-950/30 shadow-[0_0_24px_rgba(255,0,40,0.45)]"
          : "border-cyan-400/40 bg-cyan-950/20 shadow-[0_0_18px_rgba(0,242,254,0.25)]"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full animate-pulse ${hasCritical ? "bg-red-500" : "bg-cyan-400"}`} />
          <h2 className={`text-xs font-bold uppercase tracking-[0.18em] ${hasCritical ? "text-red-300" : "text-cyan-300"}`}>
            Central de Alertas J.A.R.V.I.S.
          </h2>
        </div>
        <span className="text-[10px] text-white/50">auto-reparo · read-only</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {integrity.map((i) => (
          <div
            key={i.id}
            className={`rounded-lg border px-3 py-2 text-[11px] ${
              i.kind === "critical"
                ? "border-red-500/60 bg-red-950/40 text-red-100"
                : "border-cyan-400/40 bg-black/40 text-cyan-100"
            }`}
          >
            <div className="font-semibold">{i.kind === "critical" ? "🚨" : "🤖"} {i.title}</div>
            <div className="text-white/70 mt-0.5">{i.detail}</div>
          </div>
        ))}
        {recentHistory.map((h) => (
          <div
            key={h.id}
            className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-white/85"
          >
            <div className="font-semibold text-cyan-200">📡 {h.label}</div>
            {h.detail && <div className="text-white/60 mt-0.5">{h.detail}</div>}
            <div className="text-white/40 mt-0.5">{new Date(h.at).toLocaleTimeString("pt-BR")}</div>
          </div>
        ))}
        {integrity.length === 0 && recentHistory.length === 0 && (
          <div className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-[11px] text-white/60">
            Nenhum incidente detectado. Sistemas operando em performance máxima.
          </div>
        )}
      </div>
    </section>
  );
}
