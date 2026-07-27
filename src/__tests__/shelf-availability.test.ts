import { describe, it, expect } from "vitest";

// v290 — Prateleira honesta: pacote pausado pelo teste seco recente some da vitrine,
// mas pausa velha (cron parado) NÃO esvazia a loja.
function sellableVisivel(row: { is_sellable: boolean | null; last_dry_run: string | null }, agora = Date.now()): boolean {
  const dr = row.last_dry_run ? Date.parse(row.last_dry_run) : 0;
  const recente = dr > 0 && agora - dr < 48 * 60 * 60 * 1000;
  return recente ? row.is_sellable !== false : true;
}

const H = 60 * 60 * 1000;

describe("v290 — vitrine só mostra o que tem pra entregar", () => {
  const agora = Date.parse("2026-07-27T12:00:00Z");

  it("pausa recente esconde o pacote", () => {
    expect(sellableVisivel({ is_sellable: false, last_dry_run: new Date(agora - 2 * H).toISOString() }, agora)).toBe(false);
  });

  it("pausa antiga (teste seco parado) não esconde", () => {
    expect(sellableVisivel({ is_sellable: false, last_dry_run: new Date(agora - 72 * H).toISOString() }, agora)).toBe(true);
  });

  it("sem teste seco nenhum, mantém visível", () => {
    expect(sellableVisivel({ is_sellable: false, last_dry_run: null }, agora)).toBe(true);
  });

  it("pacote saudável fica visível", () => {
    expect(sellableVisivel({ is_sellable: true, last_dry_run: new Date(agora - H).toISOString() }, agora)).toBe(true);
  });
});
