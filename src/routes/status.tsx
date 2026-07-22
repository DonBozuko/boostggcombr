import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Status do Sistema | BoostGG" },
      { name: "description", content: "Saúde em tempo real dos fornecedores, carteira e catálogo BoostGG." },
      { property: "og:title", content: "Status do Sistema | BoostGG" },
      { property: "og:description", content: "Fornecedores, saldo e catálogo em tempo real." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: StatusPage,
});

type Provider = {
  slug: string;
  label: string;
  status: "operacional" | "instavel" | "saldo_baixo";
  saldo_brl: number | null;
  unstable_until: string | null;
};

type StatusPayload = {
  ok: boolean;
  overall: "operacional" | "atencao" | "parcial" | "critico" | "desconhecido";
  providers: Provider[];
  catalog: { total: number; sellable: number; pausados: number };
  ts: string;
};

type RouteRow = { label: string; url: string; status: "checking" | "ok" | "down"; code?: number };

const ROUTES: Omit<RouteRow, "status">[] = [
  { label: "Site principal", url: "/" },
  { label: "Checkout Instagram", url: "/comprar-seguidores-instagram" },
  { label: "Checkout TikTok", url: "/tiktok" },
  { label: "Webhook Pagamento", url: "/api/public/mp-webhook" },
];

const overallLabel: Record<StatusPayload["overall"], { text: string; color: string; emoji: string }> = {
  operacional: { text: "Todos os sistemas operando", color: "#22c55e", emoji: "🟢" },
  atencao: { text: "Operando com atenção", color: "#eab308", emoji: "🟡" },
  parcial: { text: "Um fornecedor instável", color: "#f97316", emoji: "🟠" },
  critico: { text: "Todos os fornecedores fora do ar", color: "#ef4444", emoji: "🔴" },
  desconhecido: { text: "Sem leitura no momento", color: "#888", emoji: "⚪" },
};

function providerBadge(p: Provider): { emoji: string; color: string; text: string } {
  if (p.status === "instavel") return { emoji: "🔴", color: "#ef4444", text: "Instável" };
  if (p.status === "saldo_baixo") return { emoji: "🟡", color: "#eab308", text: "Saldo baixo" };
  return { emoji: "🟢", color: "#22c55e", text: "Operacional" };
}

function StatusPage() {
  const [data, setData] = useState<StatusPayload | null>(null);
  const [routes, setRoutes] = useState<RouteRow[]>(ROUTES.map((r) => ({ ...r, status: "checking" })));

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/public/status", { cache: "no-store" });
        const json = (await res.json()) as StatusPayload;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setData({ ok: false, overall: "desconhecido", providers: [], catalog: { total: 0, sellable: 0, pausados: 0 }, ts: new Date().toISOString() });
      }

      const results = await Promise.all(
        ROUTES.map(async (r) => {
          try {
            const res = await fetch(r.url, { method: "HEAD" });
            const ok = res.ok || res.status === 401 || res.status === 405;
            return { ...r, status: ok ? "ok" : "down", code: res.status } as RouteRow;
          } catch {
            return { ...r, status: "down" } as RouteRow;
          }
        }),
      );
      if (!cancelled) setRoutes(results);
    };
    load();
    const int = setInterval(load, 60_000);
    return () => { cancelled = true; clearInterval(int); };
  }, []);

  const banner = data ? overallLabel[data.overall] : overallLabel.desconhecido;

  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#fff", padding: "40px 20px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <h1 style={{ fontSize: 30, marginBottom: 4 }}>Status BoostGG</h1>
        <p style={{ opacity: 0.55, marginBottom: 24, fontSize: 13 }}>Atualiza sozinho a cada 60s</p>

        <div style={{ padding: "20px 24px", borderRadius: 12, background: "#111", border: `1px solid ${banner.color}55`, marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 600, color: banner.color }}>
            {banner.emoji} {banner.text}
          </div>
          {data ? (
            <div style={{ fontSize: 12, opacity: 0.5, marginTop: 6 }}>
              Última leitura: {new Date(data.ts).toLocaleTimeString("pt-BR")}
            </div>
          ) : null}
        </div>

        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7, marginBottom: 12 }}>
            Fornecedores
          </h2>
          <div style={{ display: "grid", gap: 8 }}>
            {(data?.providers ?? []).map((p) => {
              const b = providerBadge(p);
              return (
                <div key={p.slug} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "14px 18px", border: "1px solid #222", borderRadius: 10, background: "#111",
                }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.label}</div>
                    <div style={{ fontSize: 12, opacity: 0.6, marginTop: 2 }}>
                      {p.saldo_brl != null ? `Saldo R$ ${p.saldo_brl.toFixed(2)}` : "Saldo indisponível"}
                    </div>
                  </div>
                  <span style={{ fontSize: 13, color: b.color, fontWeight: 600 }}>{b.emoji} {b.text}</span>
                </div>
              );
            })}
            {!data ? <div style={{ opacity: 0.5, fontSize: 13 }}>Carregando…</div> : null}
          </div>
        </section>

        {data ? (
          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 16, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7, marginBottom: 12 }}>
              Catálogo
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              <Metric label="Pacotes totais" value={String(data.catalog.total)} />
              <Metric label="Vendáveis agora" value={String(data.catalog.sellable)} color="#22c55e" />
              <Metric label="Pausados" value={String(data.catalog.pausados)} color={data.catalog.pausados > 0 ? "#eab308" : "#22c55e"} />
            </div>
          </section>
        ) : null}

        <section>
          <h2 style={{ fontSize: 16, textTransform: "uppercase", letterSpacing: "0.08em", opacity: 0.7, marginBottom: 12 }}>
            Rotas principais
          </h2>
          <div style={{ display: "grid", gap: 8 }}>
            {routes.map((r) => (
              <div key={r.label} style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "12px 16px", border: "1px solid #222", borderRadius: 8, background: "#111",
              }}>
                <span style={{ fontSize: 14 }}>{r.label}</span>
                <span style={{ fontSize: 12, color: r.status === "ok" ? "#22c55e" : r.status === "down" ? "#ef4444" : "#888" }}>
                  {r.status === "ok" ? "🟢 Online" : r.status === "down" ? "🔴 Offline" : "⏳"}
                </span>
              </div>
            ))}
          </div>
        </section>

        <p style={{ marginTop: 32, opacity: 0.35, fontSize: 11, textAlign: "center" }}>v215 · Dados públicos, sem informação de cliente</p>
      </div>
    </div>
  );
}

function Metric({ label, value, color = "#fff" }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ padding: "14px 16px", border: "1px solid #222", borderRadius: 10, background: "#111" }}>
      <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.55 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color, marginTop: 4 }}>{value}</div>
    </div>
  );
}
