// v392 — INVARIANTE: reposição automática (nível 2) nunca passa do teto.
//
// O risco do nível 2 não é errar uma vez: é virar torneira aberta no fornecedor.
// Estas provas garantem teto por dia, teto de percentual, flag e idempotência.
import { describe, expect, it } from "vitest";
import {
  TETO_FALTA_PCT,
  TETO_REPOSICOES_DIA,
  decidirReposicao,
  saldoDoTeto,
} from "@/lib/refill-cap";
import { flagFromValue } from "@/lib/autonomy-flags.server";
import { ACOES } from "@/lib/autonomy-ladder";

const base = { quantidade: 1000, remains: 50, horasParado: 20, jaPediu: false };
const ctx = { flagLigada: true, reposicoesHoje: 0, horasTravadoMin: 12 };

describe("v392 — teto da reposição automática", () => {
  it("repõe quando faltou pouco e a entrega travou", () => {
    expect(decidirReposicao(base, ctx)).toEqual({ repor: true });
  });

  it("flag desligada nunca repõe", () => {
    expect(decidirReposicao(base, { ...ctx, flagLigada: false }).repor).toBe(false);
  });

  it("respeita o teto de reposições por dia", () => {
    expect(decidirReposicao(base, { ...ctx, reposicoesHoje: TETO_REPOSICOES_DIA }).repor).toBe(false);
    expect(saldoDoTeto(TETO_REPOSICOES_DIA + 5)).toBe(0);
  });

  it("falta grande é caso do dono, não de reposição", () => {
    const remains = Math.floor(base.quantidade * TETO_FALTA_PCT) + 1;
    expect(decidirReposicao({ ...base, remains }, ctx).repor).toBe(false);
  });

  it("não pede duas vezes no mesmo pedido", () => {
    expect(decidirReposicao({ ...base, jaPediu: true }, ctx).repor).toBe(false);
  });

  it("entrega que ainda anda não vira reposição", () => {
    expect(decidirReposicao({ ...base, horasParado: 1 }, ctx).repor).toBe(false);
  });

  it("nada faltando não gera chamada ao fornecedor", () => {
    expect(decidirReposicao({ ...base, remains: 0 }, ctx).repor).toBe(false);
  });

  it("flag só liga com valor explícito (fail-closed)", () => {
    expect(flagFromValue(true)).toBe(true);
    expect(flagFromValue({ enabled: true })).toBe(true);
    expect(flagFromValue({ enabled: false })).toBe(false);
    expect(flagFromValue(undefined)).toBe(false);
    expect(flagFromValue("sim")).toBe(false);
  });

  it("a escada continua declarando esta ação como nível 2 com flag e teto", () => {
    const a = ACOES.find((x) => x.id === "reposicao_automatica");
    expect(a?.nivel).toBe(2);
    expect(a?.flag).toBe("autonomia_reposicao");
    expect(a?.teto).toBeTruthy();
  });
});
