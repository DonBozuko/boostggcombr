// Helper de autenticação para endpoints internos chamados por pg_cron ou admin.
// Aceita ADMIN_TOKEN (login humano) OU CRON_ADMIN_TOKEN (chave de infra rotacionável),
// via header x-admin-token, Authorization: Bearer, ou ?token=.

export function extractAdminToken(request: Request): string | null {
  const h = request.headers;
  const raw =
    h.get("x-admin-token") ??
    h.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    new URL(request.url).searchParams.get("token");
  return raw && raw.trim().length > 0 ? raw.trim() : null;
}

export function isAuthorizedAdmin(token: string | null): boolean {
  if (!token) return false;
  const a = process.env.ADMIN_TOKEN;
  const c = process.env.CRON_ADMIN_TOKEN;
  if (a && token === a) return true;
  if (c && token === c) return true;
  return false;
}

export function unauthorized(): Response {
  return new Response(JSON.stringify({ ok: false, error: "UNAUTHORIZED" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

export function requireAdmin(request: Request): Response | null {
  return isAuthorizedAdmin(extractAdminToken(request)) ? null : unauthorized();
}
