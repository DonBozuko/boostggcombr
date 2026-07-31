import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isActionableRecoveryOrder,
  RECOVERY_DEAD_ORDER_STATUSES,
} from "@/lib/recovery-status";

describe("v386 — Pix fantasma nunca vira alerta", () => {
  it("somente status realmente pendente é recuperável", () => {
    expect(isActionableRecoveryOrder("pending")).toBe(true);
    expect(isActionableRecoveryOrder("mp_in_process")).toBe(true);
    expect(RECOVERY_DEAD_ORDER_STATUSES).toContain("mp_expired");
    expect(RECOVERY_DEAD_ORDER_STATUSES).toContain("mp_rejected_insufficient");
    expect(RECOVERY_DEAD_ORDER_STATUSES).toContain("mp_charged_back");
    for (const status of RECOVERY_DEAD_ORDER_STATUSES) {
      expect(isActionableRecoveryOrder(status)).toBe(false);
    }
  });

  it("o varredor limpa a fila mesmo quando não encontra Pix novo", () => {
    const source = readFileSync(
      join(process.cwd(), "src/routes/api/public/hooks/recovery-scan.ts"),
      "utf8",
    );
    const activeSweep = source.indexOf('.from("pix_recovery_queue")\n            .select("pedido_id")');
    expect(activeSweep).toBeGreaterThan(-1);
    expect(source.slice(0, activeSweep)).not.toMatch(/rows\.length\s*===\s*0[^\n]*return/);
  });

  it("semáforo não conta diretamente o status da fila", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/jarvis-triage.functions.ts"), "utf8");
    expect(source).toContain('.in("status", ["pending", "mp_pending", "mp_in_process"])');
    expect(source).not.toContain('.eq("status", "novo")');
  });
});