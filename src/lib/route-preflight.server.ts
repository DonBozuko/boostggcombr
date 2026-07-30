// v297 — PREFLIGHT DE ROTA (execução).
//
// Roda ANTES de gerar cobrança. Usa exatamente o mesmo rankeador do despacho
// (`rankProvidersByCost`), que já aplica: trava de ID fantasma (v296), trava de
// faixa min/max (v286), trava BR + refill (v245), sanidade de custo (v294) e
// rate ao vivo com TTL de 60s (v163). Depois aplica `evaluateRoute` (puro), que
// espelha a trava de margem do despacho (v216).
//
// Princípios de segurança operacional:
//  - FAIL-OPEN em erro/timeout: preflight nunca derruba venda por instabilidade
//    própria. Se não conseguimos decidir em 7s, deixamos passar (o despacho
//    ainda tem retentativa + parqueamento v296).
//  - FAIL-CLOSED só com veredito real: se conseguimos avaliar e não há rota,
//    bloqueia a cobrança.
//  - AUTO-CURA DA PRATELEIRA: bloqueio estrutural (nenhum ID válido) marca o
//    pacote como não-vendável, então ele some da vitrine até o auto-resolver /
//    dry-run devolver um ID bom. Bloqueio por saldo/margem NÃO derruba a
//    prateleira (é transitório).

import { evaluateRoute, type PreflightProvider, type PreflightResult } from "./route-preflight";

const TIMEOUT_MS = 7_000;
const CACHE_TTL_MS = 60_000;

// v364 — FAIL-OPEN TEM LIMITE DE VALOR.
// Causa real dos estornos depois do pagamento: quando o preflight não conseguia
// decidir (timeout/erro), a venda passava mesmo assim. Em pacote pequeno isso é
// barato e o despacho conserta. Em pacote grande vira estorno de R$ 283 e
// queima a credibilidade. Acima deste valor, sem prova viva de rota → não cobra.
const FAIL_OPEN_MAX_BRL = 100;


type CacheEntry = { at: number; result: PreflightResult };
const cache = new Map<string, CacheEntry>();

export type PreflightOutcome = PreflightResult & { skipped: boolean };

const TOPUP_ALERT_COOLDOWN_MS = 30 * 60_000;
const topupAlertAt = new Map<string, number>();

const PASS: PreflightOutcome = {
  ok: true,
  viable: [],
  reason: null,
  rejections: [],
  structural: false,
  needsTopup: false,
  skipped: true,
};

async function runPreflight(pacote: string, quantidade: number, valorBrl: number): Promise<PreflightResult> {
  const { rankProvidersByCost } = await import("./smart-routing.server");
  const ranked = await rankProvidersByCost({ pacote, quantidade });
  return evaluateRoute(ranked as unknown as PreflightProvider[], valorBrl);
}

export async function preflightRouteOrBlock(opts: {
  pacote: string;
  quantidade: number;
  valorBrl: number;
}): Promise<PreflightOutcome> {
  const key = `${opts.pacote}|${opts.quantidade}|${opts.valorBrl.toFixed(2)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return { ...hit.result, skipped: false };

  let result: PreflightResult;
  try {
    result = await Promise.race([
      runPreflight(opts.pacote, opts.quantidade, opts.valorBrl),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("preflight timeout")), TIMEOUT_MS)),
    ]);
  } catch (err) {
    // v364 — sem veredito: libera só pacote barato. Caro, não cobra.
    if (opts.valorBrl > FAIL_OPEN_MAX_BRL) {
      console.error(`[v364] COBRANÇA BLOQUEADA ${opts.pacote} R$${opts.valorBrl}: sem prova de rota`, err);
      try {
        const { dispatchWhatsappAlert } = await import("./whatsapp-alert.server");
        await dispatchWhatsappAlert(
          `🛑 VENDA GRANDE BLOQUEADA POR FALTA DE PROVA\n\n` +
            `PROBLEMA: cliente tentou comprar "${opts.pacote}" (${opts.quantidade}) por R$${opts.valorBrl.toFixed(2)} e o sistema não conseguiu confirmar com os fornecedores se entrega agora. Preferi não cobrar a cobrar e devolver depois.\n\n` +
            `O QUE FAZER: abrir Admin › Saúde do Catálogo e ver se algum fornecedor está fora do ar.`,
          { force: true },
        ).catch(() => {});
      } catch { /* noop */ }
      return {
        ok: false,
        viable: [],
        reason: "Não foi possível confirmar entrega com os fornecedores agora",
        rejections: [String((err as any)?.message ?? err)],
        structural: false,
        needsTopup: false,
        skipped: false,
      };
    }
    console.warn(`[v297] preflight indisponível p/ ${opts.pacote} — liberando venda:`, err);
    return PASS;
  }


  cache.set(key, { at: Date.now(), result });
  if (result.ok) {
    // v352 — vendeu com fornecedor sem saldo: NÃO bloqueia, mas o dono precisa
    // saber na hora (ele recarrega na hora). Cooldown de 30min por pacote para
    // não virar spam no celular.
    if (result.needsTopup) {
      const last = topupAlertAt.get(opts.pacote) ?? 0;
      if (Date.now() - last > TOPUP_ALERT_COOLDOWN_MS) {
        topupAlertAt.set(opts.pacote, Date.now());
        try {
          const { dispatchWhatsappAlert } = await import("./whatsapp-alert.server");
          await dispatchWhatsappAlert(
            `💳 RECARREGUE O FORNECEDOR AGORA\n\n` +
              `PROBLEMA: acabou de sair venda do pacote "${opts.pacote}" (${opts.quantidade}) e nenhum fornecedor tem saldo suficiente. ` +
              `A venda foi liberada normalmente (o cliente tem prazo de entrega), mas o pedido fica esperando a recarga.\n\n` +
              `O QUE FAZER: colocar saldo no fornecedor agora. Assim que o saldo entrar, o pedido é enviado sozinho.`,
            { force: true },
          ).catch(() => {});
        } catch { /* noop */ }
      }
    }
    return { ...result, skipped: false };
  }

  console.error(`[v297] COBRANÇA BLOQUEADA ${opts.pacote} (${opts.quantidade}): ${result.reason}`, result.rejections);

  // Auto-cura da prateleira: só para falha estrutural de catálogo.
  // v372 — veto com prazo (6h). Se o robô de catálogo achar rota nesse meio
  // tempo, o veto expira e o pacote volta sozinho. Pausa sem retorno é bug.
  if (result.structural) {
    try {
      const { addShelfVeto } = await import("./shelf-authority.server");
      await addShelfVeto("preflight", opts.pacote, `v297 preflight: ${result.reason}`);
    } catch { /* nunca derrubar o fluxo por causa do auto-cura */ }
  }

  try {
    const { dispatchWhatsappAlert } = await import("./whatsapp-alert.server");
    await dispatchWhatsappAlert(
      `🛑 COBRANÇA BLOQUEADA ANTES DE PAGAR\n\n` +
        `PROBLEMA: o pacote "${opts.pacote}" (${opts.quantidade}) não tem nenhum fornecedor capaz de entregar agora. ` +
        `Motivo: ${result.reason}. Preferi não cobrar o cliente a cobrar e devolver depois.\n\n` +
        `O QUE FAZER: abrir Admin › Saúde do Catálogo. ` +
        `${result.structural ? "Este pacote saiu da vitrine sozinho e volta quando o robô achar um serviço válido." : "Se for saldo, recarregue o fornecedor; se for custo, o preço do fornecedor subiu demais para esse preço de venda."}`,
    ).catch(() => {});
  } catch { /* noop */ }

  return { ...result, skipped: false };
}
