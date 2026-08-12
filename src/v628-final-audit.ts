import { getJarvisTriage } from "./lib/jarvis-triage.functions";
import { getMaturityMetrics } from "./lib/maturity-metrics.ts";
import { getInsightsIA } from "./lib/insights.functions.ts";

async function runAudit() {
  console.log("--- INICIANDO VALIDAÇÃO FUNCIONAL v628 ---");

  try {
    const triage = await getJarvisTriage();
    const dbErrors = triage.anomalias.filter(a => a.origem === 'DATABASE_ERROR');
    console.log(`Anomalias DATABASE_ERROR encontradas: ${dbErrors.length}`);
    if (dbErrors.length > 0) {
      console.log(`Severidade do primeiro DATABASE_ERROR: ${dbErrors[0].severidade}`);
    }
    console.log(`Contador databaseErrors na triagem: ${triage.status_geral.databaseErrors}`);

    const isCritical = triage.anomalias.some(a => a.severidade === 'critical');
    console.log(`Existe anomalia crítica? ${isCritical}`);

    const profileAnoms = triage.anomalias.filter(a => a.origem === 'PROFILE_NOT_FOUND');
    console.log(`Anomalias PROFILE_NOT_FOUND: ${profileAnoms.length}`);
    if (profileAnoms.length > 0) {
       console.log(`Severidade PROFILE_NOT_FOUND: ${profileAnoms[0].severidade}`);
    }
  } catch (e) {
    console.error("Erro ao executar triagem:", e);
  }

  console.log("--- FIM DA VALIDAÇÃO ---");
}

runAudit().catch(console.error);
