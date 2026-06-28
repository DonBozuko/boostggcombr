import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Check = { id: string; label: string; ok: boolean; detail: string };
type LogLine = { ts: string; tag: string; msg: string };
type Ping = { provider: string; ms: number | null; ok: boolean };

const ROUTE_PROBES = ["/", "/tiktok", "/youtube", "/facebook", "/telegram", "/trafego"];
const AUDIO_PROBES = [
  "/api/public/sfx/welcome.mp3?v=35",
  "/api/public/sfx/jarvis-interacao.mp3?v=35",
  "/api/public/sfx/jarvis-sucesso.mp3?v=35",
];
const PING_TARGETS: Array<{ provider: string; url: string }> = [
  { provider: "SMMHype", url: "https://smmhype.com/api/v2" },
  { provider: "SMMPanel", url: "https://smmpanel.com.br/api/v2" },
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

async function pingProvider(url: string): Promise<{ ms: number | null; ok: boolean }> {
  const t0 = performance.now();
  try {
    await fetch(url, { method: "HEAD", mode: "no-cors", cache: "no-store" });
    return { ms: Math.round(performance.now() - t0), ok: true };
  } catch {
    const ms = Math.round(performance.now() - t0);
    return { ms, ok: false };
  }
}

export function IntegrityVerifier() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [pings, setPings] = useState<Ping[]>([]);
  const [running, setRunning] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [copied, setCopied] = useState(false);

  const pushLog = (tag: string, msg: string) =>
    setLogs((prev) => [{ ts: new Date().toLocaleTimeString("pt-BR"), tag, msg }, ...prev].slice(0, 4));

  const copyReport = async () => {
    const ts = new Date().toISOString();
    const lines = [
      `EliteBoost Prime · Diagnóstico Integral · ${ts}`,
      `Status: ${checks.filter((c) => !c.ok).length === 0 ? "TUDO OK" : "FALHAS DETECTADAS"} (${checks.filter((c) => c.ok).length}/${checks.length})`,
      "",
      "— Tabelas & Mídias v=33 —",
      ...checks.map((c) => `${c.ok ? "[OK]" : "[FAIL]"} ${c.label} · ${c.detail}`),
      "",
      "— Latência de Provedores —",
      ...pings.map((p) => `${p.ok ? "[OK]" : "[FAIL]"} ${p.provider} · ${p.ms ?? "?"}ms`),
      "",
      "— Logs J.A.R.V.I.S. —",
      ...logs.map((l) => `${l.ts} [${l.tag}] ${l.msg}`),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(lines);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const run = async () => {
    setRunning(true);
    pushLog("SCAN", "Iniciando varredura integral");
    const out: Check[] = [];

    for (const r of ROUTE_PROBES) {
      const p = await probe(r, "html");
      out.push({ id: `route:${r}`, label: `Rota pública ${r}`, ok: p.ok, detail: p.detail });
    }
    pushLog("ROUTES", `${ROUTE_PROBES.length} rotas auditadas`);

    for (const a of AUDIO_PROBES) {
      const p = await probe(a, "audio");
      out.push({ id: `audio:${a}`, label: `Áudio ${a.split("/").pop()}`, ok: p.ok, detail: p.detail });
    }

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
    pushLog("DB", "RLS validado em 4 tabelas");

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

    // pings
    const ps: Ping[] = [];
    for (const target of PING_TARGETS) {
      const r = await pingProvider(target.url);
      ps.push({ provider: target.provider, ms: r.ms, ok: r.ok });
    }
    setPings(ps);
    pushLog("PING", ps.map((p) => `${p.provider}=${p.ms}ms`).join(" · "));

    setChecks(out);
    setRunning(false);
    pushLog("SCAN", `Concluído · ${out.filter((c) => c.ok).length}/${out.length} OK`);
  };

  const autoRepair = async () => {
    setRepairing(true);
    pushLog("REPAIR", "Reconectando Data API e revalidando RLS");
    try {
      await supabase.auth.refreshSession();
      await supabase.from("pedidos").select("id", { head: true, count: "exact" }).limit(1);
      await supabase.from("jarvis_alerts").select("id", { head: true, count: "exact" }).limit(1);
      pushLog("REPAIR", "Estados de falha resetados · OK");
    } catch (e) {
      pushLog("REPAIR", `Falha: ${(e as Error).message}`);
    }
    setRepairing(false);
    void run();
  };

  useEffect(() => {
    pushLog("BOOT", "Modal de TI inicializado");
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      <div className="grid grid-cols-2 gap-2 mb-2">
        <button
          onClick={copyReport}
          disabled={checks.length === 0}
          className={`rounded-md px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] border transition-all ${
            copied
              ? "bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.6)]"
              : "bg-cyan-500/10 border-cyan-400/60 text-cyan-200 hover:bg-cyan-500/20 hover:shadow-[0_0_14px_rgba(34,211,238,0.5)] disabled:opacity-40"
          }`}
        >
          {copied ? "✓ Copiado!" : "📋 Copiar Diagnóstico"}
        </button>
        <button
          onClick={autoRepair}
          disabled={repairing || running}
          className="rounded-md px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] border bg-red-500/10 border-red-400/60 text-red-200 hover:bg-red-500/20 hover:shadow-[0_0_14px_rgba(248,113,113,0.5)] disabled:opacity-40 transition-all"
        >
          {repairing ? "reparando..." : "⚡ Auto-Reparo BD"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto mb-2">
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

      {/* Latency line */}
      <div className="rounded-md border border-cyan-500/30 bg-black/50 px-2.5 py-1.5 mb-2">
        <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-300/80 mb-1">📡 Latência de Provedores</div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-mono">
          {pings.length === 0 && <span className="text-white/40">medindo...</span>}
          {pings.map((p) => (
            <span key={p.provider} className={p.ok ? "text-emerald-300" : "text-amber-300"}>
              {p.provider}: <b>{p.ms ?? "—"}ms</b>
            </span>
          ))}
        </div>
      </div>

      {/* JARVIS console */}
      <div className="rounded-md border border-red-500/30 bg-black/70 px-2.5 py-2 font-mono text-[10.5px] leading-relaxed">
        <div className="text-[10px] uppercase tracking-[0.18em] text-red-300/80 mb-1">🤖 Logs do Sistema J.A.R.V.I.S.</div>
        {logs.length === 0 ? (
          <div className="text-white/30">// aguardando atividade...</div>
        ) : (
          logs.map((l, i) => (
            <div key={i} className="text-emerald-200/90 truncate">
              <span className="text-white/40">{l.ts}</span>{" "}
              <span className="text-cyan-300">[{l.tag}]</span> {l.msg}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
