import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { tokenMatches, isMasterToken, isOperatorToken } from "@/lib/admin-guard.server";

// v607 — Security Proxy do Admin.
// 1) Nenhum handler privilegiado pode tocar o cliente administrativo sem porteiro.
// 2) Nenhuma comparação inline de ADMIN_TOKEN pode voltar ao código.

const LIB = path.join(process.cwd(), "src/lib");
const ROUTES = path.join(process.cwd(), "src/routes/api/public");

// Server functions públicas por desenho (bypassam RLS para trabalho legítimo do
// cliente final). Qualquer entrada nova aqui é decisão consciente de segurança.
const PUBLICAS_POR_DESENHO = new Set([
  "getPedidoStatus",
  "getBlockedMap",
  "getAutonomiaFlags",
  "getBestsellers",
  "getBrPricingGrid",
  "getSandboxEnabled",
  "consultarPedidoPublico",
  "criarPedido",
  "redeemMysteryBox",
  "signupAffiliate",
  "affiliateDashboard",
  "submitResellerApplication",
  "resellerMe",
  "resellerTopup",
  "resellerTopupStatus",
  "resellerCatalog",
  "getSessionAdminToken",
]);

const GUARDAS = [
  "admin-guard.server",
  "admin-token.server",
  "requireSupabaseAuth",
  "authReseller",
  "isCronAuthorized",
  "CRON_SECRET",
  "assertAdmin",
  "signPedidoToken",
];

function listFiles(dir: string, suffix: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full, suffix));
    else if (entry.name.endsWith(suffix)) out.push(full);
  }
  return out;
}

describe("v607 — Security Proxy do admin", () => {
  it("todo server fn que usa o cliente administrativo passa por um porteiro", () => {
    const violacoes: string[] = [];
    for (const file of listFiles(LIB, ".functions.ts")) {
      const src = fs.readFileSync(file, "utf8");
      const partes = src.split(/^export const (\w+) = createServerFn/m);
      for (let i = 1; i < partes.length; i += 2) {
        const nome = partes[i]!;
        const corpo = partes[i + 1]!;
        if (!corpo.includes("supabaseAdmin")) continue;
        if (PUBLICAS_POR_DESENHO.has(nome)) continue;
        if (GUARDAS.some((g) => corpo.includes(g))) continue;
        violacoes.push(`${path.basename(file)} :: ${nome}`);
      }
    }
    expect(violacoes, `handlers privilegiados sem porteiro:\n${violacoes.join("\n")}`).toEqual([]);
  });

  it("não existe mais comparação inline de ADMIN_TOKEN em handlers", () => {
    const inline: string[] = [];
    const alvos = [...listFiles(LIB, ".functions.ts"), ...listFiles(ROUTES, ".ts")];
    for (const file of alvos) {
      const src = fs.readFileSync(file, "utf8");
      for (const [n, linha] of src.split("\n").entries()) {
        if (!/process\.env\.(CRON_)?ADMIN_TOKEN/.test(linha)) continue;
        if (!/[!=]==/.test(linha)) continue;
        inline.push(`${path.relative(process.cwd(), file)}:${n + 1}`);
      }
    }
    expect(inline, `comparação inline de token:\n${inline.join("\n")}`).toEqual([]);
  });

  it("comparação de token é exata e tolera valores ausentes", () => {
    expect(tokenMatches("abc", "abc")).toBe(true);
    expect(tokenMatches("abc", "abd")).toBe(false);
    expect(tokenMatches("abc", "abc ")).toBe(false);
    expect(tokenMatches("", "abc")).toBe(false);
    expect(tokenMatches("abc", undefined)).toBe(false);
    expect(tokenMatches(undefined, undefined)).toBe(false);
    expect(tokenMatches("abc", "abcdefghij")).toBe(false); // tamanhos diferentes não explodem
  });

  it("token mestre e token de cron são superfícies distintas", () => {
    const antes = { a: process.env.ADMIN_TOKEN, c: process.env.CRON_ADMIN_TOKEN };
    process.env.ADMIN_TOKEN = "mestre-1234567890";
    process.env.CRON_ADMIN_TOKEN = "cron-0987654321";
    try {
      expect(isMasterToken("mestre-1234567890")).toBe(true);
      expect(isMasterToken("cron-0987654321")).toBe(false);
      expect(isOperatorToken("cron-0987654321")).toBe(true);
      expect(isOperatorToken("qualquer-outro")).toBe(false);
    } finally {
      process.env.ADMIN_TOKEN = antes.a;
      process.env.CRON_ADMIN_TOKEN = antes.c;
    }
  });

  it("sem ADMIN_TOKEN configurado, nada é autorizado", () => {
    const antes = process.env.ADMIN_TOKEN;
    delete process.env.ADMIN_TOKEN;
    try {
      expect(isMasterToken("")).toBe(false);
      expect(isMasterToken("qualquer")).toBe(false);
    } finally {
      if (antes !== undefined) process.env.ADMIN_TOKEN = antes;
    }
  });
});
