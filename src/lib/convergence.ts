// v334 — DETECTOR DE NÃO-CONVERGÊNCIA (a peça que faltava).
//
// Todo detector que criamos até aqui responde "o que está errado agora".
// Nenhum respondia a pergunta que os grandes fazem: "esse alarme está
// ANDANDO?". Um achado que repete ciclo após ciclo, idêntico, não é problema
// do fornecedor — é trava nossa que nunca converge (regra duplicada, limiar
// velho, correção que não corrige). Foi exatamente o caso dos pacotes
// "vendendo com prejuízo": dois limiares de margem diferentes brigando entre
// si, alarme eterno, prejuízo zero.
//
// Regra: achado idêntico presente em TODOS os últimos N ciclos = DEFEITO DE
// ENGENHARIA. Sobe com texto diferente do alarme normal, porque a ação também
// é diferente: não é recarregar saldo, é consertar o código.
//
// Puro de propósito: sem banco, sem HTTP. Testável.

/** Um ciclo de varredura: lista de assinaturas de achado (pacote|veredito). */
export type CicloAchados = {
  runId: string;
  assinaturas: string[];
};

export const CICLOS_PARA_DEFEITO = 6; // 6 ciclos de 2h = 12h sem sair do lugar

export type NaoConvergente = {
  assinatura: string;
  ciclos: number;
};

// v355 — Vereditos que NÃO são defeito nosso, por mais que se repitam.
// "saldo" é estado operacional do dono (recarrega quando quiser, regra v350/
// v352: saldo nunca pausa e nunca bloqueia venda). Um pacote gigante sem venda
// pode ficar meses sem saldo — isso é escolha de caixa, não trava de código.
// Se entrar aqui como "defeito", o dono recebe alarme eterno que nenhum
// conserto resolve, e aprende a ignorar o Telegram.
export const VEREDITOS_NAO_DEFEITO = new Set(["saldo"]);

/** Remove das assinaturas os vereditos que nunca são defeito de engenharia. */
export function somenteDefeitoNosso(assinaturas: string[]): string[] {
  return assinaturas.filter((sig) => {
    const veredito = sig.slice(sig.lastIndexOf("|") + 1);
    return !VEREDITOS_NAO_DEFEITO.has(veredito);
  });
}

/**
 * Achados presentes em TODOS os últimos `minCiclos` ciclos.
 * Exige a janela cheia: com menos ciclos gravados não há evidência de loop.
 */
export function achadosNaoConvergentes(
  ciclos: CicloAchados[],
  minCiclos = CICLOS_PARA_DEFEITO,
): NaoConvergente[] {
  if (minCiclos < 2) return [];
  const janela = ciclos.slice(0, minCiclos);
  if (janela.length < minCiclos) return [];

  const conjuntos = janela.map((c) => new Set(c.assinaturas));
  const [primeiro, ...resto] = conjuntos;

  const persistentes: NaoConvergente[] = [];
  for (const sig of primeiro) {
    if (resto.every((s) => s.has(sig))) {
      persistentes.push({ assinatura: sig, ciclos: minCiclos });
    }
  }
  return persistentes.sort((a, b) => a.assinatura.localeCompare(b.assinatura));
}

/** Texto em português, no formato PROBLEMA / O QUE FAZER. */
export function mensagemNaoConvergencia(itens: NaoConvergente[]): string | null {
  if (itens.length === 0) return null;
  const amostra = itens.slice(0, 8).map((i) => `• ${i.assinatura}`);
  return [
    "🔁 ALARME QUE NÃO ANDA (defeito nosso)",
    "",
    `PROBLEMA: ${itens.length} aviso(s) se repetem iguais há ${itens[0].ciclos} varreduras seguidas.`,
    "Isso não é o fornecedor — é uma trava nossa que nunca resolve sozinha.",
    "",
    ...amostra,
    itens.length > 8 ? `• ...e mais ${itens.length - 8}` : "",
    "",
    "O QUE FAZER: nada no fornecedor. Me avise para consertar a regra que está travada.",
  ]
    .filter((l) => l !== "")
    .join("\n");
}
