import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {} as unknown,
}));

const { linksDoAlvo, alvoValido } = await import("@/services/canary.server");

describe("canário v289 — pool de links de teste", () => {
  it("aceita vários links separados por vírgula, ponto-e-vírgula ou quebra de linha", () => {
    expect(linksDoAlvo({ rede: "ig", link: "a, b ;c\nd", pacote: "p50", quantidade: 50, ativo: true }))
      .toEqual(["a", "b", "c", "d"]);
  });

  it("ignora separadores vazios e espaços", () => {
    expect(linksDoAlvo({ rede: "ig", link: " , @perfil , ", pacote: "p50", quantidade: 50, ativo: true }))
      .toEqual(["@perfil"]);
  });

  it("alvo sem link ou sem quantidade não roda", () => {
    expect(alvoValido({ rede: "ig", link: "", pacote: "p50", quantidade: 50, ativo: true })).toBe(false);
    expect(alvoValido({ rede: "ig", link: "@x", pacote: "p50", quantidade: 0, ativo: true })).toBe(false);
    expect(alvoValido({ rede: "ig", link: "@x", pacote: "p50", quantidade: 50, ativo: true })).toBe(true);
  });
});
