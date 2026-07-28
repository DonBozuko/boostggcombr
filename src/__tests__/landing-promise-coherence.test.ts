// v338 — Trava de promessa nas landings de SEO.
//
// Causa raiz: o detector de promessa (v331) só lia FAQ e depoimentos das 7
// rotas de rede. As landings de SEO têm copy própria e ficaram sem medição —
// foi lá que sobreviveu "garantia de 30 dias nos pacotes brasileiros" numa
// página de YouTube, cuja linha é 100% Global e sem reposição garantida.
//
// Este teste varre o código-fonte das rotas com o MESMO detector do runtime.
// Fatos usados: redes que hoje têm linha BR com reposição confirmada.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { checkPromiseCoherence } from "@/lib/promise-coherence";
import { redeDaRota, textosDeCopy } from "@/services/promise-coherence.server";

// Espelho do catálogo (pricing_items). O runtime confere contra o banco a cada
// auditoria; aqui trava a regressão de copy no build.
const FATOS: Record<string, { hasBr: boolean; hasRefill: boolean }> = {
  instagram: { hasBr: true, hasRefill: true },
  tiktok: { hasBr: true, hasRefill: true },
  youtube: { hasBr: false, hasRefill: false },
  kwai: { hasBr: false, hasRefill: false },
  facebook: { hasBr: false, hasRefill: false },
  telegram: { hasBr: false, hasRefill: false },
  trafego: { hasBr: false, hasRefill: false },
};

const DIR = join(process.cwd(), "src/routes");

describe("copy das rotas não promete o que a rede não entrega", () => {
  for (const arquivo of readdirSync(DIR).filter((f) => f.endsWith(".tsx"))) {
    const rede = redeDaRota(arquivo);
    if (!rede || !FATOS[rede]) continue;

    it(`${arquivo} (${rede})`, () => {
      const fonte = readFileSync(join(DIR, arquivo), "utf8");
      const violacoes = checkPromiseCoherence({
        network: rede,
        facts: FATOS[rede],
        textos: textosDeCopy(fonte).map((texto) => ({ origem: arquivo, texto })),
      });
      expect(violacoes.map((v) => `${v.kind}: ${v.trecho}`)).toEqual([]);
    });
  }
});

describe("detector pega as duas ordens da promessa de reposição", () => {
  const semRefill = { hasBr: false, hasRefill: false };
  const casos = [
    "Sim, 30 dias de reposição em caso de queda.",
    "Garantia de 30 dias nos pacotes.",
    "Reposição automática em caso de queda.",
    "Reposição garantida por 30 dias.",
  ];
  for (const texto of casos) {
    it(`acusa: ${texto}`, () => {
      const v = checkPromiseCoherence({ network: "youtube", facts: semRefill, textos: [{ origem: "t", texto }] });
      expect(v.length).toBeGreaterThan(0);
    });
  }

  it("não acusa negativa honesta", () => {
    const v = checkPromiseCoherence({
      network: "youtube",
      facts: semRefill,
      textos: [{ origem: "t", texto: "A linha de YouTube é Global e hoje não tem reposição garantida." }],
    });
    expect(v).toEqual([]);
  });

  it("não acusa frase que atribui a linha BR a outra rede", () => {
    const v = checkPromiseCoherence({
      network: "kwai",
      facts: semRefill,
      textos: [{ origem: "t", texto: "Linha 🇧🇷 Brasileiro Real existe em Instagram e TikTok." }],
    });
    expect(v).toEqual([]);
  });
});
