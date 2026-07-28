// v332 — MAPA DE COBERTURA (o que os grandes fazem)
//
// Grandes operações não confiam em "achei mais um bug". Elas mantêm um
// INVENTÁRIO de superfícies × famílias de falha e tratam ausência de detector
// como incidente. Silêncio deixa de ser verde: vira "NÃO COBERTO", visível.
//
// Regra: rota pública nova que não está declarada aqui é reportada na
// auditoria até alguém decidir qual detector cuida dela.

export type Familia = {
  id: string;
  nome: string;
  detector: string | null; // null = sem detector automatizado hoje
};

export const FAMILIAS: Familia[] = [
  { id: "preco_margem", nome: "Preço e margem", detector: "price-authority / margin-guardian" },
  { id: "escada", nome: "Escada e curva unitária", detector: "price-monotonic / price-unit-curve" },
  { id: "vinculo", nome: "Vínculo com fornecedor", detector: "bind-guard / service-fingerprint" },
  { id: "saldo", nome: "Saldo vs custo real", detector: "bench-sweep" },
  { id: "entrega", nome: "Pago sem entrega", detector: "pedido-reconciler / delivery-watcher" },
  { id: "caixa", nome: "Caixa e cobrança órfã", detector: "orphan-charge / reconciliation" },
  { id: "rls", nome: "Acesso a dados", detector: "linter RLS" },
  { id: "promessa", nome: "Promessa do site × catálogo", detector: "promise-coherence + surface-scan" },
  { id: "preco_exibido", nome: "Preço exibido × preço cobrado", detector: "paridade vitrine × servidor" },
  { id: "imagem", nome: "Imagens e provas visuais das landings", detector: "asset-coherence + surface-scan" },
  { id: "email", nome: "Texto dos e-mails transacionais", detector: "email-coherence + surface-scan" },
  { id: "regra_duplicada", nome: "Mesma regra escrita em 2 lugares (margem, preço, limiar)", detector: "convergence.test (varredura de limiar duplicado)" },
  { id: "nao_convergencia", nome: "Alarme que se repete e nunca resolve", detector: "convergence + bench-autonomo" },

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
]);

/** Rotas públicas encontradas no código que ninguém declarou = ponto cego. */
export function rotasNaoDeclaradas(rotasReais: string[]): string[] {
  return rotasReais.filter((r) => !ROTAS_DECLARADAS.has(r)).sort();
}

/** Famílias sem detector automatizado — entram no relatório como NÃO COBERTO. */
export function familiasSemDetector(): Familia[] {
  return FAMILIAS.filter((f) => f.detector === null);
}
