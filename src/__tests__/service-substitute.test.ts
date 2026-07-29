// v362 — INVARIANTE: fornecedor trocar o ID não pode derrubar o pacote, e
// substituto errado nunca entra.
import { describe, it, expect } from "vitest";
import { pickSubstituteService } from "@/lib/service-substitute";

const catalogo = [
  { service: 900, name: "Instagram Followers | Brazil Real | Max 500K", rate: 1.2, min: 50, max: 500000 },
  { service: 901, name: "Instagram Followers | Global Fast", rate: 0.8, min: 100, max: 10000 },
  { service: 902, name: "Instagram Likes | Real", rate: 0.3, min: 50, max: 100000 },
  { service: 903, name: "TikTok Followers", rate: 0.9, min: 100, max: 100000 },
];

describe("v362 — substituto por impressão digital", () => {
  it("acha o serviço equivalente quando o ID some", () => {
    const r = pickSubstituteService({ previousSignature: "instagram+seguidores", qty: 1000, catalog: catalogo });
    expect(r?.service_id).toBe("901"); // mais barato e entrega 1000
  });

  it("ignora candidato que não entrega a quantidade", () => {
    const r = pickSubstituteService({ previousSignature: "instagram+seguidores", qty: 350_000, catalog: catalogo });
    expect(r?.service_id).toBe("900");
  });

  it("nunca troca por produto diferente (curtida no lugar de seguidor)", () => {
    const r = pickSubstituteService({ previousSignature: "instagram+seguidores", qty: 5_000_000, catalog: catalogo });
    expect(r).toBeNull();
  });

  it("nunca troca de rede", () => {
    const r = pickSubstituteService({ previousSignature: "tiktok+seguidores", qty: 1000, catalog: catalogo });
    expect(r?.service_id).toBe("903");
  });

  it("respeita o teto de custo", () => {
    const r = pickSubstituteService({
      previousSignature: "instagram+seguidores",
      qty: 350_000,
      catalog: catalogo,
      maxRate: 1.0,
    });
    expect(r).toBeNull();
  });

  it("aceita o nome antigo cru como assinatura", () => {
    const r = pickSubstituteService({
      previousSignature: "Instagram Followers | Old Service",
      qty: 1000,
      catalog: catalogo,
    });
    expect(r?.service_id).toBe("901");
  });
});
