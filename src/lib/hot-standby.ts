// v406 — ROTA RESERVA QUENTE (decisão pura).
//
// Causa que sobrou viva: a rota B existia, mas só era descoberta NA HORA em que
// a rota A falhava — depois do cliente já ter pago. Se o fornecedor A trocava
// de ID de madrugada e nenhum outro fornecedor tinha vínculo válido para aquele
// pacote, o pacote passava horas "com rota única" sem ninguém saber. O primeiro
// a descobrir era o pedido travado.
//
// Regra: todo pacote da vitrine deve ter DUAS rotas pré-validadas (A e B) pelos
// MESMOS filtros do despacho. Quem responde "tenho reserva?" é este módulo —
// ninguém mais. Puro de propósito (sem banco, sem HTTP): testável.

import type { PreflightProvider, PreflightResult } from "./route-preflight";

export type RedundanciaNivel =
  | "quente" // A e B prontos agora (ID válido, estável, saldo cobre o custo)
  | "morna" // existe B, mas degradado (sem saldo ou instável): sai na recarga
  | "unica" // só A entrega: qualquer tropeço do fornecedor trava o pacote
  | "nenhuma"; // não há rota nenhuma

export type RedundanciaVerdict = {
  nivel: RedundanciaNivel;
  /** Fornecedor que entregaria primeiro. */
  primaria: string | null;
  /** Fornecedor de reserva pré-validado (null quando não existe). */
  reserva: string | null;
  /** Frase curta em português, pronta pro painel/alerta. */
  motivo: string;
};

/** Fornecedor pronto AGORA: ID válido, estável e saldo cobrindo o custo. */
function prontoAgora(p: PreflightProvider): boolean {
  if (!p.provider_service_id) return false;
  if (p.unstable) return false;
  const saldo = Number(p.saldo_atual ?? 0);
  if (!(saldo > 0)) return false;
  const custo = p.cost_brl;
  if (custo != null && Number(custo) > 0 && saldo < Number(custo)) return false;
  return true;
}

/**
 * Classifica a redundância de rota de um pacote.
 *
 * `res.viable` já vem filtrado pelos mesmos portões do despacho (ID fantasma,
 * faixa, produto errado, margem). Aqui não se reavalia nada: só se conta quantas
 * rotas sobreviveram e em que estado elas estão. Duplicar filtro aqui seria
 * criar uma segunda régua — exatamente o erro que a v334 proibiu.
 */
export function classifyRedundancy(res: PreflightResult): RedundanciaVerdict {
  const viaveis = res.ok ? res.viable.filter((p) => !!p.provider_service_id) : [];

  if (viaveis.length === 0) {
    return {
      nivel: "nenhuma",
      primaria: null,
      reserva: null,
      motivo: "Sem rota de entrega: nem principal, nem reserva",
    };
  }

  const primaria = viaveis[0];
  const resto = viaveis.slice(1);

  if (resto.length === 0) {
    return {
      nivel: "unica",
      primaria: primaria.slug,
      reserva: null,
      motivo: `Rota única (${primaria.slug}): sem reserva se este fornecedor falhar`,
    };
  }

  const reservaQuente = resto.find(prontoAgora);
  if (reservaQuente && prontoAgora(primaria)) {
    return {
      nivel: "quente",
      primaria: primaria.slug,
      reserva: reservaQuente.slug,
      motivo: `Reserva quente: ${primaria.slug} entrega, ${reservaQuente.slug} assume na hora se falhar`,
    };
  }

  const reserva = reservaQuente ?? resto[0];
  return {
    nivel: "morna",
    primaria: primaria.slug,
    reserva: reserva.slug,
    motivo: `Reserva existe (${reserva.slug}) mas está degradada: entra depois da recarga/estabilização`,
  };
}

/** Quantos pacotes estão sem reserva de verdade — número que vai pro alerta. */
export function contarSemReserva(
  vereditos: Array<Pick<RedundanciaVerdict, "nivel">>,
): { semReserva: number; comReservaQuente: number } {
  let semReserva = 0;
  let comReservaQuente = 0;
  for (const v of vereditos) {
    if (v.nivel === "unica" || v.nivel === "nenhuma") semReserva += 1;
    if (v.nivel === "quente") comReservaQuente += 1;
  }
  return { semReserva, comReservaQuente };
}
