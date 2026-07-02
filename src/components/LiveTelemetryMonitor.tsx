// v94 — Strict Live Telemetry Dashboard
// Polling 1s: mostra últimos eventos do webhook (DISPATCH_OK, MARGIN_HOLD_ERROR)
// e último pedido `paid`/`SMM_FAILED`/`mp_refunded` como heartbeat.

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type AuditRow = {
  id: string;
  action: string;
  detail: any;
  created_at: string;
};

type PedidoRow = {
  id: string;
  status: string;
  pacote: string | null;
  quantidade: number | null;
  instagram_user: string | null;
  error_detail: string | null;
  updated_at?: string | null;
  created_at: string;
};

export function LiveTelemetryMonitor() {
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [lastPedido, setLastPedido] = useState<PedidoRow | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const [a, p] = await Promise.all([
          supabase
            .from("admin_audit_logs")
            .select("id, action, detail, created_at")
            .in("action", ["DISPATCH_OK", "MARGIN_HOLD_ERROR", "REFUND_OK", "REFUND_FAILED", "CHECKOUT_INSUFFICIENT_FUNDS", "WHATSAPP_SEND_FAILED"])
            .order("created_at", { ascending: false })
            .limit(8),
          supabase
            .from("pedidos")
            .select("id, status, pacote, quantidade, instagram_user, error_detail, created_at")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ]);
        if (!alive) return;
        if (a.error) setErr(a.error.message);
        else setErr(null);
        setLogs((a.data as any[] as AuditRow[]) ?? []);
        setLastPedido((p.data as any as PedidoRow) ?? null);
      } catch (e: any) {
        if (alive) setErr(String(e?.message ?? e));
      }
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  const lastOk = logs.find((l) => l.action === "DISPATCH_OK");
  const lastErr = logs.find((l) => l.action === "MARGIN_HOLD_ERROR");

  const webhookLine = (() => {
    if (!lastPedido) return { color: "text-zinc-400", text: "Aguardando primeiro webhook…" };
    const s = lastPedido.status;
    if (s === "paid") return { color: "text-emerald-400", text: `🟢 PAGAMENTO CONFIRMADO · pedido ${lastPedido.id.slice(0,8)} · ${lastPedido.pacote}` };
    if (s === "mp_rejected_insufficient") return { color: "text-rose-500", text: `❌ [CHECKOUT] Tentativa de pagamento recusada por saldo insuficiente do cliente · pedido ${lastPedido.id.slice(0,8)}` };
    if (s === "mp_refunded") return { color: "text-amber-300", text: `💸 ESTORNADO · Pix devolvido automaticamente · pedido ${lastPedido.id.slice(0,8)}` };
    if (s?.startsWith("mp_")) return { color: "text-rose-400", text: `🔴 MP ${s} · ${lastPedido.error_detail ?? ""}` };
    if (s === "MARGIN_HOLD") return { color: "text-amber-300", text: `🟠 MARGIN_HOLD · ${lastPedido.error_detail ?? ""}` };
    if (s === "SMM_FAILED" || s === "amount_mismatch") return { color: "text-rose-400", text: `🔴 ${s} · ${lastPedido.error_detail ?? ""}` };
    return { color: "text-zinc-300", text: `⚪ ${s} · pedido ${lastPedido.id.slice(0,8)}` };
  })();

  const routingLine = (() => {
    if (lastErr && lastOk && new Date(lastErr.created_at) > new Date(lastOk.created_at)) {
      return { color: "text-rose-400", text: `🔴 MARGIN GUARDIAN bloqueou · ${lastErr.detail?.tentativas ?? "sem detalhe"}` };
    }
    if (lastOk) {
      const d = lastOk.detail ?? {};
      const cost = d.cost_brl != null ? `R$ ${Number(d.cost_brl).toFixed(2)}` : "—";
      return { color: "text-cyan-300", text: `🟢 Smart Routing · fornecedor ${d.provider} · custo ${cost} · Equação Fabiano (×4.0×1.15/0.9901) OK` };
    }
    return { color: "text-zinc-400", text: "Aguardando roteamento…" };
  })();

  const dispatchLine = (() => {
    if (lastOk) {
      const d = lastOk.detail ?? {};
      const perfil = lastPedido?.instagram_user ?? "@fabiano.santiago.oficial";
      return { color: "text-emerald-400", text: `🟢 [dispatchOK] Pedido enviado com sucesso para a API · pacote ${d.pacote} (${d.quantidade}) · order ${d.order_id ?? "?"} · perfil ${perfil}` };
    }
    return { color: "text-zinc-400", text: "Aguardando disparo real…" };
  })();

  return (
    <div className="mt-4 rounded-xl border border-red-500/40 bg-black/70 shadow-[0_0_22px_rgba(255,0,60,0.35)] p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-red-300 font-black text-sm tracking-wider">
          📡 MONITOR DE TRANSMISSÃO DE PEDIDOS (LIVE TELEMETRY)
        </h3>
        <span className="text-[10px] text-zinc-400">poll 1s · v149</span>
      </div>

      {err && <div className="text-xs text-rose-400 mb-2">RLS/erro: {err}</div>}

      <div className="space-y-2 font-mono text-xs">
        <div className={`${webhookLine.color}`}>
          <span className="text-zinc-500">[1] Webhook MP:</span> {webhookLine.text}
        </div>
        <div className={`${routingLine.color}`}>
          <span className="text-zinc-500">[2] Smart Routing:</span> {routingLine.text}
        </div>
        <div className={`${dispatchLine.color}`}>
          <span className="text-zinc-500">[3] Disparo real:</span> {dispatchLine.text}
        </div>
        {(() => {
          const wa = logs.find((l) => l.action === "WHATSAPP_SEND_FAILED");
          if (!wa) return null;
          const d: any = wa.detail ?? {};
          const first = Array.isArray(d.attempts) ? d.attempts.find((a: any) => !a.ok) : null;
          const line = first
            ? `❌ Twilio bloqueado · HTTP ${first.status ?? "?"} · code=${first.code ?? "?"} · ${(first.message ?? "").slice(0, 140)}`
            : `❌ Twilio bloqueado · ${d.summary ?? d.reason ?? "erro desconhecido"}`;
          return (
            <div className="text-rose-400">
              <span className="text-zinc-500">[4] WhatsApp Admin:</span> {line}
            </div>
          );
        })()}
      </div>

      <div className="mt-4 border-t border-red-500/20 pt-2">
        <div className="text-[10px] text-zinc-500 mb-1">Últimos eventos:</div>
        <ul className="max-h-40 overflow-auto space-y-1 font-mono text-[11px]">
          {logs.length === 0 && <li className="text-zinc-500">— vazio —</li>}
          {logs.map((l) => (
            <li key={l.id} className={l.action === "DISPATCH_OK" ? "text-emerald-300" : "text-rose-300"}>
              <span className="text-zinc-500">{new Date(l.created_at).toLocaleTimeString("pt-BR")}</span>
              {" · "}{l.action}
              {" · "}{l.detail?.provider ?? "—"}
              {" · "}pedido {String(l.detail?.pedido_id ?? "").slice(0,8)}
              {l.detail?.order_id ? ` · order ${l.detail.order_id}` : ""}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
