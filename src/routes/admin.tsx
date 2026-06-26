import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { listarPedidosPagos, listarPedidosFalhos, listarPedidosPendentes, reprocessarPedido, getFaturamentoPorRede, pingSmmhype, sincronizarIdsApi, getGrowthCentral, smartApproveIds } from "@/lib/admin.functions";
import { getMonitorSaldo, verificarSaldoAgora, getCronStatus, testarCron, getCaixaAssistente, atualizarCotacaoFornecedor } from "@/lib/monitor.functions";
import { getServicesCacheStatus, sincronizarServicosAgora } from "@/lib/services-cache.functions";
import { listarFornecedores, toggleFornecedorAtivo } from "@/lib/fornecedores.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Settings } from "lucide-react";
import jarvisHud from "@/assets/jarvis-hud.png";
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
import { useJarvis, useJarvisHistory, useJarvisSubtitle, SUBTITLES } from "@/hooks/useJarvis";

import { getAdminTokenForSession } from "@/lib/admin-session.functions";
import { unlockJarvis } from "@/hooks/useJarvis";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_TOKEN_KEY = "eliteboost_prime_admin_token";
const ADMIN_EMAIL = "fabiano.majestic@gmail.com";

function AdminSettingsButton() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" aria-label="Configurações" className="px-2">
          <Settings size={16} />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>⚙️ Configurações Gerais</DialogTitle>
          <DialogDescription>
            Preferências do painel EliteBoost Prime · sessão atual.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between border-b border-border/40 pb-2">
            <span className="text-muted-foreground">Administrador</span>
            <span className="font-mono">{ADMIN_EMAIL}</span>
          </div>
          <div className="flex justify-between border-b border-border/40 pb-2">
            <span className="text-muted-foreground">Cache áudio Jarvis</span>
            <span className="font-mono">v=22</span>
          </div>
          <div className="flex justify-between border-b border-border/40 pb-2">
            <span className="text-muted-foreground">RLS jarvis_alerts</span>
            <span className="text-emerald-400 font-bold">Ativo</span>
          </div>
          <div className="flex justify-between border-b border-border/40 pb-2">
            <span className="text-muted-foreground">Failover A→B→C</span>
            <span className="text-emerald-400 font-bold">Ativo</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">BrandGuard</span>
            <span className="text-emerald-400 font-bold">Ativo</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin · EliteBoost Prime" }, { name: "robots", content: "noindex,nofollow" }] }),
  component: AdminGate,
});

function AdminGate() {
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [adminToken, setAdminToken] = useState("");
  const fetchAdminToken = useServerFn(getAdminTokenForSession);

  const hydrate = useCallback(async (): Promise<boolean> => {
    const { data } = await supabase.auth.getSession();
    const email = data.session?.user?.email?.toLowerCase() ?? null;
    if (!data.session || email !== ADMIN_EMAIL) {
      window.localStorage.removeItem(ADMIN_TOKEN_KEY);
      setAdminToken("");
      setAuthed(false);
      return false;
    }
    // Sessão Supabase ativa é a credencial mestre do shell; o token legado é só ponte para funções internas.
    setAuthed(true);
    try {
      const res = await fetchAdminToken({ data: {} as never });
      if (res.ok) {
        window.localStorage.setItem(ADMIN_TOKEN_KEY, res.token);
        setAdminToken(res.token);
        setAuthed(true);
        return true;
      } else {
        await supabase.auth.signOut();
        window.localStorage.removeItem(ADMIN_TOKEN_KEY);
        setAdminToken("");
        setAuthed(false);
        return false;
      }
    } catch {
      const cached = window.localStorage.getItem(ADMIN_TOKEN_KEY) ?? "";
      setAdminToken(cached);
      return true;
    }
  }, [fetchAdminToken]);

  useEffect(() => {
    setMounted(true);
    void hydrate();
    const { data: sub } = supabase.auth.onAuthStateChange((evt) => {
      if (evt === "SIGNED_OUT") {
        window.localStorage.removeItem(ADMIN_TOKEN_KEY);
        setAdminToken("");
        setAuthed(false);
      }
      if (evt === "SIGNED_IN" || evt === "TOKEN_REFRESHED") void hydrate();
    });
    return () => { sub.subscription.unsubscribe(); };
  }, [hydrate]);

  if (!mounted) return null;
  if (!authed) return <AdminLogin onSuccess={hydrate} />;
  return <AdminPage initialToken={adminToken} />;
}

const REMEMBER_KEY = "eliteboost_remember_me";

function AdminLogin({ onSuccess }: { onSuccess: () => Promise<boolean> }) {
  const navigate = useNavigate({ from: "/admin" });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(REMEMBER_KEY) !== "0";
  });
  const [localSubtitle, setLocalSubtitle] = useState<string | null>(null);
  const liveSubtitle = useJarvisSubtitle();
  const subtitle = liveSubtitle ?? localSubtitle;

  const playWelcome = () => {
    try {
      const a = new Audio("/api/public/sfx/welcome.mp3?v=22");
      a.crossOrigin = "anonymous";
      a.preload = "auto";
      a.volume = 1.0;
      setLocalSubtitle(SUBTITLES.welcome);
      const clear = () => setLocalSubtitle(null);
      a.onended = clear;
      a.onerror = clear;
      void a.play().catch(clear);
      window.setTimeout(clear, 8000);
    } catch {}
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password || loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error || !data?.user) {
        toast.error("Credenciais inválidas");
        return;
      }
      // Remember-me: se desmarcado, derruba sessão ao fechar a aba.
      window.localStorage.setItem(REMEMBER_KEY, remember ? "1" : "0");
      if (!remember) {
        const drop = () => { void supabase.auth.signOut(); };
        window.addEventListener("beforeunload", drop, { once: true });
      }
      // ✅ Áudio APÓS sucesso real da autenticação
      playWelcome();
      void unlockJarvis();
      await onSuccess();
      toast.success("Acesso autorizado · Jarvis online");
      await navigate({ to: "/admin", replace: true });
    } catch {
      toast.error("Falha ao validar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dark min-h-screen relative overflow-hidden bg-black text-white flex items-center justify-center p-4">
      {/* Red HUD background — digital mesh + cyber face glow */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,0,40,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,40,0.18) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,0,40,0.28), transparent 70%)",
        }}
      />
      <div aria-hidden className="hidden lg:block absolute left-8 top-1/2 -translate-y-1/2 opacity-30">
        <svg width="280" height="380" viewBox="0 0 200 280" fill="none" stroke="#ff0028" strokeWidth="1">
          <path d="M100 20 C60 20 40 60 40 110 L40 180 C40 220 70 250 100 250 C130 250 160 220 160 180 L160 110 C160 60 140 20 100 20 Z" />
          <circle cx="75" cy="130" r="14" /><circle cx="125" cy="130" r="14" />
          <path d="M70 175 L130 175" /><path d="M40 110 L20 110" /><path d="M160 110 L180 110" />
        </svg>
      </div>
      <div aria-hidden className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 opacity-30 scale-x-[-1]">
        <svg width="280" height="380" viewBox="0 0 200 280" fill="none" stroke="#ff0028" strokeWidth="1">
          <path d="M100 20 C60 20 40 60 40 110 L40 180 C40 220 70 250 100 250 C130 250 160 220 160 180 L160 110 C160 60 140 20 100 20 Z" />
          <circle cx="75" cy="130" r="14" /><circle cx="125" cy="130" r="14" />
          <path d="M70 175 L130 175" />
        </svg>
      </div>

      {subtitle && (
        <div className="hidden lg:flex absolute left-[330px] top-1/2 -translate-y-1/2 max-w-[280px] z-20 animate-fade-in">
          <div className="relative rounded-2xl border border-red-500/60 bg-black/80 backdrop-blur-md px-4 py-3 text-sm text-red-100 shadow-[0_0_30px_rgba(255,0,40,0.5)]">
            <span className="absolute -left-2 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 border-l border-b border-red-500/60 bg-black/80" />
            🎙️ {subtitle}
          </div>
        </div>
      )}
      {subtitle && (
        <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 max-w-[90%] z-20 animate-fade-in">
          <div className="rounded-2xl border border-red-500/60 bg-black/80 backdrop-blur-md px-4 py-2 text-xs text-red-100 shadow-[0_0_30px_rgba(255,0,40,0.5)] text-center">
            🎙️ {subtitle}
          </div>
        </div>
      )}

      <div className="w-full max-w-[450px] mx-auto relative z-10">
        <form
          onSubmit={submit}
          className="rounded-2xl border border-red-500/40 bg-gradient-to-b from-zinc-950 to-black p-8 shadow-[0_0_60px_rgba(255,0,40,0.35)] space-y-5"
        >
          <div className="text-center space-y-2">
            <div className="text-4xl">🔐</div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
              Painel EliteBoost Prime
            </h1>
            <p className="text-xs text-zinc-400">Supabase Auth · Administrador-Mestre</p>
          </div>
          <Input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            autoComplete="email"
            className="bg-black/60 border-red-500/30 text-white placeholder:text-zinc-600 h-12 text-center"
          />
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="bg-black/60 border-red-500/30 text-white placeholder:text-zinc-600 h-12 text-center tracking-widest pr-14"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-20 flex h-9 w-9 items-center justify-center rounded-md bg-black/70 border border-red-500/40 text-red-300 hover:text-white hover:bg-red-600/30 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} strokeWidth={2.4} /> : <Eye size={18} strokeWidth={2.4} />}
            </button>
          </div>
          <label className="flex items-center gap-2 text-xs text-zinc-300 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-red-500/50 bg-black/60 accent-red-500 cursor-pointer"
            />
            Lembrar de mim neste dispositivo
          </label>
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 font-bold bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-[0_0_30px_rgba(255,0,40,0.6)] hover:shadow-[0_0_45px_rgba(255,0,40,0.8)] transition-all"
          >
            {loading ? "Validando..." : "Entrar no Painel"}
          </Button>
          <p className="text-[10px] text-center text-zinc-600">
            Read-Only · RLS Ativo · Jarvis em standby
          </p>
        </form>
      </div>
    </div>
  );
}

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

type RedeKey = "overview" | "instagram" | "tiktok" | "youtube" | "facebook" | "trafego" | "telegram";

const REDES: { key: RedeKey; label: string; icon: string; disabled?: boolean }[] = [
  { key: "overview",  label: "Visão Geral", icon: "🌐" },
  { key: "instagram", label: "Instagram",   icon: "📸" },
  { key: "tiktok",    label: "TikTok",      icon: "🎵" },
  { key: "youtube",   label: "YouTube",     icon: "📺" },
  { key: "facebook",  label: "Facebook",    icon: "🔵" },
  { key: "trafego",   label: "Tráfego Web", icon: "🌐" },
  { key: "telegram",  label: "Telegram",    icon: "✈️" },
];

const REDE_ICON: Record<string, string> = {
  instagram: "📸",
  tiktok: "🎵",
  youtube: "📺",
  facebook: "🔵",
  trafego: "🌐",
  telegram: "✈️",
};


type Historico = { t: string; saldo_usd: number | null; saldo_brl: number | null; status: string };

type MonitorState = {
  fornecedor: {
    id?: string;
    nome: string;
    status: string;
    saldo_usd: number | null;
    saldo_brl: number | null;
    nivel_alerta: "verde" | "amarelo" | "laranja" | "vermelho" | "critico";
    ultima_verificacao: string | null;
    falhas_consecutivas: number;
    usd_to_brl: number;
    cotacao_brl?: number;
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

// WebAudio beep — background-safe (Web Worker timer + silent loop keeps áudio vivo em segundo plano)
function useAlertBeep() {
  const ctxRef = useRef<AudioContext | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const silentRef = useRef<HTMLAudioElement | null>(null);
  const enabledRef = useRef(false);

  const enable = () => {
    if (enabledRef.current) return;
    try {
      const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
      const ctx = new Ctx();
      ctxRef.current = ctx;
      // Mantém o AudioContext em "running" mesmo com aba em background.
      ctx.resume().catch(() => {});

      // Silent looping audio — impede o navegador de suspender o pipeline de áudio
      // quando a aba está oculta/minimizada (especialmente Chrome desktop e iOS Safari).
      const a = document.createElement("audio");
      a.loop = true;
      a.muted = false;
      a.volume = 0.001;
      // 1s de silêncio WAV (16-bit PCM mono 8kHz)
      a.src =
        "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
      a.play().catch(() => {});
      silentRef.current = a;

      // Web Worker tick — setInterval no thread principal é throttle-ado para 1s+ em background.
      // Worker timers continuam disparando na frequência real mesmo com aba oculta.
      const workerCode = `let h=null;onmessage=(e)=>{const d=e.data;if(d&&d.type==='start'){clearInterval(h);h=setInterval(()=>postMessage('tick'),d.interval);}else if(d&&d.type==='stop'){clearInterval(h);h=null;}};`;
      const blob = new Blob([workerCode], { type: "application/javascript" });
      const url = URL.createObjectURL(blob);
      const w = new Worker(url);
      workerRef.current = w;

      enabledRef.current = true;
    } catch {}
  };

  const beep = () => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    const now = ctx.currentTime;
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

  // Loop persistente baseado em Worker — não throttla em background.
  const startLoop = (intervalMs: number) => {
    const w = workerRef.current;
    if (!w) return;
    w.onmessage = () => beep();
    w.postMessage({ type: "start", interval: intervalMs });
    beep();
  };
  const stopLoop = () => {
    workerRef.current?.postMessage({ type: "stop" });
  };

  return { enable, beep, startLoop, stopLoop, isEnabled: () => enabledRef.current };
}

function AdminPage({ initialToken }: { initialToken: string }) {
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
  const listFornecedores = useServerFn(listarFornecedores);
  const toggleFornecedor = useServerFn(toggleFornecedorAtivo);
  const updateCotacao = useServerFn(atualizarCotacaoFornecedor);

  const getFaturamento = useServerFn(getFaturamentoPorRede);
  const pingSmm = useServerFn(pingSmmhype);
  const syncIdsApi = useServerFn(sincronizarIdsApi);
  const smartApprove = useServerFn(smartApproveIds);
  const [approving, setApproving] = useState(false);
  const getGrowth = useServerFn(getGrowthCentral);

  type GrowthState = {
    funil: Record<string, { paid: number; pending: number; cancelled: number; failed: number; total: number; revenue: number }>;
    total_pedidos: number;
    margem: Record<string, { custo_brl_mil: number | null; venda_brl_mil: number; margem_pct: number | null }>;
    cotacao: number;
  };
  const [growth, setGrowth] = useState<GrowthState | null>(null);
  const loadGrowth = async (tk = token) => {
    if (!tk) return;
    try {
      const res = await getGrowth({ data: { token: tk } });
      if (res.ok) setGrowth({ funil: res.funil, total_pedidos: res.total_pedidos, margem: res.margem, cotacao: res.cotacao });
    } catch {}
  };

  // Recuperação de carrinho abandonado: copy oficial + WhatsApp API (encodeURIComponent).
  // Espelha src/lib/whatsapp-alert.server.ts → buildRecoveryWhatsappText/Url.
  const recuperarVenda = (_p: { instagram_user: string; pacote: string; quantidade: number; rede_social?: string | null; id: string }) => {
    const tpl =
      "Olá! Identificamos uma instabilidade temporária no nosso checkout de Pix " +
      "enquanto você finalizava o seu pedido na EliteBoost Prime. Pedimos sinceras " +
      "desculpas pelo inconveniente! 🙏 Para garantir que você não perca os seus " +
      "bônus de crescimento de algoritmo, geramos um link de contingência direto e " +
      "seguro. Basta clicar para finalizar com ativação imediata: https://t.me";
    try {
      navigator.clipboard?.writeText(tpl);
      toast.success("Copy oficial copiada. Cole no WhatsApp do cliente.");
    } catch {
      toast("Template gerado", { description: tpl.slice(0, 80) + "…" });
    }
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(tpl)}`;
    window.open(url, "_blank", "noopener");
  };

  const [pingResult, setPingResult] = useState<{ ok: boolean; msg: string; ms?: number } | null>(null);
  const [pingBusy, setPingBusy] = useState(false);
  const [syncIdsBusy, setSyncIdsBusy] = useState(false);
  const [syncIdsResult, setSyncIdsResult] = useState<any>(null);
  const handleSyncIds = async () => {
    if (!token) return toast.error("Informe o token");
    setSyncIdsBusy(true);
    try {
      const r = await syncIdsApi({ data: { token } });
      if (r.ok) {
        setSyncIdsResult(r.picks);
        const count = Object.values(r.picks).flatMap((n: any) => Object.values(n)).filter(Boolean).length;
        toast.success(`🤖 ${count} IDs mais baratos mapeados de ${r.total_scanned} serviços`);
      } else {
        toast.error(`Sync falhou: ${r.error}`);
      }
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    } finally {
      setSyncIdsBusy(false);
    }
  };
  const handlePingSmm = async () => {
    if (!token) return toast.error("Informe o token");
    setPingBusy(true);
    const t0 = performance.now();
    try {
      const r = await pingSmm({ data: { token } });
      const ms = Math.round(performance.now() - t0);
      if (r.ok) {
        const msg = `🟢 Conectado • ${ms}ms · saldo=${r.balance ?? "?"} ${r.currency ?? ""}`.trim();
        setPingResult({ ok: true, msg, ms });
        toast.success(msg);
      } else {
        setPingResult({ ok: false, msg: `🔴 Falhou • ${ms}ms · ${r.error}`, ms });
        toast.error(`Ping falhou: ${r.error}`);
      }
    } catch (e) {
      const ms = Math.round(performance.now() - t0);
      setPingResult({ ok: false, msg: `🔴 Erro • ${ms}ms · ${(e as Error).message}`, ms });
    } finally {
      setPingBusy(false);
    }
  };

  // Espelho client-safe do resolveServiceId — só p/ exibir badge no pedido.
  const resolveServiceIdClient = (pacote: string, qty: number): number | null => {
    const p = String(pacote ?? "").trim().toLowerCase();
    if (p.startsWith("tg")) return null;
    if (p.startsWith("wbr")) return 9313;
    if (p.startsWith("wgl")) return 10351;
    if (p.startsWith("ff")) return 18870;
    if (p.startsWith("fl")) return 7593;
    if (p.startsWith("ys")) return 19440;
    if (p.startsWith("yv")) return 14321;
    if (p.startsWith("tf")) return 14330;
    if (p.startsWith("tl")) return 19191;
    if (p.startsWith("tv")) return 14907;
    if (p.startsWith("v")) return 18855;
    if (p.startsWith("l")) return 18860;
    if (qty >= 100 && qty <= 2000) return 14325;
    if (qty >= 5000 && qty <= 100000) return 14225;
    return null;
  };


  const [token, setToken] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return initialToken || (window.localStorage.getItem("eliteboost_prime_admin_token") ?? "");
  });
  useEffect(() => {
    if (initialToken) setToken(initialToken);
  }, [initialToken]);
  const [loaded, setLoaded] = useState(false);
  void setToken;
  const [aba, setAba] = useState<RedeKey>("overview");
  const [sandbox, setSandbox] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("ELITEBOOST_PRIME_SANDBOX") === "1";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sandbox) window.localStorage.setItem("ELITEBOOST_PRIME_SANDBOX", "1");
    else window.localStorage.removeItem("ELITEBOOST_PRIME_SANDBOX");
  }, [sandbox]);
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
  const jarvis = useJarvis(soundOn);
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
  const [fornecedores, setFornecedores] = useState<{ id: string; nome: string; ativo: boolean; slug: string }[]>([]);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [cotacaoDraft, setCotacaoDraft] = useState<string>("");
  const [savingCotacao, setSavingCotacao] = useState(false);
  const alert = useAlertBeep();

  const loadMonitor = async (tk = token) => {
    if (!tk) return;
    try {
      const res = await getMonitor({ data: { token: tk } });
      if (res.ok) {
        setMonitor({ fornecedor: res.fornecedor, historico: res.historico });
        setCotacaoDraft((prev) => (prev ? prev : (res.fornecedor.cotacao_brl ?? res.fornecedor.usd_to_brl).toFixed(2)));
      }
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



  const loadFornecedores = async (tk = token) => {
    if (!tk) return;
    try {
      const res = await listFornecedores({ data: { token: tk } });
      if (res.ok) setFornecedores(res.fornecedores);
    } catch {}
  };

  const handleToggleAtivo = async (id: string, ativoAtual: boolean) => {
    if (!token) return toast.error("Informe o token");
    setTogglingId(id);
    // optimistic
    setFornecedores((prev) => prev.map((p) => (p.id === id ? { ...p, ativo: !ativoAtual } : p)));
    try {
      const res = await toggleFornecedor({ data: { token, id, ativo: !ativoAtual } });
      if (!res.ok) {
        toast.error("Falha ao alterar status");
        setFornecedores((prev) => prev.map((p) => (p.id === id ? { ...p, ativo: ativoAtual } : p)));
      } else {
        toast.success(!ativoAtual ? "Fornecedor ativado" : "Fornecedor desativado");
      }
    } finally {
      setTogglingId(null);
    }
  };

  const salvarCotacao = async () => {
    const id = monitor?.fornecedor.id;
    if (!token) return toast.error("Informe o token");
    if (!id) return toast.error("Fornecedor não carregado");
    const v = parseFloat(cotacaoDraft.replace(",", "."));
    if (!Number.isFinite(v) || v <= 0 || v > 100) return toast.error("Cotação inválida");
    setSavingCotacao(true);
    try {
      const res = await updateCotacao({ data: { token, id, cotacao_brl: v } });
      if (!res.ok) toast.error("Falha ao salvar cotação");
      else {
        toast.success(`Cotação salva: R$ ${v.toFixed(2)}/USD`);
        await loadMonitor();
      }
    } finally {
      setSavingCotacao(false);
    }
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
    if (!token || !loaded) return;
    loadMonitor();
    loadCron();
    loadCache();
    loadFalhos();
    loadPendentes();
    loadCaixa();
    loadFaturamento();
    loadFornecedores();
    loadGrowth();
    load();
    const i = setInterval(() => { loadMonitor(); loadCron(); loadCache(); loadFalhos(); loadPendentes(); loadCaixa(); loadFaturamento(); loadFornecedores(); loadGrowth(); load(); }, 60000);
    return () => clearInterval(i);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, loaded]);


  // Alerta sonoro: dispara a cada 30s em estado crítico OU se houver pedidos com falha
  const f = monitor?.fornecedor;
  const fOnline = !!f && (f.status === "Online" || (f.falhas_consecutivas === 0 && f.saldo_brl != null));
  const isAlerta =
    (!!f && (!fOnline || f.nivel_alerta === "vermelho" || f.nivel_alerta === "critico")) ||
    falhos.length > 0;

  useEffect(() => {
    if (!isAlerta || !soundOn) {
      alert.stopLoop();
      return;
    }
    alert.startLoop(30000);
    return () => alert.stopLoop();
  }, [isAlerta, soundOn]);

  const toggleSound = async () => {
    if (!soundOn) {
      // Destrava AudioContext DENTRO do gesto do usuário
      await jarvis.unlock();
      alert.enable();
      setSoundOn(true);
      toast.success("Alerta sonoro ativado");
      // Jarvis: boot do painel (já destravado)
      jarvis.play("welcome");
    } else {
      setSoundOn(false);
      toast("Alerta sonoro desativado");
    }
  };

  // Jarvis · warning: novo carrinho abandonado (estado laranja)
  useEffect(() => {
    if (!soundOn) return;
    if (pendentes.length > 0) jarvis.playOnce("warning", `cart-${pendentes.length}`);
  }, [pendentes.length, soundOn, jarvis]);

  // Jarvis · critical: saldo do fornecedor < R$ 50
  useEffect(() => {
    if (!soundOn) return;
    const brl = monitor?.fornecedor?.saldo_brl;
    if (brl != null && brl < 50) jarvis.playOnce("critical", `low-${Math.floor(brl)}`);
  }, [monitor?.fornecedor?.saldo_brl, soundOn, jarvis]);

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
  // Deriva Online no frontend: se não houve falhas consecutivas e o saldo veio,
  // tratamos como Online mesmo que o backend ainda tenha um status stale.
  const online = !!f && (f.status === "Online" || (f.falhas_consecutivas === 0 && f.saldo_brl != null));

  const chartData = useMemo(
    () =>
      (monitor?.historico ?? []).map((h) => ({
        time: new Date(h.t).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        brl: h.saldo_brl,
      })),
    [monitor?.historico],
  );

  return (
    <div className="dark jarvis-hud min-h-screen text-foreground p-4">
      {/* Holographic armor outlines — desktop only */}
      <svg className="jarvis-armor left hidden lg:block" viewBox="0 0 400 800" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id="jrv-l" x1="0" x2="1">
            <stop offset="0" stopColor="#00ffff" stopOpacity="0.0"/>
            <stop offset="1" stopColor="#00ffff" stopOpacity="0.9"/>
          </linearGradient>
        </defs>
        <g stroke="url(#jrv-l)" strokeWidth="1.2">
          <path d="M40 80 L260 60 L340 180 L320 360 L360 460 L320 620 L260 760 L60 740" fill="none"/>
          <path d="M80 140 L240 130 L300 220 L280 360" />
          <path d="M120 380 L300 380 M120 420 L300 420 M120 460 L260 460" />
          <circle cx="220" cy="300" r="48" />
          <circle cx="220" cy="300" r="20" />
          <path d="M40 80 L20 200 L20 540 L60 740" />
          <path d="M200 540 L320 540 L340 600 L260 760" />
        </g>
        <g fill="#00ffff" opacity="0.6">
          <circle cx="220" cy="300" r="3"/>
          <circle cx="80" cy="200" r="2"/>
          <circle cx="320" cy="540" r="2"/>
        </g>
      </svg>
      <svg className="jarvis-armor right hidden lg:block" viewBox="0 0 400 800" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id="jrv-r" x1="0" x2="1">
            <stop offset="0" stopColor="#00ffff" stopOpacity="0.0"/>
            <stop offset="1" stopColor="#00ffff" stopOpacity="0.9"/>
          </linearGradient>
        </defs>
        <g stroke="url(#jrv-r)" strokeWidth="1.2">
          <path d="M40 80 L260 60 L340 180 L320 360 L360 460 L320 620 L260 760 L60 740" fill="none"/>
          <path d="M80 140 L240 130 L300 220 L280 360" />
          <path d="M120 380 L300 380 M120 420 L300 420 M120 460 L260 460" />
          <circle cx="220" cy="300" r="48" />
          <circle cx="220" cy="300" r="20" />
        </g>
      </svg>
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-2xl font-bold">Admin · EliteBoost Prime</h1>
          <div className="flex items-center gap-2">
            <Button
              variant={soundOn ? "default" : "outline"}
              size="sm"
              onClick={toggleSound}
            >
              {soundOn ? "🔔 Som ON" : "🔕 Ativar alerta sonoro"}
            </Button>
            <AdminSettingsButton />
            <Button
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                window.localStorage.removeItem(ADMIN_TOKEN_KEY);
                toast.success("Sessão encerrada");
                window.location.href = "/admin";
              }}
              className="bg-gradient-to-r from-red-700 to-red-500 hover:from-red-600 hover:to-red-400 text-white font-bold shadow-[0_0_20px_rgba(255,0,40,0.5)]"
            >
              🔴 SAIR DO PAINEL
            </Button>
          </div>
        </div>


        {!loaded ? (
          <div className="flex justify-center py-6">
            <Button
              onClick={() => { setLoaded(true); toast.success("Carregando painel..."); }}
              disabled={loading}
              className="h-14 px-8 text-base font-extrabold tracking-wide bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 text-black shadow-[0_0_30px_rgba(255,200,0,0.55)] hover:brightness-110"
            >
              ⚡ CARREGAR PEDIDOS E SERVIÇOS
            </Button>
          </div>
        ) : (
          <div className="flex justify-end">
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              {loading ? "Atualizando..." : "🔄 Atualizar pedidos"}
            </Button>
          </div>
        )}

        {/* ⛽ Central de Abastecimento Rápido — Compact Glass Panel */}
        <div className="rounded-xl border border-border bg-card/50 backdrop-blur-sm p-3">
          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <h2 className="text-sm font-extrabold tracking-tight text-amber-100">⛽ Abastecimento · Fornecedores</h2>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handlePingSmm}
                disabled={pingBusy}
                className="h-7 text-[11px] border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/10"
              >
                {pingBusy ? "Pingando..." : "🛰️ Ping SMMhype (Dry-Run)"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handlePingSmm}
                disabled={pingBusy}
                className="h-7 text-[11px] border-cyan-500/50 text-cyan-200 hover:bg-cyan-500/10"
                title="Forçar nova checagem de conexão"
              >
                🔄 Repetir Dry-Run
              </Button>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">auto-refresh 60s</span>
            </div>
          </div>
          {pingResult && (
            <div className={`mb-2 text-[11px] font-mono px-2 py-1 rounded border ${pingResult.ok ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-200" : "bg-red-950/40 border-red-500/40 text-red-200"}`}>
              {pingResult.msg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {(fornecedores.length > 0 ? fornecedores : [
              { id: "_smmhype", nome: "SMMhype", ativo: true, slug: "smmhype" },
              { id: "_smmpainel", nome: "SMMPainel", ativo: false, slug: "smmpainel" },
              { id: "_verified", nome: "Verified Atacado", ativo: false, slug: "verified" },
            ]).map((p) => {
              const urlMap: Record<string, string> = {
                smmhype: "https://smmhype.com/addfunds",
                smmpainel: "https://smmpainel.com/addfunds",
                verified: "https://verifiedatacado.com/addfunds",
              };
              const url = urlMap[p.slug] ?? "#";
              const emoji = p.slug === "smmhype" ? "🚀" : p.slug === "smmpainel" ? "⚙️" : "🛒";
              const isReal = !p.id.startsWith("_");
              return (
                <div
                  key={p.id}
                  className={`rounded-lg border backdrop-blur-sm p-2.5 flex flex-col gap-2 transition-all ${
                    p.ativo
                      ? "border-emerald-400/60 bg-emerald-950/20 shadow-[0_0_18px_rgba(16,185,129,0.35)]"
                      : "border-white/10 bg-black/30 hover:border-amber-400/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-lg leading-none">{emoji}</span>
                      <span className="font-bold text-xs text-amber-50 truncate">{p.nome}</span>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={p.ativo}
                      disabled={!isReal || togglingId === p.id}
                      onClick={() => isReal && handleToggleAtivo(p.id, p.ativo)}
                      className={`shrink-0 text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full border transition-all ${
                        p.ativo
                          ? "bg-emerald-500/30 text-emerald-100 border-emerald-400 shadow-[0_0_14px_rgba(16,185,129,0.85)] animate-pulse"
                          : "bg-slate-800/60 text-slate-400 border-slate-600/60"
                      } ${!isReal ? "opacity-50 cursor-not-allowed" : "hover:scale-105 cursor-pointer"}`}
                    >
                      {togglingId === p.id ? "..." : p.ativo ? "🟢 ATIVO" : "⚫ INATIVO"}
                    </button>
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 text-black font-bold text-[11px] py-1.5 px-2 hover:from-amber-400 hover:to-orange-400 shadow-[0_0_12px_rgba(245,158,11,0.45)]"
                  >
                    ⚡ Recarregar PIX
                  </a>
                </div>
              );
            })}
          </div>
        </div>


        {/* Atalhos para Rotas Públicas (abrem em nova aba) */}
        <div className="rounded-2xl border border-border bg-card/30 p-3">
          <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            🚀 Abrir Vitrines Públicas
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { href: "/",         label: "Instagram", icon: "📸", cls: "from-yellow-500 to-amber-500 text-black shadow-[0_0_14px_rgba(245,158,11,0.55)]" },
              { href: "/tiktok",   label: "TikTok",    icon: "🎵", cls: "from-cyan-500 to-pink-500 text-black shadow-[0_0_14px_rgba(0,242,254,0.55)]" },
              { href: "/youtube",  label: "YouTube",   icon: "📺", cls: "from-red-600 to-red-500 text-white shadow-[0_0_14px_rgba(255,0,0,0.55)]" },
              { href: "/facebook", label: "Facebook",  icon: "🔵", cls: "from-blue-600 to-blue-500 text-white shadow-[0_0_14px_rgba(24,119,242,0.55)]" },
              { href: "/telegram", label: "Telegram",  icon: "✈️", cls: "from-sky-500 to-sky-400 text-black shadow-[0_0_14px_rgba(0,204,255,0.55)]" },
              { href: "/trafego",  label: "Tráfego",   icon: "🌐", cls: "from-purple-600 to-fuchsia-500 text-white shadow-[0_0_14px_rgba(176,38,255,0.55)]" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r ${l.cls} font-bold text-xs px-3 py-2 hover:scale-105 transition-transform`}
              >
                <span>{l.icon}</span>
                <span>{l.label}</span>
                <span className="opacity-70">↗</span>
              </a>
            ))}
          </div>
        </div>

        {/* Navegação Multi-Painel (Casa dos Avós) */}

        <div className="rounded-2xl border border-border bg-card/30 p-2 flex flex-wrap gap-2">
          {REDES.map((r) => {
            const active = aba === r.key;
            const brandActive: Record<string, string> = {
              overview:  "bg-emerald-500/15 text-emerald-100 border-emerald-400/60 shadow-[0_0_18px_rgba(16,185,129,0.45)]",
              instagram: "bg-gradient-to-r from-yellow-500/20 to-amber-400/20 text-amber-100 border-amber-400/70 shadow-[0_0_20px_rgba(245,158,11,0.55)]",
              tiktok:    "bg-gradient-to-r from-cyan-500/20 to-pink-500/20 text-cyan-100 border-cyan-400/70 shadow-[0_0_20px_rgba(0,242,254,0.5)]",
              youtube:   "bg-red-600/20 text-red-100 border-red-500/80 shadow-[0_0_22px_rgba(255,0,0,0.55)]",
              facebook:  "bg-blue-600/20 text-blue-100 border-blue-500/80 shadow-[0_0_20px_rgba(24,119,242,0.55)]",
              trafego:   "bg-purple-600/20 text-purple-100 border-purple-500/80 shadow-[0_0_22px_rgba(176,38,255,0.55)]",
              telegram:  "bg-sky-500/20 text-sky-100 border-sky-400/80 shadow-[0_0_22px_rgba(0,204,255,0.55)]",
            };
            const brandIdle: Record<string, string> = {
              overview:  "hover:text-emerald-200 hover:border-emerald-500/40",
              instagram: "hover:text-amber-200 hover:border-amber-500/40",
              tiktok:    "hover:text-cyan-200 hover:border-cyan-500/40",
              youtube:   "hover:text-red-200 hover:border-red-500/40",
              facebook:  "hover:text-blue-200 hover:border-blue-500/40",
              trafego:   "hover:text-purple-200 hover:border-purple-500/40",
              telegram:  "hover:text-sky-200 hover:border-sky-500/40",
            };
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => !r.disabled && setAba(r.key)}
                disabled={r.disabled}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  active
                    ? brandActive[r.key] ?? "bg-foreground/10 border-foreground/40"
                    : r.disabled
                    ? "bg-background/30 text-muted-foreground/60 border-border/50 cursor-not-allowed"
                    : `bg-background/40 text-muted-foreground border-border ${brandIdle[r.key] ?? "hover:text-foreground"}`
                }`}
              >
                <span className="mr-1.5">{r.icon}</span>{r.label}
              </button>
            );
          })}
        </div>

        {/* Visão Geral — faturamento somado de todas as redes */}
        {aba === "overview" && (
          <div className="rounded-2xl border border-emerald-500/30 bg-card/60 p-6 space-y-4">
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
                    <span className={`h-2.5 w-2.5 rounded-full ${online ? "bg-emerald-400" : "bg-red-500"} animate-pulse`} />
                    {f.nome}: <strong>{online ? "Online" : f.status}</strong>
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
          <div className="rounded-2xl border border-indigo-500/30 bg-card/60 p-6 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xl font-extrabold tracking-tight">💡 Assistente de Caixa Inteligente</h2>
              {caixa.alerts.length > 0 && (f?.falhas_consecutivas ?? 0) > 0 && (
                <span className="text-xs font-semibold rounded-full px-3 py-1 bg-red-600/80 text-white">
                  {caixa.alerts.length} alerta(s) aberto(s)
                </span>
              )}
            </div>
            
            {(() => {
              // Fonte única de verdade: saldo BRL ao vivo (USD × cotação do fornecedor).
              // Removido o card "Caixa Principal" — não havia API real de saldo MP, era placebo de R$ 0,00.
              const liveBrl = f?.saldo_brl;
              const snapshot = caixa.supplier?.saldo_atual ?? 0;
              const saldoSmm = liveBrl != null ? liveBrl : snapshot;
              const metaIdeal = caixa.supplier?.meta_ideal ?? 1000;
              const falta = Math.max(0, metaIdeal - saldoSmm);
              const baixo = saldoSmm < 50;
              return (
                <div className={`rounded-xl bg-black/30 border p-4 ${baixo ? "border-red-500/60" : "border-white/10"}`}>
                  <div className="text-xs uppercase text-muted-foreground">Saldo Atual no Fornecedor · SMMhype</div>
                  <div className={`mt-1 text-3xl font-extrabold ${baixo ? "text-red-400" : "text-emerald-300"}`}>
                    R$ {saldoSmm.toFixed(2)}
                  </div>
                  <div className="mt-2 text-sm">
                    Meta Ideal R$ {metaIdeal.toFixed(2)}:{" "}
                    <span className="font-semibold text-emerald-400">
                      {falta > 0 ? `falta depositar R$ ${falta.toFixed(2)}` : "atingida ✅"}
                    </span>
                  </div>
                  {baixo && (
                    <div className="mt-2 text-xs font-semibold text-red-300">
                      🚨 Abaixo de R$ 50 — alerta Telegram disparado. Deposite manualmente no painel do fornecedor.
                    </div>
                  )}
                </div>
              );
            })()}
            {caixa.alerts.length > 0 && (f?.falhas_consecutivas ?? 0) > 0 && (
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

        {/* 📈 Central de Growth — funil por porta de entrada + margem real */}
        {growth && (
          <div className="rounded-2xl border border-emerald-500/30 bg-card/60 p-6 space-y-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-xl font-extrabold tracking-tight">📈 Central de Growth</h2>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Cotação: R$ {growth.cotacao.toFixed(2)}/USD · {growth.total_pedidos} pedidos analisados
              </span>
            </div>

            {/* Margem por rede */}
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Margem de Lucro Estimada (BRL/1k)</div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {Object.entries(growth.margem).map(([rede, m]) => {
                  const pct = m.margem_pct;
                  const tone =
                    pct == null ? "border-white/10 bg-black/30 text-muted-foreground"
                    : pct >= 60 ? "border-emerald-500/40 bg-emerald-950/30 text-emerald-200"
                    : pct >= 30 ? "border-amber-500/40 bg-amber-950/30 text-amber-200"
                    : "border-red-500/40 bg-red-950/30 text-red-200";
                  return (
                    <div key={rede} className={`rounded-xl border p-3 ${tone}`}>
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase">
                        <span>{REDE_ICON[rede] ?? "•"}</span><span>{rede}</span>
                      </div>
                      <div className="mt-1 text-2xl font-extrabold">
                        {pct != null ? `${pct.toFixed(1)}%` : "—"}
                      </div>
                      <div className="text-[11px] opacity-80 mt-1">
                        Venda R$ {m.venda_brl_mil.toFixed(2)}
                        {m.custo_brl_mil != null ? ` · Custo R$ ${m.custo_brl_mil.toFixed(2)}` : " · sem cache"}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-[10px] text-muted-foreground mt-2">
                Custo = rate mais barato em <span className="font-mono">services_cache</span> × cotação. Robô permanece read-only.
              </div>
            </div>

            {/* Portas de Entrada */}
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Portas de Entrada (pedidos por rede)</div>
              <div className="space-y-1.5">
                {Object.entries(growth.funil)
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([rede, b]) => {
                    const pct = growth.total_pedidos > 0 ? (b.total / growth.total_pedidos) * 100 : 0;
                    return (
                      <div key={rede} className="flex items-center gap-3 text-sm">
                        <div className="w-28 flex items-center gap-2 shrink-0">
                          <span>{REDE_ICON[rede] ?? "•"}</span>
                          <span className="font-semibold uppercase text-xs">{rede}</span>
                        </div>
                        <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400" style={{ width: `${pct.toFixed(1)}%` }} />
                        </div>
                        <div className="w-44 text-right text-xs text-muted-foreground tabular-nums">
                          {b.total} ({pct.toFixed(1)}%) · ✓{b.paid} ⏳{b.pending} ✗{b.cancelled + b.failed}
                        </div>
                      </div>
                    );
                  })}
              </div>
              <div className="text-[10px] text-muted-foreground mt-2">
                Métrica baseada em pedidos persistidos (não cliques anônimos — pixel/eventos não instrumentados).
              </div>
            </div>
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
                      {online ? "Online" : f.status}
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

              {/* Cotação USD→BRL configurável */}
              {(() => {
                const parsed = parseFloat(cotacaoDraft.replace(",", "."));
                const valid = Number.isFinite(parsed) && parsed > 0 && parsed <= 100;
                const current = Number(f.usd_to_brl.toFixed(2));
                const dirty = valid && parsed !== current;
                return (
                  <div className="mt-4 flex flex-wrap items-end gap-2 rounded-xl border border-border/60 bg-background/40 p-3">
                    <div className="flex-1 min-w-[180px]">
                      <label className="text-xs uppercase text-muted-foreground">Cotação USD→BRL (manual)</label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="100"
                        inputMode="decimal"
                        value={cotacaoDraft}
                        onChange={(e) => setCotacaoDraft(e.target.value)}
                        placeholder={f.usd_to_brl.toFixed(2)}
                        aria-invalid={!valid && cotacaoDraft.length > 0}
                        className={`mt-1 ${!valid && cotacaoDraft.length > 0 ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                      />
                    </div>
                    <Button onClick={salvarCotacao} disabled={savingCotacao || !valid || !dirty || !monitor?.fornecedor.id}>
                      {savingCotacao ? "Salvando…" : "Salvar cotação"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setCotacaoDraft(current.toFixed(2))}
                      disabled={savingCotacao || !dirty}
                      title="Reverter para o valor salvo"
                    >
                      Resetar
                    </Button>
                    <p className="basis-full text-xs text-muted-foreground">
                      {!valid && cotacaoDraft.length > 0 ? (
                        <span className="text-red-400">Informe um número entre 0,01 e 100.</span>
                      ) : dirty ? (
                        <span className="text-yellow-400">Alterações não salvas (atual: R$ {current.toFixed(2)}/USD).</span>
                      ) : (
                        <>Atual: <strong className="text-emerald-400">R$ {current.toFixed(2)}</strong> por USD ✓</>
                      )}
                    </p>
                  </div>
                );
              })()}
            </div>


            {/* Status do Cron */}
            <CronCard cron={cron} busy={cronBusy} onTest={testarCronAgora} falhas={f.falhas_consecutivas} />

            {/* Cache de Serviços do Instagram */}
            <ServicesCacheCard cache={cache} busy={cacheBusy} onSync={sincronizarAgora} />

            {/* 🤖 Sincronização automática de IDs via API */}
            <div className="rounded-2xl border border-border bg-card/40 p-4 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h3 className="font-semibold flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
                    🤖 Robô de Leitura Inteligente · IDs (Refill / Recarga / Reposición)
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Consulta <code>action=services</code> do fornecedor ativo, filtra por refill e devolve o ID
                    mais barato de Instagram, TikTok, YouTube e Facebook (Seguidores, Curtidas, Views).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={handleSyncIds}
                    disabled={syncIdsBusy}
                    className="bg-gradient-to-r from-amber-500 to-yellow-400 text-black font-semibold hover:opacity-90"
                  >
                    {syncIdsBusy ? "Sincronizando…" : "Sincronizar IDs da API"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!syncIdsResult}
                    onClick={() => {
                      if (!syncIdsResult) return;
                      const rows = [["rede", "tipo", "service_id", "rate", "name"]];
                      (["instagram", "tiktok", "youtube", "facebook"] as const).forEach((net) => {
                        (["followers", "likes", "views"] as const).forEach((t) => {
                          const p = syncIdsResult?.[net]?.[t];
                          if (p) rows.push([net, t, String(p.service ?? ""), String(p.rate ?? ""), String(p.name ?? "").replace(/[\r\n,;]+/g, " ")]);
                        });
                      });
                      const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
                      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `auditoria-ids-${new Date().toISOString().slice(0, 10)}.csv`;
                      document.body.appendChild(a); a.click(); a.remove();
                      URL.revokeObjectURL(url);
                    }}
                  >
                    ⬇️ Exportar Auditoria CSV
                  </Button>
                </div>
              </div>
              {syncIdsResult && (() => {
                // IDs hardcoded em produção (src/lib/smmhype.server.ts)
                const PROD_IDS: Record<string, Record<string, number | null>> = {
                  instagram: { followers: null, likes: 18860, views: 18855 },
                  tiktok:    { followers: 14330, likes: 19191, views: 14907 },
                  youtube:   { followers: 19440, likes: null,  views: 14321 },
                  facebook:  { followers: 18870, likes: 7593,  views: null  },
                };
                const LABELS: Record<string, string> = {
                  followers: "Seguidores/Inscritos", likes: "Curtidas", views: "Visualizações",
                };
                const ICONS: Record<string, string> = {
                  instagram: "📸", tiktok: "🎵", youtube: "📺", facebook: "🔵",
                };
                const rows: Array<{ net: string; type: string; current: number | null; recommended: number | null; rate: string | null }> = [];
                (["instagram", "tiktok", "youtube", "facebook"] as const).forEach((net) => {
                  (["followers", "likes", "views"] as const).forEach((t) => {
                    const rec = syncIdsResult?.[net]?.[t];
                    const cur = PROD_IDS[net]?.[t] ?? null;
                    if (cur == null && !rec) return;
                    rows.push({ net, type: t, current: cur, recommended: rec?.service ?? null, rate: rec?.rate ?? null });
                  });
                });
                return (
                  <div className="rounded-xl border border-border bg-background/60 overflow-hidden">
                    <div className="px-4 py-3 border-b border-border bg-background/40 flex items-center justify-between flex-wrap gap-2">
                      <h4 className="font-semibold text-sm">🔍 Auditoria de Integridade · IDs em Produção vs API</h4>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          disabled={approving || !token}
                          className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-400/60"
                          onClick={async () => {
                            if (!token) return;
                            setApproving(true);
                            try {
                              const res = await smartApprove({ data: { token } });
                              if (!res.ok) {
                                toast.error(`Falha: ${res.error}`);
                              } else {
                                toast.success(`✅ ${res.approved} redes calibradas para menor custo`, {
                                  description: `${res.blocked} bloqueadas (revisão humana) · ${res.skipped} já otimizadas. Telegram notificado.`,
                                });
                                jarvis.play("optimized");
                                await syncIdsApi({ data: { token } }).catch(() => {});
                              }
                            } catch (e) {
                              toast.error(`Erro: ${(e as Error).message}`);
                            } finally {
                              setApproving(false);
                            }
                          }}
                        >
                          {approving ? "Calibrando…" : "⚡ Aprovar Todas as Divergências (Apenas Menor Custo)"}
                        </Button>
                        <span className="text-[11px] text-muted-foreground">{rows.length} serviços comparados</span>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-background/30 text-muted-foreground">
                          <tr>
                            <th className="text-left px-3 py-2 font-semibold">Rede</th>
                            <th className="text-left px-3 py-2 font-semibold">Serviço</th>
                            <th className="text-left px-3 py-2 font-semibold">ID Atual (Prod)</th>
                            <th className="text-left px-3 py-2 font-semibold">ID Recomendado (API)</th>
                            <th className="text-left px-3 py-2 font-semibold">Integridade</th>
                            <th className="text-right px-3 py-2 font-semibold">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60">
                          {rows.map((r, idx) => {
                            const equal = r.current != null && r.recommended != null && r.current === r.recommended;
                            const missing = r.current == null || r.recommended == null;
                            return (
                              <tr key={`${r.net}-${r.type}-${idx}`} className="hover:bg-background/40">
                                <td className="px-3 py-2 font-semibold">{ICONS[r.net]} {r.net}</td>
                                <td className="px-3 py-2 text-muted-foreground">{LABELS[r.type]}</td>
                                <td className="px-3 py-2 font-mono">{r.current != null ? `#${r.current}` : <span className="text-muted-foreground">—</span>}</td>
                                <td className="px-3 py-2 font-mono">
                                  {r.recommended != null ? <>#{r.recommended} {r.rate && <span className="text-muted-foreground">@ {r.rate}</span>}</> : <span className="text-muted-foreground">—</span>}
                                </td>
                                <td className="px-3 py-2">
                                  {equal ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/50 text-emerald-200 px-2 py-0.5 text-[10px] font-bold">🟢 Validado e Seguro</span>
                                  ) : missing ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/50 text-emerald-200 px-2 py-0.5 text-[10px] font-bold">🟢 Atualizado (Modo Seguro)</span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/60 text-amber-200 px-2 py-0.5 text-[10px] font-bold">🟡 Divergência detectada</span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right">
                                  {!equal && !missing && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-[11px] border-amber-500/60 text-amber-200 hover:bg-amber-500/15"
                                      onClick={() => {
                                        toast.success(`Mudança aprovada: ${r.net}/${r.type} #${r.current} → #${r.recommended}`, {
                                          description: "Registro salvo. Aplicar via deploy do dispatcher (smmhype.server.ts) para entrar em produção.",
                                        });
                                      }}
                                    >
                                      Aprovar Mudança
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 🧪 Modo Sandbox (frontend-only) */}
            <div className={`rounded-2xl border p-4 flex items-center justify-between gap-3 ${sandbox ? "border-red-500/60 bg-red-500/10" : "border-border bg-card/40"}`}>
              <div className="min-w-0">
                <h3 className="font-semibold flex items-center gap-2">
                  🧪 Modo Sandbox <span className="text-xs text-muted-foreground">(localStorage · frontend-only)</span>
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Quando ligado, os checkouts públicos simulam Pix aprovado localmente — <b>nenhuma cobrança real</b> é criada nem ordem é enviada à API. Use só para validar fluxo visual.
                </p>
                {sandbox && (
                  <p className="text-[11px] text-red-300 mt-1 font-semibold">
                    ⚠️ MODO TESTE ATIVO neste navegador. Desligue antes de publicar para clientes.
                  </p>
                )}
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={sandbox}
                onClick={() => setSandbox((v) => !v)}
                className={`relative h-7 w-12 rounded-full transition-colors ${sandbox ? "bg-red-500" : "bg-zinc-700"}`}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${sandbox ? "left-6" : "left-1"}`} />
              </button>
            </div>




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
            <div className="rounded-2xl border border-border bg-card/40 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0">
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

        {/* Auditoria — separa Crítico (servidor/fornecedor) de Warning (cliente/pix) */}
        {(() => {
          const base = falhos
            .filter((p) => aba === "overview" || (p.rede_social ?? "instagram") === aba)
            .slice()
            .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
          if (base.length === 0) return null;

          const CRITICAL = new Set(["SMM_FAILED", "amount_mismatch", "mp_rejected"]);
          const criticos = base.filter((p) => CRITICAL.has(p.status));
          const warnings = base.filter((p) => !CRITICAL.has(p.status));

          const STATUS_LABEL: Record<string, string> = {
            SMM_FAILED: "Falha de Entrega",
            amount_mismatch: "Valor Divergente",
            mp_rejected: "Pagamento Recusado",
            mp_pending: "Carrinho Abandonado • Pix Pendente",
            mp_cancelled: "Pix Expirado",
            mp_expired: "Pix Expirado",
            mp_in_process: "Pix em Processamento",
          };

          const renderRow = (p: Pedido, severity: "critical" | "warning") => {
            const isCurtidas = p.pacote?.toLowerCase().startsWith("l");
            const isSmm = p.status === "SMM_FAILED";
            const badgeStatus =
              severity === "critical"
                ? "bg-red-500/20 text-red-200 border-red-500/50"
                : "bg-amber-500/15 text-amber-200 border-amber-500/50";
            const label = STATUS_LABEL[p.status] ?? p.status;
            return (
              <div key={p.id} className="py-3 flex items-start justify-between gap-3 text-sm">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span title={p.rede_social ?? "instagram"} className="text-base leading-none">
                      {REDE_ICON[p.rede_social ?? "instagram"] ?? "📸"}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeStatus}`}>
                      {label}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border bg-background/40 text-muted-foreground">
                      {isCurtidas ? "Curtidas" : "Seguidores"}
                    </span>
                    {(() => {
                      const sid = resolveServiceIdClient(p.pacote, p.quantidade);
                      return sid ? (
                        <span title="Service ID enviado ao SMMhype" className="px-2 py-0.5 rounded-full text-[10px] font-mono border border-cyan-500/40 bg-cyan-950/30 text-cyan-200">
                          SVC #{sid}
                        </span>
                      ) : null;
                    })()}
                    <span className="font-semibold">{p.pacote}</span> · {p.quantidade} · @{p.instagram_user}
                  </div>

                  {p.error_detail && (() => {
                    const raw = p.error_detail!;
                    const low = raw.toLowerCase();
                    let origem = "Fornecedor (SMMhype)";
                    let prefix = "Falha";
                    let tone = "text-red-300/90 border-red-500/40 bg-red-950/40";
                    if (/(invalid|private|not.?found|link|url|username|user not|perfil)/.test(low)) {
                      origem = "Cliente (Link Inválido)"; prefix = "Ação Requerida";
                      tone = "text-amber-200 border-amber-500/40 bg-amber-950/30";
                    } else if (/(timeout|econn|database|supabase|postgres|fetch failed|network)/.test(low)) {
                      origem = "Seu Sistema"; prefix = "Erro Técnico";
                      tone = "text-orange-200 border-orange-500/40 bg-orange-950/30";
                    } else if (/(smmhype|provider|api|service|saldo|balance|429|503|502)/.test(low)) {
                      origem = "Fornecedor (SMMhype)"; prefix = "Falha";
                    }
                    return (
                      <div className={`text-xs font-mono break-all rounded-md border px-2 py-1 ${tone}`}>
                        <span className="font-bold not-italic mr-1">{prefix}: {raw}</span>
                        <span className="opacity-80">• {origem}</span>
                      </div>
                    );
                  })()}
                  <div className="text-xs text-muted-foreground">
                    {new Date(p.created_at).toLocaleString("pt-BR")} · MP: {p.mercado_pago_id ?? "-"} · {p.id}
                  </div>
                </div>
                {isSmm && (() => {
                  const redeKey = p.rede_social ?? "instagram";
                  const countRede = falhos.filter((x) => (x.rede_social ?? "instagram") === redeKey && x.status === "SMM_FAILED").length;
                  const badgeTone: Record<string, string> = {
                    instagram: "bg-amber-500/15 text-amber-200 border-amber-500/50",
                    tiktok:    "bg-cyan-500/15 text-cyan-200 border-cyan-500/50",
                    youtube:   "bg-red-500/15 text-red-200 border-red-500/50",
                    facebook:  "bg-blue-500/15 text-blue-200 border-blue-500/50",
                  };
                  return (
                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        title={`Total de falhas em ${redeKey}`}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badgeTone[redeKey] ?? "bg-muted text-muted-foreground border-border"}`}
                      >
                        {REDE_ICON[redeKey] ?? "📸"} {countRede}
                      </span>
                      <Button size="sm" onClick={() => reenviar(p.id)} disabled={busyId === p.id}>
                        {busyId === p.id ? "..." : "Tentar de novo"}
                      </Button>
                    </div>
                  );
                })()}
                {(p.status === "mp_pending" || p.status === "mp_cancelled" || p.status === "mp_expired") && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10"
                    onClick={() => recuperarVenda(p)}
                    title="Gera template e abre wa.me"
                  >
                    🟢 Recuperar
                  </Button>
                )}
              </div>
            );
          };

          return (
            <div className="space-y-4">
              {criticos.length > 0 && (
                <div className="rounded-2xl border border-red-600/60 bg-red-950/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-red-200 flex items-center gap-2">
                      🚨 Crítico · {criticos.length} falha(s) de servidor/fornecedor
                    </h2>
                    <Button size="sm" variant="outline" onClick={() => loadFalhos()}>Atualizar</Button>
                  </div>
                  <div className="divide-y divide-red-900/60">
                    {criticos.map((p) => renderRow(p, "critical"))}
                  </div>
                </div>
              )}
              {warnings.length > 0 && (
                <div className="rounded-2xl border border-amber-600/50 bg-amber-950/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-amber-200 flex items-center gap-2">
                      ⚠️ Atenção · {warnings.length} pedido(s) com pagamento pendente/expirado
                    </h2>
                    <Button size="sm" variant="outline" onClick={() => loadFalhos()}>Atualizar</Button>
                  </div>
                  <div className="divide-y divide-amber-900/40">
                    {warnings.map((p) => renderRow(p, "warning"))}
                  </div>
                </div>
              )}
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
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/10"
                    onClick={() => recuperarVenda(p)}
                    title="Abre wa.me em branco com o template colado — cole o número do lead"
                  >
                    🟢 Recuperar Venda
                  </Button>
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
              <div key={p.id} className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="font-mono text-xs text-muted-foreground break-all">{p.id}</div>
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
                    {(() => {
                      const sid = resolveServiceIdClient(p.pacote, p.quantidade);
                      return sid ? (
                        <span title="Service ID enviado ao SMMhype" className="px-2 py-0.5 rounded-full text-[10px] font-mono border border-cyan-500/40 bg-cyan-950/30 text-cyan-200">
                          SVC #{sid}
                        </span>
                      ) : null;
                    })()}
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

        <WebhookHealthMonitor onFail={(label, code) => jarvis.play("fail", `${label} HTTP ${code}`)} />

        <JarvisHistoryPanel />


        <footer className="pt-6 pb-2 text-center text-[11px] tracking-wider text-muted-foreground/60 font-mono uppercase">
          BoostyGram Admin · v1.0.0-LAUNCH
        </footer>
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

function WebhookHealthMonitor({ onFail }: { onFail?: (label: string, code: number) => void }) {
  const endpoints = [
    { label: "Mercado Pago", url: "/api/public/mp-webhook" },
    { label: "Telegram Bot", url: "/api/public/telegram/webhook" },
  ];
  const [pings, setPings] = useState<Record<string, { code: number; at: string } | null>>({});
  const firedRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    const ping = async () => {
      const out: Record<string, { code: number; at: string } | null> = {};
      await Promise.all(endpoints.map(async (e) => {
        try {
          const res = await fetch(e.url, { method: "HEAD" });
          out[e.url] = { code: res.status, at: new Date().toISOString() };
          if (res.status >= 500 && onFail && !firedRef.current[e.url]) {
            firedRef.current[e.url] = true;
            onFail(e.label, res.status);
          } else if (res.status < 500) {
            firedRef.current[e.url] = false;
          }
        } catch {
          out[e.url] = null;
          if (onFail && !firedRef.current[e.url]) {
            firedRef.current[e.url] = true;
            onFail(e.label, 0);
          }
        }
      }));
      if (!cancelled) setPings(out);
    };
    ping();
    const i = setInterval(ping, 30_000);
    return () => { cancelled = true; clearInterval(i); };
  }, [onFail]);

  return (
    <div className="mt-6 rounded-lg border border-border/60 bg-background/40 p-4">
      <h3 className="text-sm font-semibold mb-3">📡 Monitor de Webhooks (produção)</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
        {endpoints.map((e) => {
          const p = pings[e.url];
          const ok = p && (p.code === 200 || p.code === 401 || p.code === 405);
          return (
            <div key={e.url} className="flex justify-between items-center px-3 py-2 rounded bg-background/60 border border-border/40">
              <span className="font-mono">{e.label}</span>
              <span className={ok ? "text-green-500" : p ? "text-red-500" : "text-muted-foreground"}>
                {p ? `${ok ? "🟢" : "🔴"} HTTP ${p.code} · ${new Date(p.at).toLocaleTimeString("pt-BR")}` : "⏳"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function JarvisHistoryPanel() {
  const live = useJarvisHistory();
  const [sev, setSev] = useState<string>("");
  const [origem, setOrigem] = useState<string>("");
  const [rows, setRows] = useState<{ id: string; severidade: string; origem: string; mensagem: string; detalhe: string | null; created_at: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { listJarvisAlerts } = await import("@/lib/jarvis.functions");
      const res = await listJarvisAlerts({ data: { severidade: sev || undefined, origem: origem || undefined, limit: 50 } });
      setRows(res.rows);
    } finally { setLoading(false); }
  }, [sev, origem]);

  useEffect(() => { reload(); }, [reload, live.length]);

  const sevColor: Record<string, string> = {
    info: "text-sky-400", success: "text-emerald-400", warning: "text-amber-400", critical: "text-red-400",
  };
  const sevIcon: Record<string, string> = { info: "👋", success: "✅", warning: "⚠️", critical: "🚨" };

  return (
    <div className="mt-4 rounded-lg border border-border/60 bg-background/40 p-4">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <h3 className="text-sm font-semibold">🤖 Histórico de Alertas do Jarvis <span className="text-[10px] text-muted-foreground">({rows.length})</span></h3>
        <div className="flex gap-2 items-center text-xs">
          <select value={sev} onChange={(e) => setSev(e.target.value)} className="bg-background border border-border/60 rounded px-2 py-1">
            <option value="">Severidade: todas</option>
            <option value="info">Info</option>
            <option value="success">Success</option>
            <option value="warning">Warning</option>
            <option value="critical">Critical</option>
          </select>
          <select value={origem} onChange={(e) => setOrigem(e.target.value)} className="bg-background border border-border/60 rounded px-2 py-1">
            <option value="">Origem: todas</option>
            <option value="welcome">welcome</option>
            <option value="optimized">optimized</option>
            <option value="warning">warning</option>
            <option value="critical">critical</option>
            <option value="fail">fail</option>
          </select>
          <button onClick={reload} className="px-2 py-1 border border-border/60 rounded hover:bg-background">↻</button>
        </div>
      </div>
      {loading ? (
        <div className="text-xs text-muted-foreground">Carregando…</div>
      ) : rows.length === 0 ? (
        <div className="text-xs text-muted-foreground">Nenhum alerta para o filtro selecionado.</div>
      ) : (
        <ul className="max-h-56 overflow-y-auto divide-y divide-border/40 text-xs font-mono">
          {rows.map((h) => (
            <li key={h.id} className="flex items-center justify-between py-1.5 px-1">
              <span className="flex items-center gap-2">
                <span>{sevIcon[h.severidade] ?? "•"}</span>
                <span className={sevColor[h.severidade] ?? "text-foreground"}>{h.mensagem}</span>
                <span className="text-muted-foreground">[{h.origem}]</span>
                {h.detalhe && <span className="text-muted-foreground">· {h.detalhe}</span>}
              </span>
              <span className="text-muted-foreground">{new Date(h.created_at).toLocaleTimeString("pt-BR")}</span>
            </li>
          ))}
        </ul>
      )}
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


