// v607 — Security Proxy do Admin.
//
// Antes: 57 comparações inline de `data.token !== process.env.ADMIN_TOKEN`
// espalhadas por 40+ arquivos. Comparação de string simples (vazamento por
// timing), sem lockout, sem trilha de auditoria de tentativa negada.
//
// Agora: porteiro único, server-only. Ordem de execução:
//   1. lockout   -> IP com falhas demais na janela é negado antes de comparar
//   2. compare   -> timingSafeEqual sobre digests SHA-256 (não vaza tamanho)
//   3. falha     -> consome crédito de lockout + grava admin_audit_logs
//   4. sucesso   -> passa; nenhum ruído no log
//
// Importar SEMPRE dentro do handler (await import) para não quebrar o
// code splitting das server functions.

import { createHash, timingSafeEqual } from "node:crypto";

/** Compara em tempo constante. Hash dos dois lados para não vazar comprimento. */
export function tokenMatches(input: string | null | undefined, expected: string | null | undefined): boolean {
  if (!input || !expected) return false;
  const a = createHash("sha256").update(String(input), "utf8").digest();
  const b = createHash("sha256").update(String(expected), "utf8").digest();
  return timingSafeEqual(a, b);
}

/** Token mestre do painel (humano). */
export function isMasterToken(token: string | null | undefined): boolean {
  return tokenMatches(token, process.env.ADMIN_TOKEN);
}

/** Token mestre OU token de cron (hooks automáticos). */
export function isOperatorToken(token: string | null | undefined): boolean {
  return isMasterToken(token) || tokenMatches(token, process.env.CRON_ADMIN_TOKEN);
}

export type AdminGuardResult = { ok: boolean; reason?: "UNAUTHORIZED" | "LOCKED" };

const FAIL_LIMIT = 10;
const FAIL_WINDOW_SEC = 600;

async function guardIp(): Promise<string> {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    if (!req?.headers) return "unknown";
    const { clientIpFrom } = await import("@/lib/rate-limit.server");
    return clientIpFrom(req.headers);
  } catch {
    return "unknown";
  }
}

async function registerDenial(scope: string, ip: string, reason: string): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("admin_audit_logs" as any).insert({
      admin_email: "system@admin-guard",
      action: "admin_auth_denied",
      detail: { scope, ip, reason, v: 607 } as any,
      created_at: new Date().toISOString(),
    } as any);
  } catch {
    /* auditoria nunca derruba o guard */
  }
}

/**
 * Porteiro único das superfícies administrativas.
 * @param token token enviado pelo chamador
 * @param scope rótulo do endpoint (usado no lockout e na trilha)
 * @param opts allowCron=true aceita também CRON_ADMIN_TOKEN (hooks/cron)
 */
export async function assertAdmin(
  token: string | null | undefined,
  scope: string,
  opts?: { allowCron?: boolean },
): Promise<AdminGuardResult> {
  const allowCron = opts?.allowCron === true;
  const ip = await guardIp();

  // 1) lockout — checa antes de comparar; não consome crédito em sucesso.
  let locked = false;
  try {
    const { peekRateLimit } = await import("@/lib/rate-limit.server");
    locked = await peekRateLimit("admin-auth-fail", ip, FAIL_LIMIT, FAIL_WINDOW_SEC);
  } catch {
    locked = false; // limitador quebrado nunca tranca o dono do painel
  }
  if (locked) {
    void registerDenial(scope, ip, "LOCKED");
    return { ok: false, reason: "LOCKED" };
  }

  // 2) comparação em tempo constante
  const ok = allowCron ? isOperatorToken(token) : isMasterToken(token);
  if (ok) return { ok: true };

  // 3) falha: consome crédito e grava trilha
  try {
    const { checkRateLimit } = await import("@/lib/rate-limit.server");
    await checkRateLimit("admin-auth-fail", ip, FAIL_LIMIT, FAIL_WINDOW_SEC);
  } catch {
    /* ignore */
  }
  void registerDenial(scope, ip, "UNAUTHORIZED");
  return { ok: false, reason: "UNAUTHORIZED" };
}

/** Açúcar para rotas HTTP: lê x-admin-token / Authorization: Bearer. */
export function tokenFromRequest(request: Request): string {
  const x = request.headers.get("x-admin-token");
  if (x) return x.trim();
  return (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
}
