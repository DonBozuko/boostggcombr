// v320 — Portão único de vínculo.
// Sem este portão, qualquer constante velha no código regrava um ID que o
// fornecedor já reaproveitou para outro produto — e o alerta volta pra sempre.
import { describe, expect, it } from "vitest";
import { sanitizeBindings } from "@/lib/bind-guard.server";

const nomes = new Map<string, string>([
  ["smmhype:18855", "⚪ Instagram Likes ➜ [Economy] [ Speed : 150K+/Day ]"],
  ["smmhype:14325", "Instagram Followers [Real] [Refill 30D]"],
  ["smmpanel:900", "Instagram Video Views [Fast]"],
]);

describe("v320 portão de vínculo", () => {
  it("zera ID cujo produto real contraria a intenção do pacote", () => {
    const { rows, rejected } = sanitizeBindings(
      [{ pacote: "v10k", category: "instagram:visualizacoes", smmhype_service_id: "18855" }],
      nomes,
    );
    expect(rows[0].smmhype_service_id).toBeNull();
    expect(rejected).toHaveLength(1);
    expect(rejected[0].pacote).toBe("v10k");
  });

  it("preserva vínculo coerente", () => {
    const { rows, rejected } = sanitizeBindings(
      [{ pacote: "p10k", category: "instagram:seguidores", smmhype_service_id: "14325" }],
      nomes,
    );
    expect(rows[0].smmhype_service_id).toBe("14325");
    expect(rejected).toHaveLength(0);
  });

  it("não apaga vínculo quando o cache ainda não conhece o serviço", () => {
    const { rows, rejected } = sanitizeBindings(
      [{ pacote: "v10k", category: "instagram:visualizacoes", smmhype_service_id: "99999" }],
      nomes,
    );
    expect(rows[0].smmhype_service_id).toBe("99999");
    expect(rejected).toHaveLength(0);
  });

  it("separa fornecedores: mesmo número, produtos diferentes", () => {
    const { rows } = sanitizeBindings(
      [{ pacote: "v10k", category: "instagram:visualizacoes", smmpanel_service_id: "900" }],
      nomes,
    );
    expect(rows[0].smmpanel_service_id).toBe("900");
  });
});
