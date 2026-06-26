import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { listJarvisAlerts, type JarvisAlertRow } from "@/lib/jarvis.functions";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Status do Sistema | Boostygram" },
      { name: "description", content: "Monitoramento em tempo real das redes sociais e webhooks da Boostygram." },
      { property: "og:title", content: "Status do Sistema | Boostygram" },
      { property: "og:description", content: "Integridade em tempo real das 5 redes, tráfego e webhooks." },
    ],
  }),
  component: StatusPage,
});

type Row = { label: string; url: string; status: "checking" | "ok" | "down"; code?: number };

const ROUTES: Omit<Row, "status">[] = [
  { label: "Instagram", url: "/" },
  { label: "TikTok", url: "/tiktok" },
  { label: "YouTube", url: "/youtube" },
  { label: "Facebook", url: "/facebook" },
  { label: "Telegram", url: "/telegram" },
  { label: "Tráfego Web", url: "/trafego" },
  { label: "Webhook Mercado Pago", url: "/api/public/mp-webhook" },
  { label: "Webhook Telegram", url: "/api/public/telegram/webhook" },
];

const SEV_COLOR: Record<string, string> = {
  info: "#38bdf8",
  success: "#22c55e",
  warning: "#f59e0b",
  critical: "#ef4444",
};

function StatusPage() {
  const [rows, setRows] = useState<Row[]>(ROUTES.map((r) => ({ ...r, status: "checking" })));
  const [alerts, setAlerts] = useState<JarvisAlertRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        ROUTES.map(async (r) => {
          try {
            const res = await fetch(r.url, { method: "HEAD" });
            const ok = res.ok || res.status === 401 || res.status === 405;
            return { ...r, status: ok ? "ok" : "down", code: res.status } as Row;
          } catch {
            return { ...r, status: "down" } as Row;
          }
        }),
      );
      if (!cancelled) setRows(results);
    })();
    (async () => {
      try {
        const res = await listJarvisAlerts({ data: { limit: 20 } });
        if (!cancelled) setAlerts(res.rows);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#fff", padding: "40px 20px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <h1 style={{ fontSize: 28, marginBottom: 8 }}>🟢 Status do Sistema</h1>
        <p style={{ opacity: 0.6, marginBottom: 24 }}>Integridade em tempo real — Boostygram</p>
        <div style={{ display: "grid", gap: 8 }}>
          {rows.map((r) => (
            <div key={r.label} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 18px", border: "1px solid #222", borderRadius: 8, background: "#111",
            }}>
              <span>{r.label}</span>
              <span style={{ fontSize: 13, color: r.status === "ok" ? "#22c55e" : r.status === "down" ? "#ef4444" : "#888" }}>
                {r.status === "ok" ? `🟢 Online${r.code ? ` (${r.code})` : ""}` : r.status === "down" ? "🔴 Offline" : "⏳ Checando..."}
              </span>
            </div>
          ))}
        </div>

        <h2 style={{ fontSize: 18, marginTop: 32, marginBottom: 12 }}>🤖 Últimos alertas do Jarvis</h2>
        {alerts.length === 0 ? (
          <p style={{ opacity: 0.5, fontSize: 13 }}>Sem alertas registrados.</p>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {alerts.map((a) => (
              <div key={a.id} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 14px", border: "1px solid #1f1f1f", borderRadius: 6, background: "#0f0f0f", fontSize: 12,
              }}>
                <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{
                    width: 8, height: 8, borderRadius: 999,
                    background: SEV_COLOR[a.severidade] ?? "#888",
                  }} />
                  <strong>{a.mensagem}</strong>
                  {a.detalhe && <span style={{ opacity: 0.6 }}>· {a.detalhe}</span>}
                </span>
                <span style={{ opacity: 0.5 }}>{new Date(a.created_at).toLocaleString("pt-BR")}</span>
              </div>
            ))}
          </div>
        )}

        <p style={{ marginTop: 24, opacity: 0.4, fontSize: 12, textAlign: "center" }}>v1.0.0-LAUNCH</p>
      </div>
    </div>
  );
}
