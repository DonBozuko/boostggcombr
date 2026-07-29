import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  achadosNaoConvergentes,
  mensagemNaoConvergencia,
  CICLOS_PARA_DEFEITO,
} from "@/lib/convergence";
import { respectsMinMargin } from "@/lib/margin-guardian";

const ciclo = (runId: string, assinaturas: string[]) => ({ runId, assinaturas });

describe("v334 — detector de não-convergência", () => {
  it("acusa achado idêntico repetido na janela cheia", () => {
    const ciclos = Array.from({ length: CICLOS_PARA_DEFEITO }, (_, i) =>
      ciclo(`r${i}`, ["p500k|margem", `outro${i}|saldo`]),
    );
    const r = achadosNaoConvergentes(ciclos);
    expect(r.map((x) => x.assinatura)).toEqual(["p500k|margem"]);
  });

  it("não acusa quando o achado sumiu em algum ciclo (está andando)", () => {
    const ciclos = Array.from({ length: CICLOS_PARA_DEFEITO }, (_, i) =>
      ciclo(`r${i}`, i === 2 ? [] : ["p500k|margem"]),
    );
    expect(achadosNaoConvergentes(ciclos)).toEqual([]);
  });

  it("não acusa sem histórico suficiente", () => {
    const ciclos = [ciclo("a", ["x|margem"]), ciclo("b", ["x|margem"])];
    expect(achadosNaoConvergentes(ciclos)).toEqual([]);
  });

  it("mensagem sai em português, sem jargão, com PROBLEMA e O QUE FAZER", () => {
    const msg = mensagemNaoConvergencia([{ assinatura: "p500k|margem", ciclos: 6 }])!;
    expect(msg).toContain("PROBLEMA:");
    expect(msg).toContain("O QUE FAZER:");
    expect(msg).not.toMatch(/SLA|ledger|smoke|parqueado/i);
  });

  it("v355 — saldo repetido NUNCA vira defeito nosso (regra v350/v352)", () => {
    const ciclos = Array.from({ length: CICLOS_PARA_DEFEITO }, (_, i) =>
      ciclo(`r${i}`, ["ff100k|saldo", "kv250k|saldo", "tv1m|saldo"]),
    );
    expect(achadosNaoConvergentes(ciclos)).toEqual([]);
  });

  it("v355 — defeito real continua acusado mesmo com saldo no meio", () => {
    const ciclos = Array.from({ length: CICLOS_PARA_DEFEITO }, (_, i) =>
      ciclo(`r${i}`, ["ff100k|saldo", "p500k|margem"]),
    );
    expect(achadosNaoConvergentes(ciclos).map((x) => x.assinatura)).toEqual(["p500k|margem"]);
  });

  it("sem itens, não gera alarme", () => {
    expect(mensagemNaoConvergencia([])).toBeNull();
  });
});

describe("v334 — margem tem dono único", () => {
  it("pacote de custo alto com markup 2,4x é saudável (não é prejuízo)", () => {
    // p500k real: custo R$ 963,50 / preço R$ 2.369,84
    expect(respectsMinMargin(2369.84, 963.5)).toBe(true);
    // yv1m real: custo R$ 3.207,90 / preço R$ 7.825,14
    expect(respectsMinMargin(7825.14, 3207.897)).toBe(true);
  });

  it("prejuízo real continua reprovado", () => {
    expect(respectsMinMargin(1000, 963.5)).toBe(false);
  });

  it("nenhum módulo define limiar de margem próprio fora do margin-guardian", () => {
    const raiz = path.resolve(__dirname, "..");
    const proibido =
      /(MIN_MARGIN\s*=|margem\s*<\s*0\.\d|cost\s*\*\s*2\.9|price\s*<\s*cost\s*\*)/;
    const ofensores: string[] = [];

    const varrer = (dir: string) => {
      for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          if (ent.name === "__tests__" || ent.name === "node_modules") continue;
          varrer(full);
          continue;
        }
        if (!/\.(ts|tsx)$/.test(ent.name)) continue;
        if (full.endsWith(path.join("lib", "margin-guardian.ts"))) continue;
        const src = fs.readFileSync(full, "utf8");
        for (const linha of src.split("\n")) {
          if (linha.trim().startsWith("//")) continue;
          if (proibido.test(linha)) ofensores.push(`${full}: ${linha.trim()}`);
        }
      }
    };
    varrer(raiz);

    expect(ofensores).toEqual([]);
  });
});
