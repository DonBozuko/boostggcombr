import { computeMaturity } from "./maturity-metrics";
import { getInsightsIA } from "./insights.functions";
import { getFunilEtapas } from "./funil-etapas.functions";

async function auditMetrics() {
  console.log("--- AUDITORIA DE MÉTRICAS v628 ---");
  
  // 1. Janelas Temporais
  console.log("Maturity Metrics: 30 dias (padrão)");
  console.log("Insights IA: 365 dias (limit 5000)");
  console.log("Funil Etapas: 7 ou 30 dias (selecionável)");
  console.log("Conversion Analytics (Frontend): 2000 pedidos (limit)");

  // 2. Definições de Status "Pago"
  const INSIGHTS_PAID = ["paid", "Enviado", "pago", "completed", "processing"];
  const MATURITY_DELIVERED = ["Enviado", "completed", "concluido", "concluído"];
  const CONVERSION_FRONTEND = ["pago"];

  console.log("Critérios 'Pago' - Insights:", INSIGHTS_PAID.join(", "));
  console.log("Critérios 'Entregue' - Maturity:", MATURITY_DELIVERED.join(", "));
  console.log("Critérios 'Pago' - Conversion (FE):", CONVERSION_FRONTEND.join(", "));

  if (!INSIGHTS_PAID.includes("pago") || !INSIGHTS_PAID.includes("paid")) {
     console.error("ERRO: Insights IA ignora status 'pago' ou 'paid'!");
  }
}

auditMetrics();
