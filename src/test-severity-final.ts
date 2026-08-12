import { classifyAlertSeverity } from "./lib/alert-severity";

const tests = [
  { msg: "Erro no banco: DATABASE_ERROR", expected: "critical" },
  { msg: "Alvo inválido: PROFILE_NOT_FOUND", expected: "warning" },
  { msg: "PIX APROVADO", expected: "critical" },
  { msg: "✅ Resolvido", expected: "info" }
];

tests.forEach(t => {
  const res = classifyAlertSeverity(t.msg);
  console.log(`Msg: ${t.msg.padEnd(30)} | Result: ${res.padEnd(10)} | Success: ${res === t.expected}`);
});
