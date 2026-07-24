// v243 — Verificação de assinatura do webhook Mercado Pago isolada e testável.
import { createHmac, timingSafeEqual } from "crypto";

export function verifyMpSignature(params: {
  signatureHeader: string | null;
  requestIdHeader: string | null;
  dataId: string | null;
  secret: string;
}): boolean {
  const { signatureHeader, requestIdHeader, dataId, secret } = params;
  if (!signatureHeader || !dataId || !secret) return false;
  const tsMatch = signatureHeader.match(/ts=([^,]+)/);
  const v1Match = signatureHeader.match(/v1=([a-f0-9]+)/i);
  if (!tsMatch || !v1Match) return false;
  const ts = tsMatch[1].trim();
  const provided = v1Match[1].trim().toLowerCase();
  const manifest = `id:${dataId};request-id:${requestIdHeader ?? ""};ts:${ts};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  if (expected.length !== provided.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(provided, "hex"));
  } catch {
    return false;
  }
}
