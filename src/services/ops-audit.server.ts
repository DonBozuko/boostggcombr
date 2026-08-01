// v233 — Auditoria Operacional Permanente (modo forense).
// Fecha o ciclo de prova: não confia em "cron rodou", confere o RESULTADO real
// (HTTP do endpoint, pedido entregue, caixa lançado, e-mail entregue).
// Só alerta quando existe impacto real (dinheiro ou cliente). Ruído é registrado, não enviado.

import { classifyHttpFailures, spreadInMinutes } from "@/lib/http-failure-shape";

// v319 — Silêncio inteligente: mesma lista de problemas só reavisa a cada 12h.
const ALERTA_COOLDOWN_MS = 12 * 60 * 60 * 1000;

async function hashAlerta(texto: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(texto));
  return Array.from(new Uint8Array(buf))
    .slice(0, 8)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function podeAlertar(assinatura: string): Promise<{ pode: boolean; vez: number }> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const key = `ops-audit:${assinatura}`;
    const { data } = await (supabaseAdmin as any)
      .from("canary_alert_state")
      .select("alert_key, last_sent_at, detail")
      .eq("alert_key", key)
      .maybeSingle();

    const agora = Date.now();
    const ultimo = data?.last_sent_at ? Date.parse(data.last_sent_at) : 0;
    if (ultimo && agora - ultimo < ALERTA_COOLDOWN_MS) return { pode: false, vez: 0 };

    const vez = Number(data?.detail ?? 0) + 1;
    await (supabaseAdmin as any)
      .from("canary_alert_state")
      .upsert(
        { alert_key: key, last_sent_at: new Date().toISOString(), detail: String(vez) },
        { onConflict: "alert_key" },
      );
    return { pode: true, vez };
  } catch {
    // Falha de estado nunca pode calar alerta crítico.
    return { pode: true, vez: 1 };
  }
}


export type OpsFinding = {
  code: string;
  severity: "critical" | "warning";
  titulo: string;
  problema: string;
  o_que_fazer: string;
  evidencia: any;
};

/**
 * v338 — Assinatura estável de qualquer formato de evidência (lista, objeto,
 * texto ou vazio). Usada só para saber se o problema é o MESMO de antes.
 */
export function assinaturaEvidencia(evidencia: any): string {
  if (evidencia == null) return "";
  if (Array.isArray(evidencia)) {
    return evidencia
      .map((e: any) => (e && typeof e === "object" ? String(e.pacote ?? e.id ?? JSON.stringify(e)) : String(e)))
      .sort()
      .join(",");
  }
  if (typeof evidencia === "object") {
    return Object.keys(evidencia).sort().map((k) => `${k}=${String((evidencia as any)[k])}`).join(",");
  }
  return String(evidencia);
};

export type OpsAuditReport = {
  ok: boolean;
  generated_at: string;
  findings: OpsFinding[];
  snapshot: any;
  telegram_enviado: boolean;
};

export async function runOpsAudit(options: { notify?: boolean } = {}): Promise<OpsAuditReport> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // v238 — janela de 1h: erro antigo já corrigido não pode manter alerta vermelho.
  // v250 — só alerta se AINDA está falhando agora (últimos 15min). Rajada isolada
  // durante deploy que já se curou sozinha não vira alerta crítico.
  const [{ data: snap }, { data: http }, { data: agora }, { data: forma }] = await Promise.all([
    (supabaseAdmin as any).rpc("ops_forensics"),
    (supabaseAdmin as any).rpc("ops_http_health", { _hours: 1 }),
    (supabaseAdmin as any).rpc("ops_http_recent_failures", { _minutes: 15 }),
    (supabaseAdmin as any).rpc("ops_http_failure_shape", { _minutes: 15 }),
  ]);

  const s = (snap ?? {}) as any;
  const h = (http ?? {}) as any;
  const now15 = (agora ?? {}) as any;
  const shape15 = (forma ?? {}) as any;
  const findings: OpsFinding[] = [];

  // 1) Robôs que dispararam mas o destino recusou (404/401) — falso "verde"
  const naoEncontrado = Number(now15.nao_encontrado_404 ?? 0);
  const semPermissao = Number(now15.sem_permissao_401_403 ?? 0);
  if (naoEncontrado > 0 || semPermissao > 0) {
    findings.push({
      code: "ROBO_CHAMADA_RECUSADA",
      severity: "critical",
      titulo: "Robô automático rodando no vazio",
      problema: `Nos últimos 15 minutos houve ${naoEncontrado} chamada(s) para endereço inexistente e ${semPermissao} recusada(s) por senha inválida. O robô aparece como "OK" mas nada foi feito.`,
      o_que_fazer: "Me avise: preciso corrigir o endereço/senha do robô no agendador.",
      evidencia: { agora: now15, ultima_hora: h },
    });
  }


  // v341 — 5xx só vira alerta se AINDA está falhando AGORA (15min), mesma
  // régua do 404/401. Antes olhava 1h: uma rajada durante deploy, já curada,
  // mantinha "robô batendo em erro" tocando por uma hora inteira.
  // v388 — agora também olha o FORMATO: erro concentrado num único instante é
  // troca de versão do site (o robô repete sozinho em ≤5min); erro espalhado
  // por minutos diferentes é rota quebrada de verdade.
  const erro5xxAgora = Number(now15.erro_servidor_5xx ?? 0);
  const erro5xxHora = Number(h.erro_servidor_5xx ?? 0);
  // v402 — além dos minutos distintos, olha a FAIXA (1º ao último erro):
  // rajada de publicação acontece em segundos; rota quebrada erra por minutos.
  const faixaMin = spreadInMinutes(shape15.primeiro, shape15.ultimo);
  const veredito = classifyHttpFailures({
    erros: Number(shape15.erros_5xx ?? erro5xxAgora),
    minutosDistintos: Number(shape15.minutos_distintos ?? 0),
    ...(faixaMin != null ? { duracaoMinutos: faixaMin } : {}),
  });
  if (erro5xxAgora >= 1 && erro5xxHora >= 3 && veredito === "falha_continua") {
    findings.push({
      code: "ROBO_ERRO_SERVIDOR",
      severity: "critical",
      titulo: "Robô batendo em erro do servidor",
      problema: `${erro5xxHora} chamadas retornaram erro de servidor na última hora (${erro5xxAgora} ainda agora), espalhadas por ${shape15.minutos_distintos} minutos diferentes.`,
      o_que_fazer: "Me avise para investigar o log da rota que está quebrando.",
      evidencia: { agora: now15, formato: shape15, ultima_hora: h },
    });
  }




  // 2) Cliente pagou e não recebeu
  const travados = Array.isArray(s.pedidos_pagos_sem_entrega) ? s.pedidos_pagos_sem_entrega : [];
  const travadosGraves = travados.filter((p: any) => Number(p.idade_horas ?? 0) >= 12);
  if (travadosGraves.length > 0) {
    findings.push({
      code: "PAGO_SEM_ENTREGA",
      severity: "critical",
      titulo: "Cliente pagou e ainda não recebeu",
      problema: `${travadosGraves.length} pedido(s) pago(s) há mais de 12h sem entrega confirmada.`,
      o_que_fazer: "Abra o painel na aba CARRINHOS & PEDIDOS e confirme ou reembolse.",
      evidencia: travadosGraves,
    });
  }

  // 3) Venda concluída sem lançamento no caixa (buraco contábil)
  const semCaixa = Array.isArray(s.vendas_sem_caixa) ? s.vendas_sem_caixa : [];
  if (semCaixa.length > 0) {
    const total = semCaixa.reduce((a: number, v: any) => a + Number(v.valor ?? 0), 0);
    findings.push({
      code: "VENDA_SEM_CAIXA",
      severity: "warning",
      titulo: "Venda entregue sem lançamento no caixa",
      problema: `${semCaixa.length} venda(s) somando R$ ${total.toFixed(2)} não aparecem na tesouraria.`,
      o_que_fazer: "Sem urgência: o lucro real está subestimado nesse valor.",
      evidencia: semCaixa.slice(0, 10),
    });
  }

  // 4) Fila de e-mail morrendo
  const email = (s.email ?? {}) as any;
  if (Number(email.dlq_24h ?? 0) > 0 || Number(email.pending_travado ?? 0) > 0) {
    findings.push({
      code: "EMAIL_NAO_ENTREGUE",
      severity: "warning",
      titulo: "E-mail não chegou no cliente",
      problema: `${email.dlq_24h ?? 0} e-mail(s) desistiram de enviar e ${email.pending_travado ?? 0} estão parados na fila.`,
      o_que_fazer: "Sem urgência: o cliente não recebeu o aviso automático.",
      evidencia: email,
    });
  }

  // 5) Pix parado sem tentativa de recuperação
  const pix = Array.isArray(s.pix_pendente) ? s.pix_pendente : [];
  const pixSemRecuperacao = pix.filter(
    (p: any) => !p.email_recuperacao_enviado && Number(p.idade_horas ?? 0) >= 2,
  );
  if (pixSemRecuperacao.length > 0) {
    const total = pixSemRecuperacao.reduce((a: number, v: any) => a + Number(v.valor ?? 0), 0);
    findings.push({
      code: "PIX_SEM_RECUPERACAO",
      severity: "warning",
      titulo: "Pix gerado e não pago, sem contato",
      problema: `${pixSemRecuperacao.length} cliente(s) somando R$ ${total.toFixed(2)} não receberam nenhuma mensagem de recuperação.`,
      o_que_fazer: "Painel > CARRINHOS & PEDIDOS > Central de Recuperação: chame no WhatsApp.",
      evidencia: pixSemRecuperacao,
    });
  }

  // 6) Robô parado — v238: tolerância derivada do intervalo REAL do agendamento.
  // Antes qualquer schedule com "*/" era tratado como "frequente" (90min), o que
  // marcava "0 */6 * * *" (a cada 6h) como parado. Agora calcula o intervalo.
  const intervaloMinutos = (sched: string): number | null => {
    const [min, hora] = sched.trim().split(/\s+/);
    if (!min || !hora) return null;
    // minuto com passo: */5, 2-59/5  → intervalo em minutos
    const stepMin = /\/(\d+)/.exec(min)?.[1];
    if (stepMin && (hora === "*" || hora === "*/1")) return Number(stepMin);
    // hora com passo: 0 */6 → intervalo em horas
    const stepHora = /\/(\d+)/.exec(hora)?.[1];
    if (stepHora) return Number(stepHora) * 60;
    if (hora === "*") return 60; // roda em minuto fixo de toda hora
    return null; // diário/mensal — fora do escopo
  };
  const crons = Array.isArray(s.crons) ? s.crons : [];
  const parados = crons.filter((c: any) => {
    if (!c.active) return true;
    const intervalo = intervaloMinutos(String(c.schedule ?? ""));
    if (intervalo === null) return false; // diários/mensais fora do escopo
    const tolerancia = intervalo * 2 + 15;
    const stale = c.stale_minutes;
    return stale === null || Number(stale) > tolerancia;
  });

  if (parados.length > 0) {
    findings.push({
      code: "ROBO_PARADO",
      severity: "critical",
      titulo: "Robô automático parou de rodar",
      problema: `${parados.length} robô(s) frequentes sem execução recente: ${parados.map((c: any) => c.jobname).join(", ")}.`,
      o_que_fazer: "Me avise para reativar o agendamento.",
      evidencia: parados,
    });
  }

  // 6.5) v312 — Impressão digital do serviço: fornecedor manteve o ID mas trocou
  // o produto por trás. Roda ANTES da coerência para que o vínculo podre já
  // esteja desligado quando a coerência avaliar o pacote.
  try {
    const { runServiceFingerprints } = await import("@/services/service-fingerprint.server");
    const fp = await runServiceFingerprints();
    if (fp.drift.length > 0) {
      findings.push({
        code: "FORNECEDOR_TROCOU_PRODUTO",
        severity: fp.paused.length > 0 ? "critical" : "warning",
        titulo: "Fornecedor trocou o produto sem avisar",
        problema: `${fp.drift.length} vínculo(s) mudaram de produto no fornecedor (ex.: ${fp.drift
          .slice(0, 3)
          .map((d) => `${d.pacote}: "${d.de}" virou "${d.para}"`)
          .join("; ")}). O sistema já desligou essas rotas${fp.paused.length > 0 ? ` e tirou ${fp.paused.length} pacote(s) da vitrine` : ""}.`,
        o_que_fazer:
          fp.paused.length > 0
            ? "Painel > Saúde do Catálogo: esses pacotes ficaram sem fornecedor. Escolha outro serviço para eles."
            : "Nada urgente: o pacote continua vendendo por outro fornecedor.",
        evidencia: fp.drift.slice(0, 20),
      });
    }
  } catch (e) {
    console.warn("[ops-audit] v312 impressão digital falhou", e);
  }

  // 6.6) v331 — O site promete o que o catálogo não tem?
  // Detector permanente da família de falha que só aparecia em auditoria
  // manual de layout: texto vendendo "brasileiro real" ou "reposição" em
  // rede cujo catálogo é global/sem refill.
  try {
    const { runPromiseCoherence } = await import("@/services/promise-coherence.server");
    const promessas = await runPromiseCoherence();
    if (promessas.length > 0) {
      findings.push({
        code: "SITE_PROMETE_O_QUE_NAO_TEM",
        // v341 — texto de FAQ/landing não é dinheiro saindo agora: é aviso.
        // Vermelho é só para cliente/dinheiro em risco imediato.
        severity: "warning",

        titulo: "Texto do site promete o que o catálogo não entrega",
        problema: `${promessas.length} trecho(s) prometem algo que a rede não tem hoje (ex.: ${promessas
          .slice(0, 3)
          .map((p) => `${p.origem}: "${p.trecho.slice(0, 90)}"`)
          .join(" | ")}).`,
        o_que_fazer:
          "Me avise para corrigir o texto dessas páginas — ou para vincular um fornecedor que realmente entregue o que está escrito.",
        evidencia: promessas.slice(0, 20),
      });
    }
  } catch (e) {
    console.warn("[ops-audit] v331 promessa×catálogo falhou", e);
  }

  // 6.7) v332 — Varredura de superfície + mapa de cobertura.
  // Não olha só FAQ/depoimento: lê o texto visível de TODAS as rotas públicas
  // e ainda acusa rota nova sem detector declarado (ponto cego).
  try {
    const { runSurfaceScan } = await import("@/services/surface-scan.server");
    const { familiasSemDetector } = await import("@/lib/coverage-map");
    const scan = await runSurfaceScan();

    if (scan.violacoes.length > 0) {
      findings.push({
        code: "TEXTO_DE_PAGINA_PROMETE_DEMAIS",
        severity: "warning",

        titulo: "Texto de página promete o que o catálogo não entrega",
        problema: `${scan.violacoes.length} trecho(s) no corpo das páginas prometem algo que a rede não tem hoje (ex.: ${scan.violacoes
          .slice(0, 3)
          .map((p) => `${p.origem}: "${p.trecho.slice(0, 90)}"`)
          .join(" | ")}).`,
        o_que_fazer:
          "Me avise para corrigir o texto dessas páginas — ou para vincular um fornecedor que entregue o que está escrito.",
        evidencia: scan.violacoes.slice(0, 20),
      });
    }

    if (scan.visuais.length > 0) {
      findings.push({
        code: "PROVA_VISUAL_QUEBRADA",
        severity: "warning",
        titulo: "Imagem quebrada ou descrição enganosa em página de venda",
        problema: `${scan.visuais.length} problema(s) de imagem nas páginas (ex.: ${scan.visuais
          .slice(0, 3)
          .map((v) => `${v.origem}: ${v.detalhe.slice(0, 90)}`)
          .join(" | ")}).`,
        o_que_fazer:
          "Me avise para repor o arquivo que sumiu ou corrigir a descrição da imagem — cliente que vê caixa quebrada não compra.",
        evidencia: scan.visuais.slice(0, 20),
      });
    }

    if (scan.emails.length > 0) {
      findings.push({
        code: "EMAIL_TRANSACIONAL_INCOERENTE",
        severity: "critical",
        titulo: "E-mail enviado ao cliente promete demais ou tem lacuna",
        problema: `${scan.emails.length} trecho(s) em e-mails automáticos (ex.: ${scan.emails
          .slice(0, 3)
          .map((e) => `${e.template}: "${e.trecho.slice(0, 90)}"`)
          .join(" | ")}).`,
        o_que_fazer:
          "Me avise para corrigir o texto desses e-mails antes do próximo disparo.",
        evidencia: scan.emails.slice(0, 20),
      });
    }

    const semDetector = familiasSemDetector().map((f) => f.nome);
    if (scan.rotasSemDeclaracao.length > 0 || semDetector.length > 0) {
      findings.push({
        code: "PONTO_CEGO_SEM_DETECTOR",
        severity: "warning",
        titulo: "Áreas do site sem verificação automática",
        problema: [
          scan.rotasSemDeclaracao.length > 0
            ? `${scan.rotasSemDeclaracao.length} página(s) novas ainda não entraram no mapa de conferência: ${scan.rotasSemDeclaracao.slice(0, 8).join(", ")}.`
            : "",
          semDetector.length > 0 ? `Sem robô conferindo: ${semDetector.join(", ")}.` : "",
        ]
          .filter(Boolean)
          .join(" "),
        o_que_fazer:
          "Me avise para criar a conferência automática dessas áreas. Enquanto não existir, elas não podem receber sinal verde.",
        evidencia: { rotasVarridas: scan.rotasVarridas, rotasSemDeclaracao: scan.rotasSemDeclaracao, semDetector },
      });
    }
  } catch (e) {
    console.warn("[ops-audit] v332 varredura de superfície falhou", e);
  }





  // 7) v291 — Coerência do catálogo (serviço errado, escada invertida, custo fora
  // da curva). Aditivo: se falhar, a auditoria antiga continua valendo.
  try {
    const { runCatalogCoherence, remediateCoherence } = await import("@/services/catalog-coherence.server");
    const issues = await runCatalogCoherence();
    // v304 — pacote com serviço errado ou custo absurdo sai da vitrine na hora.
    const remediado = await remediateCoherence(issues).catch(() => ({ paused: [], restored: [], errors: 1 }));

    if (remediado.paused.length > 0) {
      console.warn("[ops-audit] v304 pacotes pausados pela coerência", remediado.paused);
    }
    if (remediado.restored.length > 0) {
      console.info("[ops-audit] v308 pacotes religados pela coerência", remediado.restored);
    }

    const grupos = new Map<string, typeof issues>();
    for (const i of issues) {
      if (!grupos.has(i.code)) grupos.set(i.code, []);
      grupos.get(i.code)!.push(i);
    }
    const TITULOS: Record<string, { titulo: string; o_que_fazer: string }> = {
      ESCADA_QUEBRADA: {
        titulo: "Pacote maior está mais barato que o menor",
        o_que_fazer: "Painel > Saúde do Catálogo: revise esses pacotes, o cliente paga mais por menos.",
      },
      PRECO_UNITARIO_INVERTIDO: {
        titulo: "Preço por unidade sobe conforme o pacote cresce",
        o_que_fazer: "Sem urgência: revise a escada dessa categoria.",
      },
      CUSTO_FORA_DA_CURVA: {
        titulo: "Custo de fornecedor muito acima do normal",
        o_que_fazer: "Provável serviço errado vinculado. Confira o ID desse pacote.",
      },
      SERVICO_INCOERENTE: {
        titulo: "Pacote vinculado ao produto errado do fornecedor",
        o_que_fazer: "Troque o ID do fornecedor desse pacote antes que alguém compre.",
      },
      TESTE_SECO_CEGO: {
        titulo: "Catálogo sem revalidação recente",
        o_que_fazer: "O robô de teste seco parou. Me avise para religar.",
      },
    };
    for (const [code, lista] of grupos) {
      const meta = TITULOS[code] ?? { titulo: code, o_que_fazer: "Revisar no painel." };
      findings.push({
        code,
        severity: lista[0].severity,
        titulo: meta.titulo,
        problema: `${lista.length} pacote(s) com problema: ${lista.slice(0, 5).map((i) => `${i.pacote} (${i.detalhe})`).join("; ")}${lista.length > 5 ? "…" : ""}`,
        o_que_fazer: meta.o_que_fazer,
        evidencia: lista.slice(0, 30),
      });
    }
  } catch (e) {
    console.warn("[ops-audit] coerência falhou", e);
  }

  // v391 — Escada de autonomia: detector sem remédio é defeito nosso, não do
  // fornecedor. Se alguma ação de nível 1 ficou sem quem execute, o dono vira
  // o robô — e isso precisa aparecer como problema, não como silêncio.
  try {
    const { nivel1SemExecutor, contratosQuebrados } = await import("@/lib/autonomy-ladder");
    const semRemedio = nivel1SemExecutor();
    const quebrados = contratosQuebrados();
    if (semRemedio.length > 0 || quebrados.length > 0) {
      findings.push({
        code: "AUTONOMIA_INCOMPLETA",
        severity: "warning",
        titulo: "Tem conserto automático faltando",
        problema:
          `${semRemedio.length} conserto(s) que deveriam ser automáticos ainda dependem de alguém clicar` +
          (quebrados.length > 0 ? ` e ${quebrados.length} regra(s) de segurança estão sem teto ou sem botão de desligar.` : "."),
        o_que_fazer: "Me avise para ligar o conserto automático dessas etapas.",
        evidencia: { sem_remedio: semRemedio.map((a) => a.nome), contratos: quebrados },
      });
    }
  } catch (e) {
    console.warn("[ops-audit] escada de autonomia falhou", e);
  }

  const critical = findings.filter((f) => f.severity === "critical");

  let telegramEnviado = false;

  if (options.notify && critical.length > 0) {
    const { dispatchTelegramAlert } = await import("@/lib/messaging");
    const corpo = critical
      .map((f) => `⚠️ ${f.titulo}\nPROBLEMA: ${f.problema}\nO QUE FAZER: ${f.o_que_fazer}`)
      .join("\n\n");

    // v319 — SILÊNCIO INTELIGENTE. A auditoria roda de hora em hora e reenviava
    // exatamente o mesmo texto enquanto o problema existisse: o celular do dono
    // virou um loop de notificação e alerta repetido deixa de ser lido. Agora a
    // mesma lista de problemas só volta a tocar a cada 12h, com contador de
    // insistência. Problema NOVO (assinatura diferente) toca na hora, sempre.
    // v338 — `evidencia` nem sempre é lista (há findings que mandam objeto ou
    // texto). Antes, um desses no lote CRÍTICO derrubava a auditoria inteira
    // com "map is not a function" — ou seja, o alerta mais importante do dia
    // morria calado. Agora a assinatura tolera qualquer formato.
    const assinatura = await hashAlerta(
      critical.map((f) => `${f.code}|${assinaturaEvidencia(f.evidencia)}`).sort().join("||"),
    );
    const { pode, vez } = await podeAlertar(assinatura);

    if (pode) {
      const texto = [
        "🔎 AUDITORIA FORENSE — problemas que afetam dinheiro ou cliente",
        vez > 1 ? `(${vez}ª vez que aviso disso — segue sem resolver)` : "",
        "",
        corpo,
      ]
        .filter(Boolean)
        .join("\n\n");
      const r = await dispatchTelegramAlert(texto, { severity: "critical", origem: "ops-audit" });
      telegramEnviado = r.ok;
    }
  }


  try {
    await (supabaseAdmin as any).from("admin_audit_logs").insert({
      admin_email: "system@ops-audit",
      action: "ops_audit_v233",
      detail: {
        criticos: critical.length,
        total: findings.length,
        codigos: findings.map((f) => f.code),
        ts: new Date().toISOString(),
      },
    });
  } catch (e) {
    console.warn("[ops-audit] log fail", e);
  }

  return {
    ok: critical.length === 0,
    generated_at: new Date().toISOString(),
    findings,
    snapshot: { ...s, http_health: h },
    telegram_enviado: telegramEnviado,
  };
}
