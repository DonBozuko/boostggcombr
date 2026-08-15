
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { clearPhantomAlerts } from "./cleanup-v640.server";

export const runCleanupV640 = createServerFn({ method: "POST" })
  .validator((input: { token: string }) => z.object({ token: z.string().min(8) }).parse(input))
  .handler(async ({ data }): Promise<{ ok: boolean; error?: any }> => {
    const { assertAdmin } = await import("@/lib/admin-guard.server");
    const adminCheck = await assertAdmin(data.token, "cleanup");
    if (!adminCheck.ok) {
      return { ok: false, error: "UNAUTHORIZED" };
    }
    const result = await clearPhantomAlerts();
    return result;
  });
