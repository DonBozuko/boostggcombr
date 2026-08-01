// v399 — Ponto único de verdade do token de admin.
// Antes cada arquivo .functions.ts declarava seu próprio checkToken/auth/authorized
// no escopo de módulo. O divisor de server functions pode apagar esses helpers no
// bundle e derrubar admin/despacho com ReferenceError. Agora vive num .server.ts
// importado dinamicamente dentro do handler.

/** true somente se o token bater exatamente com ADMIN_TOKEN configurado. */
export function isAdminToken(token: string | undefined | null): boolean {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) return false;
  if (!token) return false;
  return token === expected;
}
