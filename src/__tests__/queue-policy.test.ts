import { describe, it, expect } from "vitest";
import {
  decideQueueAction,
  QUEUE_MIN_AGE_MIN,
  QUEUE_MAX_ATTEMPTS,
  QUEUE_BACKOFF_MIN,
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
