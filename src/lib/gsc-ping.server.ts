/**
 * v601 — GSC Freshness Ping.
 * Notifica o Google sobre atualizações no sitemap para acelerar indexação.
 */
export async function pingGoogleSitemap() {
  const sitemapUrl = "https://boostgg.com.br/sitemap.xml";
  try {
    const res = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    console.log("[v601] GSC Ping enviado com sucesso.");
    return true;
  } catch (err) {
    console.warn("[v601] Falha ao enviar ping GSC (não crítico):", err);
    return false;
  }
}
