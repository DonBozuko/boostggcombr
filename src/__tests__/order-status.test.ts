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
    expect(toCanonicalStatus("mp_expired")).toBe("CANCELADO");
    expect(toCanonicalStatus("mp_rejected_insufficient")).toBe("CANCELADO");
    expect(toCanonicalStatus("mp_charged_back")).toBe("CANCELADO");
    expect(toCanonicalStatus("mp_refunded")).toBe("CANCELADO");
    expect(toCanonicalStatus("SMM_FAILED")).toBe("ERRO");
  });

  it("todo estado final produzido pelo pagamento está no mapa", () => {
    for (const status of [
      "mp_authorized",
      "mp_rejected",
      "mp_rejected_insufficient",
      "mp_cancelled",
      "mp_refunded",
      "mp_charged_back",
      "mp_expired",
      "mp_unknown",
    ]) {
      expect(isKnownInternalStatus(status), status).toBe(true);
    }
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
  it("todo status escrito na tabela de pedidos está mapeado", () => {
    const files = walk(join(process.cwd(), "src"));
    const desconhecidos = new Set<string>();
    for (const f of files) {
      if (f.includes("order-status")) continue;
      const linhas = readFileSync(f, "utf8").split("\n");
      // só olha os 20 linhas seguintes a um .from("pedidos") — evita confundir
      // com status de outras tabelas (alerts, fila de recuperação, fornecedores).
      let janela = 0;
      for (const l of linhas) {
        if (/\.from\(["']pedidos["']\)/.test(l)) janela = 20;
        // outra tabela dentro da janela encerra o escopo de "pedidos":
        // update em pix_recovery_queue não é status de pedido.
        else if (/\.from\(["'][a-z_]+["']\)/.test(l)) janela = 0;
        else if (janela > 0) janela -= 1;
        if (janela === 0) continue;
        const m = l.match(/status:\s*"([A-Za-z_]+)"/);
        if (m && !isKnownInternalStatus(m[1])) {
          desconhecidos.add(`${m[1]} (${f.split("/src/")[1]})`);
        }
      }
    }
    expect([...desconhecidos]).toEqual([]);
  });
});

