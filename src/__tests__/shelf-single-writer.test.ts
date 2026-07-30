import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { decidirVitrine, VETO_TTL_HORAS, type ShelfVeto } from "@/lib/shelf-authority";

// v372 — Trava estrutural: só UM módulo pode tirar/pôr pacote na vitrine.
// Antes eram SEIS motores gravando `is_sellable` (price-authority,
// bench-autonomo, catalog-coherence, service-fingerprint, route-preflight,
// dry-run). Um pausava, o outro religava, e o alerta nunca andava — mesma
// família do bug de preço (v305). Sem este detector, um sétimo escritor
// aparece em três semanas e o loop volta.

const ALLOW = new Set(["src/lib/shelf-authority.server.ts"]);
const WRITE_RE = /is_sellable\s*:/;

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

describe("v372 — ponto único de gravação da vitrine", () => {
  it("nenhum módulo grava is_sellable em update/upsert fora da Autoridade de Vitrine", () => {
    const infratores: string[] = [];
    for (const file of walk("src")) {
      const rel = file.replace(/\\/g, "/");
      if (ALLOW.has(rel)) continue;
      if (rel.includes("__tests__")) continue;
      if (rel === "src/integrations/supabase/types.ts") continue;
      const src = readFileSync(file, "utf8");
      const blocos = src.split(/\.update\(|\.upsert\(/).slice(1);
      for (const b of blocos) {
        if (WRITE_RE.test(b.slice(0, 400))) {
          infratores.push(rel);
          break;
        }
      }
    }
    expect(infratores).toEqual([]);
  });

  it("toda origem de veto tem prazo de validade (pausa sem retorno é bug)", () => {
    for (const [source, horas] of Object.entries(VETO_TTL_HORAS)) {
      expect(horas, `origem ${source} sem prazo`).toBeGreaterThan(0);
    }
  });
});

describe("v372 — decisão de vitrine", () => {
  const futuro = new Date(Date.now() + 3600_000).toISOString();
  const passado = new Date(Date.now() - 3600_000).toISOString();

  it("pacote sem veto ativo volta à vitrine", () => {
    const d = decidirVitrine(["p1k"], []);
    expect(d[0]).toMatchObject({ sellable: true, motivo: null });
  });

  it("veto vencido não segura pacote", () => {
    const vetos: ShelfVeto[] = [
      { pacote: "p1k", source: "bancada", motivo: "sem rota", expires_at: passado },
    ];
    expect(decidirVitrine(["p1k"], vetos)[0].sellable).toBe(true);
  });

  it("um veto ativo basta para pausar e o motivo mais duro é o exibido", () => {
    const vetos: ShelfVeto[] = [
      { pacote: "p1k", source: "margem", motivo: "margem apertada", expires_at: futuro },
      { pacote: "p1k", source: "impressao", motivo: "fornecedor trocou o produto", expires_at: futuro },
    ];
    const d = decidirVitrine(["p1k"], vetos)[0];
    expect(d.sellable).toBe(false);
    expect(d.motivo).toBe("fornecedor trocou o produto");
    expect(d.sources).toContain("margem");
  });

  it("motor que para de votar não segura pacote pausado por outro motor", () => {
    const vetos: ShelfVeto[] = [
      { pacote: "p1k", source: "margem", motivo: "margem apertada", expires_at: futuro },
    ];
    const d = decidirVitrine(["p1k", "p2k"], vetos);
    expect(d.find((x) => x.pacote === "p2k")!.sellable).toBe(true);
    expect(d.find((x) => x.pacote === "p1k")!.sellable).toBe(false);
  });
});
