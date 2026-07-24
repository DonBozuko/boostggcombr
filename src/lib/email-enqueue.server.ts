// v232 — Helper único de enfileiramento de e-mail transacional.
// Motivo: rotas de cron enfileiravam payload cru ({template_name, recipient_email}),
// mas o processador da fila (/lovable/email/queue/process) espera payload JÁ RENDERIZADO
// ({to, from, sender_domain, subject, html, text, label, message_id, unsubscribe_token}).
// Resultado do bug: mensagem ficava girando na fila e morria no DLQ sem envio.
import * as React from 'react'
import { render } from '@react-email/render'
import type { SupabaseClient } from '@supabase/supabase-js'
import { TEMPLATES } from '@/lib/email-templates/registry'

const SITE_NAME = 'BoostGG'
const SENDER_DOMAIN = 'contador.boostgg.com.br'
const FROM_DOMAIN = 'boostgg.com.br'

function generateToken(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export type EnqueueResult =
  | { ok: true; messageId: string }
  | { ok: false; reason: string }

export async function enqueueTemplateEmail(
  supabase: SupabaseClient<any, any>,
  params: {
    templateName: string
    recipientEmail: string
    idempotencyKey?: string
    templateData?: Record<string, any>
  },
): Promise<EnqueueResult> {
  const template = TEMPLATES[params.templateName]
  if (!template) return { ok: false, reason: 'template_not_found' }

  const recipient = (template.to || params.recipientEmail || '').trim().toLowerCase()
  if (!recipient) return { ok: false, reason: 'no_recipient' }

  const messageId = crypto.randomUUID()
  const idempotencyKey = params.idempotencyKey || messageId
  const templateData = params.templateData ?? {}

  // Supressão (fail-closed)
  const { data: suppressed, error: supErr } = await supabase
    .from('suppressed_emails')
    .select('id')
    .eq('email', recipient)
    .maybeSingle()
  if (supErr) return { ok: false, reason: 'suppression_check_failed' }
  if (suppressed) {
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: params.templateName,
      recipient_email: recipient,
      status: 'suppressed',
    })
    return { ok: false, reason: 'suppressed' }
  }

  // Token de descadastro (1 por e-mail)
  let unsubscribeToken: string
  const { data: existing, error: tokErr } = await supabase
    .from('email_unsubscribe_tokens')
    .select('token, used_at')
    .eq('email', recipient)
    .maybeSingle()
  if (tokErr) return { ok: false, reason: 'token_lookup_failed' }

  if (existing && !existing.used_at) {
    unsubscribeToken = existing.token
  } else if (!existing) {
    unsubscribeToken = generateToken()
    const { error: insErr } = await supabase
      .from('email_unsubscribe_tokens')
      .upsert({ token: unsubscribeToken, email: recipient }, { onConflict: 'email', ignoreDuplicates: true })
    if (insErr) return { ok: false, reason: 'token_create_failed' }
    const { data: stored } = await supabase
      .from('email_unsubscribe_tokens')
      .select('token')
      .eq('email', recipient)
      .maybeSingle()
    if (!stored?.token) return { ok: false, reason: 'token_readback_failed' }
    unsubscribeToken = stored.token
  } else {
    return { ok: false, reason: 'unsubscribed' }
  }

  // Render
  const element = React.createElement(template.component, templateData)
  const html = await render(element)
  const text = await render(element, { plainText: true })
  const subject =
    typeof template.subject === 'function' ? template.subject(templateData) : template.subject

  await supabase.from('email_send_log').insert({
    message_id: messageId,
    template_name: params.templateName,
    recipient_email: recipient,
    status: 'pending',
  })

  const { error: enqErr } = await supabase.rpc('enqueue_email' as any, {
    queue_name: 'transactional_emails',
    payload: {
      message_id: messageId,
      to: recipient,
      from: `${SITE_NAME} <noreply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text,
      purpose: 'transactional',
      label: params.templateName,
      idempotency_key: idempotencyKey,
      unsubscribe_token: unsubscribeToken,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqErr) {
    await supabase.from('email_send_log').insert({
      message_id: messageId,
      template_name: params.templateName,
      recipient_email: recipient,
      status: 'failed',
      error_message: 'Failed to enqueue email',
    })
    return { ok: false, reason: 'enqueue_failed' }
  }

  return { ok: true, messageId }
}
