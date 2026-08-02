// v406 — INVARIANTE: rota reserva quente.
//
// Sem este teste, "tem plano B" volta a ser opinião. Aqui o plano B é medido
// com os MESMOS dados que o despacho enxerga.
import { describe, expect, it } from "vitest";
import { classifyRedundancy, contarSemReserva } from "@/lib/hot-standby";
import { evaluateRoute, type PreflightProvider } from "@/lib/route-preflight";

const P = (over: Partial<PreflightProvider>): PreflightProvider => ({
  slug: "a",
  cost_brl: 10,
  provider_service_id: "111",
  saldo_atual: 500,
  unstable: false,
  ...over,
});

const PRECO = 100; // margem folgada: nenhum fornecedor cai por margem

describe("v406 — rota reserva quente", () => {
  it("dois fornecedores prontos = reserva quente", () => {
    const v = classifyRedundancy(
      evaluateRoute([P({ slug: "smmhype" }), P({ slug: "verified", cost_brl: 12 })], PRECO),
    );
    expect(v.nivel).toBe("quente");
    expect(v.primaria).toBe("smmhype");
    expect(v.reserva).toBe("verified");
  });

  it("um fornecedor só = rota única (aviso, não bloqueio)", () => {
    const v = classifyRedundancy(evaluateRoute([P({ slug: "smmhype" })], PRECO));
    expect(v.nivel).toBe("unica");
    expect(v.reserva).toBeNull();
    expect(v.motivo).toContain("sem reserva");
  });

  it("fornecedor sem ID não conta como reserva", () => {
    const v = classifyRedundancy(
      evaluateRoute([P({ slug: "smmhype" }), P({ slug: "verified", provider_service_id: null })], PRECO),
    );
    expect(v.nivel).toBe("unica");
  });

  it("reserva sem saldo não conta como reserva pronta", () => {
    // evaluateRoute já degrada quem não tem saldo quando existe alguém com
    // saldo: o pacote fica com rota única — e é isso que o painel precisa dizer.
    const v = classifyRedundancy(
      evaluateRoute([P({ slug: "smmhype" }), P({ slug: "verified", saldo_atual: 0 })], PRECO),
    );
    expect(v.nivel).toBe("unica");
  });

  it("todos sem saldo: rota morna (sai depois da recarga)", () => {
    const v = classifyRedundancy(
      evaluateRoute(
        [P({ slug: "smmhype", saldo_atual: 0 }), P({ slug: "verified", saldo_atual: 0 })],
        PRECO,
      ),
    );
    expect(v.nivel).toBe("morna");
    expect(v.reserva).toBe("verified");
  });

  it("sem rota nenhuma = nenhuma", () => {
    const v = classifyRedundancy(evaluateRoute([], PRECO));
    expect(v.nivel).toBe("nenhuma");
    expect(v.primaria).toBeNull();
  });

  it("contador separa quem está descoberto", () => {
    const c = contarSemReserva([
      { nivel: "quente" },
      { nivel: "morna" },
      { nivel: "unica" },
      { nivel: "nenhuma" },
    ]);
    expect(c.semReserva).toBe(2);
    expect(c.comReservaQuente).toBe(1);
  });

  it("não inventa régua própria: margem reprovada some da reserva", () => {
    // custo alto derruba o segundo por margem dentro do evaluateRoute
    const v = classifyRedundancy(
      evaluateRoute([P({ slug: "smmhype", cost_brl: 10 }), P({ slug: "verified", cost_brl: 99 })], PRECO),
    );
    expect(v.reserva).toBeNull();
    expect(v.nivel).toBe("unica");
  });
});
