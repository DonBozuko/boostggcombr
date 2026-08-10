// Auth helper para rotas cron: aceita x-admin-token (chamadas manuais/legacy)
// OU Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY> (padrão pg_cron via vault).
// v607 — comparação em tempo constante (tokenMatches), sem `===` de string.
import { tokenMatches } from "@/lib/admin-guard.server";

export function isCronAuthorized(request: Request): boolean {
  const admin = process.env.ADMIN_TOKEN ?? "";
  const cron = process.env.CRON_ADMIN_TOKEN ?? "";
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const xTok = request.headers.get("x-admin-token") ?? "";
  const bearer = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (xTok && (tokenMatches(xTok, admin) || tokenMatches(xTok, cron))) return true;
  if (bearer && (tokenMatches(bearer, svc) || tokenMatches(bearer, admin) || tokenMatches(bearer, cron))) return true;
  return false;
}
