#!/usr/bin/env node
// v398 — Auditor de Ponta a Ponta (Motor Anti-Alucinação, parte executável).
//
// Por que existe: eu (agente) não posso afirmar "está tudo certo" de memória.
// Este script lê o repositório inteiro, arquivo por arquivo, e devolve FATOS.
// Toda auditoria futura começa rodando `npm run audit` — nunca por opinião.
//
// Saída: .lovable/audit-report.md  (+ exit code 1 se houver defeito BLOQUEANTE)

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

/* ---------------------------------------------------------------- helpers */
function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === "ui") continue;
      walk(p, out);
    } else if ([".ts", ".tsx"].includes(extname(name))) {
      out.push(p);
    }
  }
  return out;
}

const files = walk(SRC).filter((f) => !f.endsWith("routeTree.gen.ts"));
const read = (f) => readFileSync(f, "utf8");
const rel = (f) => relative(ROOT, f);
const cache = new Map(files.map((f) => [f, read(f)]));

const findings = []; // { severity: 'bloqueante'|'atencao'|'nota', check, file, detail }
const add = (severity, check, file, detail) =>
  findings.push({ severity, check, file: file ? rel(file) : "-", detail });

const isRoute = (f) => f.includes("/routes/");
const isTest = (f) => f.includes("/__tests__/");
const isApi = (f) => f.includes("/routes/api/");

/* ---------------------------------------------- 1. Nada fake nas rotas */
const FAKE = [
  /\bem breve\b/i,
  /coming soon/i,
  /lorem ipsum/i,
  /placeholder de/i,
  /\bTODO\b/,
  /\bFIXME\b/,
  /em desenvolvimento/i,
];
for (const f of files) {
  if (isTest(f)) continue;
  const src = cache.get(f);
  src.split("\n").forEach((line, i) => {
    if (line.trim().startsWith("//") && !isRoute(f)) return; // comentário interno tolerado fora de rota
    for (const rx of FAKE) {
      if (rx.test(line)) {
        add(
          isRoute(f) && !isApi(f) ? "bloqueante" : "atencao",
          "nada-fake",
          f,
          `linha ${i + 1}: ${line.trim().slice(0, 120)}`,
        );
        break;
      }
    }
  });
}

/* ---------------------------------------------- 2. Metadados por rota */
const contentRoutes = files.filter(
  (f) =>
    isRoute(f) &&
    !isApi(f) &&
    !f.includes("__root") &&
    !f.includes("/lovable/") &&
    !f.endsWith(".ts"), // rotas de servidor puro (.ts) não têm head
);
for (const f of contentRoutes) {
  const src = cache.get(f);
  if (!/head\s*:\s*\(/.test(src)) {
    add("atencao", "seo-head", f, "rota de conteúdo sem head()");
    continue;
  }
  for (const needle of ["title", "description", "og:title", "og:description"]) {
    if (!src.includes(needle)) add("atencao", "seo-head", f, `head() sem ${needle}`);
  }
}

/* ---------------------------------------------- 3. Cor hardcoded na UI */
const COLOR = /className=["'`][^"'`]*(?:\btext-white\b|\bbg-black\b|\bbg-white\b|\[#[0-9a-fA-F]{3,8}\])/;
for (const f of files) {
  if (isTest(f) || (!isRoute(f) && !f.includes("/components/"))) continue;
  const src = cache.get(f);
  src.split("\n").forEach((line, i) => {
    if (COLOR.test(line)) add("nota", "cor-hardcoded", f, `linha ${i + 1}`);
  });
}

/* ---------------------------------------------- 4. console.log em produção */
for (const f of files) {
  if (isTest(f)) continue;
  const n = (cache.get(f).match(/console\.log\(/g) || []).length;
  if (n > 0) add("nota", "console-log", f, `${n} ocorrência(s)`);
}

/* ---------------------------------------------- 5. Arquivos órfãos */
const importedNames = new Set();
for (const f of files) {
  for (const m of cache.get(f).matchAll(/from\s+["']([^"']+)["']/g)) importedNames.add(m[1]);
  for (const m of cache.get(f).matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)) importedNames.add(m[1]);
}
const importedTails = new Set(
  [...importedNames].map((s) => s.replace(/^.*\//, "").replace(/\.(ts|tsx|js)$/, "")),
);
for (const f of files) {
  if (isTest(f) || isRoute(f)) continue;
  const base = f.replace(/^.*\//, "").replace(/\.(ts|tsx)$/, "");
  if (!importedTails.has(base)) add("atencao", "arquivo-orfao", f, "ninguém importa este arquivo");
}

/* ---------------------------------------------- 6. Modo Torre: arquivo gigante */
for (const f of files) {
  const n = cache.get(f).split("\n").length;
  if (n > 600 && !isTest(f)) add("nota", "arquivo-gigante", f, `${n} linhas (> 600)`);
}

/* ---------------------------------------------- 7. Dono único do preço */
for (const f of files) {
  if (isTest(f) || f.endsWith("price-authority.server.ts")) continue;
  const src = cache.get(f);
  if (/update\(\s*\{[^}]*price_brl/s.test(src) || /upsert\(\s*\{[^}]*price_brl/s.test(src)) {
    add("bloqueante", "preco-dono-unico", f, "escreve price_brl fora da Autoridade de Preço");
  }
}

/* ---------------------------------------------- 8. Segredo no código */
const SECRET = /(sk_live_|sb_secret_|APP_USR-[0-9]{6,}|-----BEGIN [A-Z ]*PRIVATE KEY)/;
for (const f of files) {
  const src = cache.get(f);
  if (SECRET.test(src)) add("bloqueante", "segredo-no-codigo", f, "possível credencial literal");
}

/* ---------------------------------------------- 9. Server fn: módulo fino */
for (const f of files) {
  if (!f.endsWith(".functions.ts") && !f.endsWith(".functions.tsx")) continue;
  const src = cache.get(f);
  const bad = src
    .split("\n")
    .map((l, i) => [l, i])
    .filter(
      ([l]) =>
        /^(export\s+)?(async\s+)?function\s/.test(l) ||
        /^(export\s+)?const\s+\w+\s*=\s*(?!createServerFn)/.test(l),
    )
    .filter(([l]) => !/^export\s+const\s+\w+\s*=\s*createServerFn/.test(l));
  for (const [l, i] of bad) {
    add("atencao", "serverfn-modulo-fino", f, `linha ${i + 1}: ${l.trim().slice(0, 100)}`);
  }
}

/* ---------------------------------------------- 10. Rota crítica sem teste */
const testBlob = files
  .filter(isTest)
  .map((f) => cache.get(f))
  .join("\n");
const CRITICOS = [
  "src/lib/price-authority.server.ts",
  "src/lib/margin-guardian.ts",
  "src/lib/dispatch-gates.ts",
  "src/lib/route-preflight.ts",
  "src/lib/target-preflight.ts",
  "src/lib/shelf-authority.ts",
  "src/lib/mp-signature.ts",
  "src/lib/cron-auth.server.ts",
  "src/lib/autonomy-ladder.ts",
];
for (const c of CRITICOS) {
  const base = c.replace(/^.*\//, "").replace(/\.(server\.)?ts$/, "");
  if (!testBlob.includes(base)) add("bloqueante", "critico-sem-teste", null, `${c} sem cobertura`);
}

/* ---------------------------------------------------------------- report */
const order = { bloqueante: 0, atencao: 1, nota: 2 };
findings.sort((a, b) => order[a.severity] - order[b.severity] || a.check.localeCompare(b.check));

const byCheck = {};
for (const f of findings) (byCheck[f.check] ||= []).push(f);

const counts = findings.reduce((acc, f) => ((acc[f.severity] = (acc[f.severity] || 0) + 1), acc), {});

let md = `# Auditoria de Ponta a Ponta\n\n`;
md += `Gerado por \`npm run audit\` — ${new Date().toISOString()}\n\n`;
md += `Arquivos lidos: ${files.length}\n\n`;
md += `| Gravidade | Qtd |\n|---|---|\n`;
for (const s of ["bloqueante", "atencao", "nota"]) md += `| ${s} | ${counts[s] || 0} |\n`;
md += `\n`;
for (const [check, list] of Object.entries(byCheck)) {
  md += `## ${check} (${list.length})\n\n`;
  for (const f of list.slice(0, 40)) md += `- **${f.severity}** \`${f.file}\` — ${f.detail}\n`;
  if (list.length > 40) md += `- … e mais ${list.length - 40}\n`;
  md += `\n`;
}

writeFileSync(join(ROOT, ".lovable/audit-report.md"), md);
console.log(md.split("\n").slice(0, 60).join("\n"));
console.log(`\nRelatório completo: .lovable/audit-report.md`);
process.exit((counts.bloqueante || 0) > 0 ? 1 : 0);
