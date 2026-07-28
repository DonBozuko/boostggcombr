import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  CANONICAL_STATUSES,
  toCanonicalStatus,
  statusLabelPt,
  isKnownInternalStatus,
  isOpenPaidStatus,
} from "@/lib/order-status";

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) {
      if (f === "node_modules" || f === "__tests__") continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(f)) out.push(p);
  }
  return out;
}

describe("v325 — mapa canônico de status", () => {
  it("só existem 8 estados públicos", () => {
    expect(CANONICAL_STATUSES).toHaveLength(8);
  });

  it("traduz os estados internos reais do banco", () => {
    expect(toCanonicalStatus("pending")).toBe("PENDENTE");
    expect(toCanonicalStatus("paid")).toBe("PAGO");
    expect(toCanonicalStatus("waiting_provision")).toBe("EM_PROCESSAMENTO");
    expect(toCanonicalStatus("MARGIN_HOLD")).toBe("EM_PROCESSAMENTO");
    expect(toCanonicalStatus("Enviado")).toBe("ENVIADO_AO_FORNECEDOR");
    expect(toCanonicalStatus("processing")).toBe("EM_ENTREGA");
    expect(toCanonicalStatus("completed")).toBe("CONCLUIDO");
    expect(toCanonicalStatus("expired")).toBe("CANCELADO");
    expect(toCanonicalStatus("mp_refunded")).toBe("CANCELADO");
    expect(toCanonicalStatus("SMM_FAILED")).toBe("ERRO");
  });

  it("status desconhecido nunca some: cai em ERRO", () => {
    expect(toCanonicalStatus("inventado_ontem")).toBe("ERRO");
    expect(isKnownInternalStatus("inventado_ontem")).toBe(false);
  });

  it("tolera diferença de caixa", () => {
    expect(toCanonicalStatus("ENVIADO")).toBe("ENVIADO_AO_FORNECEDOR");
    expect(toCanonicalStatus("Paid")).toBe("PAGO");
  });

  it("frase ao cliente nunca cita fornecedor, custo ou termo técnico", () => {
    for (const s of ["pending", "paid", "waiting_provision", "Enviado", "processing", "completed", "expired", "SMM_FAILED"]) {
      const f = statusLabelPt(s);
      expect(f.length).toBeGreaterThan(10);
      expect(f).not.toMatch(/fornecedor|smm|provider|custo|margem|dispatch|R\$/i);
    }
  });

  it("sabe quando o dinheiro entrou e a entrega ainda não terminou", () => {
    expect(isOpenPaidStatus("paid")).toBe(true);
    expect(isOpenPaidStatus("waiting_provision")).toBe(true);
    expect(isOpenPaidStatus("processing")).toBe(true);
    expect(isOpenPaidStatus("completed")).toBe(false);
    expect(isOpenPaidStatus("pending")).toBe(false);
    expect(isOpenPaidStatus("expired")).toBe(false);
  });

  // TRAVA: status gravado em pedidos.status que não esteja no mapa quebra o build.
  it("todo status escrito no código está mapeado", () => {
    const files = walk(join(process.cwd(), "src"));
    const desconhecidos = new Set<string>();
    for (const f of files) {
      if (f.includes("order-status")) continue;
      const src = readFileSync(f, "utf8");
      // só considera trechos que atualizam pedidos: `status: "x"` perto de pedidos
      if (!/from\("pedidos"\)|\.from\('pedidos'\)/.test(src)) continue;
      for (const m of src.matchAll(/status:\s*"([A-Za-z_]+)"/g)) {
        const v = m[1];
        if (!isKnownInternalStatus(v)) desconhecidos.add(`${v} (${f.split("/src/")[1]})`);
      }
    }
    expect([...desconhecidos]).toEqual([]);
  });
});
