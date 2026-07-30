import { describe, it, expect, vi } from "vitest";

vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {} as unknown,
}));

const { linksDoAlvo, alvoValido, intervaloDoAlvo } = await import("@/services/canary.server");

describe("canário v289 — pool de links de teste", () => {
  it("aceita vários links separados por vírgula, ponto-e-vírgula ou quebra de linha", () => {
    expect(linksDoAlvo({ rede: "ig", link: "a, b ;c\nd", pacote: "p50", quantidade: 50, ativo: true, intervalo_horas: 0 }))
      .toEqual(["a", "b", "c", "d"]);
  });

  it("ignora separadores vazios e espaços", () => {
    expect(linksDoAlvo({ rede: "ig", link: " , @perfil , ", pacote: "p50", quantidade: 50, ativo: true, intervalo_horas: 0 }))
      .toEqual(["@perfil"]);
  });

  it("alvo sem link ou sem quantidade não roda", () => {
    expect(alvoValido({ rede: "ig", link: "", pacote: "p50", quantidade: 50, ativo: true, intervalo_horas: 0 })).toBe(false);
    expect(alvoValido({ rede: "ig", link: "@x", pacote: "p50", quantidade: 0, ativo: true, intervalo_horas: 0 })).toBe(false);
    expect(alvoValido({ rede: "ig", link: "@x", pacote: "p50", quantidade: 50, ativo: true, intervalo_horas: 0 })).toBe(true);
  });
});

describe("canário v369 — relógio próprio por rede", () => {
  it("usa o intervalo da rede quando definido e o geral quando é zero", () => {
    expect(intervaloDoAlvo({ rede: "yt", link: "@x", pacote: "ys50", quantidade: 50, ativo: true, intervalo_horas: 48 }, 12)).toBe(48);
    expect(intervaloDoAlvo({ rede: "ig", link: "@x", pacote: "p50", quantidade: 50, ativo: true, intervalo_horas: 0 }, 12)).toBe(12);
  });
});
