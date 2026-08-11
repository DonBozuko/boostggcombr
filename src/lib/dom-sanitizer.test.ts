import { describe, it, expect } from 'vitest';
import { sanitizeText, sanitizeObject } from './dom-sanitizer';

describe('dom-sanitizer', () => {
  it('deve remover U+2063', () => {
    const input = "Texto\u2063 com invisivel";
    expect(sanitizeText(input)).toBe("Texto com invisivel");
  });

  it('deve remover U+200B', () => {
    const input = "Texto\u200B com invisivel";
    expect(sanitizeText(input)).toBe("Texto com invisivel");
  });

  it('deve remover múltiplos caracteres problemáticos', () => {
    const input = "\u2063Texto\u200B\uFEFF";
    expect(sanitizeText(input)).toBe("Texto");
  });

  it('deve sanitizar objetos recursivamente', () => {
    const obj = {
      name: "João\u2063",
      details: {
        city: "São Paulo\u200B",
        tags: ["tag1\u2063", "tag2"]
      }
    };
    const sanitized = sanitizeObject(obj);
    expect(sanitized.name).toBe("João");
    expect(sanitized.details.city).toBe("São Paulo");
    expect(sanitized.details.tags[0]).toBe("tag1");
  });
});
