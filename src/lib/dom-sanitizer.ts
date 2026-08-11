/**
 * Protocolo Antidote Pro (v617)
 * Sanitizador atômico para neutralização de caracteres invisíveis injetados (U+2063, etc.)
 */

export const sanitizeText = (text: string | null | undefined): string => {
  if (!text) return "";
  
  // Remove U+2063 (Invisible Separator), U+200B (Zero Width Space), U+FEFF (BOM)
  // Mapeia e remove apenas os caracteres de controle problemáticos identificados
  return text.replace(/[\u2063\u200B\uFEFF]/g, "");
};

/**
 * Sanitiza objetos recursivamente (útil para props de componentes)
 */
export const sanitizeObject = <T extends Record<string, any>>(obj: T): T => {
  if (!obj || typeof obj !== 'object') return obj;
  
  const newObj = Array.isArray(obj) ? [...obj] : { ...obj };
  
  for (const key in newObj) {
    const val = (newObj as any)[key];
    if (typeof val === "string") {
      (newObj as any)[key] = sanitizeText(val);
    } else if (typeof val === "object" && val !== null) {
      (newObj as any)[key] = sanitizeObject(val);
    }
  }
  return newObj as T;
};
