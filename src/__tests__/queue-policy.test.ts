import { describe, it, expect } from "vitest";
import {
  decideQueueAction,
  QUEUE_MIN_AGE_MIN,
  QUEUE_MAX_ATTEMPTS,
  QUEUE_BACKOFF_MIN,
  QUEUE_BACKOFF_WAITING_MIN,
  QUEUE_MAX_ATTEMPTS_WAITING,
} from "@/lib/queue-policy";

const NOW = new Date("2026-07-28T12:00:00Z").getTime();
const minAgo = (m: number) => new Date(NOW - m * 60_000).toISOString();

describe("v324 — fila que anda sozinha", () => {
  it("não mexe em pedido recém-pago (dispatch inline ainda pode resolver)", () => {
    const d = decideQueueAction(
      { id: "1", status: "waiting_provision", created_at: minAgo(5), attempts: 0, last_attempt_at: null },
      NOW,
    );
    expect(d.action).toBe("wait");
  });

  it("retenta sozinho assim que passa a idade mínima", () => {
    const d = decideQueueAction(
      { id: "1", status: "waiting_provision", created_at: minAgo(QUEUE_MIN_AGE_MIN + 1), attempts: 0, last_attempt_at: null },
      NOW,
    );
    expect(d.action).toBe("retry");
  });

  it("respeita backoff crescente entre tentativas", () => {
    const base = { id: "1", status: "SMM_FAILED", created_at: minAgo(600) };
    // 1 tentativa feita → espera 30min
    expect(decideQueueAction({ ...base, attempts: 1, last_attempt_at: minAgo(10) }, NOW).action).toBe("wait");
    expect(decideQueueAction({ ...base, attempts: 1, last_attempt_at: minAgo(31) }, NOW).action).toBe("retry");
    // 3 tentativas feitas → espera 120min
    expect(decideQueueAction({ ...base, attempts: 3, last_attempt_at: minAgo(90) }, NOW).action).toBe("wait");
    expect(decideQueueAction({ ...base, attempts: 3, last_attempt_at: minAgo(121) }, NOW).action).toBe("retry");
  });

  it("nunca entra em loop infinito: escala para humano no teto", () => {
    const d = decideQueueAction(
      { id: "1", status: "MARGIN_HOLD", created_at: minAgo(5000), attempts: QUEUE_MAX_ATTEMPTS, last_attempt_at: minAgo(5000) },
      NOW,
    );
    expect(d.action).toBe("escalate");
  });

  it("backoff é sempre crescente", () => {
    for (let i = 1; i < QUEUE_BACKOFF_MIN.length; i++) {
      expect(QUEUE_BACKOFF_MIN[i]).toBeGreaterThan(QUEUE_BACKOFF_MIN[i - 1]);
    }
  });
});

describe("v353 — pedido esperando recarga insiste por ~24h", () => {
  it("não desiste no teto antigo (5 tentativas) quando está aguardando saldo", () => {
    const d = decideQueueAction(
      { id: "1", status: "waiting_provision", created_at: minAgo(5000), attempts: 5, last_attempt_at: minAgo(5000) },
      NOW,
    );
    expect(d.action).toBe("retry");
  });

  it("só chama humano depois de ~24h insistindo", () => {
    const soma = QUEUE_BACKOFF_WAITING_MIN.reduce((a, b) => a + b, 0);
    expect(soma).toBeGreaterThanOrEqual(24 * 60);
    const d = decideQueueAction(
      {
        id: "1",
        status: "waiting_provision",
        created_at: minAgo(5000),
        attempts: QUEUE_MAX_ATTEMPTS_WAITING,
        last_attempt_at: minAgo(5000),
      },
      NOW,
    );
    expect(d.action).toBe("escalate");
  });

  it("falha real (SMM_FAILED) continua com o teto curto", () => {
    const d = decideQueueAction(
      { id: "1", status: "SMM_FAILED", created_at: minAgo(5000), attempts: QUEUE_MAX_ATTEMPTS, last_attempt_at: minAgo(5000) },
      NOW,
    );
    expect(d.action).toBe("escalate");
  });
});
