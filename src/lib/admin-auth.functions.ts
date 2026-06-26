import { createServerFn } from "@tanstack/react-start";

export const verifyAdminToken = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    const expected = process.env.ADMIN_TOKEN;
    if (!expected) return { ok: false, error: "ADMIN_TOKEN não configurado" };
    return { ok: data.token === expected };
  });
