import { describe, it, expect } from "vitest";
import { classifyHttpFailures } from "@/lib/http-failure-shape";

describe("v388 — pico de atualização não vira alarme de rota quebrada", () => {
  it("o caso real de 31/07: 20 erros em 3 instantes = troca de versão", () => {
    expect(classifyHttpFailures({ erros: 20, minutosDistintos: 1 })).toBe("pico_de_atualizacao");
  });

  it("erro espalhado por minutos diferentes é falha de verdade", () => {
    expect(classifyHttpFailures({ erros: 6, minutosDistintos: 4 })).toBe("falha_continua");
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
