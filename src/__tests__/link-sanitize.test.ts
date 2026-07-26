import { describe, it, expect } from "vitest";
import { stripTrackers, normalizeInstagramUser } from "@/lib/smmhype.server";

describe("v272 — saneamento de link do cliente", () => {
  it("remove rastreadores do link copiado do app do Instagram", () => {
    expect(
      normalizeInstagramUser(
        "https://www.instagram.com/hstrader82?igsh=MXd0dXpzZTFpZjBtNg%3D%3D&utm_source=qr",
      ),
    ).toBe("https://instagram.com/hstrader82");
  });

  it("aceita @handle e handle puro", () => {
    expect(normalizeInstagramUser("@fabiano")).toBe("https://instagram.com/fabiano");
    expect(normalizeInstagramUser("fabiano")).toBe("https://instagram.com/fabiano");
  });

  it("preserva o id do vídeo mas tira utm", () => {
    expect(stripTrackers("https://www.youtube.com/watch?v=abc123&utm_source=qr")).toBe(
      "https://www.youtube.com/watch?v=abc123",
    );
  });
});
