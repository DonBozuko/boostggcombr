// v390 — Invariante: TODO pedido já despachado é acompanhado até a entrega.
// Bug que originou o teste: o watcher só olhava status="processing", então
// pedido de revenda (gravado como "Enviado") ficava despachado pra sempre —
// nunca virava "completed" e nunca disparava alerta de travamento.
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { STATUS_EM_ENTREGA } from "@/services/delivery-watcher.server";
import { toCanonicalStatus } from "@/lib/order-status";

const SRC = readFileSync("src/services/delivery-watcher.server.ts", "utf8");

describe("acompanhamento de entrega (v390)", () => {
  it("cobre os dois status de pedido já despachado", () => {
    expect(STATUS_EM_ENTREGA).toContain("processing");
    expect(STATUS_EM_ENTREGA).toContain("Enviado");
  });

  it("todo status vigiado é conhecido pelo mapa canônico", () => {
    for (const s of STATUS_EM_ENTREGA) {
      expect(toCanonicalStatus(s)).toBeTruthy();
    }
  });

  it("a leitura e a escrita usam a MESMA lista (sem escrita órfã)", () => {
    // Se a leitura pega "Enviado" mas o UPDATE trava em "processing",
    // o pedido de revenda é lido e nunca fechado.
    expect(SRC).not.toMatch(/\.eq\("status",\s*"processing"\)/);
    const usos = SRC.match(/STATUS_EM_ENTREGA/g) ?? [];
    expect(usos.length).toBeGreaterThanOrEqual(3); // declaração + leitura + escrita
  });

  it("a janela de varredura cobre pelo menos 7 dias", () => {
    const m = SRC.match(/const since = new Date\(Date\.now\(\) - (\d+) \* 24 \* 60 \* 60 \* 1000\)/);
    expect(m).toBeTruthy();
    expect(Number(m![1])).toBeGreaterThanOrEqual(7);
  });
});
