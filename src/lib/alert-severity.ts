// v316 — CLASSIFICADOR ÚNICO DE SEVERIDADE DE ALERTA.
//
// CAUSA RAIZ (não sintoma): `dispatchTelegramAlert` usava `severity ?? "critical"`.
// Das 35 chamadas do sistema, 33 não passavam severidade. Resultado: TODO evento
// virava vermelho — inclusive "✅ PACOTE VOLTOU AO NORMAL", "🤝 NOVO PEDIDO DE
// REVENDA" e "🟢 PIX APROVADO". O semáforo do admin nunca podia ficar verde,
// porque sucesso e desastre entravam na mesma gaveta.
//
// Efeito colateral pior: com tudo vermelho, o vermelho perdeu significado. O dono
// não conseguia mais distinguir "cliente perdendo dinheiro AGORA" de "robô fez o
// trabalho dele". Isso é o que dá a sensação de "vírus preso": não é um bug novo,
// é ruído sem hierarquia.
//
// Regra agora: a severidade é DERIVADA da mensagem, num único lugar puro e
// testável. Quem chamar pode sobrescrever, mas ninguém mais herda "critical" por
// acidente.

export type AlertSeverity = "critical" | "error" | "warning" | "info";

/** Sucesso / informativo: nada quebrado, nada para o dono fazer agora. */
const INFO_MARKERS = [
  "✅",
  "🟢",
  "🤝",
  "problema: nenhum",
  "voltou ao normal",
  "resolvido",
  "calibração concluída",
  "boot do painel",
  "entrega automática",
  "concluído",
  "concluida",
];

/** Aviso: uma trava funcionou e impediu o dano. Registra, não acorda ninguém. */
const WARNING_MARKERS = [
  "⚠️",
  "bloqueada",
  "bloqueado",
  "em quarentena",
  "quarentena",
  "protegido",
  "proteção",
  "ignorado",
  "tirado da vitrine",
  "instáv", // "webhook instável" com recuperação bem-sucedida
  // v345 — saldo NÃO é falha de entrega: existe prazo de 24h e o dono repõe a
  // qualquer hora. Só vira vermelho quando o prazo estoura (marcador abaixo).
  "sem saldo",
  "saldo baixo",
  "recarregar",
];

/** Crítico: dinheiro ou cliente em risco AGORA. Só isso pode acordar o dono. */
const CRITICAL_MARKERS = [
  "🚨",
  "⛔",
  "não está funcionando",
  "nao esta funcionando",
  "quebrada",
  "quebrado",
  "falhou",
  "estorno",
  "reembolso",
  "saldo pendente há mais de 24h",
  "saldo pendente ha mais de 24h",
  "cobrança órfã",
  "cobranca orfa",
  "todos fornecedores",
  "dupla entrega",
];


function norm(s: string): string {
  return String(s ?? "").toLowerCase();
}

/**
 * Deriva a severidade a partir do texto do alerta.
 * Ordem de decisão (a mais grave que se aplicar vence, exceto sucesso explícito):
 * 1. Sucesso explícito no início da mensagem → info (não é problema, ponto).
 * 2. Marcador crítico → critical.
 * 3. Marcador de aviso → warning.
 * 4. Nada reconhecido → warning (padrão seguro: registra, não vira vermelho).
 *
 * Padrão deliberadamente NÃO é "critical": vermelho por omissão foi exatamente
 * a causa do semáforo travado. Alerta que precisa acordar o dono declara isso
 * com um marcador claro (🚨/⛔) ou passando `severity` na chamada.
 */
export function classifyAlertSeverity(message: string): AlertSeverity {
  const m = norm(message);
  const cabeca = m.slice(0, 120);

  if (INFO_MARKERS.some((k) => cabeca.includes(k))) return "info";
  if (CRITICAL_MARKERS.some((k) => m.includes(k))) return "critical";
  if (WARNING_MARKERS.some((k) => m.includes(k))) return "warning";
  return "warning";
}
