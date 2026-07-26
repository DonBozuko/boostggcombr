// v264 — Provisionamento automático de revendedor.
// Motivo: com um operador só, mandar chave na mão pelo WhatsApp não escala e
// vaza segredo em conversa. Aqui a chave nasce, é gravada só como hash e vai
// por e-mail direto pro revendedor.
export type ProvisionResult =
  | { ok: true; apiKey: string; resellerId: string; emailed: boolean }
  | { ok: false; error: string };

async function sendKeyEmail(
  email: string,
  nome: string,
  apiKey: string,
  descontoPct: number,
  reissue: boolean,
): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { enqueueTemplateEmail } = await import("@/lib/email-enqueue.server");
    const r = await enqueueTemplateEmail(supabaseAdmin as any, {
      templateName: "reseller-access",
      recipientEmail: email,
      idempotencyKey: `reseller-access:${email}:${apiKey.slice(0, 12)}`,
      templateData: { nome, apiKey, descontoPct, reissue },
    });
    return r.ok;
  } catch (e) {
    console.error("[reseller-provision] e-mail falhou:", (e as Error).message);
    return false;
  }
}

/** Cria o revendedor (ou reaproveita o existente pelo e-mail) e envia a chave. */
export async function provisionReseller(input: {
  nome: string;
  email: string;
  descontoPct: number;
}): Promise<ProvisionResult> {
  const email = input.email.trim().toLowerCase();
  if (!email.includes("@")) return { ok: false, error: "E-mail inválido." };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { generateApiKey, hashApiKey } = await import("@/lib/reseller-api.server");
  const { key, prefix } = generateApiKey();
  const hash = await hashApiKey(key);

  const { data: existing } = await supabaseAdmin
    .from("resellers" as any)
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let resellerId: string;
  if (existing) {
    resellerId = String((existing as any).id);
    const { error } = await supabaseAdmin
      .from("resellers" as any)
      .update({ api_key_hash: hash, api_key_prefix: prefix, ativo: true, desconto_pct: input.descontoPct } as any)
      .eq("id", resellerId);
    if (error) return { ok: false, error: error.message };
  } else {
    const { data: created, error } = await supabaseAdmin
      .from("resellers" as any)
      .insert({
        nome: input.nome,
        email,
        desconto_pct: input.descontoPct,
        api_key_hash: hash,
        api_key_prefix: prefix,
        ativo: true,
      } as any)
      .select("id")
      .maybeSingle();
    if (error || !created) return { ok: false, error: error?.message ?? "insert falhou" };
    resellerId = String((created as any).id);
  }

  const emailed = await sendKeyEmail(email, input.nome, key, input.descontoPct, !!existing);
  return { ok: true, apiKey: key, resellerId, emailed };
}

/** Reemite a chave de um revendedor já existente (fluxo "esqueci minha chave"). */
export async function reissueResellerKey(email: string): Promise<{ ok: boolean; error?: string }> {
  const mail = email.trim().toLowerCase();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("resellers" as any)
    .select("id, nome, desconto_pct, ativo")
    .eq("email", mail)
    .maybeSingle();
  const r = data as any;
  // Resposta genérica no chamador: nunca revelar se o e-mail existe.
  if (!r || r.ativo !== true) return { ok: true };

  const { generateApiKey, hashApiKey } = await import("@/lib/reseller-api.server");
  const { key, prefix } = generateApiKey();
  const { error } = await supabaseAdmin
    .from("resellers" as any)
    .update({ api_key_hash: await hashApiKey(key), api_key_prefix: prefix } as any)
    .eq("id", r.id);
  if (error) return { ok: false, error: error.message };

  await sendKeyEmail(mail, String(r.nome), key, Number(r.desconto_pct ?? 0), true);
  return { ok: true };
}
