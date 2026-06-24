import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { listarPedidosPagos, reprocessarPedido } from "@/lib/admin.functions";
import { getMonitorSaldo, verificarSaldoAgora, getCronStatus, testarCron } from "@/lib/monitor.functions";
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
  const reprocessar = useServerFn(reprocessarPedido);
  const getMonitor = useServerFn(getMonitorSaldo);
  const checkAgora = useServerFn(verificarSaldoAgora);
  const getCron = useServerFn(getCronStatus);
  const runCron = useServerFn(testarCron);

  const [token, setToken] = useState("");
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
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

  useEffect(() => {
    if (!token) return;
    loadMonitor();
    loadCron();
    const i = setInterval(() => { loadMonitor(); loadCron(); }, 30000);
    return () => clearInterval(i);
  }, [token]);

  // Alerta sonoro: dispara a cada 30s enquanto em estado crítico
  const f = monitor?.fornecedor;
  const isAlerta =
    !!f && (f.status === "Offline" || f.nivel_alerta === "vermelho" || f.nivel_alerta === "critico");

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
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Status do Estoque Atacadista</div>
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

        <div className="border border-border rounded-lg divide-y divide-border">
          {pedidos.length === 0 && (
            <div className="p-4 text-sm text-muted-foreground">Nenhum pedido carregado.</div>
          )}
          {pedidos.map((p) => (
            <div key={p.id} className="p-4 flex items-center justify-between gap-4 text-sm">
              <div className="space-y-1">
                <div className="font-mono text-xs text-muted-foreground">{p.id}</div>
                <div>
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
          ))}
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
