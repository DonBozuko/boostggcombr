// v359 — AUTORIDADE DO VÍNCULO (módulo puro).
//
// Causa raiz do loop que sobrou: a cada sincronização o motor de preço
// REGRAVAVA `smmhype_service_id` com o ID vindo da matriz do CÓDIGO
// (`resolveServiceId`). Qualquer vínculo escolhido no admin — ou corrigido à
// mão para um serviço que realmente entrega a quantidade — era apagado no
// ciclo seguinte. O pacote voltava para o fornecedor errado, o custo pulava e
// o alerta "PACOTE APOSENTADO" nascia de novo. Loop sem fim, sem culpa do
// fornecedor.
//
// Regra (memória: fonte única de ID de fornecedor):
//   o ID do código é SEMENTE, nunca verdade. O vínculo que já está no banco
//   manda, e só perde a vez quando ele mesmo não entrega a quantidade pedida.

import { serviceAcceptsQty } from "./critical-guards";

export type ServiceRange = { min?: number | string | null; max?: number | string | null };

/**
 * Decide qual ID de serviço deve ficar gravado no pacote.
 *
 * - sem vínculo no banco → usa a semente do código;
 * - com vínculo e faixa desconhecida → mantém o vínculo (falta de dado nunca
 *   apaga escolha boa; ID fantasma já é cortado pelo portão v320);
 * - com vínculo que aceita a quantidade → mantém o vínculo;
 * - com vínculo que NÃO aceita a quantidade → cai para a semente do código.
 */
export function chooseBoundServiceId(params: {
  candidate: string | null;
  existing: string | null;
  qty: number;
  ranges: Map<number, ServiceRange>;
}): string | null {
  const { candidate, existing, qty, ranges } = params;
  const atual = existing != null && String(existing).trim() !== "" ? String(existing).trim() : null;
  if (!atual) return candidate;
  const faixa = ranges.get(Number(atual));
  if (!faixa) return atual;
  if (serviceAcceptsQty(faixa, qty)) return atual;
  return candidate;
}
