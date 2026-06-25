# Jarvis FX (textura metalizada)

Drop-in dos 4 mp3 fixos (sem rename):

- `jarvis-welcome.mp3`   — inicialização do painel (toggle Som ON)
- `jarvis-optimized.mp3` — botão master ⚡ "Aprovar Divergências" OK
- `jarvis-warning.mp3`   — carrinho abandonado entra no painel (laranja)
- `jarvis-critical.mp3`  — saldo do fornecedor < R$ 50

Fluxo é tolerante: se o arquivo não existir, o `play()` falha em silêncio
e nenhuma outra trava do `/admin` é afetada (modo Read-Only preservado).
