// v399 — Ponto único de verdade do token de admin.
// v607 — Delegado ao Security Proxy (`admin-guard.server`): comparação em
// tempo constante. Mantido como fachada síncrona para call sites legados;
// código novo deve chamar `assertAdmin` (lockout + trilha de auditoria).

import { isMasterToken } from "@/lib/admin-guard.server";

/** true somente se o token bater com ADMIN_TOKEN (timing-safe). */
export function isAdminToken(token: string | undefined | null): boolean {
  return isMasterToken(token);
}
