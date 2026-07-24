// v163 — Fila "Aguardando Automação/Saldo" no painel admin.
// Consome /api/public/queue/waiting e permite confirmar envio manual.
// Estilo: mesmo cyan/black glassmorphism dos demais cards admin.
import { useEffect, useState, useCallback } from "react";
import { useAdminRealtime } from "@/hooks/useAdminRealtime";

type QueueItem = {
  pedido_id: string;
  status: string;
  pacote: string;
  quantidade: number;
  link_do_perfil: string;
  valor_cliente_brl: number;
  custo_estimado_brl: number | null;
  fornecedor_sugerido: string | null;
  service_id: string | null;
  created_at: string;
};

function brl(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function WaitingProvisionQueue({ token }: { token: string }) {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) { setLoading(false); return; } // v186 — sem token = sessão ainda hidratando; evita 401 UNAUTHORIZED espúrio
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/public/queue/waiting", { headers: { "x-admin-token": token } });
      const j = await res.json();
      if (!j.ok) throw new Error(j.error ?? "erro");
      setItems(j.items ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally { setLoading(false); }
  }, [token]);

  useEffect(() => { void load(); const id = window.setInterval(load, 30_000); return () => window.clearInterval(id); }, [load]);
  useAdminRealtime(["pedidos"], load);

  const confirm = async (pedido_id: string) => {
    if (!token) { setFlash("❌ Sessão expirada — refaça login"); return; }
    setBusyId(pedido_id); setFlash(null);
    try {
      const res = await fetch("/api/public/queue/confirm", {
        method: "POST",
        headers: { "x-admin-token": token, "Content-Type": "application/json" },
        body: JSON.stringify({ pedido_id }),
      });
      const j = await res.json();
      if (j.ok) {
        setFlash(`✅ ${pedido_id.slice(0,8)} enviado via ${j.fornecedor} (order ${j.orderId ?? "?"})`);
        await load();
      } else {
        setFlash(`❌ ${pedido_id.slice(0,8)}: ${j.error}${j.tentativas ? " · " + j.tentativas.join(" | ") : ""}`);
      }
    } catch (e) {
      setFlash(`❌ ${(e as Error).message}`);
    } finally { setBusyId(null); }
  };

  const copyPayload = (it: QueueItem) => {
    const payload = {
      pedido_id: it.pedido_id,
      link_do_perfil: it.link_do_perfil,
      quantidade_seguidores: it.quantidade,
      service_id: it.service_id,
      fornecedor: it.fornecedor_sugerido,
      valor_para_pagar_brl: it.custo_estimado_brl,
    };
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setFlash(`📋 Payload de ${it.pedido_id.slice(0,8)} copiado`);
  };

  return (
    <section className="rounded-xl border border-cyan-500/40 bg-black/60 backdrop-blur-xl p-4 shadow-[0_0_18px_rgba(34,211,238,0.25)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-cyan-300">
          🤖 Fila · Aguardando Automação/Saldo
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/50 font-mono">{items.length} pedido(s)</span>
          <button
            onClick={load}
            className="text-[10px] uppercase tracking-wider text-cyan-300 hover:text-cyan-100 border border-cyan-500/40 rounded px-2 py-1"
          >
            {loading ? "..." : "↻"}
          </button>
        </div>
      </div>

      {flash && (
        <div className="mb-2 text-[11px] font-mono text-amber-200 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1">
          {flash}
        </div>
      )}
      {error && <div className="mb-2 text-[11px] text-red-300">Erro: {error}</div>}

      {items.length === 0 && !loading && (
        <div className="text-[12px] text-white/50 text-center py-6 font-mono">
          Nenhum pedido aguardando. Robô ocioso.
        </div>
      )}

      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.pedido_id} className="rounded-lg border border-white/10 bg-black/40 p-3 grid grid-cols-1 md:grid-cols-6 gap-2 text-[11px]">
            <div className="md:col-span-2">
              <div className="text-white/40 uppercase text-[9px] tracking-wider">Pedido / Status</div>
              <div className="text-cyan-200 font-mono">{it.pedido_id.slice(0,8)}</div>
              <div className="text-amber-300 text-[10px]">{it.status}</div>
            </div>
            <div>
              <div className="text-white/40 uppercase text-[9px] tracking-wider">Perfil</div>
              <div className="text-white/90 font-mono break-all">{it.link_do_perfil}</div>
            </div>
            <div>
              <div className="text-white/40 uppercase text-[9px] tracking-wider">Qtd · Pacote</div>
              <div className="text-white/90">{it.quantidade.toLocaleString("pt-BR")}</div>
              <div className="text-white/50 text-[10px]">{it.pacote}</div>
            </div>
            <div>
              <div className="text-white/40 uppercase text-[9px] tracking-wider">Service ID</div>
              <div className="text-emerald-300 font-mono">{it.service_id ?? "—"}</div>
              <div className="text-white/50 text-[10px]">{it.fornecedor_sugerido ?? "—"}</div>
            </div>
            <div>
              <div className="text-white/40 uppercase text-[9px] tracking-wider">Custo · Venda</div>
              <div className="text-red-300">{brl(it.custo_estimado_brl)}</div>
              <div className="text-emerald-300 text-[10px]">{brl(it.valor_cliente_brl)}</div>
            </div>
            <div className="md:col-span-6 flex gap-2 pt-1 border-t border-white/5">
              <button
                onClick={() => copyPayload(it)}
                className="text-[10px] uppercase tracking-wider text-cyan-200 border border-cyan-500/40 rounded px-2 py-1 hover:bg-cyan-500/10"
              >
                📋 Copiar JSON p/ robô
              </button>
              <button
                onClick={() => confirm(it.pedido_id)}
                disabled={busyId === it.pedido_id}
                className="text-[10px] uppercase tracking-wider text-emerald-200 border border-emerald-500/40 rounded px-2 py-1 hover:bg-emerald-500/10 disabled:opacity-50"
              >
                {busyId === it.pedido_id ? "processando..." : "✅ Confirmar envio"}
              </button>
              {it.status === "AWAITING_REFUND_APPROVAL" && (
                <button
                  onClick={async () => {
                    if (!token) { setFlash("❌ Sessão expirada — refaça login"); return; }
                    if (!window.confirm(`Reembolsar R$${it.valor_cliente_brl.toFixed(2)} pro cliente do pedido ${it.pedido_id.slice(0,8)}? Ação irreversível.`)) return;
                    setBusyId(it.pedido_id); setFlash(null);
                    try {
                      const { supabase } = await import("@/integrations/supabase/client");
                      const { data: { session } } = await supabase.auth.getSession();
                      const headers: Record<string,string> = { "Content-Type": "application/json", "x-admin-token": token };
                      if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
                      const res = await fetch("/api/public/queue/approve-refund", {
                        method: "POST",
                        headers,
                        body: JSON.stringify({ pedido_id: it.pedido_id }),
                      });
                      const j = await res.json();
                      setFlash(j.ok
                        ? `💸 Refund OK · ${it.pedido_id.slice(0,8)}`
                        : `❌ Refund falhou: ${j.error ?? j.detail ?? "erro"}`);
                      await load();
                    } catch (e) {
                      setFlash(`❌ ${(e as Error).message}`);
                    } finally { setBusyId(null); }
                  }}
                  disabled={busyId === it.pedido_id}
                  className="text-[10px] uppercase tracking-wider text-red-200 border border-red-500/40 rounded px-2 py-1 hover:bg-red-500/10 disabled:opacity-50"
                >
                  {busyId === it.pedido_id ? "..." : "💸 Aprovar Refund"}
                </button>
              )}
            </div>

          </div>
        ))}
      </div>
    </section>
  );
}
