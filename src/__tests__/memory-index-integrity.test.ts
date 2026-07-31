// v394 — INVARIANTE: a memória do projeto não pode apodrecer.
//
// Causa raiz do achado desta auditoria: o índice apontava uma regra ("dupla
// leitura de custo") para o arquivo errado, um arquivo de regra existia sem
// nenhum link no índice e várias linhas do Core viraram parágrafos. Memória
// quebrada = regra que deixa de ser aplicada sem ninguém perceber.
//
// Esta trava vigia o próprio sistema de memória, igual às outras invariantes.
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(process.cwd(), ".lovable", "memory");
const INDEX = join(ROOT, "index.md");

function memoryFiles(): string[] {
  const out: string[] = [];
  for (const dir of ["constraints", "features", "preferences"]) {
    const p = join(ROOT, dir);
    if (!existsSync(p)) continue;
    for (const f of readdirSync(p)) {
      if (f.endsWith(".md")) out.push(`${dir}/${f.replace(/\.md$/, "")}`);
    }
  }
  return out.sort();
}

const index = readFileSync(INDEX, "utf8");
const links = [...index.matchAll(/mem:\/\/([a-z0-9/~-]+)/g)].map((m) => m[1]);

describe("v394 — integridade da memória do projeto", () => {
  it("nenhum link do índice aponta para arquivo inexistente", () => {
    const quebrados = links.filter((l) => !existsSync(join(ROOT, `${l}.md`)));
    expect(quebrados).toEqual([]);
  });

  it("nenhuma regra fica órfã (todo arquivo é citado no índice)", () => {
    const orfaos = memoryFiles().filter((f) => !links.includes(f));
    expect(orfaos).toEqual([]);
  });

  it("nenhum link duplicado apontando para o mesmo arquivo com nomes diferentes", () => {
    const vistos = new Map<string, number>();
    for (const l of links) vistos.set(l, (vistos.get(l) ?? 0) + 1);
    expect([...vistos.entries()].filter(([, n]) => n > 1).map(([k]) => k)).toEqual([]);
  });

  it("linhas do Core são one-liners (≤ 260 caracteres)", () => {
    const core = index.split("## Core")[1]?.split("## Memories")[0] ?? "";
    const longas = core
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 260);
    expect(longas).toEqual([]);
  });

  it("todo arquivo de memória tem frontmatter name/description/type válido", () => {
    const ruins: string[] = [];
    for (const f of memoryFiles()) {
      const txt = readFileSync(join(ROOT, `${f}.md`), "utf8");
      const fm = txt.startsWith("---") ? txt.split("---")[1] ?? "" : "";
      const okTipo = /type:\s*(design|constraint|preference|feature|reference)\b/.test(fm);
      if (!/name:\s*\S/.test(fm) || !/description:\s*\S/.test(fm) || !okTipo) ruins.push(f);
    }
    expect(ruins).toEqual([]);
  });
});
