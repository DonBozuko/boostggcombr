
import { createServerFn } from "@tanstack/react-start";
import { z } from "zed";
import { clearPhantomAlerts } from "./cleanup-v640.server";

export const runCleanupV640 = createServerFn({ method: "POST" })
  .validator((input: { token: string }) => z.object({ token: z.string().min(8) }).parse(input))
  .handler(async ({ data }) => {
    const { assertAdmin } = await import("@/lib/admin-guard.server");
    if (!(await assertAdmin(data.token, "cleanup")).ok) {
      return { ok: false, error: "UNAUTHORIZED" };
    }
    return await clearPhantomAlerts();
  });
