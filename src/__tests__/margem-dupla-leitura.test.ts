import { describe, expect, it } from "vitest";
import { margemReprovaNasDuasLeituras } from "@/lib/bench-sweep";
import { respectsMinMargin } from "@/lib/margin-guardian";

/**
 * v361 — Divergência entre custo gravado e custo vivo não pode tirar pacote
 * da vitrine. Só é prejuízo quando as DUAS leituras reprovam.
 */
describe("margem: dupla confirmação antes de pausar", () => {
  it("br-tf100 real (7,25 / custo 1,15~1,16) passa nas duas leituras", () => {
    expect(respectsMinMargin(7.25, 1.1566)).toBe(true);
    expect(margemReprovaNasDuasLeituras(7.25, 1.1566, 1.15, respectsMinMargin)).toBe(false);
  });

  it("divergência estrutural (>5%) continua sendo prejuízo e pode pausar", () => {
    // yv1.5m real: gravado R$ 3377 × vivo R$ 4836 (+43%) — não é ruído.
    expect(margemReprovaNasDuasLeituras(8239.42, 4836.32, 3377.75, respectsMinMargin)).toBe(true);
  });

  it("ruído de tarifa (≤5%) com custo gravado saudável NÃO pausa", () => {
    expect(margemReprovaNasDuasLeituras(7.25, 1.19, 1.15, respectsMinMargin)).toBe(false);
  });


  it("as duas leituras caras = prejuízo real, pode pausar", () => {
    expect(margemReprovaNasDuasLeituras(7.25, 5.0, 4.9, respectsMinMargin)).toBe(true);
  });

  it("sem custo gravado confiável vale o veredito vivo", () => {
    expect(margemReprovaNasDuasLeituras(7.25, 5.0, 0, respectsMinMargin)).toBe(true);
    expect(margemReprovaNasDuasLeituras(7.25, 5.0, null, respectsMinMargin)).toBe(true);
  });
});
