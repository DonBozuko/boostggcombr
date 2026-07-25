import { describe, it, expect } from "vitest";
import { summarizeGuards } from "@/lib/guards-summary";

describe("v253 — Saldo de Guardas", () => {
  it("conta acionamentos por trava e guarda a última ocorrência", () => {
    const rows = [
      { action: "GUARD_RATE_LIMIT", created_at: "2026-07-25T10:00:00.000Z" },
      { action: "GUARD_RATE_LIMIT", created_at: "2026-07-25T12:00:00.000Z" },
      { action: "GUARD_CHECKOUT_DEDUPE", created_at: "2026-07-25T11:00:00.000Z" },
      { action: "outro_evento", created_at: "2026-07-25T11:30:00.000Z" },
    ];
    const out = summarizeGuards(rows);
    const rl = out.find((g) => g.key === "RATE_LIMIT")!;
    expect(rl.count).toBe(2);
    expect(rl.last).toBe("2026-07-25T12:00:00.000Z");
    expect(out.find((g) => g.key === "CHECKOUT_DEDUPE")!.count).toBe(1);
  });

  it("zero acionamento não é erro (contador vazio, alto=false)", () => {
    const out = summarizeGuards([]);
    expect(out.every((g) => g.count === 0 && g.alto === false && g.last === null)).toBe(true);
    expect(out.length).toBeGreaterThanOrEqual(6);
  });

  it("marca alto quando a trava age acima do esperado", () => {
    const rows = Array.from({ length: 25 }, (_, i) => ({
      action: "GUARD_RATE_LIMIT",
      created_at: `2026-07-25T10:${String(i).padStart(2, "0")}:00.000Z`,
    }));
    expect(summarizeGuards(rows).find((g) => g.key === "RATE_LIMIT")!.alto).toBe(true);
  });

  it("agrega margem retida pelas duas fontes de evento", () => {
    const out = summarizeGuards([
      { action: "GUARD_MARGIN_HOLD", created_at: "2026-07-25T10:00:00.000Z" },
      { action: "MARGIN_HOLD_ERROR", created_at: "2026-07-25T10:05:00.000Z" },
    ]);
    expect(out.find((g) => g.key === "MARGIN_HOLD")!.count).toBe(2);
  });
});
