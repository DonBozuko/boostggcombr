// v380 — Badge incorporável (ativo de link).
//
// Qualquer site pode colar um <iframe> com a contagem ao vivo de um perfil.
// O snippet que entregamos vem sempre acompanhado de um link normal (<a>) para
// a ferramenta — é ele que gera autoridade; o iframe é só o visual.
//
// Regra da casa: se não conseguirmos ler o número real, o badge diz isso.
// Nada de número inventado.

import { createFileRoute } from "@tanstack/react-router";
import { parseInscritos } from "@/lib/contador-inscritos.functions";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

const SITE = "https://www.boostgg.com.br";

function esc(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function html(body: string) {
  return new Response(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
:root{color-scheme:dark}
*{box-sizing:border-box;margin:0}
body{font:14px/1.3 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#0b0b12;color:#f5f5ff}
a.card{display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid #2a2a3c;border-radius:14px;text-decoration:none;color:inherit;background:linear-gradient(135deg,#12121c,#0b0b12)}
img{width:44px;height:44px;border-radius:50%;object-fit:cover;background:#1b1b28}
.n{font-weight:700;font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:170px}
.c{font-weight:800;font-size:20px;color:#a78bfa}
.l{font-size:11px;opacity:.6}
</style></head><body>${body}</body></html>`,
    {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=600, s-maxage=600",
        "x-robots-tag": "noindex",
      },
    },
  );
}

function card(opts: { href: string; avatar: string; nome: string; contagem: string; rotulo: string }) {
  return html(
    `<a class="card" href="${esc(opts.href)}" target="_blank" rel="noopener">
      ${opts.avatar ? `<img src="${esc(opts.avatar)}" alt="">` : `<img alt="">`}
      <div>
        <div class="n">${esc(opts.nome)}</div>
        <div class="c">${esc(opts.contagem)}</div>
        <div class="l">${esc(opts.rotulo)} · BoostGG</div>
      </div>
    </a>`,
  );
}

function erro(msg: string) {
  return html(`<a class="card" href="${SITE}/ferramentas" target="_blank" rel="noopener">
    <div><div class="n">Não deu para ler agora</div><div class="l">${esc(msg)} · BoostGG</div></div></a>`);
}

async function youtube(canal: string) {
  const res = await fetch(`https://www.youtube.com/@${encodeURIComponent(canal)}`, {
    headers: { "User-Agent": UA, "Accept-Language": "pt-BR,pt;q=0.9" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return erro("canal não encontrado");
  const h = await res.text();
  const sub = h.match(/"subscriberCountText":\{"simpleText":"([^"]+)"/)?.[1] ?? null;
  const nome = h.match(/"title":"([^"]+)","description"/)?.[1] ?? canal;
  const avatar = h.match(/"avatar":\{"thumbnails":\[\{"url":"([^"]+)"/)?.[1] ?? "";
  if (!sub) return erro("o canal não mostra a contagem");
  const n = parseInscritos(sub);
  return card({
    href: `${SITE}/ferramentas/contador-inscritos-youtube?ref=badge`,
    avatar,
    nome,
    contagem: n ? `${n.toLocaleString("pt-BR")} inscritos` : sub,
    rotulo: "Contador de inscritos",
  });
}

async function instagram(user: string) {
  const res = await fetch(
    `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(user)}`,
    {
      headers: {
        "x-ig-app-id": "936619743392459",
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
        Accept: "*/*",
      },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!res.ok) return erro("perfil não encontrado");
  const j = (await res.json()) as {
    data?: { user?: { full_name?: string; profile_pic_url?: string; edge_followed_by?: { count?: number } } };
  };
  const u = j?.data?.user;
  if (!u) return erro("perfil não encontrado");
  return card({
    href: `${SITE}/ferramentas/contador-seguidores?ref=badge`,
    avatar: u.profile_pic_url ?? "",
    nome: u.full_name || `@${user}`,
    contagem: `${(u.edge_followed_by?.count ?? 0).toLocaleString("pt-BR")} seguidores`,
    rotulo: "Contador de seguidores",
  });
}

export const Route = createFileRoute("/api/public/badge")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const tipo = url.searchParams.get("tipo") === "yt" ? "yt" : "ig";
        const alvo = (url.searchParams.get("alvo") ?? "").trim().replace(/^@/, "").slice(0, 80);
        if (!/^[A-Za-z0-9._-]+$/.test(alvo)) return erro("informe um perfil válido");
        try {
          return tipo === "yt" ? await youtube(alvo) : await instagram(alvo.toLowerCase());
        } catch (e) {
          console.error("[badge] erro:", e);
          return erro("tente de novo em instantes");
        }
      },
    },
  },
});
