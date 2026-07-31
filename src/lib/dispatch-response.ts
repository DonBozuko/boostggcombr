// v383 — Leitor único de resposta de fornecedor (SMM Panel v2).
//
// Causa raiz que este arquivo mata: cada dispatcher interpretava a resposta do
// fornecedor do seu jeito e só olhava `json.error`. Painéis SMM devolvem erro
// de VÁRIAS formas — e quase sempre com HTTP 200:
//   {"error":"Not enough funds"}          → erro clássico
//   {"errors":["incorrect service id"]}   → array
//   {"status":"error","msg":"..."}        → envelope diferente
//   {"order":0} / {"order":"error"}       → id inválido disfarçado de sucesso
//   "<html>...503..." (HTML puro)         → proxy/WAF na frente da API
// Qualquer um desses passando como sucesso = pedido marcado entregue sem
// entrega. Aqui existe UM interpretador, puro e testável.

export type ProviderReadResult =
  | { ok: true; orderId: string }
  | { ok: false; error: string };

/** order id aceitável: alfanumérico, não vazio, não "0", não palavra de erro. */
function isValidOrderId(raw: unknown): raw is string | number {
  if (raw == null) return false;
  const s = String(raw).trim();
  if (!s || s === "0" || s === "null" || s === "undefined" || s === "false") return false;
  if (/^(error|erro|fail|failed|invalid)$/i.test(s)) return false;
  return /^[A-Za-z0-9._:-]{1,64}$/.test(s);
}

function firstString(v: unknown): string | null {
  if (typeof v === "string" && v.trim()) return v.trim();
  if (typeof v === "number") return String(v);
  if (Array.isArray(v)) {
    for (const item of v) {
      const s = firstString(item);
      if (s) return s;
    }
    return null;
  }
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of ["message", "msg", "error", "detail", "description"]) {
      const s = firstString(o[k]);
      if (s) return s;
    }
  }
  return null;
}

/**
 * Interpreta o corpo BRUTO da resposta do fornecedor.
 * `httpStatus` só complementa: HTTP 200 com erro escondido é tratado como erro.
 */
export function interpretProviderResponse(rawText: string, httpStatus: number): ProviderReadResult {
  const text = String(rawText ?? "");
  let json: unknown = null;
  try { json = JSON.parse(text); } catch { /* corpo não-JSON */ }

  if (json == null || typeof json !== "object") {
    // Corpo não-JSON: HTML de WAF, texto de erro, corpo vazio.
    const snippet = text.replace(/\s+/g, " ").trim().slice(0, 200);
    return {
      ok: false,
      error: httpStatus >= 400
        ? `HTTP ${httpStatus}: ${snippet || "corpo vazio"}`
        : `resposta não-JSON do fornecedor: ${snippet || "corpo vazio"}`,
    };
  }

  const o = json as Record<string, unknown>;

  // Erro explícito em qualquer envelope conhecido.
  const explicit = firstString(o.error) ?? firstString(o.errors);
  if (explicit) return { ok: false, error: explicit };
  if (typeof o.status === "string" && /^(error|fail(ed)?)$/i.test(o.status.trim())) {
    return { ok: false, error: firstString(o.msg) ?? firstString(o.message) ?? `status ${o.status}` };
  }
  if (httpStatus >= 400) {
    return { ok: false, error: `HTTP ${httpStatus}: ${text.slice(0, 200)}` };
  }

  const order = o.order ?? o.order_id ?? o.orderId;
  if (!isValidOrderId(order)) {
    return {
      ok: false,
      error: order == null
        ? `resposta sem orderId (${text.slice(0, 200)})`
        : `orderId inválido do fornecedor: ${String(order).slice(0, 60)}`,
    };
  }

  return { ok: true, orderId: String(order).trim() };
}
