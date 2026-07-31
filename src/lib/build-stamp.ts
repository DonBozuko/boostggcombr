/**
 * v361 — CARIMBO DE VERSÃO NO ALERTA.
 *
 * Causa raiz de "corrigi e o alerta continua igual": as varreduras automáticas
 * (cron) rodam no site PUBLICADO. Enquanto a correção fica só no preview, o
 * robô continua julgando com a regra velha e manda o mesmo aviso — parece que
 * a correção não funcionou, quando na verdade ela ainda não subiu.
 *
 * Todo alerta de "alarme que não anda" carrega esta versão. Se a versão do
 * alerta for menor que a última correção feita, a ação é PUBLICAR, não mexer
 * em fornecedor nem em código.
 *
 * Ao entregar uma correção que muda regra de preço/margem/entrega, suba este
 * número no mesmo commit.
 */
export const APP_VERSION = "v386";

/** Linha curta, em português direto, para o rodapé de alertas. */
export function carimboVersao(): string {
  return `Versão que rodou esta varredura: ${APP_VERSION}. Se você acabou de corrigir algo e o aviso repetiu igual, publique o site — o robô ainda está usando a versão publicada.`;
}
