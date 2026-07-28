// v297 — PREFLIGHT DE ROTA (decisão pura).
//
// Por que existe: até a v296 o checkout só olhava FLAGS do banco
// (`is_sellable` + existir algum `*_service_id`). Essas flags envelhecem: o
// fornecedor troca de ID/preço a qualquer hora. Resultado real observado:
//   - p15k R$283,44 → cobrado e reembolsado (IDs mortos / painel recusando)
//   - kf2k R$18,00  → cobrado e reembolsado (custo estourou a margem mínima)
//
// A regra nova é a mesma dos painéis grandes: NÃO COBRE O QUE VOCÊ NÃO
// CONSEGUE DESPACHAR AGORA. Este módulo aplica, ANTES de gerar o Pix, os
// MESMOS filtros que o despacho aplica depois. Se nenhum fornecedor sobra, o
// cliente vê "indisponível" em vez de pagar e receber estorno.
//
// Puro de propósito (sem banco/HTTP) para ser testável e ser o ponto único de
// verdade da pergunta "dá pra entregar?".

import { respectsMinMargin } from "./margin-guardian";

export type PreflightProvider = {
  slug: string;
  nome?: string;
  cost_brl: number | null;
  provider_service_id: string | null;
  saldo_atual: number;
  unstable: boolean;
};

export type PreflightResult = {
  ok: boolean;
  viable: PreflightProvider[];
  /** Motivo legível do bloqueio (só quando ok=false). */
  reason: string | null;
  /** Por que cada fornecedor caiu fora — vai pro alerta e pro log. */
  rejections: string[];
  /** true = nenhum fornecedor tem ID válido (problema de catálogo, não de saldo). */
  structural: boolean;
  /** v352 — rota existe, mas nenhum fornecedor tem saldo agora: vender e recarregar. */
  needsTopup: boolean;
};

/** Saldo cobre o custo conhecido deste pedido? */
function cobreCusto(p: PreflightProvider): boolean {
  const saldo = Number(p.saldo_atual);
  if (!(saldo > 0)) return false;
  if (p.cost_brl != null && Number(p.cost_brl) > 0 && saldo < Number(p.cost_brl)) return false;
  return true;
}

export function evaluateRoute(ranked: PreflightProvider[], valorBrl: number): PreflightResult {
  const rejections: string[] = [];
  let semId = 0;

  const comId = ranked.filter((p) => {
    if (!p.provider_service_id) {
      semId += 1;
      rejections.push(`${p.slug}: sem ID de serviço válido`);
      return false;
    }
    return true;
  });

  // Margem primeiro: espelha a trava v216 do despacho e é a causa mais grave
  // (venderia no prejuízo). Custo desconhecido NÃO bloqueia — o despacho tenta.
  const comMargem = comId.filter((p) => {
    if (p.cost_brl != null && !respectsMinMargin(valorBrl, p.cost_brl)) {
      rejections.push(`${p.slug}: custo R$${Number(p.cost_brl).toFixed(2)} estoura a margem mínima`);
      return false;
    }
    return true;
  });

  // v352 — SALDO NÃO BLOQUEIA VENDA. Substitui a v322 (que recusava a cobrança).
  // Motivo: o dono repõe saldo na hora em que o aviso chega no celular, e o
  // cliente tem prazo de entrega. Recusar a venda perde dinheiro por um
  // problema que se resolve com um Pix. Fornecedor sem saldo vira ÚLTIMA opção
  // (degradado), e o pedido, se preciso, parqueia em `waiting_provision` até a
  // recarga — nunca some da vitrine, nunca é estorno automático imediato.
  const comSaldo = comMargem.filter(cobreCusto);
  const semSaldo = comMargem.filter((p) => !cobreCusto(p));
  for (const p of semSaldo) {
    const saldo = Number(p.saldo_atual);
    rejections.push(
      p.cost_brl != null && Number(p.cost_brl) > 0
        ? `${p.slug}: saldo R$${saldo.toFixed(2)} não cobre o custo R$${Number(p.cost_brl).toFixed(2)} (degradado, aguarda recarga)`
        : `${p.slug}: sem saldo (degradado, aguarda recarga)`,
    );
  }

  // Instável é degradado, não eliminado: só descartamos se houver alternativa
  // estável. Caso contrário o failover em runtime ainda tenta.
  // Quem tem saldo entrega primeiro; sem saldo em ninguém, a rota ainda existe
  // (parqueia e sai na recarga). Dentro do mesmo grupo, estável ganha.
  const preferidos = comSaldo.length ? comSaldo : semSaldo;
  const estaveis = preferidos.filter((p) => !p.unstable);
  const ordem = estaveis.length ? estaveis : preferidos;

  if (ordem.length > 0) {
    return {
      ok: true,
      viable: ordem,
      reason: null,
      rejections,
      structural: false,
      needsTopup: comSaldo.length === 0,
    };
  }

  const structural = ranked.length === 0 || semId === ranked.length;
  const reason = ranked.length === 0
    ? "Nenhum fornecedor habilitado para este pacote"
    : structural
      ? "Nenhum fornecedor tem ID de serviço válido no catálogo atual"
      : rejections[0] ?? "Sem rota de entrega disponível";

  return { ok: false, viable: [], reason, rejections, structural, needsTopup: false };
}

