---
name: Saldo nunca tira pacote da vitrine
description: v350 — falta de saldo em fornecedor é aviso (amarelo, chega no celular na hora), nunca motivo de pausar pacote ou pintar vermelho. Só catálogo/fornecedor e margem negativa pausam.
type: constraint
---
Regra permanente (v350), substitui a v345 (que pausava depois de 24h):

1. **Saldo NUNCA pausa pacote.** Nem pacote pequeno, nem gigante, nem depois
   de 24h. O dono repõe saldo a qualquer hora e existe prazo de entrega ao
   cliente. Esconder pacote por saldo é perder venda por um problema que se
   resolve com um Pix.
2. **Saldo NUNCA é vermelho.** Severidade amarela, mas com `force: true` (v346)
   para chegar no celular na hora.
3. **Pausa só por falha real de entrega:** estrutural (sem fornecedor / sem ID
   no catálogo) → na hora; margem negativa persistente (3 ciclos / 6h) → pausa.
4. **Pausa antiga por saldo é liberada sozinha** na varredura seguinte.
5. A proteção contra cobrar sem entregar continua no checkout
   (`route-preflight`): sem rota viável na hora, não gera Pix. É lá que a
   trava de saldo vale, não na vitrine.

Invariante automatizada: `src/__tests__/saldo-nao-pausa.test.ts`.
