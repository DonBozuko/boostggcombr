import { describe, it, expect } from "vitest";
import {
  evaluateTarget,
  extractInstagramHandle,
  requiresProfileCheck,
} from "@/lib/target-preflight";

describe("v301 quando checar o perfil", () => {
  it("seguidores de instagram (p*) precisam de checagem", () => {
    expect(requiresProfileCheck("instagram", "p15k")).toBe(true);
    expect(requiresProfileCheck("instagram", "br-p500")).toBe(true);
  });

  it("curtidas/views apontam pra post — não checa perfil", () => {
    expect(requiresProfileCheck("instagram", "l500")).toBe(false);
    expect(requiresProfileCheck("instagram", "v1k")).toBe(false);
  });

  it("outras redes não usam essa checagem", () => {
    expect(requiresProfileCheck("tiktok", "tf500")).toBe(false);
    expect(requiresProfileCheck("youtube", "ys50")).toBe(false);
  });
});

describe("v301 extração do @", () => {
  it("limpa link do app com rastreadores", () => {
    expect(
      extractInstagramHandle("https://www.instagram.com/hstrader82?igsh=MXd0&utm_source=qr"),
    ).toBe("hstrader82");
  });

  it("aceita @handle puro", () => {
    expect(extractInstagramHandle("@Fabiano.Santiago")).toBe("fabiano.santiago");
  });

  it("recusa lixo", () => {
    expect(extractInstagramHandle("")).toBeNull();
    expect(extractInstagramHandle("https://facebook.com/")).toBeNull();
  });
});

describe("v301 veredito", () => {
  it("perfil inexistente bloqueia", () => {
    expect(evaluateTarget({ ok: false })).toEqual({ ok: false, code: "PROFILE_NOT_FOUND" });
  });

  it("perfil privado bloqueia (fornecedor recusa)", () => {
    expect(evaluateTarget({ ok: true, privado: true })).toEqual({
      ok: false,
      code: "PROFILE_PRIVATE",
    });
  });

  it("perfil público passa", () => {
    expect(evaluateTarget({ ok: true, privado: false })).toEqual({ ok: true });
  });
});
