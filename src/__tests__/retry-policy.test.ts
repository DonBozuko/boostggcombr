import { describe, it, expect } from "vitest";
import { backoffDelayMs, isTransientError, isBusinessError, MAX_DISPATCH_ATTEMPTS } from "@/lib/retry-policy";

describe("retry-policy v251", () => {
  it("primeira tentativa não espera", () => {
    expect(backoffDelayMs(1)).toBe(0);
  });

  it("backoff é crescente (exponencial, não fixo)", () => {
    const d2 = backoffDelayMs(2, 0.5);
    const d3 = backoffDelayMs(3, 0.5);
    expect(d2).toBe(1500);
    expect(d3).toBe(5000);
    expect(d3).toBeGreaterThan(d2);
  });

  it("jitter fica dentro de ±20%", () => {
    expect(backoffDelayMs(2, 0)).toBe(1200);
    expect(backoffDelayMs(2, 1)).toBe(1800);
  });

  it("total do backoff cabe no limite de execução (<10s)", () => {
    let total = 0;
    for (let a = 1; a <= MAX_DISPATCH_ATTEMPTS; a++) total += backoffDelayMs(a, 1);
    expect(total).toBeLessThan(10_000);
  });

  it("classifica erro transiente vs de negócio", () => {
    expect(isTransientError("smmhype: rede timeout 15s")).toBe(true);
    expect(isTransientError("HTTP 503 upstream")).toBe(true);
    expect(isTransientError("429 too many requests")).toBe(true);
    expect(isTransientError("provider4 falhou: not enough balance")).toBe(false);
    expect(isBusinessError("provider4 falhou: not enough balance")).toBe(true);
    expect(isBusinessError("ID reserva real ausente: service id")).toBe(true);
  });
});
