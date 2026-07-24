import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isCronAuthorized } from "@/lib/cron-auth.server";

const req = (headers: Record<string, string>) => new Request("https://x.test", { headers });

// FLUXO 4 — Autenticação dos robôs. Se afrouxar, qualquer um dispara refund,
// reprocessamento e sincronização de catálogo.
describe("autenticação das rotas de robô", () => {
  const original = { ...process.env };
  beforeEach(() => {
    process.env.ADMIN_TOKEN = "admin-tok";
    process.env.CRON_ADMIN_TOKEN = "cron-tok";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  });
  afterEach(() => {
    process.env = { ...original };
  });

  it("aceita x-admin-token válido", () => {
    expect(isCronAuthorized(req({ "x-admin-token": "admin-tok" }))).toBe(true);
    expect(isCronAuthorized(req({ "x-admin-token": "cron-tok" }))).toBe(true);
  });

  it("aceita Bearer service role (padrão pg_cron)", () => {
    expect(isCronAuthorized(req({ authorization: "Bearer service-key" }))).toBe(true);
  });

  it("recusa token errado, vazio ou ausente", () => {
    expect(isCronAuthorized(req({ "x-admin-token": "errado" }))).toBe(false);
    expect(isCronAuthorized(req({ authorization: "Bearer errado" }))).toBe(false);
    expect(isCronAuthorized(req({}))).toBe(false);
  });

  it("não autoriza quando os segredos não estão configurados", () => {
    process.env.ADMIN_TOKEN = "";
    process.env.CRON_ADMIN_TOKEN = "";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "";
    expect(isCronAuthorized(req({ "x-admin-token": "" }))).toBe(false);
    expect(isCronAuthorized(req({ authorization: "Bearer " }))).toBe(false);
  });
});
