// v642 — INVARIANTE: linha brasileira não pode cair em silêncio.
// Contexto real: os 7 pacotes `br-p*` ficaram dias fora da vitrine porque o
// vínculo apontava para um serviço global sem reposição. Ninguém foi avisado.
// É a linha de maior margem — sumiço dela é dinheiro parado.

import { describe, expect, it, vi, beforeEach } from "vitest";

const dispatch = vi.fn(async () => ({ ok: true }));

vi.mock("@/lib/whatsapp-alert.server", () => ({ dispatchWhatsappAlert: dispatch }));
vi.mock("../lib/whatsapp-alert.server", () => ({ dispatchWhatsappAlert: dispatch }));
vi.mock("./whatsapp-alert.server", () => ({ dispatchWhatsappAlert: dispatch }));

import { notificarVitrineBr } from "@/lib/shelf-authority.server";

const vazio = { avaliados: 0, pausados: [] as string[], religados: [] as string[], errors: 0 };

describe("v642 — veto em pacote BR avisa o dono", () => {
  beforeEach(() => dispatch.mockClear());

  it("avisa quando pacote brasileiro sai da vitrine, com o motivo", async () => {
    await notificarVitrineBr(
      { ...vazio, pausados: ["br-p1k"] },
      [{ pacote: "br-p1k", source: "bench", motivo: "nenhum fornecedor habilitado", expires_at: "" }],
    );

    expect(dispatch).toHaveBeenCalledTimes(1);
    const [msg, opts] = dispatch.mock.calls[0] as unknown as [string, any];
    expect(msg).toContain("br-p1k");
    expect(msg).toContain("nenhum fornecedor habilitado");
    expect(opts.severity).toBe("critical");
  });

  it("não dispara nada quando só pacote global cai", async () => {
    await notificarVitrineBr({ ...vazio, pausados: ["p1k", "l500"] }, []);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("silencioso quando não houve mudança de estado", async () => {
    await notificarVitrineBr({ ...vazio }, []);
    expect(dispatch).not.toHaveBeenCalled();
  });

  it("avisa como informativo quando a linha BR volta sozinha", async () => {
    await notificarVitrineBr({ ...vazio, religados: ["br-p1k", "br-p500"] }, []);
    expect(dispatch).toHaveBeenCalledTimes(1);
    const [msg, opts] = dispatch.mock.calls[0] as unknown as [string, any];
    expect(msg).toContain("br-p500");
    expect(opts.severity).toBe("info");
  });
});
