/**
 * v609 — Cérebro de Auto-Cura (Shadow Mode).
 * 
 * PROMPT DE ARQUITETO DE SISTEMAS / CTO:
 * "Você é o Tech Lead do projeto BOOSTGG. Sua missão é realizar diagnósticos forenses
 * profundos em logs de erro, performance de banco de dados (PostgreSQL/Supabase) 
 * e autoridade de SEO (GSC). Nunca foque no sintoma; descubra a causa raiz na infraestrutura, 
 * nas travas de RLS ou no drift de margem. Seus insights serão salvos como memórias 
 * vetoriais para evitar amnésia técnica e coordenar a auto-cura autônoma."
 *
 * Este serviço é assíncrono e isolado. Não deve interceptar o fluxo do usuário.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";

const AI_API_KEY = process.env.PROCESS_ENV_AI_KEY; // Claude 3.5 Sonnet ou GPT-4o
const AI_GATEWAY_URL = "https://gateway.lovable.dev/v1/chat/completions";

interface DiagnosticInput {
  context: string;
  logs?: any[];
  source: 'infra' | 'db' | 'seo' | 'margin';
}

/**
 * Registra um diagnóstico no "Cérebro de Longo Prazo" (memorias_sistema).
 */
async function saveToSystemMemory(diagnosis: string, embedding?: number[]) {
  try {
    await supabaseAdmin.from("memorias_sistema").insert({
      contexto: diagnosis,
      embedding: embedding ? (embedding as any) : null,
      criado_em: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[AI-INSPECTOR] Falha ao salvar memória vetorial:", error);
  }
}

/**
 * Executa inspeção profunda usando IA em background.
 */
export async function runShadowInspection(input: DiagnosticInput): Promise<void> {
  // Shadow Mode: Silent Return se não houver chave
  if (!AI_API_KEY) {
    console.info("[AI-INSPECTOR] Shadow Mode ativo: Aguardando PROCESS_ENV_AI_KEY.");
    return;
  }

  // Execução assíncrona para não bloquear quem chama
  (async () => {
    try {
      const prompt = `
        DIRETIVA DE CTO/ARQUITETO:
        Analise o seguinte contexto do sistema BOOSTGG e forneça um diagnóstico técnico ácido e preciso.
        FOCO: Banco de dados, Infraestrutura, Risco de Margem e SEO.
        
        CONTEXTO: ${input.context}
        LOGS: ${JSON.stringify(input.logs || [])}
        FONTE: ${input.source}
      `;

      const response = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${AI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20240620",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2, // Rigor técnico
        }),
      });

      if (!response.ok) throw new Error(`IA Gateway Error: ${response.status}`);
      
      const data = await response.json();
      const diagnosis = data.choices?.[0]?.message?.content;

      if (diagnosis) {
        await saveToSystemMemory(diagnosis);
        console.log(`[AI-INSPECTOR] Diagnóstico de ${input.source} arquivado.`);
      }
    } catch (error) {
      console.error("[AI-INSPECTOR] Falha na inspeção autônoma:", error);
    }
  })();
}
