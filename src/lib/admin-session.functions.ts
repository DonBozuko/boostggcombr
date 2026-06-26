import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ADMIN_EMAIL = "fabiano.majestic@gmail.com";

/**
 * Troca uma sessão válida do Supabase Auth pelo ADMIN_TOKEN do servidor.
 * Só responde se o e-mail autenticado for o do administrador-mestre.
 */
export const getAdminTokenForSession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const email =
      (context.claims?.email as string | undefined)?.toLowerCase() ?? "";
    if (email !== ADMIN_EMAIL) {
      return { ok: false as const, error: "Forbidden" };
    }
    const token = process.env.ADMIN_TOKEN;
    if (!token) return { ok: false as const, error: "ADMIN_TOKEN ausente" };
    return { ok: true as const, token };
  });
