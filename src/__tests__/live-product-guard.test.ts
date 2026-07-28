import { describe, it, expect } from "vitest";
import { serviceMatchesIntent } from "@/lib/catalog-coherence";
import { productChanged, serviceSignature } from "@/lib/service-fingerprint";

describe("v313 intenção conferida no ato da venda", () => {
  it("recusa serviço de curtidas em pacote de visualizações", () => {
    expect(serviceMatchesIntent("instagram:visualizacoes:br", "Instagram Likes Brazil")).toBe(false);
  });

  it("aceita serviço coerente", () => {
    expect(serviceMatchesIntent("instagram:seguidores:br", "Instagram Followers Brasil Real")).toBe(true);
  });

  it("não bloqueia categoria sem intenção conhecida", () => {
    expect(serviceMatchesIntent("telegram:membros", "Qualquer coisa")).toBe(true);
  });
});

describe("v313 troca de produto sob o mesmo id", () => {
  const link = { provider: "smmhype", service_id: "123" };
  const prev = {
    provider: "smmhype",
    service_id: "123",
    name_sig: serviceSignature("Instagram Followers Brazil"),
  };

  it("bloqueia quando o fornecedor troca seguidores por curtidas", () => {
    expect(productChanged("Instagram Likes Brazil", prev, link)).toBe(true);
  });

  it("libera quando só mudou marketing no nome", () => {
    expect(productChanged("Instagram Followers Brazil ⚡ FAST 2026", prev, link)).toBe(false);
  });

  it("não bloqueia vínculo sem baseline gravado", () => {
    expect(productChanged("Instagram Likes Brazil", undefined, link)).toBe(false);
  });

  it("não bloqueia quando o id do vínculo mudou (outro serviço)", () => {
    expect(productChanged("Instagram Likes Brazil", prev, { provider: "smmhype", service_id: "999" })).toBe(false);
  });
});
