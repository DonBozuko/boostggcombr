import { classifyAlertSeverity } from "./lib/alert-severity";
import { getJarvisTriage } from "./lib/jarvis-triage.functions";

async function runValidation() {
  console.log("--- VALIDAÇÃO v628 ---");
  
  // 1. Severidade
  const dbErrorSev = classifyAlertSeverity("🚨 DATABASE_ERROR no checkout: falha ao inserir pedido");
  console.log("Severidade DATABASE_ERROR:", dbErrorSev);
  if (dbErrorSev !== "critical") throw new Error("DATABASE_ERROR deve ser critical");

  const profileErrorSev = classifyAlertSeverity("👤 PROFILE_NOT_FOUND: perfil inexistente");
  console.log("Severidade PROFILE_NOT_FOUND:", profileErrorSev);
  
  console.log("Validação concluída com sucesso.");
}

runValidation().catch(e => {
  console.error("FALHA NA VALIDAÇÃO:", e);
  process.exit(1);
});
