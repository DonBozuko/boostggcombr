---
name: Nada fake em nenhuma rota
description: Proibido placeholder, "em breve", botão decorativo ou texto que mente sobre capacidade real — em qualquer rota, inclusive admin.
type: constraint
---
Vale para TODAS as rotas: `/`, `/admin`, checkouts de rede, blog, `/status`,
`/diagnostico`, ferramentas, painéis de revenda e afiliado.

**Proibido:**
- "em breve", "em desenvolvimento", placeholder, lorem
- botão desabilitado só de enfeite
- número, prazo ou capacidade que o sistema não consegue provar
- aba/seção que abre vazia

**Permitido só com lastro real:** rótulos como "⚠️ Em manutenção" quando ligados a
flag real do banco (`admin_settings` / `isBlocked()`), nunca hardcoded.

**Se não dá para entregar de verdade agora, remove.** Fantasma na tela é pior que
funcionalidade ausente: ele quebra a confiança em tudo que está do lado.
