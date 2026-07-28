// v354 — MEDIDOR NO LUGAR DO PERCENTUAL.
//
// Por que existe: "o sistema está 80%" é chute, e chute não vale nada aqui.
// Este módulo é puro (sem banco, sem rede) e transforma linhas de `pedidos`
// em três números que não mentem:
//
//   1. Taxa de entrega SEM TOQUE HUMANO — quantos pedidos pagos foram
//      entregues sozinhos, sem clique no Telegram / botão no painel.
//   2. Tempo médio pago → entregue (mediana + média).
//   3. Estornos no período.
//
// Regra: o que não é medido não é declarado. Se a amostra for pequena,
// o próprio resultado diz `amostra` para ninguém confundir sorte com sistema.

/** Marcas gravadas em `error_detail` quando um humano (ou robô externo) empurrou o pedido. */
export const HUMAN_TOUCH_RE =
  /recarga manual|rob[ôo] externo confirmou|refund manual|aprova[çc][ãa]o humana|manualmente/i;

/** Marca gravada quando a própria fila (cron) reprocessou sozinha. */
export const AUTO_QUEUE_TAG = "v354 fila automática";

export type MaturityOrder = {
  status: string;
  created_at: string;
  dispatched_at?: string | null;
  last_reconciled_at?: string | null;
  error_detail?: string | null;
};

export const DELIVERED_STATUSES = new Set(["Enviado", "completed", "concluido", "concluído"]);
export const REFUNDED_STATUSES = new Set(["mp_refunded", "refunded"]);

/** Um humano precisou tocar neste pedido para ele andar? */
export function isHumanTouched(o: MaturityOrder): boolean {
  const d = String(o.error_detail ?? "");
  if (!d) return false;
  if (d.includes(AUTO_QUEUE_TAG)) return false;
  return HUMAN_TOUCH_RE.test(d);
}

export type MaturityMetrics = {
  /** Entregues sem nenhum toque humano / total entregue, em %. `null` = sem amostra. */
  autonomiaPct: number | null;
  entregues: number;
  entreguesSemToque: number;
  toquesHumanos: number;
  /** Minutos de pago (created_at) até entregue (last_reconciled_at). */
  pagoEntregueMedianaMin: number | null;
  pagoEntregueMediaMin: number | null;
  amostraTempo: number;
  estornos: number;
  windowDays: number;
};

function mediana(v: number[]): number | null {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function computeMaturity(rows: MaturityOrder[], windowDays = 30): MaturityMetrics {
  let entregues = 0;
  let semToque = 0;
  let toques = 0;
  let estornos = 0;
  const tempos: number[] = [];

  for (const r of rows) {
    const st = String(r.status ?? "");
    if (REFUNDED_STATUSES.has(st)) estornos++;
    if (!DELIVERED_STATUSES.has(st)) continue;

    entregues++;
    if (isHumanTouched(r)) toques++;
    else semToque++;

    const ini = new Date(String(r.created_at ?? "")).getTime();
    const fim = new Date(String(r.last_reconciled_at ?? r.dispatched_at ?? "")).getTime();
    if (Number.isFinite(ini) && Number.isFinite(fim) && fim > ini) {
      tempos.push((fim - ini) / 60_000);
    }
  }

  const med = mediana(tempos);
  const media = tempos.length ? tempos.reduce((a, b) => a + b, 0) / tempos.length : null;

  return {
    autonomiaPct: entregues > 0 ? Math.round((semToque / entregues) * 1000) / 10 : null,
    entregues,
    entreguesSemToque: semToque,
    toquesHumanos: toques,
    pagoEntregueMedianaMin: med != null ? Math.round(med) : null,
    pagoEntregueMediaMin: media != null ? Math.round(media) : null,
    amostraTempo: tempos.length,
    estornos,
    windowDays,
  };
}
