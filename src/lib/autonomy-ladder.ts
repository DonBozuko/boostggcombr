// v391 — ESCADA DE AUTONOMIA (parte pura).
//
// Causa raiz de "todo dia aparece erro novo": o sistema ganhou 20+ detectores
// e quase nenhum remédio. Detector sem executor não conserta nada — só
// transfere trabalho para o dono. Alerta acumulado é dívida, não segurança.
//
// Regra nova: toda família de falha declara AQUI o seu nível de autonomia.
//   nível 1 — conserta sozinho, sempre. Nada de dinheiro saindo.
//   nível 2 — conserta sozinho até um teto declarado; acima disso, alerta.
//   nível 3 — só alerta. Dinheiro saindo exige o dedo do dono.
//
// O mapa tem dente (mesma lógica do coverage-map v366): nível 1 sem arquivo
// executor no disco é DEFEITO NOSSO e aparece na auditoria; nível 2 sem teto
// ou sem flag de desligar é proibido pelo teste.

export type NivelAutonomia = 1 | 2 | 3;

export type AcaoAutonoma = {
  id: string;
  /** Família correspondente em coverage-map.ts */
  familia: string;
  nome: string;
  nivel: NivelAutonomia;
  /** Arquivo (relativo a src/) que executa a ação. Nível 1 e 2 exigem um. */
  executor: string | null;
  /** Chave em admin_settings que liga/desliga. Obrigatória em nível 2 e 3. */
  flag: string | null;
  /** Teto de segurança por dia. Obrigatório em nível 2. */
  teto: string | null;
  /** Caminho de volta explícito. */
  rollback: string;
};

export const ACOES: AcaoAutonoma[] = [
  // ---------- Nível 1: conserta sozinho, sempre (nada de dinheiro saindo)
  {
    id: "religar_pacote",
    familia: "prateleira",
    nome: "Religar pacote pausado quando o motivo sumiu",
    nivel: 1,
    executor: "lib/shelf-authority.server.ts",
    flag: null,
    teto: null,
    rollback: "veto manual no admin volta a pausar na hora",
  },
  {
    id: "refazer_vinculo",
    familia: "vinculo",
    nome: "Refazer vínculo com o fornecedor quando o id muda",
    nivel: 1,
    executor: "services/auto-healer.server.ts",
    flag: null,
    teto: null,
    rollback: "id anterior fica em admin_audit_logs / catalog_changes",
  },
  {
    id: "fechar_entregue",
    familia: "entrega",
    nome: "Fechar pedido quando o fornecedor confirma entrega",
    nivel: 1,
    executor: "services/delivery-watcher.server.ts",
    flag: null,
    teto: null,
    rollback: "status volta a mão no admin; escrita é atômica por status",
  },
  {
    id: "limpar_fantasma_recuperacao",
    familia: "recuperacao_pix",
    nome: "Marcar Pix expirado/cancelado como perdido",
    nivel: 1,
    executor: "routes/api/public/hooks/recovery-scan.ts",
    flag: null,
    teto: null,
    rollback: "estado real do pedido manda; nada é apagado",
  },
  {
    id: "reconciliar_pedido",
    familia: "caixa",
    nome: "Reconciliar pedido pago sem despacho",
    nivel: 1,
    executor: "services/pedido-reconciler.server.ts",
    flag: null,
    teto: null,
    rollback: "chave de idempotência impede despacho duplicado",
  },
  {
    id: "quarentena_fornecedor",
    familia: "entrega",
    nome: "Tirar fornecedor instável da rota por um tempo",
    nivel: 1,
    executor: "lib/smart-routing.server.ts",
    flag: null,
    teto: null,
    rollback: "quarentena expira sozinha (unstable_until)",
  },

  // ---------- Nível 2: conserta sozinho até um teto (ligado por flag)
  {
    id: "reposicao_automatica",
    familia: "entrega",
    nome: "Pedir reposição quando faltou pouco na entrega",
    nivel: 2,
    executor: "services/delivery-watcher.server.ts",
    flag: "autonomia_reposicao",
    teto: "10 reposições/dia e no máximo 10% do pedido",
    rollback: "desligar a flag; reposição não estorna nada",
  },

  // ---------- Nível 3: só alerta (dinheiro saindo)
  {
    id: "estorno_automatico",
    familia: "caixa",
    nome: "Estornar pedido pago que não entregou",
    nivel: 3,
    executor: null,
    flag: "autonomia_estorno",
    teto: null,
    rollback: "permanece manual enquanto a flag estiver desligada",
  },
  {
    id: "recarga_fornecedor",
    familia: "entrega",
    nome: "Recarregar saldo do fornecedor via Pix",
    nivel: 3,
    executor: null,
    flag: "autonomia_recarga",
    teto: null,
    rollback: "botão manual no admin continua sendo o caminho",
  },
];

/** Executores citados que não existem no disco = remédio fantasma. */
export function executoresFantasma(arquivosExistentes: string[]): string[] {
  const existe = new Set(arquivosExistentes);
  return ACOES.filter((a) => a.executor && !existe.has(a.executor)).map((a) => a.id);
}

/** Nível 1 sem executor = detectamos e não consertamos. Defeito nosso. */
export function nivel1SemExecutor(): AcaoAutonoma[] {
  return ACOES.filter((a) => a.nivel === 1 && !a.executor);
}

/** Nível 2 precisa de teto e flag; nível 3 precisa de flag. */
export function contratosQuebrados(): string[] {
  const erros: string[] = [];
  for (const a of ACOES) {
    if (a.nivel === 2 && (!a.teto || !a.flag || !a.executor)) erros.push(`${a.id}: nível 2 exige executor, flag e teto`);
    if (a.nivel === 3 && !a.flag) erros.push(`${a.id}: nível 3 exige flag para ligar depois`);
    if (!a.rollback) erros.push(`${a.id}: sem caminho de volta declarado`);
  }
  return erros;
}

/** O que continua esperando o dono — a conta de trabalho manual do sistema. */
export function pendentesNoDono(): AcaoAutonoma[] {
  return ACOES.filter((a) => a.nivel === 3);
}

/** Quanto do trabalho o sistema resolve sem ninguém (0..1). */
export function grauDeAutonomia(): number {
  if (ACOES.length === 0) return 1;
  return ACOES.filter((a) => a.nivel === 1).length / ACOES.length;
}
