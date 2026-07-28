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
};

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

  // v322 — SALDO PRECISA COBRIR O PEDIDO, não só ser maior que zero.
  // Causa real do "pacote pequeno entrega, pacote grande falha": um fornecedor
  // com R$16 passava nesta trava e recebia um pedido de custo R$70. O painel
  // recusa por saldo, o cliente já pagou → estorno. Agora, quando o custo é
  // conhecido, o fornecedor só entra na rota se o saldo cobrir o custo.
  const comSaldo = comMargem.filter((p) => {
    const saldo = Number(p.saldo_atual);
    if (!(saldo > 0)) {
      rejections.push(`${p.slug}: sem saldo`);
      return false;
    }
    if (p.cost_brl != null && Number(p.cost_brl) > 0 && saldo < Number(p.cost_brl)) {
      rejections.push(
        `${p.slug}: saldo R$${saldo.toFixed(2)} não cobre o custo R$${Number(p.cost_brl).toFixed(2)}`,
      );
      return false;
    }
    return true;
  });


  // Instável é degradado, não eliminado: só descartamos se houver alternativa
  // estável. Caso contrário o failover em runtime ainda tenta.
  const estaveis = comMargem.filter((p) => !p.unstable);
  const viable = estaveis.length ? estaveis : comMargem;

  if (viable.length > 0) {
    return { ok: true, viable, reason: null, rejections, structural: false };
  }

  const structural = ranked.length === 0 || semId === ranked.length;
  const reason = ranked.length === 0
    ? "Nenhum fornecedor habilitado para este pacote"
    : structural
      ? "Nenhum fornecedor tem ID de serviço válido no catálogo atual"
      : rejections[0] ?? "Sem rota de entrega disponível";

  return { ok: false, viable: [], reason, rejections, structural };
}
