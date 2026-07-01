import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listPricingCatalog,
  upsertPricingCatalog,
  deletePricingCatalog,
  type PricingCatalogRow,
} from "@/lib/pricing-catalog.functions";
import { computeGuardedPrice, respectsMinMargin } from "@/lib/margin-guardian";

const CATEGORIES = [
  "instagram:seguidores", "instagram:curtidas", "instagram:visualizacoes",
  "tiktok:seguidores", "tiktok:curtidas", "tiktok:visualizacoes",
  "youtube:inscritos", "youtube:visualizacoes",
  "facebook:seguidores", "facebook:curtidas",
  "telegram:canal", "telegram:grupo",
  "trafego:br", "trafego:global",
] as const;

type FormState = {
  pacote: string;
  category: string;
  quantidade: string;
  cost_brl: string;
  price_brl: string;
  smmhype_service_id: string;
  smmpanel_service_id: string;
  verified_service_id: string;
};

const empty: FormState = {
  pacote: "", category: CATEGORIES[0], quantidade: "1000",
  cost_brl: "0", price_brl: "0",
  smmhype_service_id: "", smmpanel_service_id: "", verified_service_id: "",
};

const MONOTONIC_STEP = 0.5;

/** v133 — Preço vivo pela Equação Fabiano + Monotonic Guard sequencial por categoria. */
function buildLivePrices(rows: PricingCatalogRow[]): Map<string, number> {
  const out = new Map<string, number>();
  const byCat = new Map<string, PricingCatalogRow[]>();
  for (const r of rows) {
    if (!byCat.has(r.category)) byCat.set(r.category, []);
    byCat.get(r.category)!.push(r);
  }
  for (const [, list] of byCat) {
    list.sort((a, b) => a.quantidade - b.quantidade);
    let prev = 0;
    for (const r of list) {
      const equation = computeGuardedPrice(Number(r.cost_brl) || 0);
      let live = equation > 0 ? equation : Number(r.price_brl) || 0;
      if (live <= prev) live = Number((prev + MONOTONIC_STEP).toFixed(2));
      out.set(r.pacote, live);
      prev = live;
    }
  }
  return out;
}

export function PricingCatalogEditor({ token }: { token: string }) {
  const listFn = useServerFn(listPricingCatalog);
  const upsertFn = useServerFn(upsertPricingCatalog);
  const delFn = useServerFn(deletePricingCatalog);
  const [rows, setRows] = useState<PricingCatalogRow[]>([]);
  const [form, setForm] = useState<FormState>(empty);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const reload = async () => {
    const r = await listFn({ data: { token } });
    if (r.ok) setRows(r.rows);
    else setMsg(r.error);
  };

  useEffect(() => { if (token) void reload(); /* eslint-disable-next-line */ }, [token]);

  const livePrices = useMemo(() => buildLivePrices(rows), [rows]);

  const edit = (r: PricingCatalogRow) => {
    const live = livePrices.get(r.pacote) ?? Number(r.price_brl);
    setForm({
      pacote: r.pacote,
      category: r.category,
      quantidade: String(r.quantidade),
      cost_brl: String(r.cost_brl),
      price_brl: String(live.toFixed(2)),
      smmhype_service_id: r.smmhype_service_id ?? "",
      smmpanel_service_id: r.smmpanel_service_id ?? "",
      verified_service_id: r.verified_service_id ?? "",
    });
    setMsg(`Editando pacote: ${r.pacote}`);
  };

  const hypeId = form.smmhype_service_id.trim();
  const panelId = form.smmpanel_service_id.trim();
  const verifiedId = form.verified_service_id.trim();
  const dupError =
    hypeId && ((panelId && panelId === hypeId) || (verifiedId && verifiedId === hypeId));

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      if (!form.pacote.trim()) { setMsg("⚠️ Informe o código do pacote"); return; }
      const q = Number(form.quantidade);
      if (!Number.isFinite(q) || q <= 0) { setMsg("⚠️ Quantidade inválida"); return; }
      if (dupError) {
        setMsg("⚠️ Erro Contábil: Os IDs das chaves reservas não podem ser idênticos ao ID da SMMHype. Digite os códigos específicos de cada painel.");
        return;
      }
      const r = await upsertFn({ data: {
        token,
        pacote: form.pacote.trim(),
        category: form.category,
        quantidade: q,
        cost_brl: Number(form.cost_brl) || 0,
        price_brl: Number(form.price_brl) || 0,
        smmhype_service_id: form.smmhype_service_id || null,
        smmpanel_service_id: form.smmpanel_service_id || null,
        verified_service_id: form.verified_service_id || null,
      }});
      if (r.ok) {
        setMsg("✅ Pacote salvo no banco de dados");
        setForm(empty);
        await reload();
      } else setMsg(`❌ ${r.error ?? "Falha ao salvar"}`);
    } finally { setBusy(false); }
  };

  const remove = async (pacote: string) => {
    if (!confirm(`Excluir pacote "${pacote}"?`)) return;
    setBusy(true);
    const r = await delFn({ data: { token, pacote } });
    setBusy(false);
    if (r.ok) { setMsg(`🗑️ ${pacote} removido`); await reload(); }
    else setMsg(`❌ ${r.error ?? "Falha ao excluir"}`);
  };

  const filtered = rows.filter((r) => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return r.pacote.toLowerCase().includes(q) || r.category.toLowerCase().includes(q);
  });

  const inputCls = "w-full rounded-md bg-black/50 border border-amber-500/30 px-3 py-2 text-sm text-amber-100 placeholder:text-amber-100/30 focus:outline-none focus:border-amber-400";
  const labelCls = "text-[11px] uppercase tracking-wider text-amber-300/80 mb-1 block";

  return (
    <div className="rounded-xl border border-amber-500/30 bg-black/60 p-4 shadow-[0_0_22px_rgba(245,158,11,0.25)]">
      <div className="flex items-center justify-between gap-2 mb-3">
        <h3 className="text-amber-300 font-bold tracking-wide text-sm">
          📦 EXPANSÃO DO CATÁLOGO · IDs DOS FORNECEDORES
        </h3>
        <button onClick={reload} className="text-[11px] px-2 py-1 rounded border border-amber-500/40 text-amber-200 hover:bg-amber-500/10">
          ⟳ Atualizar
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        <div className="col-span-2">
          <label className={labelCls}>Código do pacote (ex: p1k, tf1k)</label>
          <input className={inputCls} value={form.pacote} onChange={(e) => setForm({ ...form, pacote: e.target.value })} placeholder="p1k" />
        </div>
        <div>
          <label className={labelCls}>Categoria</label>
          <select className={inputCls} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Quantidade</label>
          <input className={inputCls} type="number" value={form.quantidade} onChange={(e) => setForm({ ...form, quantidade: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>Custo em Real</label>
          <input className={inputCls} type="number" step="0.0001" value={form.cost_brl} onChange={(e) => {
            const cost = e.target.value;
            const suggested = computeGuardedPrice(Number(cost) || 0);
            setForm({ ...form, cost_brl: cost, price_brl: suggested ? String(suggested) : form.price_brl });
          }} />
        </div>
        <div>
          <label className={labelCls}>
            Preço de Venda {form.cost_brl && form.price_brl && !respectsMinMargin(Number(form.price_brl), Number(form.cost_brl)) && (
              <span className="text-red-400 ml-1">⚠ Margem Abaixo do Limite de Segurança</span>
            )}
          </label>
          <input className={inputCls} type="number" step="0.01" value={form.price_brl} onChange={(e) => setForm({ ...form, price_brl: e.target.value })} />
        </div>
        <div>
          <label className={labelCls}>ID SMMHype</label>
          <input className={inputCls} value={form.smmhype_service_id} onChange={(e) => setForm({ ...form, smmhype_service_id: e.target.value })} placeholder="14330" />
        </div>
        <div>
          <label className={labelCls}>ID SMMPanel</label>
          <input className={inputCls + (panelId && panelId === hypeId ? " !border-red-500 !text-red-300" : "")} value={form.smmpanel_service_id} onChange={(e) => setForm({ ...form, smmpanel_service_id: e.target.value })} placeholder="" />
        </div>
        <div>
          <label className={labelCls}>ID Verified Atacado</label>
          <input className={inputCls + (verifiedId && verifiedId === hypeId ? " !border-red-500 !text-red-300" : "")} value={form.verified_service_id} onChange={(e) => setForm({ ...form, verified_service_id: e.target.value })} placeholder="" />
        </div>
      </div>

      {dupError && (
        <div className="mb-3 rounded-md border border-red-500/60 bg-red-950/40 px-3 py-2 text-[12px] text-red-300 shadow-[0_0_14px_rgba(239,68,68,0.35)]">
          ⚠️ Erro Contábil: Os IDs das chaves reservas não podem ser idênticos ao ID da SMMHype. Digite os códigos específicos de cada painel.
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        <button onClick={save} disabled={busy} className="px-4 py-2 rounded-md bg-gradient-to-r from-amber-400 to-orange-500 text-black text-sm font-bold shadow-[0_0_18px_rgba(245,158,11,0.55)] disabled:opacity-50">
          {busy ? "Salvando..." : "💾 Salvar pacote"}
        </button>
        <button onClick={() => { setForm(empty); setMsg(null); }} className="px-3 py-2 rounded-md border border-amber-500/40 text-amber-200 text-sm">
          Limpar
        </button>
        {msg && <span className="self-center text-xs text-amber-200/90">{msg}</span>}
      </div>

      <div className="mt-2">
        <input
          className={inputCls + " mb-2"}
          placeholder="🔎 Filtrar por pacote ou categoria..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="max-h-[360px] overflow-auto border border-amber-500/20 rounded-md">
          <table className="w-full text-[11px] text-amber-100/90">
            <thead className="bg-amber-500/10 text-amber-300 sticky top-0">
              <tr>
                <th className="px-2 py-1 text-left">Pacote</th>
                <th className="px-2 py-1 text-left">Categoria</th>
                <th className="px-2 py-1 text-right">Quantidade</th>
                <th className="px-2 py-1 text-right">Preço de Custo (R$)</th>
                <th className="px-2 py-1 text-right">Preço de Venda (R$)</th>
                <th className="px-2 py-1 text-left">ID SMMHype</th>
                <th className="px-2 py-1 text-left">ID SMMPanel</th>
                <th className="px-2 py-1 text-left">ID Verified Atacado</th>
                <th className="px-2 py-1"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const live = livePrices.get(r.pacote) ?? Number(r.price_brl);
                const drift = Math.abs(live - Number(r.price_brl)) > 0.01;
                return (
                  <tr key={r.pacote} className="border-t border-amber-500/10 hover:bg-amber-500/5">
                    <td className="px-2 py-1 font-mono">{r.pacote}</td>
                    <td className="px-2 py-1">{r.category}</td>
                    <td className="px-2 py-1 text-right">{r.quantidade}</td>
                    <td className="px-2 py-1 text-right">{Number(r.cost_brl).toFixed(2)}</td>
                    <td className="px-2 py-1 text-right font-bold text-emerald-300" title="Equação Fabiano viva + Monotonic Guard">
                      {live.toFixed(2)}
                      {drift && <span className="ml-1 text-[9px] text-amber-400/80">↺</span>}
                    </td>
                    <td className="px-2 py-1 font-mono">{r.smmhype_service_id ?? <span className="text-yellow-400">⚠️ Cadastrar ID</span>}</td>
                    <td className="px-2 py-1 font-mono">{r.smmpanel_service_id ?? <span className="text-yellow-400">⚠️ Cadastrar ID</span>}</td>
                    <td className="px-2 py-1 font-mono">{r.verified_service_id ?? <span className="text-yellow-400">⚠️ Cadastrar ID</span>}</td>
                    <td className="px-2 py-1 text-right whitespace-nowrap">
                      <button onClick={() => edit(r)} className="text-amber-300 hover:underline mr-2">editar</button>
                      <button onClick={() => remove(r.pacote)} className="text-red-400 hover:underline">excluir</button>
                    </td>
                  </tr>
                );
              })}
              {!filtered.length && (
                <tr><td colSpan={9} className="px-2 py-4 text-center text-amber-200/60">Nenhum pacote encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-amber-200/60">
          Preço de Venda calculado ao vivo: Custo × 4,0 × 1,15 ÷ 0,9901 (Equação Fabiano) com incremento mínimo de R$ 0,50 entre pacotes da mesma categoria.
        </p>
      </div>
    </div>
  );
}
