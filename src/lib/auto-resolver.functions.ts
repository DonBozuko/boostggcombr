import { createServerFn } from "@tanstack/react-start";

export const runAutoResolveIds = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    const admin = process.env.ADMIN_TOKEN;
    const cron = process.env.CRON_ADMIN_TOKEN;
    if (!data.token || (data.token !== admin && data.token !== cron)) {
      throw new Error("unauthorized");
    }
    const { autoResolveAll } = await import("@/lib/auto-resolver.server");
    return await autoResolveAll();
  });
