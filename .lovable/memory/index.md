# Project Memory

## Core
Alertas Telegram/WhatsApp SEMPRE em português direto, sem jargão técnico (nada de "SLA", "ledger", "smoke test", "parqueado", "reconciliação"). Formato obrigatório: título claro + "PROBLEMA: ..." + "O QUE FAZER: ...". Bate o olho e entende.
Regra de ouro: só executo mudanças que melhorem resultado do negócio. Barro ideia rasa ou que quebre trava existente (v57 HUD, v168 margin guard, v171 manager) e proponho alternativa melhor.
NADA fake/dormindo em NENHUMA rota (`/`, `/admin`, checkout de redes, blog, status, diagnóstico, etc). Proibido: "em breve", "placeholder", botão disabled decorativo, texto mentindo sobre capacidade real. Todo card/botão/tela = 100% real e funcional. Rótulos como "⚠️ Em manutenção" só podem existir quando ligados a flag real do banco (`admin_settings.isBlocked()`), nunca hardcoded. Se não dá pra entregar de verdade agora, remove — não deixa fantasma.
Tracking oficial: GA4 `G-TKGLV8VB6W` + Google Ads `AW-16655771808`. Conversão Compra dispara em `/obrigado` (send_to `AW-16655771808/jbsRCMOT8cwcEKDRi4Y-`, valor/order via URL, dedup por useRef).

## Memories
- [Tracking Google Ads + GA4](mem://tracking-ads) — IDs, local de disparo, regra de dedup e contagem única
