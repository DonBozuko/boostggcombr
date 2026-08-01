import { describe, it, expect } from "vitest";
import { classifyHttpFailures, spreadInMinutes } from "@/lib/http-failure-shape";

describe("v388 — pico de atualização não vira alarme de rota quebrada", () => {
  it("o caso real de 31/07: 20 erros em 3 instantes = troca de versão", () => {
    expect(classifyHttpFailures({ erros: 20, minutosDistintos: 1 })).toBe("pico_de_atualizacao");
  });

  it("erro espalhado por minutos diferentes é falha de verdade", () => {
    expect(classifyHttpFailures({ erros: 6, minutosDistintos: 4 })).toBe("falha_continua");
  });

  it("v402 — rajada de publicação (18:00 e 18:02) não é rota quebrada", () => {
    expect(
      classifyHttpFailures({ erros: 7, minutosDistintos: 2, duracaoMinutos: 2 }),
    ).toBe("pico_de_atualizacao");
  });

  it("v402 — erro espalhado por faixa longa continua sendo alarme", () => {
    expect(
      classifyHttpFailures({ erros: 7, minutosDistintos: 3, duracaoMinutos: 11 }),
    ).toBe("falha_continua");
  });

  it("v402 — faixa em minutos a partir de dois instantes", () => {
    expect(spreadInMinutes("2026-08-01T18:00:00Z", "2026-08-01T18:02:00Z")).toBe(2);
    expect(spreadInMinutes(null, "2026-08-01T18:02:00Z")).toBeNull();
    expect(spreadInMinutes("nao-e-data", "outra")).toBeNull();
  });


  it("pouquíssimos erros não geram nada", () => {
    expect(classifyHttpFailures({ erros: 2, minutosDistintos: 2 })).toBe("silencio");
    expect(classifyHttpFailures(null)).toBe("silencio");
    expect(classifyHttpFailures({})).toBe("silencio");
  });

  it("dado inválido não inventa alarme", () => {
    expect(classifyHttpFailures({ erros: Number.NaN, minutosDistintos: 9 })).toBe("silencio");
    expect(classifyHttpFailures({ erros: 9, minutosDistintos: Number.NaN })).toBe("pico_de_atualizacao");
  });
});
