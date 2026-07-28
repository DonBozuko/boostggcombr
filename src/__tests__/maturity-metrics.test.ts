import { describe, expect, it } from "vitest";
import {
  computeMaturity,
  isHumanTouched,
  AUTO_QUEUE_TAG,
  type MaturityOrder,
} from "@/lib/maturity-metrics";

const o = (p: Partial<MaturityOrder>): MaturityOrder => ({
  status: "Enviado",
  created_at: "2026-07-28T10:00:00Z",
  last_reconciled_at: "2026-07-28T10:30:00Z",
  error_detail: null,
  ...p,
});

describe("v354 — medidor real (nada de percentual chutado)", () => {
  it("entrega automática não conta como toque humano", () => {
    expect(isHumanTouched(o({ error_detail: "Enviado via provider4 (order 9)" }))).toBe(false);
    expect(isHumanTouched(o({ error_detail: `${AUTO_QUEUE_TAG} · Enviado via provider4` }))).toBe(false);
  });

  it("recarga manual e confirmação de robô externo contam como toque humano", () => {
    expect(isHumanTouched(o({ error_detail: "v151 recarga manual · Enviado via verified" }))).toBe(true);
    expect(isHumanTouched(o({ error_detail: "Robô externo confirmou envio via smmpainel" }))).toBe(true);
    expect(isHumanTouched(o({ error_detail: "Refund manual aprovado." }))).toBe(true);
  });

  it("mede autonomia, tempo pago→entregue e estornos", () => {
    const m = computeMaturity([
      o({}),
      o({ last_reconciled_at: "2026-07-28T11:00:00Z" }),
      o({ error_detail: "v151 recarga manual · Enviado via verified" }),
      o({ status: "mp_refunded" }),
      o({ status: "waiting_provision" }),
    ]);
    expect(m.entregues).toBe(3);
    expect(m.entreguesSemToque).toBe(2);
    expect(m.autonomiaPct).toBeCloseTo(66.7, 1);
    expect(m.estornos).toBe(1);
    expect(m.pagoEntregueMedianaMin).toBe(30);
    expect(m.amostraTempo).toBe(3);
  });

  it("sem amostra não inventa número", () => {
    const m = computeMaturity([]);
    expect(m.autonomiaPct).toBeNull();
    expect(m.pagoEntregueMedianaMin).toBeNull();
    expect(m.amostraTempo).toBe(0);
  });
});
