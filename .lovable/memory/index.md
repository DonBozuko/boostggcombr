# Memory: index.md
Updated: today

# Project Memory

## Core
Alertas Telegram/WhatsApp SEMPRE em português direto, sem jargão técnico (nada de "SLA", "ledger", "smoke test", "parqueado", "reconciliação"). Formato obrigatório: título claro + "PROBLEMA: ..." + "O QUE FAZER: ...". Bate o olho e entende.
Regra de ouro: só executo mudanças que melhorem resultado do negócio. Barro ideia rasa ou que quebre trava existente (v57 HUD, v168 margin guard, v171 manager) e proponho alternativa melhor.
NADA fake/dormindo em NENHUMA rota (`/`, `/admin`, checkout de redes, blog, status, diagnóstico, etc). Proibido: "em breve", "placeholder", botão disabled decorativo, texto mentindo sobre capacidade real. Todo card/botão/tela = 100% real e funcional. Rótulos como "⚠️ Em manutenção" só podem existir quando ligados a flag real do banco (`admin_settings.isBlocked()`), nunca hardcoded. Se não dá pra entregar de verdade agora, remove — não deixa fantasma.
Toda integração com fornecedor (SMMhype, SMMPainel, Verified, MP, TikTok, etc) deve ser SEMPRE: (1) catálogo/dados COMPLETOS sincronizados do provedor, nunca amostra hardcoded; (2) tabela atualizável em banco, não constante em código; (3) job automático (pg_cron diário mínimo) que mantém tudo fresco; (4) detector automático de variantes (BR/mundial, refill/sem, tiers de qty) que popula `service_id_matrix` sem intervenção manual. Se precisar preencher ID à mão, o sync está incompleto — arruma o sync, não o valor.

## Memories

