import { describe, it, expect } from "vitest";
import { interpretProviderResponse } from "@/lib/dispatch-response";
import { evaluateProviderGate } from "@/lib/dispatch-gates";

describe("v383 leitor único de resposta de fornecedor", () => {
  it("aceita sucesso normal", () => {
    expect(interpretProviderResponse('{"order":123456}', 200)).toEqual({ ok: true, orderId: "123456" });
  });
  it("pega erro clássico em HTTP 200", () => {
    const r = interpretProviderResponse('{"error":"Not enough funds"}', 200);
    expect(r.ok).toBe(false);
  });
  it("pega erro em array 'errors' com HTTP 200", () => {
    const r = interpretProviderResponse('{"errors":["incorrect service id"]}', 200);
    expect(r).toMatchObject({ ok: false });
    expect((r as any).error).toMatch(/incorrect service id/);
  });
  it("pega envelope status:error com HTTP 200", () => {
    const r = interpretProviderResponse('{"status":"error","msg":"service disabled"}', 200);
    expect(r).toMatchObject({ ok: false });
    expect((r as any).error).toMatch(/service disabled/);
  });
  it("recusa orderId 0 disfarçado de sucesso", () => {
    expect(interpretProviderResponse('{"order":0}', 200).ok).toBe(false);
  });
  it("recusa orderId textual 'error'", () => {
    expect(interpretProviderResponse('{"order":"error"}', 200).ok).toBe(false);
  });
  it("recusa HTML de WAF com HTTP 200", () => {
    expect(interpretProviderResponse("<html>503 backend</html>", 200).ok).toBe(false);
  });
  it("recusa corpo vazio", () => {
    expect(interpretProviderResponse("", 200).ok).toBe(false);
  });
  it("aceita order_id alternativo", () => {
    expect(interpretProviderResponse('{"order_id":"AB-99"}', 200)).toEqual({ ok: true, orderId: "AB-99" });
  });
  it("HTTP 4xx nunca vira sucesso", () => {
    expect(interpretProviderResponse('{"order":777}', 400).ok).toBe(false);
  });
});

describe("v383 portão único de fornecedor", () => {
  const semLimite = () => true;
  it("barra saldo zero", () => {
    const r = evaluateProviderGate({ slug: "x", saldo_atual: 0, cost_brl: 1 }, 10, semLimite);
    expect(r).toMatchObject({ allow: false, kind: "saldo_zero" });
  });
  it("barra saldo menor que custo", () => {
    const r = evaluateProviderGate({ slug: "x", saldo_atual: 1, cost_brl: 5 }, 50, semLimite);
    expect(r).toMatchObject({ allow: false, kind: "saldo_insuficiente" });
  });
  it("barra margem abaixo do piso", () => {
    const r = evaluateProviderGate({ slug: "x", saldo_atual: 100, cost_brl: 9 }, 10, () => false);
    expect(r).toMatchObject({ allow: false, kind: "margem" });
  });
  it("barra instável só quando pedido", () => {
    const cand = { slug: "x", saldo_atual: 100, cost_brl: 1, unstable: true };
    expect(evaluateProviderGate(cand, 50, semLimite).allow).toBe(true);
    expect(evaluateProviderGate(cand, 50, semLimite, { skipUnstable: true })).toMatchObject({ allow: false, kind: "unstable" });
  });
  it("libera fornecedor saudável", () => {
    expect(evaluateProviderGate({ slug: "x", saldo_atual: 100, cost_brl: 2 }, 50, semLimite).allow).toBe(true);
  });
});
