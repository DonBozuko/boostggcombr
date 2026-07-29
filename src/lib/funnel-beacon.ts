// v363 — MEDIDOR DE FUNIL REAL.
//
// Causa: entre "visitou" e "Pix gerado" o sistema era cego. 1.898 visitas na
// home em 14 dias e quase nenhum registro intermediário: não dava para saber
// se o cliente desistia no preço, no @, no formulário ou no Pix.
//
// Este beacon marca cada etapa. Não bloqueia nada, nunca quebra a página.

export type FunnelStep =
  | "abriu_vitrine"
  | "escolheu_pacote"
  | "preencheu_perfil"
  | "enviou_formulario"
  | "pix_gerado"
  | "pix_falhou"
  | "pix_copiado"
  | "pagou";

type Extra = {
  plan_id?: string | null;
  categoria?: string | null;
  valor?: number | null;
  detail?: string | null;
};

const enviados = new Set<string>();

/** Registra uma etapa do funil. Silencioso e à prova de falha. */
export function trackFunnel(step: FunnelStep, extra: Extra = {}): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem("ebp_optout") === "1") return;

    // Uma etapa por sessão+pacote: evita inflar o funil com repetição de clique.
    const chave = `${step}:${extra.plan_id ?? ""}`;
    if (enviados.has(chave)) return;
    enviados.add(chave);

    const payload = JSON.stringify({
      step,
      session_id: sessionStorage.getItem("ebp_sid"),
      device_id: localStorage.getItem("ebp_did"),
      plan_id: extra.plan_id ?? null,
      categoria: extra.categoria ?? null,
      valor: typeof extra.valor === "number" ? extra.valor : null,
      path: window.location.pathname.slice(0, 300),
      detail: extra.detail ? String(extra.detail).slice(0, 300) : null,
    });

    const url = "/api/public/funnel";
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon && navigator.sendBeacon(url, blob)) return;
    fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  } catch {
    // medidor nunca atrapalha a venda
  }
}
