import { createServerFn } from "@tanstack/react-start";


import type { InspectRow } from "@/lib/gsc-inspect.server";
export type { InspectRow };

export type InspectResult = {
  fetchedAt: string;
  site: string;
  rows: InspectRow[];
};


export const inspectAllRoutes = createServerFn({ method: "GET" }).handler(
  async (): Promise<InspectResult> => {
    const { GSC_ROUTES, GSC_SITE, inspectOne } = await import("@/lib/gsc-inspect.server");
    const rows = await Promise.all(GSC_ROUTES.map(inspectOne));
    return { fetchedAt: new Date().toISOString(), site: GSC_SITE, rows };
  },
);
