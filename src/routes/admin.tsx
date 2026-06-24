import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { listarPedidosPagos, listarPedidosFalhos, listarPedidosPendentes, reprocessarPedido, getFaturamentoPorRede } from "@/lib/admin.functions";
import { getMonitorSaldo, verificarSaldoAgora, getCronStatus, testarCron, getCaixaAssistente } from "@/lib/monitor.functions";
import { getServicesCacheStatus, sincronizarServicosAgora } from "@/lib/services-cache.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · BoostGram" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminPage,
});

type Pedido = {
  id: string;
  created_at: string;
  status: string;
  pacote: string;
  quantidade: number;
  instagram_user: string;
  mercado_pago_id: string | null;
  error_detail?: string | null;
  rede_social?: string | null;
};

type RedeKey = "overview" | "instagram" | "tiktok" | "youtube";

const REDES: { key: RedeKey; label: string; icon: string; disabled?: boolean }[] = [
  { key: "overview",  label: "Visão Geral",      icon: "🌐" },
  { key: "instagram", label: "Instagram",        icon: "📸" },
  { key: "tiktok",    label: "TikTok (Breve)",   icon: "🎵", disabled: true },
  { key: "youtube",   label: "YouTube (Breve)",  icon: "📺", disabled: true },
];

const REDE_ICON: Record<string, string> = {
  instagram: "📸",
  tiktok: "🎵",
  youtube: "📺",
};


type Historico = { t: string; saldo_usd: number | null; saldo_brl: number | null; status: string };

type MonitorState = {
  fornecedor: {
    nome: string;
    status: string;
    saldo_usd: number | null;
    saldo_brl: number | null;
    nivel_alerta: "verde" | "amarelo" | "laranja" | "vermelho" | "critico";
    ultima_verificacao: string | null;
    falhas_consecutivas: number;
    usd_to_brl: number;
  };
  historico: Historico[];
} | null;

const NIVEL_STYLE: Record<string, { bg: string; border: string; glow: string; label: string; emoji: string }> = {
  verde:    { bg: "bg-emerald-950/40", border: "border-emerald-500", glow: "shadow-[0_0_40px_rgba(16,185,129,0.45)]", label: "Saldo Saudável", emoji: "🟢" },
  amarelo:  { bg: "bg-yellow-950/40",  border: "border-yellow-500",  glow: "shadow-[0_0_40px_rgba(234,179,8,0.45)]",  label: "Saldo Baixo", emoji: "🟡" },
  laranja:  { bg: "bg-orange-950/40",  border: "border-orange-500",  glow: "shadow-[0_0_40px_rgba(249,115,22,0.55)]", label: "Saldo Muito Baixo", emoji: "🟠" },
  vermelho: { bg: "bg-red-950/40",     border: "border-red-500",     glow: "shadow-[0_0_45px_rgba(239,68,68,0.6)]",   label: "Recarregar Imediatamente", emoji: "🔴" },
  critico:  { bg: "bg-red-950/60",     border: "border-red-600",     glow: "shadow-[0_0_60px_rgba(239,68,68,0.8)]",   label: "CRÍTICO", emoji: "🚨" },
};

// WebAudio beep — não precisa de asset
function useAlertBeep() {
  const ctxRef = useRef<AudioContext | null>(null);
  const enabledRef = useRef(false);

  const enable = () => {
    if (enabledRef.current) return;
    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      ctxRef.current = new Ctx();
      enabledRef.current = true;
    } catch {}
  };

  const beep = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const now = ctx.currentTime;
    // 3 pulsos curtos
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, now + i * 0.25);
      gain.gain.exponentialRampToValueAtTime(0.25, now + i * 0.25 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.25 + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.25);
      osc.stop(now + i * 0.25 + 0.22);
    }
  };

  return { enable, beep, isEnabled: () => enabledRef.current };
}

function AdminPage() {
  const listar = useServerFn(listarPedidosPagos);
  const listarFalhos = useServerFn(listarPedidosFalhos);
  const listarPendentes = useServerFn(listarPedidosPendentes);
  const reprocessar = useServerFn(reprocessarPedido);
  const getMonitor = useServerFn(getMonitorSaldo);
  const checkAgora = useServerFn(verificarSaldoAgora);
  const getCron = useServerFn(getCronStatus);
  const runCron = useServerFn(testarCron);
  const getCache = useServerFn(getServicesCacheStatus);
  const syncCache = useServerFn(sincronizarServicosAgora);
  const getCaixa = useServerFn(getCaixaAssistente);

  const getFaturamento = useServerFn(getFaturamentoPorRede);

  const [token, setToken] = useState("");
  const [aba, setAba] = useState<RedeKey>("overview");
  const [faturamento, setFaturamento] = useState<{ geral: number; count: number; totais: Record<string, { total: number; count: number }> } | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [falhos, setFalhos] = useState<Pedido[]>([]);
  const [pendentes, setPendentes] = useState<(Pedido & { abandono_notificado_at: string | null })[]>([]);

  const [filtro, setFiltro] = useState<"todos" | "seguidores" | "curtidas">("todos");
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [monitor, setMonitor] = useState<MonitorState>(null);
  const [monitorBusy, setMonitorBusy] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [cron, setCron] = useState<{
    jobname: string; schedule: string; active: boolean;
    last_start: string | null; last_end: string | null;
    last_status: string | null; last_return: string | null;
  } | null>(null);
  const [cronBusy, setCronBusy] = useState(false);
  const [cache, setCache] = useState<{
    total: number; last_sync: string | null; missing_monitored: number[]; monitorados: number[];
  } | null>(null);
  const [cacheBusy, setCacheBusy] = useState(false);
  const [caixa, setCaixa] = useState<{
    supplier: { nome: string; saldo_atual: number; saldo_minimo: number; meta_ideal: number; falta_depositar: number; ultimo_update: string } | null;
    bank: { nome: string; saldo_atual: number; saldo_minimo_seguranca: number; ok: boolean; status_text: string } | null;
    alerts: { id: string; tipo: string; nivel: number; mensagem: string; created_at: string }[];
  } | null>(null);
  const alert = useAlertBeep();

  const loadMonitor = async (tk = token) => {
    if (!tk) return;
    try {
      const res = await getMonitor({ data: { token: tk } });
      if (res.ok) setMonitor({ fornecedor: res.fornecedor, historico: res.historico });
    } catch {}
  };

  const loadCron = async (tk = token) => {
    if (!tk) return;
    try {
      const res = await getCron({ data: { token: tk } });
      if (res.ok) setCron(res.cron);
    } catch {}
  };

  const loadCache = async (tk = token) => {
    if (!tk) return;
    try {
      const res = await getCache({ data: { token: tk } });
      if (res.ok) setCache({
        total: res.total, last_sync: res.last_sync,
        missing_monitored: res.missing_monitored, monitorados: res.monitorados,
      });
    } catch {}
  };

  const loadFalhos = async (tk = token) => {
    if (!tk) return;
    try {
      const res = await listarFalhos({ data: { token: tk } });
      if (res.ok) setFalhos(res.pedidos as Pedido[]);
    } catch {}
  };

  const loadPendentes = async (tk = token) => {
    if (!tk) return;
    try {
      const res = await listarPendentes({ data: { token: tk } });
      if (res.ok) setPendentes(res.pedidos as any);
    } catch {}
  };

  const loadCaixa = async (tk = token) => {
    if (!tk) return;
    try {
      const res = await getCaixa({ data: { token: tk } });
      if (res.ok) setCaixa({ supplier: res.supplier, bank: res.bank, alerts: res.alerts });
    } catch {}
  };

  const loadFaturamento = async (tk = token) => {
    if (!tk) return;
    try {
      const res = await getFaturamento({ data: { token: tk } });
      if (res.ok) setFaturamento({ geral: res.geral, count: res.count, totais: res.totais });
    } catch {}
  };

  const sincronizarAgora = async () => {
    if (!token) return toast.error("Informe o token");
    setCacheBusy(true);
    try {
      const res = await syncCache({ data: { token } });
      if (res.ok) toast.success(`Sync OK · ${res.result.total} serviços`);
      else toast.error(`Falha: ${res.error}`);
      await loadCache();
    } finally {
      setCacheBusy(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadMonitor();
    loadCron();
    loadCache();
    loadFalhos();
    loadPendentes();
    loadCaixa();
    loadFaturamento();
    const i = setInterval(() => { loadMonitor(); loadCron(); loadCache(); loadFalhos(); loadPendentes(); loadCaixa(); loadFaturamento(); }, 30000);
    return () => clearInterval(i);
  }, [token]);


  // Alerta sonoro: dispara a cada 30s em estado crítico OU se houver pedidos com falha
  const f = monitor?.fornecedor;
  const isAlerta =
    (!!f && (f.status === "Offline" || f.nivel_alerta === "vermelho" || f.nivel_alerta === "critico")) ||
    falhos.length > 0;

  useEffect(() => {
    if (!isAlerta || !soundOn) return;
    alert.beep();
    const i = setInterval(() => alert.beep(), 30000);
    return () => clearInterval(i);
  }, [isAlerta, soundOn]);

  const toggleSound = () => {
    if (!soundOn) {
      alert.enable();
      setSoundOn(true);
      toast.success("Alerta sonoro ativado");
    } else {
      setSoundOn(false);
      toast("Alerta sonoro desativado");
    }
  };

  const load = async () => {
    if (!token) return toast.error("Informe o token");
    setLoading(true);
    try {
      const res = await listar({ data: { token } });
      if (!res.ok) return toast.error(`Falhou: ${res.error}`);
      setPedidos(res.pedidos as Pedido[]);
      loadMonitor();
      loadFalhos();
    } finally {
      setLoading(false);
    }
  };

  const reenviar = async (id: string) => {
    setBusyId(id);
    try {
      const res = await reprocessar({ data: { token, pedidoId: id } });
      if (!res.ok) toast.error(`Falhou: ${res.error}${"detail" in res ? ` — ${res.detail}` : ""}`);
      else toast.success(`Enviado! order=${res.orderId ?? "-"}`);
      loadFalhos();
    } finally {
      setBusyId(null);
    }
  };

  const verificarAgora = async () => {
    if (!token) return toast.error("Informe o token");
    setMonitorBusy(true);
    try {
      const res = await checkAgora({ data: { token } });
      if (!res.ok) return toast.error("Falha ao verificar");
      toast.success("Saldo verificado");
      await loadMonitor();
    } finally {
      setMonitorBusy(false);
    }
  };

  const testarCronAgora = async () => {
    if (!token) return toast.error("Informe o token");
    setCronBusy(true);
    try {
      const res = await runCron({ data: { token } });
      if (res.ok) toast.success(`Cron OK · HTTP ${res.status} · ${res.elapsed_ms}ms`);
      else toast.error(`Cron falhou · HTTP ${res.status} · ${res.body?.slice(0, 120) ?? ""}`);
      await Promise.all([loadCron(), loadMonitor()]);
    } finally {
      setCronBusy(false);
    }
  };

  const style = f ? NIVEL_STYLE[f.nivel_alerta] : null;
  const online = f?.status === "Online";

  const chartData = useMemo(
    () =>
      (monitor?.historico ?? []).map((h) => ({
        time: new Date(h.t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        brl: h.saldo_brl,
      })),
    [monitor?.historico],
  );

  return (
    <div className="dark min-h-screen bg-background text-foreground p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-2xl font-bold">Admin · BoostGram</h1>
          <Button
            variant={soundOn ? "default" : "outline"}
            size="sm"
            onClick={toggleSound}
          >
            {soundOn ? "🔔 Som ON" : "🔕 Ativar alerta sonoro"}
          </Button>
        </div>

        <div className="flex gap-2">
          <Input
            type="password"
            placeholder="ADMIN_TOKEN"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="flex-1"
          />
          <Button onClick={load} disabled={loading}>
            {loading ? "Carregando..." : "Listar pagos"}
          </Button>
        </div>

        {/* ⛽ Central de Abastecimento Rápido */}
        <div className="rounded-2xl border-2 border-amber-500/60 bg-gradient-to-br from-amber-950/50 via-orange-950/40 to-slate-950/60 p-6 shadow-[0_0_45px_rgba(245,158,11,0.45)] space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl font-extrabold tracking-tight">⛽ Abastecimento de Combustível</h2>
            <span className="text-xs text-muted-foreground">Recarga expressa via PIX</span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { nome: "SMMhype",         emoji: "🚀", url: "https://smmhype.com/addfunds" },
              { nome: "SMMPainel",       emoji: "⚙️", url: "https://smmpainel.com/addfunds" },
              { nome: "Verified Atacado", emoji: "✅", url: "https://verifiedatacado.com/addfunds" },
            ].map((p) => (
              <div
                key={p.nome}
                className="rounded-xl bg-black/40 border border-amber-500/30 p-4 flex flex-col gap-3 hover:border-amber-400/70 hover:shadow-[0_0_25px_rgba(251,191,36,0.4)] transition-all"
              >
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{p.emoji}</span>
                  <span className="font-bold text-amber-100">{p.nome}</span>
                </div>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-sm py-2 px-3 hover:from-amber-400 hover:to-orange-400 shadow-[0_0_20px_rgba(245,158,11,0.5)]"
                >
                  ⚡ RECARREGAR VIA PIX
                </a>
              </div>
            ))}
          </div>
        </div>


        {/* Navegação Multi-Painel (Casa dos Avós) */}
        <div className="rounded-2xl border border-border bg-card/30 p-2 flex flex-wrap gap-2">
          {REDES.map((r) => {
            const active = aba === r.key;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => !r.disabled && setAba(r.key)}
                disabled={r.disabled}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  active
                    ? "bg-fuchsia-500/20 text-fuchsia-100 border-fuchsia-500/60 shadow-[0_0_20px_rgba(217,70,239,0.35)]"
                    : r.disabled
                    ? "bg-background/30 text-muted-foreground/60 border-border/50 cursor-not-allowed"
                    : "bg-background/40 text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                <span className="mr-1.5">{r.icon}</span>{r.label}
              </button>
            );
          })}
        </div>

        {/* Visão Geral — faturamento somado de todas as redes */}
        {aba === "overview" && (
          <div className="rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-950/50 to-slate-950/60 p-6 shadow-[0_0_30px_rgba(16,185,129,0.25)] space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xl font-extrabold tracking-tight">🌐 Visão Geral — Casa dos Avós</h2>
              <span className="text-xs text-muted-foreground">{faturamento?.count ?? 0} pedido(s) pagos</span>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl bg-black/30 border border-emerald-500/30 p-4">
                <div className="text-xs uppercase text-muted-foreground">Faturamento Total</div>
                <div className="mt-1 text-2xl font-bold text-emerald-300">
                  R$ {(faturamento?.geral ?? 0).toFixed(2)}
                </div>
              </div>
              {REDES.filter((r) => r.key !== "overview").map((r) => {
                const t = faturamento?.totais[r.key];
                return (
                  <div key={r.key} className={`rounded-xl bg-black/30 border p-4 ${r.disabled ? "border-border/40 opacity-60" : "border-border"}`}>
                    <div className="text-xs uppercase text-muted-foreground">{r.icon} {r.label}</div>
                    <div className="mt-1 text-2xl font-bold">R$ {(t?.total ?? 0).toFixed(2)}</div>
                    <div className="text-[10px] text-muted-foreground">{t?.count ?? 0} pedido(s)</div>
                  </div>
                );
              })}
            </div>
            <div className="rounded-xl bg-black/30 border border-border p-4">
              <div className="text-xs uppercase text-muted-foreground mb-2">🤖 Status global dos robôs de saldo</div>
              {f ? (
                <div className="flex items-center gap-3 text-sm flex-wrap">
                  <span className="inline-flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${f.status === "Online" ? "bg-emerald-400" : "bg-red-500"} animate-pulse`} />
                    {f.nome}: <strong>{f.status}</strong>
                  </span>
                  <span>· Saldo: <strong>R$ {f.saldo_brl?.toFixed(2) ?? "—"}</strong></span>
                  <span>· Nível: <strong>{NIVEL_STYLE[f.nivel_alerta].emoji} {NIVEL_STYLE[f.nivel_alerta].label}</strong></span>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Carregando status...</div>
              )}
            </div>
          </div>
        )}



        {/* Assistente de Caixa Inteligente */}
        {caixa && (
          <div className="rounded-2xl border-2 border-indigo-500/60 bg-gradient-to-br from-indigo-950/60 to-slate-950/60 p-6 shadow-[0_0_40px_rgba(99,102,241,0.35)] space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xl font-extrabold tracking-tight">💡 Assistente de Caixa Inteligente</h2>
              {caixa.alerts.length > 0 && (
                <span className="text-xs font-semibold rounded-full px-3 py-1 bg-red-600/80 text-white">
                  {caixa.alerts.length} alerta(s) aberto(s)
                </span>
              )}
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-xl bg-black/30 border border-white/10 p-4">
                <div className="text-xs uppercase text-muted-foreground">SMMhype</div>
                <div className="mt-1 text-2xl font-bold">
                  R$ {caixa.supplier?.saldo_atual.toFixed(2) ?? "0.00"}
                </div>
                <div className="mt-2 text-sm">
                  Custo para atingir a Meta Ideal (R$ {caixa.supplier?.meta_ideal.toFixed(2) ?? "1000.00"}):{" "}
                  <span className="font-semibold text-emerald-400">
                    Falta depositar R$ {caixa.supplier?.falta_depositar.toFixed(2) ?? "0.00"} no SMMhype
                  </span>
                </div>
              </div>
              <div className="rounded-xl bg-black/30 border border-white/10 p-4">
                <div className="text-xs uppercase text-muted-foreground">{caixa.bank?.nome ?? "Caixa"}</div>
                <div className="mt-1 text-2xl font-bold">
                  R$ {caixa.bank?.saldo_atual.toFixed(2) ?? "0.00"}
                </div>
                <div className={`mt-2 text-sm font-semibold ${caixa.bank?.ok ? "text-emerald-400" : "text-red-400"}`}>
                  {caixa.bank?.status_text}
                </div>
              </div>
            </div>
            {caixa.alerts.length > 0 && (
              <div className="space-y-2">
                {caixa.alerts.slice(0, 5).map((a) => (
                  <div
                    key={a.id}
                    className={`rounded-lg border p-3 text-sm ${
                      a.nivel >= 2
                        ? "border-red-500 bg-red-950/40 text-red-100"
                        : "border-yellow-500 bg-yellow-950/40 text-yellow-100"
                    }`}
                  >
                    <div className="font-semibold">
                      {a.nivel >= 2 ? "🚨 Nível 2 · URGENTE" : "⚠️ Nível 1"} · {new Date(a.created_at).toLocaleString("pt-BR")}
                    </div>
                    <div>{a.mensagem}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}


        {/* Widget Monitor de Saldo */}
        {f && style && (
          <div className="space-y-3">
            {!online && (
              <div className="rounded-lg border-2 border-red-600 bg-red-950/60 p-4 text-center font-black tracking-wide text-red-300 uppercase shadow-[0_0_30px_rgba(239,68,68,0.6)]">
                ⚠ ATENÇÃO: NÃO FOI POSSÍVEL CONSULTAR O SALDO DO FORNECEDOR SMMHYPE
              </div>
            )}

            <div className={`rounded-2xl border-2 ${style.border} ${style.bg} ${style.glow} p-6 transition-all`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">📸 Robô de Saldo · Instagram</div>
                  <div className="mt-1 flex items-center gap-3 text-3xl font-extrabold">
                    <span>{style.emoji}</span>
                    <span>{style.label}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={verificarAgora} disabled={monitorBusy}>
                    {monitorBusy ? "..." : "Testar conexão"}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={verificarAgora} disabled={monitorBusy}>
                    {monitorBusy ? "Verificando..." : "Verificar agora"}
                  </Button>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                <Info label="Fornecedor" value={f.nome} />
                <Info
                  label="Servidor"
                  value={
                    <span className="inline-flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${online ? "bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.9)]" : "bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.9)]"}`} />
                      {f.status}
                    </span>
                  }
                />
                <Info
                  label="Saldo (USD)"
                  value={f.saldo_usd != null ? `$ ${f.saldo_usd.toFixed(2)}` : "—"}
                />
                <Info
                  label={`Saldo (BRL · ${f.usd_to_brl.toFixed(2)})`}
                  value={f.saldo_brl != null ? `R$ ${f.saldo_brl.toFixed(2)}` : "—"}
                />
                <Info
                  label="Última verificação"
                  value={f.ultima_verificacao ? new Date(f.ultima_verificacao).toLocaleString("pt-BR") : "—"}
                />
                <Info label="Falhas consecutivas" value={String(f.falhas_consecutivas)} />
              </div>
            </div>

            {/* Status do Cron */}
            <CronCard cron={cron} busy={cronBusy} onTest={testarCronAgora} falhas={f.falhas_consecutivas} />

            {/* Cache de Serviços do Instagram */}
            <ServicesCacheCard cache={cache} busy={cacheBusy} onSync={sincronizarAgora} />




            {/* Histórico 24h */}
            <div className="rounded-2xl border border-border bg-card/40 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Histórico de saldo (últimas 24h · BRL)</h2>
                <span className="text-xs text-muted-foreground">{chartData.length} pontos</span>
              </div>
              {chartData.length === 0 ? (
                <div className="text-sm text-muted-foreground py-10 text-center">Sem dados ainda. Aguarde a próxima verificação.</div>
              ) : (
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                      <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickFormatter={(v) => `R$${v}`} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                        formatter={(v: number) => [`R$ ${v?.toFixed(2)}`, "Saldo"]}
                      />
                      <ReferenceLine y={50} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "R$50", fill: "#ef4444", fontSize: 10 }} />
                      <ReferenceLine y={20} stroke="#dc2626" strokeDasharray="4 4" label={{ value: "R$20", fill: "#dc2626", fontSize: 10 }} />
                      <Line type="monotone" dataKey="brl" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Fornecedores (multi — placeholder) */}
            <div className="rounded-2xl border border-border bg-card/40 p-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Fornecedores</h3>
                <p className="text-xs text-muted-foreground">Atualmente: SMMhype. Suporte a múltiplos fornecedores em breve.</p>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">+ Cadastrar fornecedor</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cadastrar novo fornecedor</DialogTitle>
                    <DialogDescription>
                      Em breve. Estrutura preparada para herdar a tabela <code>fornecedores</code>.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 opacity-60 pointer-events-none">
                    <Input placeholder="Nome (ex: SMMPanel)" disabled />
                    <Input placeholder="URL da API" disabled />
                    <Input placeholder="Nome da secret (ex: SMMPANEL_API_KEY)" disabled />
                  </div>
                  <DialogFooter>
                    <Button disabled>Cadastrar (em breve)</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        )}

        {/* Auditoria de falhas (SMM + MP recusado + valor divergente) */}
        {(() => {
          const lista = falhos.filter((p) => aba === "overview" || (p.rede_social ?? "instagram") === aba);
          if (lista.length === 0) return null;
          return (
          <div className="rounded-2xl border-2 border-red-600 bg-red-950/40 shadow-[0_0_40px_rgba(239,68,68,0.45)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-red-200 flex items-center gap-2">
                🚨 {lista.length} pedido(s) com falha — requer ação
              </h2>
              <Button size="sm" variant="outline" onClick={() => loadFalhos()}>Atualizar</Button>
            </div>
            <div className="divide-y divide-red-900/60">
              {lista.map((p) => {

                const isCurtidas = p.pacote?.toLowerCase().startsWith("l");
                const isSmm = p.status === "SMM_FAILED";
                return (
                  <div key={p.id} className="py-3 flex items-start justify-between gap-3 text-sm">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span title={p.rede_social ?? "instagram"} className="text-base leading-none">
                          {REDE_ICON[p.rede_social ?? "instagram"] ?? "📸"}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-200 border border-red-500/50">
                          {p.status}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-background/40 text-muted-foreground">
                          {isCurtidas ? "Curtidas" : "Seguidores"}
                        </span>
                        <span className="font-semibold">{p.pacote}</span> · {p.quantidade} · @{p.instagram_user}

                      </div>
                      {p.error_detail && (
                        <div className="text-xs text-red-300/90 font-mono break-all">{p.error_detail}</div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleString("pt-BR")} · MP: {p.mercado_pago_id ?? "-"} · {p.id}
                      </div>
                    </div>
                    {isSmm && (
                      <Button size="sm" onClick={() => reenviar(p.id)} disabled={busyId === p.id}>
                        {busyId === p.id ? "..." : "Tentar de novo"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          );
        })()}

        {/* Pedidos pendentes (Pix gerado, aguardando pagamento) */}
        {(() => {
          const lista = pendentes.filter((p) => aba === "overview" || (p.rede_social ?? "instagram") === aba);
          if (lista.length === 0) return null;
          return (
          <div className="rounded-2xl border border-yellow-700/60 bg-yellow-950/20 p-4 space-y-3">

            <div className="flex items-center justify-between">
              <h2 className="font-bold text-yellow-200 flex items-center gap-2">
                ⏳ {lista.length} pedido(s) pendente(s)
              </h2>
              <Button size="sm" variant="outline" onClick={() => loadPendentes()}>Atualizar</Button>
            </div>
            <div className="divide-y divide-yellow-900/40">
              {lista.map((p) => (
                <div key={p.id} className="py-2 flex items-start justify-between gap-3 text-sm">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span title={p.rede_social ?? "instagram"} className="text-base leading-none">
                        {REDE_ICON[p.rede_social ?? "instagram"] ?? "📸"}
                      </span>
                      <span className="font-semibold">{p.pacote}</span> · {p.quantidade} · @{p.instagram_user}

                      {p.abandono_notificado_at && (
                        <span
                          title={`Enviado em ${new Date(p.abandono_notificado_at).toLocaleString("pt-BR")}`}
                          className="px-2 py-0.5 rounded-full text-[10px] font-semibold border bg-emerald-500/10 text-emerald-300 border-emerald-500/40"
                        >
                          ✓ Notificação de Abandono Enviada
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(p.created_at).toLocaleString("pt-BR")} · MP: {p.mercado_pago_id ?? "-"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          );
        })()}




        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">Filtrar:</span>
          {(["todos", "seguidores", "curtidas"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFiltro(f)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-colors ${
                filtro === f
                  ? "bg-fuchsia-500/20 text-fuchsia-200 border-fuchsia-500/50"
                  : "bg-background/40 text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              {f === "todos" ? "Todos" : f === "seguidores" ? "Seguidores" : "Curtidas"}
            </button>
          ))}
          <span className="text-xs text-muted-foreground ml-auto">
            {pedidos.filter((p) => {
              if (aba !== "overview" && (p.rede_social ?? "instagram") !== aba) return false;
              if (filtro === "todos") return true;
              const isC = p.pacote?.toLowerCase().startsWith("l");
              return filtro === "curtidas" ? isC : !isC;
            }).length} pedido(s)
          </span>
        </div>

        <div className="border border-border rounded-lg divide-y divide-border">
          {pedidos.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">Nenhum pedido carregado.</div>
          )}
          {pedidos
            .filter((p) => {
              if (aba !== "overview" && (p.rede_social ?? "instagram") !== aba) return false;
              if (filtro === "todos") return true;
              const isC = p.pacote?.toLowerCase().startsWith("l");
              return filtro === "curtidas" ? isC : !isC;
            })

            .map((p) => {
            const isCurtidas = p.pacote?.toLowerCase().startsWith("l");
            return (
              <div key={p.id} className="p-4 flex items-center justify-between gap-4 text-sm">
                <div className="space-y-1">
                  <div className="font-mono text-xs text-muted-foreground">{p.id}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span title={p.rede_social ?? "instagram"} className="text-base leading-none">
                      {REDE_ICON[p.rede_social ?? "instagram"] ?? "📸"}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      isCurtidas
                        ? "bg-pink-500/15 text-pink-300 border border-pink-500/40"
                        : "bg-fuchsia-500/15 text-fuchsia-300 border border-fuchsia-500/40"
                    }`}>
                      {isCurtidas ? "Curtidas" : "Seguidores"}
                    </span>
                    <span className="font-semibold">{p.pacote}</span> · {p.quantidade} · @{p.instagram_user}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleString("pt-BR")} · MP: {p.mercado_pago_id ?? "-"}
                  </div>
                </div>
                <Button size="sm" onClick={() => reenviar(p.id)} disabled={busyId === p.id}>
                  {busyId === p.id ? "Enviando..." : "Reenviar SMM"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg bg-background/40 border border-border/60 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-semibold text-foreground">{value}</div>
    </div>
  );
}

function CronCard({
  cron,
  busy,
  onTest,
  falhas,
}: {
  cron: {
    jobname: string; schedule: string; active: boolean;
    last_start: string | null; last_end: string | null;
    last_status: string | null; last_return: string | null;
  } | null;
  busy: boolean;
  onTest: () => void;
  falhas: number;
}) {
  const lastOk = cron?.last_status === "succeeded";
  const lastFail = cron?.last_status && cron.last_status !== "succeeded";
  const stale = cron?.last_start
    ? Date.now() - new Date(cron.last_start).getTime() > 10 * 60 * 1000
    : true;
  const healthy = !!cron?.active && lastOk && !stale;
  const dot = healthy ? "bg-emerald-400" : lastFail ? "bg-red-500" : "bg-yellow-400";
  const label = !cron
    ? "Sem dados"
    : !cron.active
    ? "Inativo"
    : lastFail
    ? "Falhou"
    : stale
    ? "Atrasado"
    : "Rodando";

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${dot} animate-pulse`} />
            Status do Cron · {label}
          </h3>
          <p className="text-xs text-muted-foreground">
            Agendamento automático que chama <code>/api/public/check-saldo</code> a cada 5 min.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onTest} disabled={busy}>
          {busy ? "Testando..." : "Testar Cron"}
        </Button>
      </div>

      {falhas >= 3 && (
        <div className="rounded-md border border-red-600 bg-red-950/50 p-3 text-sm text-red-200 font-semibold">
          ⚠ {falhas} falhas consecutivas detectadas — verifique logs e token.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <Info label="Job" value={cron?.jobname ?? "—"} />
        <Info label="Schedule" value={cron?.schedule ?? "—"} />
        <Info label="Ativo" value={cron?.active ? "Sim" : "Não"} />
        <Info
          label="Última execução"
          value={cron?.last_start ? new Date(cron.last_start).toLocaleString("pt-BR") : "—"}
        />
        <Info label="Status" value={cron?.last_status ?? "—"} />
        <Info
          label="Retorno"
          value={
            <span className="font-mono text-xs break-all line-clamp-2">
              {cron?.last_return ?? "—"}
            </span>
          }
        />
      </div>
    </div>
  );
}

function ServicesCacheCard({
  cache,
  busy,
  onSync,
}: {
  cache: { total: number; last_sync: string | null; missing_monitored: number[]; monitorados: number[] } | null;
  busy: boolean;
  onSync: () => void;
}) {
  const hasMissing = (cache?.missing_monitored.length ?? 0) > 0;
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full ${hasMissing ? "bg-red-500 animate-pulse" : "bg-emerald-400 animate-pulse"}`} />
            Cache de Serviços · Instagram (Refill)
          </h3>
          <p className="text-xs text-muted-foreground">
            Sincroniza com SMMhype a cada 6h. Apenas serviços de Instagram com garantia de reposição.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onSync} disabled={busy}>
          {busy ? "Sincronizando..." : "Sincronizar agora"}
        </Button>
      </div>

      {hasMissing && (
        <div className="rounded-md border-2 border-red-600 bg-red-950/60 p-3 text-sm font-bold text-red-200">
          🚨 ATENÇÃO: serviço(s) monitorado(s) sumiram do fornecedor: {cache!.missing_monitored.join(", ")}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
        <Info label="Serviços ativos no cache" value={String(cache?.total ?? 0)} />
        <Info
          label="Última sincronização"
          value={cache?.last_sync ? new Date(cache.last_sync).toLocaleString("pt-BR") : "—"}
        />
        <Info label="IDs monitorados" value={cache?.monitorados.join(", ") ?? "—"} />
      </div>
    </div>
  );
}


