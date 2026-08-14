import { useState, useEffect } from "react";
import { 
  Activity, 
  ShieldAlert, 
  Zap, 
  Database, 
  Lock, 
  AlertTriangle, 
  CheckCircle2, 
  XCircle,
  Clock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useJarvis } from "@/hooks/useJarvis";

type ServiceStatus = "healthy" | "warning" | "error";

interface MetricCardProps {
  title: string;
  value: string;
  unit: string;
  status: ServiceStatus;
  icon: any;
  sparklineData: number[];
}

function Sparkline({ data, color }: { data: number[], color: string }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min;
  const width = 100;
  const height = 30;
  
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

function MetricCard({ title, value, unit, status, icon: Icon, sparklineData }: MetricCardProps) {
  const statusColors = {
    healthy: "#00B37E",
    warning: "#FBA94C",
    error: "#F75A68"
  };

  return (
    <Card className="bg-[#202024] border-none text-white shadow-xl">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-zinc-400 uppercase tracking-wider">{title}</CardTitle>
        <Icon size={18} style={{ color: statusColors[status] }} />
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold">{value}</span>
          <span className="text-xs text-zinc-500">{unit}</span>
        </div>
        <div className="mt-4">
          <Sparkline data={sparklineData} color={statusColors[status]} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColors[status] }} />
          <span className="text-[10px] text-zinc-500 font-mono">
            {status === "healthy" ? "VERIFICADO" : status === "warning" ? "ATENÇÃO" : "FALHA DETECTADA"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export function JarvisNocDashboard() {
  const [incidentForm, setIncidentForm] = useState({
    rootCause: "",
    regressionSteps: "",
    noDuplication: false
  });
  
  const [logs, setLogs] = useState<string[]>([]);
  
  const addLog = (msg: string) => {
    setLogs(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 9)]);
  };

  const handleSaveIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentForm.rootCause || !incidentForm.regressionSteps || !incidentForm.noDuplication) {
      toast.error("Preencha todos os campos obrigatórios e valide a não-duplicação.");
      return;
    }
    toast.success("Plano de correção registrado no protocolo v629.");
    addLog(`INCIDENTE REGISTRADO: ${incidentForm.rootCause.substring(0, 30)}...`);
    setIncidentForm({ rootCause: "", regressionSteps: "", noDuplication: false });
  };

  // Simulação de dados
  const metrics = [
    { title: "Checkout", value: "98.2", unit: "% Sucesso", status: "healthy" as const, icon: Activity, data: [90, 92, 95, 98, 97, 98, 99] },
    { title: "Gateway", value: "142", unit: "ms Latência", status: "healthy" as const, icon: Zap, data: [180, 160, 150, 140, 145, 142, 138] },
    { title: "Inventário", value: "0.4", unit: "% Erros", status: "healthy" as const, icon: Database, data: [1.2, 0.8, 0.5, 0.4, 0.3, 0.4, 0.4] },
    { title: "Autenticação", value: "99.9", unit: "% Uptime", status: "healthy" as const, icon: Lock, data: [99.8, 99.9, 100, 99.9, 99.9, 99.9, 99.9] },
  ];

  const globalStatus = "healthy"; // Lógica real baseada em metrics.every(...)

  return (
    <div className="min-h-screen bg-[#121214] text-white p-4 md:p-8 font-inter">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header & Global Status */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-zinc-100 flex items-center gap-2">
              <ShieldAlert className="text-[#00B37E]" /> J.A.R.V.I.S. NOC
            </h1>
            <p className="text-zinc-500 text-sm">Saúde operacional em tempo real v630</p>
          </div>
          
          <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 ${
            globalStatus === "healthy" ? "border-[#00B37E]/20 bg-[#00B37E]/5" : "border-[#F75A68]/20 bg-[#F75A68]/5"
          }`}>
            <div className={`h-3 w-3 rounded-full animate-pulse ${
              globalStatus === "healthy" ? "bg-[#00B37E]" : "bg-[#F75A68]"
            }`} />
            <span className={`font-bold tracking-widest text-sm ${
              globalStatus === "healthy" ? "text-[#00B37E]" : "text-[#F75A68]"
            }`}>
              {globalStatus === "healthy" ? "SISTEMA SAUDÁVEL" : "ALERTA OPERACIONAL"}
            </span>
          </div>
        </header>

        {/* Grid de Métricas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map((m) => (
            <MetricCard 
              key={m.title}
              title={m.title}
              value={m.value}
              unit={m.unit}
              status={m.status}
              icon={m.icon}
              sparklineData={m.data}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulário de Incidentes */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <AlertTriangle className="text-[#FBA94C]" size={20} /> Registro de Incidente
            </h2>
            <Card className="bg-[#202024] border-none text-white shadow-xl p-6">
              <form onSubmit={handleSaveIncident} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="rootCause" className="text-zinc-400">Causa Raiz</Label>
                  <Input 
                    id="rootCause"
                    placeholder="Descreva a causa técnica real..."
                    className="bg-[#121214] border-zinc-800 text-white focus:border-[#00B37E]"
                    value={incidentForm.rootCause}
                    onChange={(e) => setIncidentForm({...incidentForm, rootCause: e.target.value})}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="regression" className="text-zinc-400">Teste de Regressão</Label>
                  <textarea 
                    id="regression"
                    rows={4}
                    placeholder="Passo a passo para validar a correção..."
                    className="w-full rounded-md bg-[#121214] border border-zinc-800 text-white p-3 text-sm focus:border-[#00B37E] outline-none"
                    value={incidentForm.regressionSteps}
                    onChange={(e) => setIncidentForm({...incidentForm, regressionSteps: e.target.value})}
                  />
                </div>

                <div className="flex items-center space-x-2 bg-[#121214] p-4 rounded-lg border border-zinc-800">
                  <Checkbox 
                    id="duplication" 
                    checked={incidentForm.noDuplication}
                    onCheckedChange={(checked: boolean | "indeterminate") => setIncidentForm({...incidentForm, noDuplication: !!checked})}
                  />
                  <Label htmlFor="duplication" className="text-xs text-zinc-400 cursor-pointer">
                    Confirmo que a correção impede a duplicação de pedidos ou entregas (Protocolo Atômico v383)
                  </Label>
                </div>

                <Button className="w-full bg-[#00B37E] hover:bg-[#009669] text-white font-bold h-12">
                  SALVAR PLANO DE CORREÇÃO
                </Button>
              </form>
            </Card>
          </div>

          {/* Logs */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Clock className="text-zinc-400" size={20} /> Histórico Status
            </h2>
            <div className="bg-[#202024] rounded-2xl p-4 min-h-[400px] border border-zinc-800/50">
              <div className="space-y-3">
                {logs.length === 0 && (
                  <p className="text-zinc-600 text-xs italic">Aguardando sinais de rádio...</p>
                )}
                {logs.map((log, i) => (
                  <div key={i} className="text-[10px] font-mono p-2 border-b border-zinc-800/30 text-zinc-400 last:border-0">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
