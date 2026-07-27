import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PendenciasDigest, PendenciaManual } from "@/lib/pendencias.server";

export type { PendenciasDigest, PendenciaManual };

export const getPendenciasManuais = createServerFn({ method: "POST" })
  .inputValidator((input: { token: string }) => z.object({ token: z.string().min(8) }).parse(input))
  .handler(async ({ data }): Promise<PendenciasDigest> => {
    if (!process.env.ADMIN_TOKEN || data.token !== process.env.ADMIN_TOKEN) {
      return { pendencias: [], robosAtivos: 0, geradoEm: new Date().toISOString() };
    }
    const { collectPendencias } = await import("@/lib/pendencias.server");
    return collectPendencias();
  });
