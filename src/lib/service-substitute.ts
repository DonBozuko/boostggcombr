// v362 — SUBSTITUTO POR IMPRESSÃO DIGITAL (função pura, testável).
//
// Causa raiz que sobrou viva: quando o fornecedor APAGA ou TROCA o ID, o
// auto-reparador procurava o serviço novo com `name.includes(pacote)` — ou
// seja, comparava "ig1k" com "Instagram Followers | Real | Max 500K". Nunca
// achava. Resultado: o vínculo era zerado, a rota sumia e o pacote caía na
// varredura como "sem entrega garantida". O fornecedor tinha o produto; nós é
// que não sabíamos reconhecê-lo.
//
// Regra nova: ID é referência descartável. A verdade do vínculo é
//   intenção (rede + o que entrega) + faixa de quantidade + custo aceitável.
// Com isso, trocar de ID vira evento rotineiro, não quebra de venda.

import { intentSignature, serviceSignature } from "./service-fingerprint";
import { serviceAcceptsQty } from "./critical-guards";

export type CandidateService = {
  service: string | number;
  name?: string | null;
  rate?: number | string | null;
  min?: number | string | null;
  max?: number | string | null;
};

export type SubstituteChoice = {
  service_id: string;
  name: string;
  rate: number;
  /** Assinatura de intenção que casou (rede + produto). */
  intent: string;
};

export type SubstituteInput = {
  /** Assinatura gravada no vínculo antigo (name_sig) OU o nome antigo do serviço. */
  previousSignature: string;
  /** Quantidade que o pacote precisa entregar. */
  qty: number;
  /** Catálogo vivo do fornecedor. */
  catalog: CandidateService[];
  /**
   * Teto de custo por unidade na moeda do fornecedor (rate é por 1000).
   * Opcional: sem teto, escolhe o mais barato que entrega.
   */
  maxRate?: number | null;
};

/**
 * Escolhe o serviço substituto quando o ID vinculado morreu.
 *
 * Critérios, em ordem — nenhum deles é "parecido no nome":
 *   1. mesma intenção (rede + produto) da assinatura antiga;
 *   2. aceita a quantidade do pacote (min/max reais do fornecedor);
 *   3. custo dentro do teto informado (quando informado);
 *   4. entre os que sobram, o mais barato; empate → menor teto (mais específico).
 *
 * Sem candidato → null. Nunca chuta: preferir rota vazia a entregar produto
 * errado (é o erro que vira estorno).
 */
export function pickSubstituteService(input: SubstituteInput): SubstituteChoice | null {
  const alvo = intentSignature(input.previousSignature);
  if (!alvo) return null;

  const qty = Number(input.qty) || 0;
  const teto = Number(input.maxRate);
  const temTeto = Number.isFinite(teto) && teto > 0;

  const viaveis = input.catalog
    .map((s) => {
      const name = String(s.name ?? "");
      const rate = Number(s.rate);
      return {
        raw: s,
        name,
        rate,
        intent: intentSignature(serviceSignature(name)),
        max: Number(s.max) || 0,
      };
    })
    .filter((c) => c.intent === alvo)
    .filter((c) => Number.isFinite(c.rate) && c.rate > 0)
    .filter((c) => serviceAcceptsQty(c.raw, qty))
    .filter((c) => (temTeto ? c.rate <= teto : true));

  if (viaveis.length === 0) return null;

  viaveis.sort((a, b) => {
    if (a.rate !== b.rate) return a.rate - b.rate;
    const am = a.max || Number.MAX_SAFE_INTEGER;
    const bm = b.max || Number.MAX_SAFE_INTEGER;
    return am - bm;
  });

  const win = viaveis[0];
  return {
    service_id: String(win.raw.service),
    name: win.name,
    rate: win.rate,
    intent: win.intent,
  };
}
