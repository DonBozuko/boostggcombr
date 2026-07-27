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

  // v303 — o botão Compartilhar do YouTube cola `?si=` e `?feature=`.
  // Antes só o dispatcher de fallback removia isso; o SMMhype mandava sujo
  // e o fornecedor recusava com "Unable to verify your domain submission".
  it("remove os rastreadores do compartilhar do YouTube", () => {
    expect(stripTrackers("https://youtu.be/abc123?si=Xy9&feature=shared")).toBe(
      "https://youtu.be/abc123",
    );
    expect(
      stripTrackers("https://www.tiktok.com/@user/video/123?is_from_webapp=1&sender_device=pc"),
    ).toBe("https://www.tiktok.com/@user/video/123");
  });

  it("remove rastreadores de anúncio (fbclid/gclid/mibextid)", () => {
    expect(stripTrackers("https://www.facebook.com/pagina?mibextid=abc&fbclid=xyz")).toBe(
      "https://www.facebook.com/pagina",
    );
  });
});

