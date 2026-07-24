import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// v233 — Auditoria Forense sob demanda no painel admin.
export const runOpsAuditNow = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ token: z.string().min(8) }).parse(input))
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_TOKEN;
    if (!expected || data.token !== expected) {
      return { ok: false as const, error: "UNAUTHORIZED" as const };
    }
    const { runOpsAudit } = await import("@/services/ops-audit.server");
    const report = await runOpsAudit({ notify: false });
    return { ok: true as const, report };
  });
