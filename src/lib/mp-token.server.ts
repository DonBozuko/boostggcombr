/**
 * v588: Caching Centralizado e Seguro de Token do Mercado Pago.
 * Refatoração para escala horizontal real (Serverless/Edge) e Segurança Estrita.
 * 
 * MELHORIAS v588:
 * 1. Cliente Administrativo Real: Usa supabaseAdmin (Proxy) para evitar vazamento de tipos e escopo.
 * 2. Expiração Robusta: Suporta tokens de longa duração (env) com revalidação forçada de 24h.
 * 3. Fallback Transparente: Erros de banco são logados mas não interrompem o fluxo se o env estiver presente.
 * 4. Tipagem Flexível: Usa cast para contornar drift entre o banco real e os tipos gerados (Database['public']['Tables']).
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

interface MpTokenConfig {
  access_token: string;
  expires_at: number; // Timestamp em milissegundos
}

const CONFIG_KEY = "mercado_pago_token";
const FORCE_REFRESH_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 horas para tokens estáticos

/**
 * Retorna o token do Mercado Pago consultando a tabela app_config no banco.
 * Garante que todas as instâncias serverless usem o mesmo token sincronizado.
 */
export async function getMpAccessToken(): Promise<string> {
  const now = Date.now();

  // 1. Tentar ler do banco (Central de Verdade para instâncias horizontais)
  // Usamos casting para 'any' apenas no seletor de tabela para contornar o drift de tipos se a migration ainda não foi processada pelo gerador
  const { data: config, error: fetchError } = await (supabaseAdmin as any)
    .from("app_config")
    .select("value")
    .eq("key", CONFIG_KEY)
    .maybeSingle();

  if (fetchError) {
    console.error("[v588] Erro ao buscar app_config:", fetchError);
  }

  const tokenData = config?.value as unknown as MpTokenConfig | null;

  // 2. Validar se o token no banco é útil e não expirou
  if (tokenData?.access_token && tokenData.expires_at > now) {
    return tokenData.access_token;
  }

  // 3. Fallback / Refresh: Se chegamos aqui, o banco está vazio ou expirado
  const envToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!envToken) {
    console.error("[v588] CRÍTICO: MERCADO_PAGO_ACCESS_TOKEN não encontrado no process.env");
    throw new Error("Configuração de pagamento ausente (MERCADO_PAGO_ACCESS_TOKEN)");
  }

  // Se o banco falhou ou expirou, atualizamos com o env e definimos uma expiração de 24h (para tokens estáticos)
  const newExpiresAt = now + FORCE_REFRESH_WINDOW_MS;

  try {
    const { error: upsertError } = await (supabaseAdmin as any)
      .from("app_config")
      .upsert({
        key: CONFIG_KEY,
        value: { access_token: envToken, expires_at: newExpiresAt },
        updated_at: new Date().toISOString()
      });

    if (upsertError) {
      console.warn("[v588] Falha ao sincronizar token no banco (instância isolada):", upsertError);
    }
  } catch (e) {
    console.warn("[v588] Exceção ao persistir token no banco:", e);
  }

  return envToken;
}

/**
 * Legado v586: Mantido para compatibilidade, aponta para a nova lógica.
 */
export async function getCachedToken() {
  return getMpAccessToken();
}
