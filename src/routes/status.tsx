import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

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

function StatusPage() {
  const [rows, setRows] = useState<Row[]>(ROUTES.map((r) => ({ ...r, status: "checking" })));

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
        <p style={{ marginTop: 24, opacity: 0.4, fontSize: 12, textAlign: "center" }}>v1.0.0-LAUNCH</p>
      </div>
    </div>
  );
}
