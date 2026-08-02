// v332 — MAPA DE COBERTURA (o que os grandes fazem)
//
// Grandes operações não confiam em "achei mais um bug". Elas mantêm um
// INVENTÁRIO de superfícies × famílias de falha e tratam ausência de detector
// como incidente. Silêncio deixa de ser verde: vira "NÃO COBERTO", visível.
//
// Regra: rota pública nova que não está declarada aqui é reportada na
// auditoria até alguém decidir qual detector cuida dela.
//
// v366 — O MAPA VIROU MOTOR, NÃO ENFEITE.
// Antes o campo `detector` era texto livre: podia citar um detector que não
// existe mais e ninguém percebia. Agora cada família aponta para ARQUIVOS DE
// TESTE REAIS (`provas`). O teste `cobertura-real.test.ts` quebra o build se:
//   a) uma prova citada não existe no disco (detector fantasma);
//   b) existe teste em src/__tests__ que nenhuma família reivindica (aterro).
// Nenhum motor novo: o mesmo mapa passou a ter dente.

export type Familia = {
  id: string;
  nome: string;
  detector: string | null; // null = sem detector automatizado hoje
  /** Arquivos em src/__tests__ que provam esta família. */
  provas: string[];
};

export const FAMILIAS: Familia[] = [
  {
    id: "preco_margem",
    nome: "Preço e margem",
    detector: "price-authority / margin-guardian",
    provas: [
      "price-authority.test.ts",
      "price-single-writer.test.ts",
      "price-single-math.test.ts",
      "margin-guard.test.ts",
      "margin-epsilon.test.ts",
      "margem-dupla-leitura.test.ts",
      "cost-tier-markup.test.ts",
      "card-pricing.test.ts",
      "aposentadoria-catraca.test.ts",
    ],
  },
  {
    id: "escada",
    nome: "Escada e curva unitária",
    detector: "price-monotonic / price-unit-curve",
    provas: ["price-monotonic.test.ts", "price-unit-curve.test.ts", "ladder-invariant.test.ts"],
  },
  {
    id: "vinculo",
    nome: "Vínculo com fornecedor",
    detector: "bind-guard / service-fingerprint",
    provas: [
      "bind-guard.test.ts",
      "bind-authority.test.ts",
      "bind-intent-guard.test.ts",
      "service-fingerprint.test.ts",
      "service-substitute.test.ts",
    ],
  },
  {
    id: "custo_real",
    nome: "Custo real de quem entrega a quantidade",
    detector: "cost-bound-service / cost-qty-range / recost",
    provas: [
      "cost-sanity.test.ts",
      "cost-bound-service.test.ts",
      "cost-qty-range.test.ts",
      "recost-qty-range.test.ts",
      "custo-fonte-elegivel.test.ts",
    ],
  },
  {
    id: "saldo",
    nome: "Saldo vs custo real",
    detector: "bench-sweep",
    provas: [
      "bench-sweep.test.ts",
      "saldo-nao-pausa.test.ts",
      "provider-topup.test.ts",
      "bench-fix-before-measure.test.ts",
      "smoke-fix-before-measure.test.ts",
    ],

  },
  {
    id: "entrega",
    nome: "Pago sem entrega",
    detector: "pedido-reconciler / delivery-watcher / dispatch-orquestrado (v383)",
    provas: [
      "order-status.test.ts",
      "queue-policy.test.ts",
      "retry-policy.test.ts",
      "dispatch-br-guard.test.ts",
      "dispatch-harmony.test.ts",
      "failure-classifier.test.ts",
      "no-trafego-br.test.ts",
      "delivery-followup.test.ts",
      "refill-cap.test.ts",
    ],

  },
  {
    id: "preflight",
    nome: "Não cobrar sem prova de rota e de alvo",
    detector: "route-preflight / target-preflight",
    provas: [
      "route-preflight.test.ts",
      "target-preflight.test.ts",
      "preflight-fail-open-limite.test.ts",
      "link-sanitize.test.ts",
      // v406 — plano B pré-validado faz parte de "posso cobrar por isso?"
      "hot-standby.test.ts",
    ],
  },
  {
    id: "caixa",
    nome: "Caixa e cobrança órfã",
    detector: "orphan-charge / reconciliation",
    provas: ["checkout-idempotency.test.ts", "mp-webhook-signature.test.ts"],
  },
  {
    id: "rls",
    nome: "Acesso a dados",
    detector: "linter RLS + autenticação dos robôs",
    provas: ["cron-auth.test.ts", "rate-limit.test.ts", "status-publico-sem-vazamento.test.ts"],
  },
  {
    id: "promessa",
    nome: "Promessa do site × catálogo",
    detector: "promise-coherence + surface-scan",
    provas: [
      "promise-coherence.test.ts",
      "landing-promise-coherence.test.ts",
      "surface-scan.test.ts",
      "catalog-coherence.test.ts",
    ],
  },
  {
    id: "preco_exibido",
    nome: "Preço exibido × preço cobrado",
    detector: "paridade vitrine × servidor",
    provas: ["landing-price-truth.test.ts", "live-product-guard.test.ts"],
  },
  {
    id: "caminho_compra",
    nome: "Caminho da busca até o pagamento (deep-link de pacote)",
    detector: "landing-deep-link (atalho landing → formulário com pacote pronto)",
    provas: ["landing-deep-link.test.ts"],
  },

  {
    id: "prateleira",
    nome: "Vitrine honesta (só mostra o que entrega)",
    detector: "shelf-authority (escritor único) / shelf-availability / honest-shelf-fallback",
    provas: [
      "shelf-availability.test.ts",
      "honest-shelf-fallback.test.ts",
      "shelf-single-writer.test.ts",
    ],
  },
  {
    id: "imagem",
    nome: "Imagens e provas visuais das landings",
    detector: "asset-coherence + surface-scan",
    provas: ["asset-email-coherence.test.ts"],
  },
  {
    id: "email",
    nome: "Texto dos e-mails transacionais",
    detector: "email-coherence + surface-scan",
    provas: ["checkout-email.test.ts"],
  },
  {
    id: "recuperacao_pix",
    nome: "Pix recuperável sem fantasma histórico",
    detector: "recovery-scan + triagem por estado real do pedido",
    provas: ["recovery-queue-invariant.test.ts"],
  },
  {
    id: "regra_duplicada",
    nome: "Mesma regra escrita em 2 lugares (margem, preço, limiar)",
    detector: "convergence.test (varredura de limiar duplicado)",
    provas: ["convergence.test.ts", "guards-summary.test.ts"],
  },
  {
    id: "nao_convergencia",
    nome: "Alarme que se repete e nunca resolve",
    detector: "convergence + bench-autonomo",
    provas: [
      "alert-severity.test.ts",
      "money-alert-force.test.ts",
      "canary-link-pool.test.ts",
      "http-failure-shape.test.ts",
    ],
  },
  {
    id: "funil",
    nome: "Medição do funil (onde o cliente desiste)",
    detector: "funnel-beacon + traffic-source",
    provas: ["funnel-referer.test.ts", "traffic-source.test.ts", "maturity-metrics.test.ts"],
  },
  {
    id: "revenda",
    nome: "Revenda e afiliados (dinheiro de terceiros)",
    detector: "reseller-pricing / reseller-refund / affiliate-commission",
    provas: ["reseller-pricing.test.ts", "reseller-refund.test.ts", "affiliate-commission.test.ts"],
  },
  {
    id: "ferramentas-publicas",
    nome: "Ferramentas grátis (contadores) — número real ou erro honesto",
    detector: "extrairInscritosTexto + parseInscritos",
    provas: ["contador-inscritos.test.ts"],
  },
  {
    id: "autonomia",
    nome: "Autonomia — detector sem remédio é dívida transferida ao dono",
    detector: "autonomy-ladder (escada de níveis 1/2/3 com executor real)",
    provas: ["autonomy-ladder.test.ts"],
  },
  {
    id: "memoria-de-regras",
    nome: "Memória de regras — regra não pode sumir do índice nem apontar pro arquivo errado",
    detector: "integridade de .lovable/memory (link quebrado, regra órfã, Core inchado)",
    provas: ["memory-index-integrity.test.ts"],
  },
  {
    id: "anti-alucinacao",
    nome: "Motor Anti-Alucinação — auditoria de ponta a ponta é executável, não opinião",
    detector: "npm run audit (scripts/audit.mjs) varre src/ e grava .lovable/audit-report.md",
    provas: ["anti-hallucination-engine.test.ts"],
  },
  {
    id: "serverfn-modulo-fino",
    nome: "Server functions finas — helper solto no arquivo pode sumir no bundle e derrubar admin/despacho",
    detector: "teste lê todos os src/lib/*.functions.ts e barra função declarada no escopo de módulo",
    provas: ["serverfn-modulo-fino.test.ts"],
  },
];



/** Rotas públicas já declaradas como cobertas pela varredura de superfície. */
export const ROTAS_DECLARADAS = new Set<string>([
  "index",
  "tiktok",
  "youtube",
  "kwai",
  "facebook",
  "telegram",
  "trafego",
  "blog.index",
  "blog.$slug",
  "avaliacoes",
  "revenda",
  "afiliados",
  "seguidores-pix",
  "audiencia-brasileira",
  "comprar-curtidas-instagram",
  "comprar-inscritos-youtube",
  "comprar-seguidores-brasileiros",
  "comprar-seguidores-instagram",
  "comprar-seguidores-instagram-barato",
  "comprar-seguidores-kwai",
  "comprar-seguidores-tiktok",
  "comprar-visualizacoes-tiktok",
  "crescer-youtube",
  "engajamento-instagram",
  "impulsionar-instagram",
  "turbinar-tiktok",
  "views-tiktok",
  "kit-creator",
  "promo-5reais",
  "ferramentas.index",
  "ferramentas.calculadora-engajamento-instagram",
  "ferramentas.contador-seguidores",
  "ferramentas.gerador-legenda-instagram",
  "diagnostico",
  "status",
  "rastrear",
  "obrigado",
  "reembolso",
  "termos",
  "privacidade",
  "api-revenda",
  "painel-smm",
  "revender-seguidores",
  "ferramentas.calculadora-lucro-revenda",
]);

/** Rotas públicas encontradas no código que ninguém declarou = ponto cego. */
export function rotasNaoDeclaradas(rotasReais: string[]): string[] {
  return rotasReais.filter((r) => !ROTAS_DECLARADAS.has(r)).sort();
}

/** Famílias sem detector automatizado — entram no relatório como NÃO COBERTO. */
export function familiasSemDetector(): Familia[] {
  return FAMILIAS.filter((f) => f.detector === null || f.provas.length === 0);
}

/** Todas as provas declaradas no mapa (nomes de arquivo de teste). */
export function provasDeclaradas(): string[] {
  return [...new Set(FAMILIAS.flatMap((f) => f.provas))].sort();
}

/** Provas citadas no mapa que não existem no disco = detector fantasma. */
export function provasFantasma(arquivosReais: string[]): string[] {
  const reais = new Set(arquivosReais);
  return provasDeclaradas().filter((p) => !reais.has(p));
}

/** Testes que existem mas nenhuma família reivindica = teste órfão (aterro). */
export function testesOrfaos(arquivosReais: string[]): string[] {
  const declaradas = new Set(provasDeclaradas());
  return arquivosReais.filter((a) => !declaradas.has(a)).sort();
}
