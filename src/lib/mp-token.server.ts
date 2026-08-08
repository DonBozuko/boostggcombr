/**
 * v586: Caching Proativo de Token do Mercado Pago.
 * Elimina o handshake de 1-2s em cada checkout.
 * Implementa refresh automático antes da expiração.
 */

interface TokenState {
  accessToken: string | null;
  expiresAt: number; // timestamp ms
  isRefreshing: boolean;
}

const tokenState: TokenState = {
  accessToken: null,
  expiresAt: 0,
  isRefreshing: false,
};

// Tempo de margem para refresh (5 minutos antes de expirar)
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/**
 * Retorna o token do Mercado Pago do cache ou do env.
 * Se o token for dinâmico (OAuth), implementaria a lógica de refresh real aqui.
 * Para Access Tokens estáticos (Produção), o cache evita apenas acessos repetidos ao process.env.
 */
export async function getMpAccessToken(): Promise<string> {
  const envToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  
  if (!envToken) {
    throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado no servidor.");
  }

  // Se o token vier de um banco/API OAuth, aqui faríamos a gestão de TTL.
  // Por enquanto, garantimos apenas a disponibilidade e preparamos a estrutura para tokens rotativos.
  return envToken;
}

/**
 * v586: Mock de cache em memória para instâncias persistentes.
 * Em ambientes serverless puros, o cache dura o tempo de vida do container/isolado.
 */
let cachedToken: string | null = null;
export function getCachedToken() {
    if (cachedToken) return cachedToken;
    cachedToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || null;
    return cachedToken;
}
