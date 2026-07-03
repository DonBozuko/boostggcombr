import { createServerFn } from "@tanstack/react-start";

const SITE = "https://eliteboostprime.lovable.app/";
const ROUTES = ["/", "/tiktok", "/youtube", "/facebook", "/telegram", "/trafego"];

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

export type InspectResult = {
  fetchedAt: string;
  site: string;
  rows: InspectRow[];
};

async function inspectOne(path: string): Promise<InspectRow> {
  const url = `https://eliteboostprime.lovable.app${path}`;
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
        body: JSON.stringify({ inspectionUrl: url, siteUrl: SITE }),
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

export const inspectAllRoutes = createServerFn({ method: "GET" }).handler(
  async (): Promise<InspectResult> => {
    const rows = await Promise.all(ROUTES.map(inspectOne));
    return { fetchedAt: new Date().toISOString(), site: SITE, rows };
  },
);
