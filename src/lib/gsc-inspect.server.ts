// v399 — inspeção de URL no Google Search Console (chama API externa → server-only).
export const GSC_SITE = "https://boostgg.com.br/";
export const GSC_ROUTES = ["/", "/tiktok", "/youtube", "/facebook", "/telegram", "/trafego"];

export type InspectRow = {
  path: string;
  url: string;
  verdict?: string;
  coverageState?: string;
  indexingState?: string;
  robotsTxtState?: string;
  pageFetchState?: string;
  lastCrawlTime?: string;
  mobileVerdict?: string;
  richResultsVerdict?: string;
  error?: string;
};

export async function inspectOne(path: string): Promise<InspectRow> {
  const url = `https://boostgg.com.br${path}`;
  try {
    const res = await fetch(
      "https://connector-gateway.lovable.dev/google_search_console/v1/urlInspection/index:inspect",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": process.env.GOOGLE_SEARCH_CONSOLE_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ inspectionUrl: url, siteUrl: GSC_SITE }),
        signal: AbortSignal.timeout(20_000),
      },
    );
    if (!res.ok) {
      return { path, url, error: `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` };
    }
    const json: any = await res.json();
    const r = json?.inspectionResult ?? {};
    const idx = r.indexStatusResult ?? {};
    return {
      path,
      url,
      verdict: idx.verdict,
      coverageState: idx.coverageState,
      indexingState: idx.indexingState,
      robotsTxtState: idx.robotsTxtState,
      pageFetchState: idx.pageFetchState,
      lastCrawlTime: idx.lastCrawlTime,
      mobileVerdict: r.mobileUsabilityResult?.verdict,
      richResultsVerdict: r.richResultsResult?.verdict,
    };
  } catch (e: any) {
    return { path, url, error: e?.message ?? "unknown error" };
  }
}
