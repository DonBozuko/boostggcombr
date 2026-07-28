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
  // v352 — a venda não é mais bloqueada por saldo (o dono recarrega na hora),
  // mas a bancada CONTINUA apontando "saldo" para o aviso amarelo no celular.
  if (res.ok && res.needsTopup) {
    const candidatos = ranked
      .filter((p) => p.provider_service_id && p.cost_brl != null && Number(p.cost_brl) > 0)
      .map((p) => ({
        slug: p.slug,
        custo: Number(p.cost_brl),
        falta: Number(p.cost_brl) - Number(p.saldo_atual ?? 0),
      }))
      .filter((c) => c.falta > 0)
      .sort((a, b) => a.falta - b.falta);
    const alvo = candidatos[0];
    if (alvo) {
      return {
        verdict: "saldo",
        motivo: `Falta ${fmt(alvo.falta)} de saldo em ${alvo.slug} — a venda continua liberada, o pedido sai na recarga`,
        fornecedor: alvo.slug,
        custoBrl: alvo.custo,
        faltaRecarregar: Number(alvo.falta.toFixed(2)),
        faltaEm: alvo.slug,
      };
    }
  }

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

  // v335 — DIAGNÓSTICO PELO FORNECEDOR QUE ENTREGARIA.
  //
  // Antes: bastava QUALQUER fornecedor reprovar por margem para o pacote ser
  // rotulado "vendendo no prejuízo" — mesmo quando o real bloqueio era falta de
  // saldo no fornecedor mais barato. Isso inflou "margem" de 10 → 51 num ciclo
  // e mandou o dono recarregar/consertar a coisa errada.
  // Agora o veredito é o motivo do fornecedor MAIS BARATO com ID válido — que é
  // exatamente quem entregaria o pedido.
  const comId = ranked.filter(
    (p) => p.provider_service_id && p.cost_brl != null && Number(p.cost_brl) > 0,
  );

  const escolhido = [...comId].sort((a, b) => Number(a.cost_brl) - Number(b.cost_brl))[0];

  if (escolhido) {
    const custo = Number(escolhido.cost_brl);
    const reprovaMargem = res.rejections.some(
      (r) => r.startsWith(`${escolhido.slug}:`) && /margem/i.test(r),
    );
    if (reprovaMargem) {
      return {
        verdict: "margem",
        motivo: `O custo em ${escolhido.slug} (${fmt(custo)}) subiu e comeu a margem — venderia no prejuízo`,
        fornecedor: escolhido.slug,
        custoBrl: custo,
        faltaRecarregar: null,
        faltaEm: null,
      };
    }

    // Falta de saldo: existe ID válido e custo conhecido, só falta dinheiro lá.
    const candidatos = comId
      .map((p) => ({
        slug: p.slug,
        custo: Number(p.cost_brl),
        falta: Number(p.cost_brl) - Number(p.saldo_atual ?? 0),
      }))
      .filter(
        (c) => c.falta > 0 && !res.rejections.some((r) => r.startsWith(`${c.slug}:`) && /margem/i.test(r)),
      )
      .sort((a, b) => a.falta - b.falta);

    if (candidatos.length > 0) {
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

    if (res.rejections.some((r) => /margem/i.test(r))) {
      return {
        verdict: "margem",
        motivo: "O custo do fornecedor subiu e comeu a margem — venderia no prejuízo",
        fornecedor: escolhido.slug,
        custoBrl: custo,
        faltaRecarregar: null,
        faltaEm: null,
      };
    }
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
  /** Recarga necessária para destravar o que o cliente REALMENTE compra. */
  recargaPorFornecedor: Record<string, number>;
  /** Recarga de pacote gigante sem venda: só sob encomenda, não é urgência. */
  recargaSobDemanda: Record<string, number>;
  /** Rotas (categorias) com pelo menos 1 pacote travado. */
  rotasComProblema: string[];
};

/**
 * v335 — a recarga pedida tem que caber na realidade.
 * O pedido de R$ 91.910 num fornecedor veio de um pacote gigante que ninguém
 * comprou na vida. Somar isso no mesmo balde do que vende todo dia faz o dono
 * ignorar o alerta inteiro. Agora separa: o que vende vira urgência; o resto
 * fica listado como "sob encomenda".
 */
export function summarizeBench(
  rows: BenchRow[],
  opts: { demanda?: Set<string> } = {},
): BenchSummary {
  const porVeredito: Record<BenchVerdict, number> = {
    entregavel: 0,
    sem_fornecedor: 0,
    catalogo: 0,
    saldo: 0,
    margem: 0,
  };
  const recargaPorFornecedor: Record<string, number> = {};
  const recargaSobDemanda: Record<string, number> = {};
  const rotas = new Set<string>();
  const demanda = opts.demanda;

  for (const r of rows) {
    porVeredito[r.verdict] += 1;
    if (r.verdict !== "entregavel") rotas.add(r.category ?? "sem-rota");
    if (r.verdict === "saldo" && r.faltaEm && r.faltaRecarregar != null) {
      // Sem histórico de demanda informado, tudo conta como demanda (não
      // esconder problema por falta de dado).
      const vende = !demanda || demanda.has(r.pacote);
      const balde = vende ? recargaPorFornecedor : recargaSobDemanda;
      // O maior buraco cobre os menores no mesmo fornecedor — recarregar o
      // maior destrava todos os pacotes abaixo dele.
      balde[r.faltaEm] = Math.max(balde[r.faltaEm] ?? 0, r.faltaRecarregar);
    }
  }

  return {
    total: rows.length,
    entregavel: porVeredito.entregavel,
    porVeredito,
    recargaPorFornecedor,
    recargaSobDemanda,
    rotasComProblema: [...rotas].sort(),
  };
}

