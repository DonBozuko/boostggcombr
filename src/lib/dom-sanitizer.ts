/**
 * Protocolo Antidote Pro (v627)
 * Higienização atômica de caracteres invisíveis para camada de UI.
 * 
 * Este módulo isola a limpeza visual (apresentação) sem afetar 
 * a integridade dos dados originais em fluxos de transporte.
 */

/**
 * sanitizeText: Remove caracteres invisíveis estritamente para exibição.
 * Use este método apenas em JSX ou componentes que renderizam texto na tela.
 */
export const sanitizeText = (text: string | null | undefined): string => {
  if (!text) return "";
  
  // v627: Remoção visual agressiva de U+2063, U+200B e U+FEFF
  // preservando a string original nos fluxos que NÃO chamam esta função.
  return text.replace(/[\u2063\u200B\uFEFF]/g, "");
};

/**
 * sanitizeObject: Higieniza objetos recursivamente para injeção em props/UI.
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

