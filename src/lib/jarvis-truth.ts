import { z } from "zod";

/**
 * v653 — Jarvis Truth Protocol
 * Define os estados e a lógica de classificação canônica.
 */

export const HealthStateSchema = z.enum(["GREEN", "DEGRADED", "RED", "UNKNOWN"]);
export type HealthState = z.infer<typeof HealthStateSchema>;

export interface MetricProbe {
  value: any;
  timestamp: string | null;
  valid: boolean;
  timeout?: boolean;
  error?: string;
  source: string;
}

export interface MetricClassification {
  state: HealthState;
  reason: string;
  details?: any;
}

/**
 * Prioridade de agregação: RED > DEGRADED > UNKNOWN > GREEN
 */
export function aggregateStates(states: HealthState[]): HealthState {
  if (states.includes("RED")) return "RED";
  if (states.includes("DEGRADED")) return "DEGRADED";
  if (states.includes("UNKNOWN")) return "UNKNOWN";
  return "GREEN";
}

/**
 * Regra: Ausência de evidência NÃO é sucesso.
 */
export function classifyProbe(probe: MetricProbe, logic: (val: any) => MetricClassification): MetricClassification {
  if (!probe.valid || probe.timeout || !!probe.error || !probe.timestamp) {
    return { state: "UNKNOWN", reason: `Evidência ausente ou inconclusiva: ${probe.error || 'sem dados'}` };
  }
  
  // Verificar validade temporal (ex: dados com mais de 1h são considerados UNKNOWN para métricas críticas)
  const ageMs = Date.now() - new Date(probe.timestamp).getTime();
  if (ageMs > 60 * 60 * 1000) {
     return { state: "UNKNOWN", reason: "Métrica expirada (>1h)" };
  }

  return logic(probe.value);
}
