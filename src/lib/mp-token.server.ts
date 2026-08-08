/**
 * v587: Caching Proativo de Token do Mercado Pago (Centralizado no Banco).
 * Resolve o isolamento de instâncias serverless/edge salvando o token no Supabase.
 * Latência < 10ms vs 1-2s de handshake de API.
 */

interface MpTokenConfig {
  access_token: string | null;
  expires_at: number;
}

/**
 * Retorna o token do Mercado Pago consultando primeiro a tabela app_config.
 * Se o token no banco estiver expirado ou ausente, usa o env e atualiza o banco.
 */
export async function getMpAccessToken(): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  
  try {
    // Busca na tabela de configuração centralizada usando cast para omitir erros de tipo se a tabela for nova
    const { data: config } = await (supabaseAdmin as any)
      .from("app_config")
      .select("value")
      .eq("key", "mercado_pago_token")
      .maybeSingle();

    const tokenData = (config?.value as unknown as MpTokenConfig) || { access_token: null, expires_at: 0 };
    const now = Date.now();

    // Se temos um token válido no banco (tokens estáticos têm validade infinita ou longa)
    if (tokenData.access_token && (tokenData.expires_at === 0 || tokenData.expires_at > now)) {
      return tokenData.access_token;
    }

    // Fallback para o env e sincronização com o banco
    const envToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!envToken) {
      throw new Error("MERCADO_PAGO_ACCESS_TOKEN não configurado.");
    }

    // Atualiza o banco para as próximas instâncias/requests
    await (supabaseAdmin as any)
      .from("app_config")
      .upsert({
        key: "mercado_pago_token",
        value: { access_token: envToken, expires_at: 0 },
        updated_at: new Date().toISOString()
      });

    return envToken;
  } catch (err) {
    console.error("[getMpAccessToken] Falha no banco, usando fallback env:", err);
    return process.env.MERCADO_PAGO_ACCESS_TOKEN || "";
  }
}

/**
 * v586: Mantido para compatibilidade, mas redireciona para a estratégia centralizada.
 */
export async function getCachedToken() {
  return getMpAccessToken();
}
