// Auth helper para rotas cron: aceita x-admin-token (chamadas manuais/legacy)
// OU Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY> (padrão pg_cron via vault).
export function isCronAuthorized(request: Request): boolean {
  const admin = process.env.ADMIN_TOKEN ?? "";
  const cron = process.env.CRON_ADMIN_TOKEN ?? "";
  const svc = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const xTok = request.headers.get("x-admin-token") ?? "";
  const bearer = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (xTok && (xTok === admin || xTok === cron)) return true;
  if (bearer && (bearer === svc || bearer === admin || bearer === cron)) return true;
  return false;
}
