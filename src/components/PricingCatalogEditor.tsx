import { useEffect, useState } from "react";
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

  const edit = (r: PricingCatalogRow) => {
    setForm({
      pacote: r.pacote,
      category: r.category,
      quantidade: String(r.quantidade),
      cost_brl: String(r.cost_brl),
      price_brl: String(r.price_brl),
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
        setMsg("✅ Pacote salvo no Supabase");
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
          📦 EXPANSÃO DE CATÁLOGO · IDs DE FORNECEDORES
        </h3>
        <button onClick={reload} className="text-[11px] px-2 py-1 rounded border border-amber-500/40 text-amber-200 hover:bg-amber-500/10">
          ⟳ atualizar
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
          <label className={labelCls}>Custo BRL</label>
          <input className={inputCls} type="number" step="0.0001" value={form.cost_brl} onChange={(e) => {
            const cost = e.target.value;
            const suggested = computeGuardedPrice(Number(cost) || 0);
            setForm({ ...form, cost_brl: cost, price_brl: suggested ? String(suggested) : form.price_brl });
          }} />
        </div>
        <div>
          <label className={labelCls}>
            Preço venda BRL {form.cost_brl && form.price_brl && !respectsMinMargin(Number(form.price_brl), Number(form.cost_brl)) && (
              <span className="text-red-400 ml-1">⚠ margem &lt; 300%</span>
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
          <input className={inputCls + (panelId && panelId === hypeId ? " !border-red-500 !text-red-300" : "")} value={form.smmpanel_service_id} onChange={(e) => setForm({ ...form, smmpanel_service_id: e.target.value })} placeholder="ex: 8721" />
        </div>
        <div>
          <label className={labelCls}>ID Verified Atacado</label>
          <input className={inputCls + (verifiedId && verifiedId === hypeId ? " !border-red-500 !text-red-300" : "")} value={form.verified_service_id} onChange={(e) => setForm({ ...form, verified_service_id: e.target.value })} placeholder="ex: 1204" />
        </div>
      </div>

      {dupError && (
        <div className="mb-3 rounded-md border border-red-500/60 bg-red-950/40 px-3 py-2 text-[12px] text-red-300 shadow-[0_0_14px_rgba(239,68,68,0.35)]">
          ⚠️ Erro Contábil: Os IDs das chaves reservas não podem ser idênticos ao ID da SMMHype. Digite os códigos específicos de cada painel.
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        <button onClick={save} disabled={busy} className="px-4 py-2 rounded-md bg-gradient-to-r from-amber-400 to-orange-500 text-black text-sm font-bold shadow-[0_0_18px_rgba(245,158,11,0.55)] disabled:opacity-50">
          {busy ? "salvando..." : "💾 Salvar pacote"}
        </button>
        <button onClick={() => { setForm(empty); setMsg(null); }} className="px-3 py-2 rounded-md border border-amber-500/40 text-amber-200 text-sm">
          Limpar
        </button>
        {msg && <span className="self-center text-xs text-amber-200/90">{msg}</span>}
      </div>

      <div className="mt-2">
        <input
          className={inputCls + " mb-2"}
          placeholder="🔎 filtrar por pacote ou categoria..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <div className="max-h-[360px] overflow-auto border border-amber-500/20 rounded-md">
          <table className="w-full text-[11px] text-amber-100/90">
            <thead className="bg-amber-500/10 text-amber-300 sticky top-0">
              <tr>
                <th className="px-2 py-1 text-left">Pacote</th>
                <th className="px-2 py-1 text-left">Categoria</th>
                <th className="px-2 py-1 text-right">Qtd</th>
                <th className="px-2 py-1 text-right">Custo</th>
                <th className="px-2 py-1 text-right">Venda</th>
                <th className="px-2 py-1 text-left">Hype</th>
                <th className="px-2 py-1 text-left">Panel</th>
                <th className="px-2 py-1 text-left">Verified</th>
                <th className="px-2 py-1"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.pacote} className="border-t border-amber-500/10 hover:bg-amber-500/5">
                  <td className="px-2 py-1 font-mono">{r.pacote}</td>
                  <td className="px-2 py-1">{r.category}</td>
                  <td className="px-2 py-1 text-right">{r.quantidade}</td>
                  <td className="px-2 py-1 text-right">{Number(r.cost_brl).toFixed(2)}</td>
                  <td className="px-2 py-1 text-right">{Number(r.price_brl).toFixed(2)}</td>
                  <td className="px-2 py-1 font-mono">{r.smmhype_service_id ?? "—"}</td>
                  <td className="px-2 py-1 font-mono">{r.smmpanel_service_id ?? "—"}</td>
                  <td className="px-2 py-1 font-mono">{r.verified_service_id ?? "—"}</td>
                  <td className="px-2 py-1 text-right whitespace-nowrap">
                    <button onClick={() => edit(r)} className="text-amber-300 hover:underline mr-2">editar</button>
                    <button onClick={() => remove(r.pacote)} className="text-red-400 hover:underline">excluir</button>
                  </td>
                </tr>
              ))}
              {!filtered.length && (
                <tr><td colSpan={9} className="px-2 py-4 text-center text-amber-200/60">Nenhum pacote encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
