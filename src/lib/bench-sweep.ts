// v322 — BANCADA DE PROVAS (decisão pura).
//
// Por que existe: "pacote pequeno entregava, pacote grande não". A vitrine
// dizia vendável (flag do banco), mas na hora do despacho o fornecedor recusava
// por saldo insuficiente — e o cliente já tinha pago. Testar isso comprando de
// verdade custa dinheiro; testar só com flag do banco mente.
//
// Esta bancada roda a MESMA decisão do checkout (`evaluateRoute`) contra o
// catálogo e o saldo VIVOS, pacote por pacote, sem gerar cobrança e sem
// despachar nada. O veredito aqui é o mesmo veredito que o cliente receberia.
//
// Puro de propósito: sem banco, sem HTTP. Testável.

import type { PreflightProvider, PreflightResult } from "./route-preflight";

export type BenchVerdict =
  | "entregavel"
  | "sem_fornecedor"
  | "catalogo"
  | "saldo"
  | "margem";

export type BenchRow = {
  pacote: string;
  category: string | null;
  quantidade: number;
  price_brl: number;
  verdict: BenchVerdict;
  /** Frase curta em português, pronta pro painel. */
  motivo: string;
  /** Fornecedor que entregaria (quando entregável). */
  fornecedor: string | null;
  custoBrl: number | null;
  /** Quanto falta recarregar pra destravar este pacote (só no veredito "saldo"). */
  faltaRecarregar: number | null;
  /** Em qual fornecedor falta esse dinheiro. */
  faltaEm: string | null;
};

function fmt(v: number): string {
  return `R$ ${v.toFixed(2).replace(".", ",")}`;
}

/**
 * Traduz o resultado do preflight em veredito de bancada.
 * A ordem importa: catálogo (estrutural) > margem > saldo. Saldo é transitório
 * e some com uma recarga; catálogo exige religar vínculo.
 */
export function classifyBench(
  ranked: PreflightProvider[],
  res: PreflightResult,
): Pick<BenchRow, "verdict" | "motivo" | "fornecedor" | "custoBrl" | "faltaRecarregar" | "faltaEm"> {
  if (res.ok) {
    const melhor = [...res.viable].sort(
      (a, b) => (a.cost_brl ?? Infinity) - (b.cost_brl ?? Infinity),
    )[0];
    return {
      verdict: "entregavel",
      motivo: "Entrega garantida agora",
      fornecedor: melhor?.slug ?? null,
      custoBrl: melhor?.cost_brl ?? null,
      faltaRecarregar: null,
      faltaEm: null,
    };
  }

  if (ranked.length === 0) {
    return {
      verdict: "sem_fornecedor",
      motivo: "Nenhum fornecedor habilitado para este pacote",
      fornecedor: null,
      custoBrl: null,
      faltaRecarregar: null,
      faltaEm: null,
    };
  }

  if (res.structural) {
    return {
      verdict: "catalogo",
      motivo: "Nenhum fornecedor reconhece o serviço deste pacote",
      fornecedor: null,
      custoBrl: null,
      faltaRecarregar: null,
      faltaEm: null,
    };
  }

  // Falta de saldo: existe ID válido e custo conhecido, só falta dinheiro lá.
  const candidatos = ranked
    .filter((p) => p.provider_service_id && p.cost_brl != null && Number(p.cost_brl) > 0)
    .map((p) => ({
      slug: p.slug,
      custo: Number(p.cost_brl),
      falta: Number(p.cost_brl) - Number(p.saldo_atual ?? 0),
    }))
    .filter((c) => c.falta > 0)
    .sort((a, b) => a.falta - b.falta);

  const bloqueioMargem = res.rejections.some((r) => /margem/i.test(r));

  if (candidatos.length > 0 && !bloqueioMargem) {
    const alvo = candidatos[0];
    return {
      verdict: "saldo",
      motivo: `Falta ${fmt(alvo.falta)} de saldo em ${alvo.slug} pra este pacote sair`,
      fornecedor: alvo.slug,
      custoBrl: alvo.custo,
      faltaRecarregar: Number(alvo.falta.toFixed(2)),
      faltaEm: alvo.slug,
    };
  }

  if (bloqueioMargem) {
    return {
      verdict: "margem",
      motivo: "O custo do fornecedor subiu e comeu a margem — venderia no prejuízo",
      fornecedor: null,
      custoBrl: null,
      faltaRecarregar: null,
      faltaEm: null,
    };
  }

  return {
    verdict: "saldo",
    motivo: res.reason ?? "Sem rota de entrega agora",
    fornecedor: null,
    custoBrl: null,
    faltaRecarregar: null,
    faltaEm: null,
  };
}

export type BenchSummary = {
  total: number;
  entregavel: number;
  porVeredito: Record<BenchVerdict, number>;
  /** Quanto recarregar em cada fornecedor pra destravar TODOS os pacotes travados por saldo. */
  recargaPorFornecedor: Record<string, number>;
  /** Rotas (categorias) com pelo menos 1 pacote travado. */
  rotasComProblema: string[];
};

export function summarizeBench(rows: BenchRow[]): BenchSummary {
  const porVeredito: Record<BenchVerdict, number> = {
    entregavel: 0,
    sem_fornecedor: 0,
    catalogo: 0,
    saldo: 0,
    margem: 0,
  };
  const recargaPorFornecedor: Record<string, number> = {};
  const rotas = new Set<string>();

  for (const r of rows) {
    porVeredito[r.verdict] += 1;
    if (r.verdict !== "entregavel") rotas.add(r.category ?? "sem-rota");
    if (r.verdict === "saldo" && r.faltaEm && r.faltaRecarregar != null) {
      // O maior buraco cobre os menores no mesmo fornecedor — recarregar o
      // maior destrava todos os pacotes abaixo dele.
      recargaPorFornecedor[r.faltaEm] = Math.max(
        recargaPorFornecedor[r.faltaEm] ?? 0,
        r.faltaRecarregar,
      );
    }
  }

  return {
    total: rows.length,
    entregavel: porVeredito.entregavel,
    porVeredito,
    recargaPorFornecedor,
    rotasComProblema: [...rotas].sort(),
  };
}
