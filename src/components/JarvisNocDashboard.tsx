import { useState, useEffect } from "react";
import { 
  Activity, 
  Zap, 
  Database, 
  Lock, 
  AlertTriangle, 
  Clock,
  ShieldAlert
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { jarvisNocSnapshot } from "@/lib/jarvis-noc.functions";
import { getJarvisTriage } from "@/lib/jarvis-triage.functions";
import { getAdminToken } from "@/lib/admin-token-store";
import { toast } from "sonner";

type ServiceStatus = "healthy" | "warning" | "error" | "unknown";

interface MetricCardProps {
  title: string;
  value: string;
  unit: string;
  status: ServiceStatus;
  icon: any;
  data: number[];
  source: string;
}

function MetricCard({ title, value, unit, status, icon: Icon, data, source }: MetricCardProps) {
  const statusColors = {
    healthy: "#00B37E",
    warning: "#FBA94C",
    error: "#F75A68",
    unknown: "#71717A"
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
          <span style={{ color: statusColors[status] }}>{status.toUpperCase()}</span>
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

  const fetchData = async () => {
    const token = getAdminToken();
    if (!token) return;
    try {
      setLoading(true);
      const [snapshot, triage] = await Promise.all([
        getSnapshotFn({ data: { token } }),
        getTriageFn({ data: { token } })
      ]);
      setData({ snapshot, triage });
    } catch (e) {
      toast.error("Erro na telemetria NOC");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <div className="p-8 text-zinc-500 text-center font-mono">Carregando telemetria real...</div>;
  if (!data) return <div className="p-8 text-red-500 text-center font-mono">Erro de conexão com NOC.</div>;

  const { snapshot, triage } = data;
  const metrics: MetricCardProps[] = [
    { 
      title: "Checkout 24h", 
      value: snapshot.ok ? String(snapshot.pedidos.pagos24h) : "??", 
      unit: "pedidos pagos", 
      status: snapshot.ok ? "healthy" : "unknown", 
      icon: Activity, 
      data: [], 
      source: "pedidos.db" 
    },
    { 
      title: "API Gateway", 
      value: snapshot.ok ? (snapshot.apiLatency.find((a: any) => a.name === 'MercadoPago')?.ms || 0).toString() : "??", 
      unit: "ms", 
      status: snapshot.ok ? (snapshot.apiLatency.find((a: any) => a.name === 'MercadoPago')?.ok ? "healthy" : "error") : "unknown", 
      icon: Zap, 
      data: [], 
      source: "ping.api" 
    },
    { 
      title: "Alerta Crítico", 
      value: triage.counters.criticalAlerts.toString(), 
      unit: "eventos", 
      status: triage.counters.criticalAlerts > 0 ? "error" : "healthy", 
      icon: AlertTriangle, 
      data: [], 
      source: "jarvis_alerts" 
    },
    { 
      title: "Latência Checkout", 
      value: "UNKNOWN", 
      unit: "NÃO TELEMETRADA", 
      status: "unknown", 
      icon: Clock, 
      data: [], 
      source: "infra.telemetry" 
    },
    { 
      title: "Profile Errors", 
      value: triage.counters.invalidTargetAnomalies.toString(), 
      unit: "anomalias", 
      status: triage.counters.invalidTargetAnomalies > 3 ? "warning" : "healthy", 
      icon: ShieldAlert, 
      data: [], 
      source: "funnel_events" 
    }
  ];

  const globalStatus = triage.status === "green" ? "healthy" : (triage.status === "yellow" ? "warning" : "error");
  const lastUpdate = triage.generatedAt;

  return (
    <div className="p-4 md:p-8 font-inter bg-[#121214] min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-zinc-100 flex items-center gap-2">
              <ShieldAlert className="text-[#00B37E]" /> J.A.R.V.I.S. NOC
            </h1>
            <p className="text-zinc-500 text-xs font-mono">Telemetria Real v631 · Última: {new Date(lastUpdate).toLocaleTimeString()}</p>
          </div>
          
          <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 ${
            globalStatus === "healthy" ? "border-[#00B37E]/20 bg-[#00B37E]/5" : 
            globalStatus === "warning" ? "border-[#FBA94C]/20 bg-[#FBA94C]/5" : 
            "border-[#F75A68]/20 bg-[#F75A68]/5"
          }`}>
            <div className={`h-3 w-3 rounded-full animate-pulse ${
              globalStatus === "healthy" ? "bg-[#00B37E]" : 
              globalStatus === "warning" ? "bg-[#FBA94C]" : 
              "bg-[#F75A68]"
            }`} />
            <span className={`font-bold tracking-widest text-sm ${
              globalStatus === "healthy" ? "text-[#00B37E]" : 
              globalStatus === "warning" ? "text-[#FBA94C]" : 
              "text-[#F75A68]"
            }`}>
              {globalStatus === "healthy" ? "SISTEMA SAUDÁVEL" : 
               globalStatus === "warning" ? "ATENÇÃO OPERACIONAL" : 
               "FALHA CRÍTICA"}
            </span>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m) => <MetricCard key={m.title} {...m} />)}
        </div>

        <Card className="bg-[#202024] border-none text-white shadow-xl p-6">
            <h2 className="text-sm font-bold text-zinc-400 mb-4 uppercase">Status Triagem: {triage.status.toUpperCase()}</h2>
            <p className="text-lg font-bold">{triage.headline}</p>
            <p className="text-sm text-zinc-400 mt-2">{triage.summary}</p>
        </Card>
      </div>
    </div>
  );
}
