// v403 — INVARIANTE: caminho curto da busca até o pagamento.
//
// Bug real medido em 31/07-01/08: 23 aberturas de vitrine vindas do Google e
// ZERO escolha de pacote. O tráfego caía nas landings de busca, onde o preço
// era uma tabela morta — o visitante precisava voltar para a home e procurar o
// pacote de novo. Esta trava impede que o atalho seja removido sem querer.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const seoLanding = readFileSync(join(root, "src/components/SeoLanding.tsx"), "utf8");
const home = readFileSync(join(root, "src/routes/index.tsx"), "utf8");

describe("v403 — deep-link de pacote", () => {
  it("a landing gera link de compra com o pacote na URL", () => {
    expect(seoLanding).toMatch(/href=\{`\/\?plan=\$\{encodeURIComponent\(r\.id\)\}#pedido`\}/);
  });

  it("a home lê o pacote da URL e preenche o formulário", () => {
    expect(home).toContain('.get("plan")');
    expect(home).toMatch(/dynAllPlans\.find\(\(p\) => p\.id === wanted\)/);
  });

  it("só aceita pacote que existe no catálogo vivo (sem preço inventado)", () => {
    // o valor usado no funil vem do pacote encontrado, nunca da URL
    expect(home).toMatch(/valor: chosen\.valor \?\? null/);
  });

  it("o clique vindo da landing conta como escolha de pacote no funil", () => {
    expect(home).toMatch(/trackFunnel\("escolheu_pacote", \{ plan_id: chosen\.id/);
  });
});
