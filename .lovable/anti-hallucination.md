# Motor Anti-Alucinação (v398)

Objetivo: eu não posso "achar" que está certo. Nem refazer a mesma coisa duas
vezes. Antes de qualquer afirmação ou correção, este motor roda.

## 1. Medidor antes do remédio

Nenhuma auditoria começa por opinião. Começa por:

```
npm run audit
```

O script `scripts/audit.mjs` lê os 431 arquivos de `src/` e devolve fatos em
`.lovable/audit-report.md`. Ele checa, arquivo por arquivo:

| Checagem | O que impede |
|---|---|
| `nada-fake` | texto mentindo sobre capacidade real em rota de cliente |
| `seo-head` | página pública sem título/descrição/card social |
| `preco-dono-unico` | segundo motor gravando `price_brl` |
| `segredo-no-codigo` | credencial literal commitada |
| `critico-sem-teste` | módulo de dinheiro sem teste de regressão |
| `serverfn-modulo-fino` | helper solto em `.functions.ts` (quebra no build) |
| `arquivo-orfao` | lixo que ninguém importa |
| `arquivo-gigante` | violação do Modo Torre (> 600 linhas) |
| `cor-hardcoded` | UI fora do design system |
| `console-log` | ruído em produção |

Gravidades: **bloqueante** (derruba o build), **atencao** (entra em ciclo),
**nota** (dívida registrada, não urgente).

## 2. Alarme falso é defeito MEU, não do sistema

Se uma checagem aponta algo que não é problema real (ex.: exigir `og:image` de
página `noindex`, ou ler "TODO pedido" em português como `TODO:`), a correção é
**calibrar o medidor** — nunca inventar trabalho para apagar o número.
Medidor barulhento é medidor que se aprende a ignorar.

## 3. Consertar antes de medir

Toda varredura que julga preço/margem roda a Autoridade de Preço primeiro
(v396/v397). Medir estado velho gera alerta vencido — e alerta vencido é a
principal fonte de retrabalho.

## 4. Bug vira invariante, uma vez só

Toda correção nasce com teste em `src/__tests__/`. Se o mesmo sintoma volta
duas vezes, para de tratar sintoma: refaz o mecanismo (regra 2x causa raiz).

## 5. Ordem fixa de execução

Banco → serviço → rota → UI → teste → alerta. Nunca começar pela UI.

## 6. Encerramento de ciclo

Um ciclo só fecha com: `npm run audit` sem bloqueante + `tsgo` limpo +
`vitest run` verde + varredura de órfãos.
