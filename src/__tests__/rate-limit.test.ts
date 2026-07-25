import { describe, it, expect } from "vitest";
import { clientIpFrom } from "@/lib/rate-limit.server";

describe("clientIpFrom", () => {
  it("prioriza cf-connecting-ip", () => {
    const h = new Headers({ "cf-connecting-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" });
    expect(clientIpFrom(h)).toBe("1.2.3.4");
  });

  it("usa o primeiro IP do x-forwarded-for", () => {
    const h = new Headers({ "x-forwarded-for": "5.6.7.8, 10.0.0.1" });
    expect(clientIpFrom(h)).toBe("5.6.7.8");
  });

  it("cai para x-real-ip", () => {
    expect(clientIpFrom(new Headers({ "x-real-ip": "8.8.8.8" }))).toBe("8.8.8.8");
  });

  it("retorna unknown sem headers de proxy", () => {
    expect(clientIpFrom(new Headers())).toBe("unknown");
  });
});
