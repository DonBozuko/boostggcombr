import { useState, useEffect } from "react";
import { 
  Activity, 
  Zap, 
  Database, 
  AlertTriangle, 
  Clock,
  ShieldAlert,
  Server
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useServerFn } from "@tanstack/react-start";
import { jarvisNocSnapshot } from "@/lib/jarvis-noc.functions";
import { getJarvisTriage } from "@/lib/jarvis-triage.functions";
import { getIncidentTriage } from "@/lib/jarvis-incidents-logic.server";
import { getAdminToken } from "@/lib/admin-token-store";
import { toast } from "sonner";

type HealthState = "GREEN" | "DEGRADED" | "RED" | "UNKNOWN";

interface MetricCardProps {
  title: string;
  value: string;
  unit: string;
  status: HealthState;
  icon: any;
  source: string;
}

function MetricCard({ title, value, unit, status, icon: Icon, source }: MetricCardProps) {
  const statusColors: Record<HealthState, string> = {
    GREEN: "#00B37E",
    DEGRADED: "#FBA94C",
    RED: "#F75A68",
    UNKNOWN: "#71717A"
  };

  return (
    <Card className="bg-[#202024] border-none text-white shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{title}</CardTitle>
        <Icon size={16} style={{ color: statusColors[status] }} />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1">
          <span className="text-xl font-bold">{value}</span>
          <span className="text-[10px] text-zinc-500">{unit}</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-[9px] text-zinc-500 font-mono">
          <span>{source}</span>
          <span style={{ color: statusColors[status] }}>{status}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function JarvisNocDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const getSnapshotFn = useServerFn(jarvisNocSnapshot);
  const getTriageFn = useServerFn(getJarvisTriage);
  const getIncidentsFn = useServerFn(getIncidentTriage);

  const fetchData = async () => {
    const token = getAdminToken();
    if (!token) return;
    try {
      setLoading(true);
      const [snapshot, triage, incidentData] = await Promise.all([
        getSnapshotFn({ data: { token } }),
        getTriageFn({ data: { token } }),
        getIncidentsFn({ data: { token } })
      ]);
      setData({ snapshot, triage, incidentData });
    } catch (e) {
      toast.error("Erro na telemetria NOC");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="p-8 text-zinc-500 text-center font-mono animate-pulse">🛰️ Telemetria v653 Truth Protocol...</div>;
  if (!data || !data.snapshot.ok) return <div className="p-8 text-red-500 text-center font-mono">Erro de conexão com NOC J.A.R.V.I.S.</div>;

  const { snapshot, triage, incidentData } = data;
  
  const metrics: MetricCardProps[] = [
    { 
      title: "Checkout 24h", 
      value: String(snapshot.pedidos.pagos24h), 
      unit: "aprovados", 
      status: snapshot.globalStatus, 
      icon: Activity, 
      source: "pedidos.db" 
    },
    { 
      title: "Gateway MP", 
      value: String(snapshot.metrics.mp?.value?.ms || "??"), 
      unit: "ms", 
      status: snapshot.metrics.mp?.state || "UNKNOWN", 
      icon: Zap, 
      source: "ping.mp" 
    },
    { 
      title: "Incidentes", 
      value: String(snapshot.incidents.totalOpen), 
      unit: "ativos", 
      status: snapshot.incidents.critical > 0 ? "RED" : (snapshot.incidents.totalOpen > 0 ? "DEGRADED" : "GREEN"), 
      icon: ShieldAlert, 
      source: "jarvis_incidents" 
    },
    { 
      title: "Saúde Banco", 
      value: `${snapshot.systemHealth.ok}/${snapshot.systemHealth.total}`, 
      unit: "tabelas", 
      status: snapshot.metrics.database?.state || "UNKNOWN", 
      icon: Database, 
      source: "supabase.db" 
    }
  ];

  const statusColors: Record<HealthState, string> = {
    GREEN: "#00B37E",
    DEGRADED: "#FBA94C",
    RED: "#F75A68",
    UNKNOWN: "#71717A"
  };

  return (
    <div className="p-4 md:p-8 font-inter bg-[#121214] min-h-screen text-zinc-100">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-zinc-100 flex items-center gap-2">
              <Server className="text-[#00B37E]" /> J.A.R.V.I.S. NOC
            </h1>
            <p className="text-zinc-500 text-[10px] font-mono uppercase tracking-widest">
              Protocolo de Verdade v653 · {new Date(snapshot.generatedAt).toLocaleTimeString()}
            </p>
          </div>
          
          <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 transition-all duration-500`} 
               style={{ 
                 borderColor: `${statusColors[snapshot.globalStatus as HealthState]}33`,
                 backgroundColor: `${statusColors[snapshot.globalStatus as HealthState]}0D` 
               }}>
            <div className="h-3 w-3 rounded-full animate-pulse" 
                 style={{ backgroundColor: statusColors[snapshot.globalStatus as HealthState] }} />
            <span className="font-black tracking-widest text-sm" 
                  style={{ color: statusColors[snapshot.globalStatus as HealthState] }}>
              {snapshot.globalStatus === "GREEN" ? "SISTEMA SAUDÁVEL" : 
               snapshot.globalStatus === "DEGRADED" ? "DEGRADAÇÃO OPERACIONAL" : 
               snapshot.globalStatus === "RED" ? "FALHA CRÍTICA" : "ESTADO DESCONHECIDO"}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m) => <MetricCard key={m.title} {...m} />)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="bg-[#202024] border-none text-white shadow-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Triagem Jarvis</h2>
                <span className="text-[10px] font-mono text-zinc-500">{triage.status.toUpperCase()}</span>
              </div>
              <p className="text-lg font-bold text-emerald-400">{triage.headline}</p>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{triage.summary}</p>
            </Card>

            <Card className="bg-[#202024] border-none text-white shadow-xl p-6">
              <h2 className="text-xs font-bold text-zinc-400 mb-6 uppercase tracking-widest">Fornecedores (Truth Protocol)</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {snapshot.fornecedores.map((f: any) => (
                  <div key={f.id} className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{f.nome}</span>
                        {f.ativo && <span className="text-[9px] bg-emerald-500/10 text-emerald-500 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase font-black">Ativo</span>}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500 mt-1 uppercase">
                        R$ {f.saldo?.toFixed(2) || "0.00"} · {f.status || "UNKNOWN"}
                      </div>
                    </div>
                    <div className="h-2 w-2 rounded-full shadow-[0_0_8px]" 
                         style={{ 
                           backgroundColor: statusColors[f.state as HealthState],
                           boxShadow: `0 0 8px ${statusColors[f.state as HealthState]}66` 
                         }} />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="bg-[#202024] border-none text-white shadow-xl p-6">
              <h2 className="text-xs font-bold text-zinc-400 mb-4 uppercase tracking-widest">Incidentes Abertos</h2>
              {incidentData?.incidents?.length > 0 ? (
                <div className="space-y-3">
                  {incidentData.incidents.map((inc: any) => (
                    <div key={inc.id} className="p-3 bg-zinc-900/50 rounded-lg border-l-2 border-red-500">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-black text-red-500 uppercase">{inc.severity}</span>
                        <span className="text-[9px] font-mono text-zinc-600">{inc.status}</span>
                      </div>
                      <p className="text-xs font-bold mt-1 text-zinc-200">{inc.headline}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ShieldAlert className="mx-auto text-zinc-800 mb-2" size={32} />
                  <p className="text-[10px] font-mono text-zinc-600 uppercase">Nenhum incidente</p>
                </div>
              )}
            </Card>

            <Card className="bg-[#202024] border-none text-white shadow-xl p-6">
              <h2 className="text-xs font-bold text-zinc-400 mb-4 uppercase tracking-widest">Pedidos Travados ({">"}15m)</h2>
              <div className="flex items-center justify-between">
                <span className={`text-2xl font-black ${snapshot.pedidos.travados > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {snapshot.pedidos.travados}
                </span>
                <Clock size={20} className={snapshot.pedidos.travados > 0 ? 'text-red-500/50' : 'text-emerald-500/50'} />
              </div>
              <p className="text-[9px] font-mono text-zinc-500 mt-2 uppercase">Verificação atômica em tempo real</p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}