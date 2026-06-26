# System Architecture — EliteBoost Prime

Árvore genealógica do ecossistema. **Isolamento estrito por rota.** Não misturar identidades visuais, ícones, textos ou IDs de serviço entre as vitrines públicas.

---

## 1. 👴 O AVÔ — `/admin`
**Arquivo:** `src/routes/admin.tsx`

Painel administrativo único e centralizado.

**Responsabilidades:**
- Saldo global do fornecedor SMMhype.
- Cron jobs e dispatcher de pedidos.
- Listagem de pedidos com filtros por `rede_social` (`instagram` | `tiktok`).
- Toggle de fornecedores ativos (apenas um ativo por vez).

**Proibido:** vender pacotes, expor checkout público, exibir branding de rede social no header.

---

## 2. 📸 O NETO DO INSTAGRAM — `/`
**Arquivo:** `src/routes/index.tsx`

Landing page pública **exclusivamente Instagram**.

**Identidade visual:**
- Fundo Dark.
- Acentos Dourado / Verde Canarinho.
- Logo oficial do Instagram (lucide `Instagram` ou SVG oficial).

**Catálogo (SMMhype service IDs):**
- Seguidores → `14325`
- Curtidas → `18860`
- Visualizações → `18855`

**Prefixo de pedido:** `i*` (ex.: `i100`, `i500`, `i1k`).
**Coluna `rede_social`:** `instagram`.

**Proibido:** qualquer referência visual ou textual a TikTok, ciano neon, rosa neon, ícone de música, palavra "TikTok".

---

## 3. 🎵 O NETO DO TIKTOK — `/tiktok`
**Arquivo:** `src/routes/tiktok.tsx`

Landing page pública **exclusivamente TikTok**, totalmente isolada da rota `/`.

**Identidade visual:**
- Fundo Grafite Ultra Escuro `#0a0a0a`.
- Acentos elétricos Ciano Neon `#00f2fe` + Rosa Neon `#fe0979` com glow.
- Logo oficial do TikTok (SVG inline `TikTokIcon`).

**Catálogo (SMMhype service IDs):**
- Seguidores → `14330`
- Curtidas → `19191`
- Visualizações → `14907`

**Prefixos de pedido:** `tf*` (followers), `tl*` (likes), `tv*` (views).
**Coluna `rede_social`:** `tiktok`.

**Proibido:** qualquer referência visual ou textual a Instagram, gradiente fuchsia/pink/orange clássico do IG, ícone `Instagram` do lucide, palavra "Instagram".

---

## 4. 📺 O NETO DO YOUTUBE — `/youtube`
**Arquivo:** `src/routes/youtube.tsx`

Landing page pública **exclusivamente YouTube**, totalmente isolada das demais rotas.

**Identidade visual:**
- Fundo Grafite Ultra Escuro `#0a0a0a`.
- Acentos Vermelho Puro Neon `#FF0000` com glow.
- Logo oficial do YouTube (SVG inline `YouTubeIcon`).

**Catálogo (SMMhype service IDs):**
- Inscritos → `14343`
- Visualizações → `997`

**Prefixos de pedido:** `ys*` (subscribers), `yv*` (views).
**Coluna `rede_social`:** `youtube`.

**Proibido:** qualquer referência visual ou textual a Instagram ou TikTok, ícones de outras redes, dourado/verde canarinho, ciano/rosa neon.

---

## Regras de isolamento (checklist antes de qualquer PR)

1. Editou `src/routes/index.tsx`? Não introduza ciano/rosa/vermelho neon nem ícones de TikTok/YouTube.
2. Editou `src/routes/tiktok.tsx`? Não introduza dourado/verde canarinho, vermelho YouTube ou ícones de Instagram/YouTube.
3. Editou `src/routes/youtube.tsx`? Não introduza identidades de Instagram ou TikTok.
4. Editou `src/routes/admin.tsx`? Não exiba branding de rede social no header — use ícones apenas como filtro/etiqueta de linha.
5. Novo pacote? Adicione em `src/lib/pedidos.functions.ts` (PRICE_TABLE) **e** mapeie o prefixo em `src/lib/smmhype.server.ts`.
6. Build deve passar com `bun run build` antes de publicar.
