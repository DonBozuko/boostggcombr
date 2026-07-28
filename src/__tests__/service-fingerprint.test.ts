import { describe, it, expect } from "vitest";
import { decideFingerprints, serviceSignature, fingerprintKey, type FingerprintRecord } from "@/lib/service-fingerprint";

const rec = (over: Partial<FingerprintRecord> = {}): FingerprintRecord => ({
  pacote: "ig-seg-1000",
  col: "smmhype_service_id",
  provider: "smmhype",
  service_id: "123",
  service_name: "Instagram Followers Brazil Real",
  name_sig: serviceSignature("Instagram Followers Brazil Real"),
  ...over,
});

describe("v312 assinatura do serviço", () => {
  it("ignora ruído de marketing do fornecedor", () => {
    expect(serviceSignature("Instagram Followers Brazil - FAST 2024 ⚡")).toBe(
      serviceSignature("instagram followers brasil (novo, super rápido)"),
    );
  });

  it("detecta troca de produto sob o mesmo nome de rede", () => {
    expect(serviceSignature("Instagram Followers BR")).not.toBe(serviceSignature("Instagram Likes BR"));
  });

  it("separa live de conteúdo normal", () => {
    expect(serviceSignature("Facebook Live Views")).not.toBe(serviceSignature("Facebook Views"));
  });
});

describe("v312 decisão de vínculo", () => {
  const link = {
    pacote: "ig-seg-1000",
    col: "smmhype_service_id",
    provider: "smmhype",
    service_id: "123",
    current_name: "Instagram Followers Brazil Real",
  };

  it("grava baseline na primeira vez sem desvincular", () => {
    const [d] = decideFingerprints([link], new Map());
    expect(d.action).toBe("baseline");
  });

  it("mantém ok quando o nome só mudou de marketing", () => {
    const stored = new Map([[fingerprintKey(link.pacote, link.col), rec()]]);
    const [d] = decideFingerprints([{ ...link, current_name: "Instagram Followers Brazil Real ⚡ FAST" }], stored);
    expect(d.action).toBe("ok");
  });

  it("acusa drift quando o fornecedor troca seguidores por curtidas no mesmo id", () => {
    const stored = new Map([[fingerprintKey(link.pacote, link.col), rec()]]);
    const [d] = decideFingerprints([{ ...link, current_name: "Instagram Likes Brazil" }], stored);
    expect(d.action).toBe("drift");
    if (d.action === "drift") expect(d.to).toBe("Instagram Likes Brazil");
  });

  it("re-baseline quando o id do vínculo mudou (outro serviço)", () => {
    const stored = new Map([[fingerprintKey(link.pacote, link.col), rec({ service_id: "999" })]]);
    const [d] = decideFingerprints([link], stored);
    expect(d.action).toBe("baseline");
  });

  it("não decide nada quando o serviço sumiu do cache", () => {
    const stored = new Map([[fingerprintKey(link.pacote, link.col), rec()]]);
    const [d] = decideFingerprints([{ ...link, current_name: null }], stored);
    expect(d.action).toBe("unknown");
  });
});

describe("v314 baseline desconfiado e renome cosmético", () => {
  const link = {
    pacote: "ig-view-1000",
    col: "smmhype_service_id",
    provider: "smmhype",
    service_id: "555",
    current_name: "Instagram Likes BR",
    category: "instagram:visualizacoes",
  };
  const matches = (cat: string | null | undefined, name: string) =>
    !(String(cat ?? "").includes("visualizacoes") && /like|curtid/i.test(name));

  it("vínculo novo que não bate com a categoria nasce suspeito, não normal", () => {
    const [d] = decideFingerprints([link], new Map(), matches);
    expect(d.action).toBe("suspect");
  });

  it("vínculo novo coerente vira baseline normal", () => {
    const [d] = decideFingerprints([{ ...link, current_name: "Instagram Views BR" }], new Map(), matches);
    expect(d.action).toBe("baseline");
  });

  it("nome novo com mesma intenção é renome, não desvincula", () => {
    const stored = new Map([
      [
        fingerprintKey(link.pacote, link.col),
        {
          pacote: link.pacote,
          col: link.col,
          provider: "smmhype",
          service_id: "555",
          service_name: "Instagram Views BR",
          name_sig: serviceSignature("Instagram Views BR"),
        } as FingerprintRecord,
      ],
    ]);
    const [d] = decideFingerprints(
      [{ ...link, current_name: "Instagram Views Brasil Premium ⚡ HQ" }],
      stored,
      matches,
    );
    expect(d.action).toBe("rename");
  });

  it("troca real de produto continua sendo drift", () => {
    const stored = new Map([
      [
        fingerprintKey(link.pacote, link.col),
        {
          pacote: link.pacote,
          col: link.col,
          provider: "smmhype",
          service_id: "555",
          service_name: "Instagram Views BR",
          name_sig: serviceSignature("Instagram Views BR"),
        } as FingerprintRecord,
      ],
    ]);
    const [d] = decideFingerprints([link], stored, matches);
    expect(d.action).toBe("drift");
  });
});
