import { describe, it, expect } from "vitest";
import {
  buildCheckoutIdempotencyKey,
  isStalePending,
  IDEMPOTENCY_WINDOW_MS,
  PENDING_MAX_AGE_HOURS,
} from "@/lib/checkout-idempotency";

describe("v260 — corrida de checkout (cliques simultâneos)", () => {
  const base = { usuario: "Fabiano_BR", pacote: "br-pro1k", valor: 49.9, nowMs: 1_700_000_000_000 };

  it("dois cliques simultâneos geram a MESMA chave (MP não cobra 2x)", () => {
    const a = buildCheckoutIdempotencyKey(base);
    const b = buildCheckoutIdempotencyKey({ ...base, nowMs: base.nowMs + 1_500 });
    expect(a).toBe(b);
  });

  it("é insensível a caixa/espaço no @ do cliente", () => {
    expect(buildCheckoutIdempotencyKey(base)).toBe(
      buildCheckoutIdempotencyKey({ ...base, usuario: "  fabiano_br " }),
    );
  });

  it("clientes diferentes nunca compartilham cobrança", () => {
    expect(buildCheckoutIdempotencyKey(base)).not.toBe(
      buildCheckoutIdempotencyKey({ ...base, usuario: "outro_cliente" }),
    );
  });

  it("pacote ou valor diferente = cobrança nova", () => {
    expect(buildCheckoutIdempotencyKey(base)).not.toBe(
      buildCheckoutIdempotencyKey({ ...base, pacote: "br-pro2k" }),
    );
    expect(buildCheckoutIdempotencyKey(base)).not.toBe(
      buildCheckoutIdempotencyKey({ ...base, valor: 59.9 }),
    );
  });

  it("depois da janela o cliente consegue comprar de novo", () => {
    const later = buildCheckoutIdempotencyKey({
      ...base,
      nowMs: base.nowMs + IDEMPOTENCY_WINDOW_MS * 2,
    });
    expect(later).not.toBe(buildCheckoutIdempotencyKey(base));
  });

  it("10 requisições paralelas colapsam em 1 única chave", () => {
    const keys = new Set(
      Array.from({ length: 10 }, (_, i) =>
        buildCheckoutIdempotencyKey({ ...base, nowMs: base.nowMs + i * 50 }),
      ),
    );
    expect(keys.size).toBe(1);
  });
});

describe("v260 — Pix vencido não fica zumbi", () => {
  const now = 1_700_000_000_000;

  it("pedido recém-criado não é encerrado", () => {
    expect(isStalePending(new Date(now - 60_000).toISOString(), now)).toBe(false);
  });

  it("pedido pendente há mais de 24h é considerado expirado", () => {
    const old = new Date(now - (PENDING_MAX_AGE_HOURS + 1) * 3_600_000).toISOString();
    expect(isStalePending(old, now)).toBe(true);
  });

  it("data inválida não derruba a rotina", () => {
    expect(isStalePending("não-é-data", now)).toBe(false);
  });
});
