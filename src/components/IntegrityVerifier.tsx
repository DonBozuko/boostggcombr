import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Check = { id: string; label: string; ok: boolean; detail: string };

const ROUTE_PROBES = ["/", "/tiktok", "/youtube", "/facebook", "/telegram", "/trafego"];
const AUDIO_PROBES = [
  "/api/public/sfx/welcome.mp3?v=33",
  "/api/public/sfx/jarvis-interacao.mp3?v=33",
  "/api/public/sfx/jarvis-sucesso.mp3?v=33",
];

async function probe(url: string, kind: "html" | "audio"): Promise<{ ok: boolean; detail: string }> {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    const ct = res.headers.get("content-type") ?? "";
    const ok = res.ok && (kind === "audio" ? ct.startsWith("audio/") : true);
    return { ok, detail: `${res.status} · ${ct || "no content-type"}` };
  } catch (e) {
    return { ok: false, detail: (e as Error).message };
  }
}

export function IntegrityVerifier() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(false);

  const run = async () => {
    setRunning(true);
    const out: Check[] = [];

    // 1. Routes
    for (const r of ROUTE_PROBES) {
      const p = await probe(r, "html");
      out.push({ id: `route:${r}`, label: `Rota pública ${r}`, ok: p.ok, detail: p.detail });
    }
    // 2. Audio assets (cache v=33)
    for (const a of AUDIO_PROBES) {
      const p = await probe(a, "audio");
      out.push({ id: `audio:${a}`, label: `Áudio ${a.split("/").pop()}`, ok: p.ok, detail: p.detail });
    }
    // 3. DB tables (existence + RLS reachable)
    const tables = ["scheduled_posts", "fornecedores", "pedidos", "jarvis_alerts"] as const;
    for (const t of tables) {
      const { error } = await supabase.from(t).select("id", { count: "exact", head: true }).limit(1);
      out.push({
        id: `db:${t}`,
        label: `Tabela ${t}`,
        ok: !error,
        detail: error ? error.message : "acessível via RLS",
      });
    }
    // 4. scheduled_posts schema columns (omnichannel)
    const { error: colErr } = await supabase
      .from("scheduled_posts")
      .select("network, format, approved")
      .limit(1);
    out.push({
      id: "schema:omnichannel",
      label: "Colunas Omnichannel (network/format/approved)",
      ok: !colErr,
      detail: colErr ? colErr.message : "presentes",
    });

    setChecks(out);
    setRunning(false);
  };

  useEffect(() => { void run(); }, []);

  const failed = checks.filter((c) => !c.ok).length;
  const total = checks.length;
  const allOk = total > 0 && failed === 0;

  return (
    <section
      aria-label="Verificador de Integridade"
      className={`rounded-xl border backdrop-blur-xl p-3 sm:p-4 ${
        allOk
          ? "border-emerald-400/40 bg-emerald-950/20 shadow-[0_0_18px_rgba(16,185,129,0.25)]"
          : "border-amber-400/50 bg-amber-950/20 shadow-[0_0_18px_rgba(251,191,36,0.25)]"
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full animate-pulse ${allOk ? "bg-emerald-400" : "bg-amber-400"}`} />
          <h2 className={`text-xs font-bold uppercase tracking-[0.18em] ${allOk ? "text-emerald-300" : "text-amber-300"}`}>
            🔍 Verificador Antimentira · {total === 0 ? "auditando..." : `${total - failed}/${total} OK`}
          </h2>
        </div>
        <button
          onClick={run}
          disabled={running}
          className="text-[10px] uppercase tracking-wider text-cyan-300 hover:text-cyan-200 disabled:opacity-40"
        >
          {running ? "verificando..." : "↻ revalidar"}
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-56 overflow-y-auto">
        {checks.map((c) => (
          <div
            key={c.id}
            className={`rounded-md border px-2.5 py-1.5 text-[11px] ${
              c.ok
                ? "border-emerald-500/30 bg-black/40 text-emerald-100"
                : "border-red-500/50 bg-red-950/40 text-red-100"
            }`}
          >
            <div className="font-semibold">{c.ok ? "✅" : "❌"} {c.label}</div>
            <div className="text-white/50 text-[10px] truncate">{c.detail}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
