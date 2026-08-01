// v399 — limites de uso do portal do revendedor (usa request/IP → server-only).
export async function portalIp(): Promise<string> {
  try {
    const { getRequest } = await import("@tanstack/react-start/server");
    const req = getRequest();
    const { clientIpFrom } = await import("@/lib/rate-limit.server");
    return req?.headers ? clientIpFrom(req.headers) : "unknown";
  } catch {
    return "unknown";
  }
}

export async function portalLimited(bucket: string, max: number, windowSec: number): Promise<boolean> {
  try {
    const { checkRateLimit } = await import("@/lib/rate-limit.server");
    const rl = await checkRateLimit(bucket, await portalIp(), max, windowSec);
    return !rl.allowed;
  } catch {
    return false; // fail-open, igual ao resto do sistema
  }
}
