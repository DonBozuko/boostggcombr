// v291 — Auditoria de Coerência do Catálogo (função pura, testável).
//
// Motivo: os problemas que "aparecem sozinhos a cada conversa" (serviço errado
// vinculado, escada de preço invertida, custo fora de curva) nunca tiveram
// detector. O teste seco só olha "dá pra vender?" — não olha "faz sentido?".
// Aqui ficam as INVARIANTES do catálogo. Se uma quebra, vira achado.

// v308 — IDs de serviço agora carregam o fornecedor junto.
// Motivo real (auditoria 27/07): o id "143" existe em DOIS fornecedores com
// produtos diferentes ("Curtidas na Live" no SMMPanel, "Visualizações de live
// do FB" no Verified). O mapa de nomes era global por id, então a auditoria
// lia o nome do fornecedor errado e pausava pacote saudável. Chave = provider:id.
export type ServiceRef = { provider: string; id: string };

export type CoherenceRow = {
  pacote: string;
  category: string | null;
  quantidade: number | null;
  cost_brl: number | null;
  price_brl: number | null;
  last_dry_run: string | null;
  serviceIds: ServiceRef[];
};

export type CoherenceIssue = {
  code:
    | "ESCADA_QUEBRADA"
    | "PRECO_UNITARIO_INVERTIDO"
    | "CUSTO_FORA_DA_CURVA"
    | "SERVICO_INCOERENTE"
    | "TESTE_SECO_CEGO";
  severity: "critical" | "warning";
  pacote: string;
  category: string;
  detalhe: string;
  // v310 — qual vínculo exatamente está errado. Sem isso a remediação só sabia
  // "esse pacote tem algo errado" e tirava o pacote inteiro da vitrine, mesmo
  // quando as outras rotas do mesmo pacote estavam corretas.
  service?: ServiceRef;
};

// Nome do serviço do fornecedor → precisa bater com a intenção da categoria.
// v309 — o \b final deixava passar PLURAL: "Instagram Likes" não batia em \blike\b.
// Caso real: pacotes de visualizações do Instagram vinculados a "Instagram Likes".
// Agora aceita sufixo (likes/followers/views/seguidores).
const INTENT: Record<string, { requer?: RegExp; proibe?: RegExp; label: string }> = {
  seguidores: { proibe: /\b(like|curtid|view|visualiz|inscrit|subscrib|ao\s*vivo|live)\w*/i, label: "seguidores" },
  curtidas: { proibe: /\b(follow|seguidor|view|visualiz|inscrit|subscrib|ao\s*vivo|live)\w*/i, label: "curtidas" },
  visualizacoes: { proibe: /\b(follow|seguidor|like|curtid|ao\s*vivo|live|short)\w*/i, label: "visualizações" },
  inscritos: { proibe: /\b(like|curtid|view|visualiz|ao\s*vivo|live)\w*/i, label: "inscritos" },
};


function intentOf(category: string) {
  const parts = category.split(":");
  for (const p of parts) if (INTENT[p]) return INTENT[p];
  return null;
}

export function serviceKey(ref: ServiceRef): string {
  return `${ref.provider}:${ref.id}`;
}

// v313 — mesma invariante da auditoria, aplicada AO VIVO no momento da venda.
// A auditoria roda de hora em hora; o cliente compra no minuto seguinte à troca
// do fornecedor. Sem esta checagem no roteamento, o pedido errado já foi cobrado
// e despachado antes de qualquer alerta. true = pode usar este serviço.
export function serviceMatchesIntent(category: string | null | undefined, name: string | null | undefined): boolean {
  const intent = intentOf(String(category ?? ""));
  if (!intent || !name) return true;
  return !intent.proibe?.test(String(name));
}



function median(nums: number[]): number {
  if (nums.length === 0) return 0;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function analyzeCatalogCoherence(
  rows: CoherenceRow[],
  serviceNames: Map<string, string>,
  now: Date = new Date(),
): CoherenceIssue[] {
  const issues: CoherenceIssue[] = [];
  const byCategory = new Map<string, CoherenceRow[]>();

  // Serviço vinculado bate com o produto da categoria? Calculado antes porque a
  // trava de custo usa isso: custo alto com serviço CERTO é tier premium legítimo,
  // custo alto com serviço errado/desconhecido é risco de prejuízo.
  const nameOk = new Map<string, boolean>();
  for (const r of rows) {
    const intent = intentOf(String(r.category ?? ""));
    let known = false;
    let bad = false;
    for (const ref of r.serviceIds) {
      const name = serviceNames.get(serviceKey(ref));
      if (!name) continue;
      known = true;
      if (intent?.proibe?.test(name)) bad = true;
    }
    nameOk.set(r.pacote, known && !bad);
  }

  // v338 — MEDIR DENTRO DA MESMA PRATELEIRA.
  // A escada e a curva de custo comparavam econômico com premium na mesma
  // categoria. Um "BR Premium 100" custa mais por unidade que um "Global 1k"
  // por natureza — isso não é defeito, é outro produto. O resultado era um
  // painel vermelho permanente com 19 avisos que ninguém mais lia, escondendo
  // a inversão de preço de verdade. Agora cada linha (global / BR / BR premium)
  // é medida contra ela mesma.
  for (const r of rows) {
    const cat = String(r.category ?? "");
    if (!cat) continue;
    const chave = `${cat}#${tierDoPacote(r.pacote)}`;
    if (!byCategory.has(chave)) byCategory.set(chave, []);
    byCategory.get(chave)!.push(r);
  }

  for (const [chave, list] of byCategory) {
    const cat = chave.split("#")[0];

    const sorted = list
      .filter((r) => Number(r.quantidade) > 0 && Number(r.price_brl) > 0)
      .sort((a, b) => Number(a.quantidade) - Number(b.quantidade));

    // 1) Escada quebrada: pacote maior custando igual ou menos que o menor.
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      if (Number(cur.price_brl) <= Number(prev.price_brl)) {
        issues.push({
          code: "ESCADA_QUEBRADA",
          severity: "critical",
          pacote: cur.pacote,
          category: cat,
          detalhe: `${cur.quantidade} por R$ ${Number(cur.price_brl).toFixed(2)} sendo que ${prev.quantidade} custa R$ ${Number(prev.price_brl).toFixed(2)}`,
        });
      }
    }

    // 2) Preço por unidade subindo com o volume (>10% de folga).
    for (let i = 1; i < sorted.length; i++) {
      const prevUnit = Number(sorted[i - 1].price_brl) / Number(sorted[i - 1].quantidade);
      const curUnit = Number(sorted[i].price_brl) / Number(sorted[i].quantidade);
      if (curUnit > prevUnit * 1.1) {
        issues.push({
          code: "PRECO_UNITARIO_INVERTIDO",
          severity: "warning",
          pacote: sorted[i].pacote,
          category: cat,
          detalhe: `unidade a R$ ${curUnit.toFixed(4)} contra R$ ${prevUnit.toFixed(4)} do pacote menor`,
        });
      }
    }

    // 3) Custo fora da curva: custo unitário > 4× a mediana da categoria.
    const units = list
      .filter((r) => Number(r.cost_brl) > 0 && Number(r.quantidade) > 0)
      .map((r) => Number(r.cost_brl) / Number(r.quantidade));
    const med = median(units);
    if (med > 0) {
      for (const r of list) {
        if (!(Number(r.cost_brl) > 0) || !(Number(r.quantidade) > 0)) continue;
        const u = Number(r.cost_brl) / Number(r.quantidade);
        if (u > med * 4) {
          const servicoConfere = nameOk.get(r.pacote) === true;
          issues.push({
            code: "CUSTO_FORA_DA_CURVA",
            // v308 — serviço confere = tier premium legítimo (ex.: seguidor BR
            // premium 90 dias). Não tira da vitrine; só avisa.
            severity: servicoConfere ? "warning" : "critical",
            pacote: r.pacote,
            category: cat,
            detalhe: servicoConfere
              ? `custo unitário ${(u / med).toFixed(1)}× acima do normal da categoria — serviço confere, provável tier premium`
              : `custo unitário ${(u / med).toFixed(1)}× acima do normal da categoria — provável serviço errado vinculado`,
          });
        }

      }
    }
  }

  // 4) Serviço vinculado incompatível com o produto da categoria.
  for (const r of rows) {
    const cat = String(r.category ?? "");
    const intent = intentOf(cat);
    if (!intent) continue;
    for (const ref of r.serviceIds) {
      const name = serviceNames.get(serviceKey(ref));
      if (!name) continue;
      if (intent.proibe?.test(name)) {
        issues.push({
          code: "SERVICO_INCOERENTE",
          severity: "critical",
          pacote: r.pacote,
          category: cat,
          detalhe: `vinculado ao serviço "${name}" (${ref.provider} id ${ref.id}), incompatível com ${intent.label}`,
          service: ref,
        });
      }
    }

  }

  // 5) Teste seco cego: sem revalidação recente o catálogo inteiro é palpite.
  const ultimo = rows
    .map((r) => (r.last_dry_run ? Date.parse(r.last_dry_run) : 0))
    .reduce((a, b) => Math.max(a, b), 0);
  const horas = ultimo > 0 ? (now.getTime() - ultimo) / 3_600_000 : Infinity;
  if (horas > 48) {
    issues.push({
      code: "TESTE_SECO_CEGO",
      severity: "warning",
      pacote: "-",
      category: "-",
      detalhe:
        ultimo > 0
          ? `última revalidação há ${Math.round(horas)}h`
          : "nenhuma revalidação registrada",
    });
  }

  return issues;
}
