import { createServerFn } from "@tanstack/react-start";

export const runAutoResolveIds = createServerFn({ method: "POST" })
  .validator((d: { token: string }) => d)
  .handler(async ({ data }) => {
    if (!(await (await import("@/lib/admin-guard.server")).assertAdmin(data.token, "auto-resolver", { allowCron: true })).ok) {
      throw new Error("unauthorized");
    }
    const { autoResolveAll } = await import("@/lib/auto-resolver.server");
    return await autoResolveAll();
  });
