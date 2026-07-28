// v319 — Trava de intenção na hora de VINCULAR (não só na auditoria).
// Regressão real: a auditoria desvinculava o serviço errado e o religador/backfill
// gravava o MESMO ID no ciclo seguinte → alerta eterno de "pacote vinculado ao
// produto errado". Estes testes garantem que o vínculo incoerente nunca é aceito.
import { describe, expect, it } from "vitest";
import { serviceMatchesIntent } from "@/lib/catalog-coherence";

describe("v319 trava de vínculo por intenção", () => {
  it("recusa serviço de curtidas para pacote de visualizações", () => {
    expect(
      serviceMatchesIntent(
        "instagram:visualizacoes",
        "⚪ Instagram Likes ➜ [Economy] [ Speed : 150K+/Day | Refill : No Refill ] ⛔",
      ),
    ).toBe(false);
  });

  it("aceita serviço coerente de visualizações", () => {
    expect(serviceMatchesIntent("instagram:visualizacoes", "Instagram Video Views [Fast]")).toBe(true);
  });

  it("não bloqueia quando o nome do serviço é desconhecido", () => {
    expect(serviceMatchesIntent("instagram:seguidores", null)).toBe(true);
  });
});
