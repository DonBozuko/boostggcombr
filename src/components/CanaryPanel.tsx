// v281 — Painel do Pedido Canário.
// Prova de entrega real: o sistema compra de verdade, no menor valor possível,
// e acompanha até chegar. Se não chegar, alerta antes do cliente reclamar.
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCanaryPanel, saveCanaryConfig, runCanaryNow, suggestCanaryTargets } from "@/lib/canary.functions";
import { Bird, RefreshCw, Play } from "lucide-react";
import { toast } from "sonner";

type Panel = Awaited<ReturnType<typeof getCanaryPanel>>;
type Alvo = { rede: string; link: string; pacote: string; quantidade: number; ativo: boolean; intervalo_horas: number };
type Run = { id: string; created_at: string; pacote: string; quantidade: number; provider_slug: string | null; provider_order_id: string | null; status: string; remains: number | null; delivered_at: string | null; detail: string | null; cost_brl: number | null };

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  dispatched: { text: "enviado ao fornecedor", cls: "text-cyan-300" },
  processing: { text: "entregando", cls: "text-amber-300" },
  delivered: { text: "ENTREGUE", cls: "text-emerald-300" },
  failed: { text: "FALHOU", cls: "text-red-300" },
  stuck: { text: "ATRASADO", cls: "text-red-300" },
};

export function CanaryPanel({ token }: { token: string }) {
  const load$ = useServerFn(getCanaryPanel);
  const save$ = useServerFn(saveCanaryConfig);
  const run$ = useServerFn(runCanaryNow);
  const suggest$ = useServerFn(suggestCanaryTargets);

  const [panel, setPanel] = useState<Panel | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<{ enabled: boolean; alvos: Alvo[]; interval_hours: number; sla_hours: number; budget_brl_month: number }>(
    { enabled: false, alvos: [], interval_hours: 12, sla_hours: 6, budget_brl_month: 40 },
  );

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const r = await load$({ data: { token } });
      setPanel(r);
      if (r.ok) setForm(r.config);
    } catch (e) { console.error(e); }
  }, [load$, token]);

  useEffect(() => { void load(); }, [load]);

  const setAlvo = (i: number, patch: Partial<Alvo>) =>
    setForm((f) => ({ ...f, alvos: f.alvos.map((a, idx) => (idx === i ? { ...a, ...patch } : a)) }));

  const addAlvo = () =>
    setForm((f) => ({ ...f, alvos: [...f.alvos, { rede: "", link: "", pacote: "", quantidade: 0, ativo: true, intervalo_horas: 0 }] }));


  const removeAlvo = (i: number) =>
    setForm((f) => ({ ...f, alvos: f.alvos.filter((_, idx) => idx !== i) }));
  const preencherMaisBaratos = async () => {
    setBusy(true);
    try {
      const r = await suggest$({ data: { token } });
      if (!r.ok) { toast.error(r.error ?? "erro"); return; }
      setForm((f) => {
        const jaTem = new Map(f.alvos.map((a) => [a.pacote, a]));
        const novos: Alvo[] = r.sugestoes.map((s) => {
          const ex = jaTem.get(s.pacote);
          return { rede: s.rede, link: ex?.link ?? "", pacote: s.pacote, quantidade: s.quantidade, ativo: Boolean(ex?.link) };
        });
        return { ...f, alvos: novos.slice(0, 12) };
      });
      toast.success("Pacotes mais baratos carregados — falta só colar o link de teste de cada rede");
    } finally { setBusy(false); }
  };


  const save = async () => {
    setBusy(true);
    try {
      const r = await save$({
        data: {
          token,
          enabled: form.enabled,
          interval_hours: Number(form.interval_hours) || 12,
          sla_hours: Number(form.sla_hours) || 6,
          budget_brl_month: Number(form.budget_brl_month) || 40,
          alvos: form.alvos.map((a) => ({ ...a, quantidade: Number(a.quantidade) || 0 })),
        },
      });
      if (r.ok) { toast.success("Configuração salva"); void load(); }
      else toast.error(r.error ?? "erro");
    } finally { setBusy(false); }
  };


  const runNow = async () => {
    setBusy(true);
    try {
      const r = await run$({ data: { token } });
      if (!r.ok) { toast.error(r.error ?? "erro"); return; }
      const rep = r.report;
      if (!rep.ligado) toast.error(rep.motivo ?? "canário desligado");
      else if (rep.novo_pedido) toast.success(`Compra real feita em ${rep.novo_pedido.fornecedor} (ordem ${rep.novo_pedido.ordem})`);
      else toast.message("Nenhuma compra nova — apenas verificação dos testes abertos");
      void load();
    } finally { setBusy(false); }
  };

  const runs = (panel?.ok ? panel.runs : []) as Run[];
  const quarentena = (panel?.ok ? (panel as { quarentena?: unknown[] }).quarentena ?? [] : []) as Array<{
    pacote: string; provider_slug: string; until: string; reason: string | null;
  }>;


  return (
    <section className="rounded-xl border border-emerald-500/40 bg-black/60 backdrop-blur-xl p-4 shadow-[0_0_18px_rgba(16,185,129,0.2)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-300 flex items-center gap-2">
          <Bird size={14} /> Pedido Canário · prova de entrega real
        </h3>
        <div className="flex gap-2">
          <button onClick={load} className="text-[10px] uppercase tracking-wider text-emerald-300 border border-emerald-500/40 rounded px-2 py-1 flex items-center gap-1">
            <RefreshCw size={10} /> ↻
          </button>
          <button onClick={runNow} disabled={busy} className="text-[10px] uppercase tracking-wider text-black bg-emerald-400 rounded px-2 py-1 flex items-center gap-1 disabled:opacity-40">
            <Play size={10} /> Testar agora
          </button>
        </div>
      </div>

      <p className="text-[11px] text-white/60 mb-3 leading-relaxed">
        O sistema compra de verdade o menor pacote possível apontando para o seu perfil de teste e acompanha até entregar.
        Se atrasar ou falhar, você recebe alerta no Telegram antes de qualquer cliente reclamar.
      </p>

      {panel && !panel.ok && <div className="text-[11px] text-red-300 font-mono">Token inválido — recarrega o admin.</div>}

      {panel?.ok && (
        <>
          {quarentena.length > 0 && (
            <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-2">
              <div className="text-[10px] uppercase tracking-wider text-amber-300 mb-1">
                Fornecedores em descanso (só neste pacote — o site continua vendendo pelos outros)
              </div>
              {quarentena.map((q, i) => (
                <div key={i} className="text-[11px] text-white/70 font-mono">
                  {q.pacote} · {q.provider_slug} · volta {new Date(q.until).toLocaleString("pt-BR")} · {q.reason ?? ""}
                </div>
              ))}
            </div>
          )}
          <div className="space-y-2 mb-3">
            <div className="text-[10px] uppercase tracking-wider text-white/50">
              Alvos por rede — cada rede precisa do próprio link de teste (Instagram não serve para YouTube/TikTok/Telegram)
            </div>

            {form.alvos.length === 0 && (
              <div className="text-[11px] text-amber-300 font-mono">Nenhuma rede configurada — o canário não roda.</div>
            )}
            {form.alvos.map((a, i) => (
              <div key={i} className="grid grid-cols-2 md:grid-cols-6 gap-2 text-[11px] items-end rounded-lg border border-white/10 bg-black/40 p-2">
                <input value={a.rede} onChange={(e) => setAlvo(i, { rede: e.target.value })}
                  placeholder="rede (instagram)"
                  className="bg-black/50 border border-white/15 rounded px-2 py-1 text-white" />
                <input value={a.link} onChange={(e) => setAlvo(i, { link: e.target.value })}
                  placeholder="links de teste (separe por vírgula p/ rodízio)"
                  className="md:col-span-2 bg-black/50 border border-white/15 rounded px-2 py-1 text-white" />

                <input value={a.pacote} onChange={(e) => setAlvo(i, { pacote: e.target.value })}
                  placeholder="pacote do catálogo"
                  className="bg-black/50 border border-white/15 rounded px-2 py-1 text-white" />
                <input type="number" value={a.quantidade} onChange={(e) => setAlvo(i, { quantidade: Number(e.target.value) })}
                  placeholder="qtd"
                  className="bg-black/50 border border-white/15 rounded px-2 py-1 text-white" />
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-1 text-white/70">
                    <input type="checkbox" checked={a.ativo} onChange={(e) => setAlvo(i, { ativo: e.target.checked })} />
                    ativo
                  </label>
                  <button onClick={() => removeAlvo(i)} className="text-red-300 border border-red-400/40 rounded px-2">×</button>
                </div>
              </div>
            ))}
            <div className="flex gap-2 flex-wrap">
              <button onClick={addAlvo} className="text-[10px] uppercase tracking-wider text-emerald-300 border border-emerald-500/40 rounded px-2 py-1">
                + adicionar rede
              </button>
              <button onClick={preencherMaisBaratos} disabled={busy} className="text-[10px] uppercase tracking-wider text-cyan-300 border border-cyan-500/40 rounded px-2 py-1 disabled:opacity-40">
                usar pacotes mais baratos de cada rede
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11px] mb-3">

            <label className="flex flex-col gap-1">
              <span className="text-white/50">Intervalo entre testes (h)</span>
              <input type="number" value={form.interval_hours} onChange={(e) => setForm({ ...form, interval_hours: Number(e.target.value) })}
                className="bg-black/50 border border-white/15 rounded px-2 py-1 text-white" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-white/50">Prazo máximo p/ entregar (h)</span>
              <input type="number" value={form.sla_hours} onChange={(e) => setForm({ ...form, sla_hours: Number(e.target.value) })}
                className="bg-black/50 border border-white/15 rounded px-2 py-1 text-white" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-white/50">Limite de gasto de teste por mês (R$)</span>
              <input type="number" step="1" value={form.budget_brl_month} onChange={(e) => setForm({ ...form, budget_brl_month: Number(e.target.value) })}
                className="bg-black/50 border border-white/15 rounded px-2 py-1 text-white" />
            </label>
            <label className="flex items-end gap-2 pb-1">
              <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} />
              <span className="text-white/70">Ligado (compra automática)</span>
            </label>
          </div>

          {panel?.ok && typeof (panel as any).gasto_mes_brl === "number" && (
            <div className="mb-3 text-[11px] text-white/70 border border-white/10 rounded px-2 py-1">
              Gasto real de teste neste mês:{" "}
              <strong className="text-white">
                R$ {Number((panel as any).gasto_mes_brl).toFixed(2)}
              </strong>{" "}
              de R$ {Number(form.budget_brl_month || 0).toFixed(2)} — este é o custo pago ao
              fornecedor, não o preço de vitrine.
            </div>
          )}


          <button onClick={save} disabled={busy}
            className="text-[11px] uppercase tracking-wider border border-emerald-500/40 text-emerald-300 rounded px-3 py-1 mb-4 disabled:opacity-40">
            Salvar configuração
          </button>

          {!form.enabled && (
            <div className="text-[11px] text-amber-300 font-mono mb-3">
              Canário desligado — nenhuma compra automática está sendo feita.
            </div>
          )}

          <div className="space-y-1">
            {runs.length === 0 && <div className="text-[11px] text-white/40 font-mono">Nenhum teste real registrado ainda.</div>}
            {runs.map((r) => {
              const s = STATUS_LABEL[r.status] ?? { text: r.status, cls: "text-white/60" };
              return (
                <div key={r.id} className="rounded-lg border border-white/10 bg-black/40 p-2 text-[11px] flex flex-wrap gap-x-3 gap-y-1">
                  <span className="text-white/40 font-mono">{new Date(r.created_at).toLocaleString("pt-BR")}</span>
                  <span className="text-white/80">{r.pacote} · {r.quantidade}</span>
                  <span className="text-white/50">{r.provider_slug ?? "—"}{r.provider_order_id ? ` #${r.provider_order_id}` : ""}</span>
                  <span className={s.cls}>{s.text}</span>
                  {r.remains != null && r.status !== "delivered" && <span className="text-white/50">faltam {r.remains}</span>}
                  {r.detail && <span className="text-white/40 w-full font-mono">{r.detail}</span>}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

export default CanaryPanel;
