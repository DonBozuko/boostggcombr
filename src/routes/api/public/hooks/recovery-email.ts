import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

// v231 — Recuperação automática por e-mail (1 envio por pedido).
// Varre pedidos com Pix pendente entre 30min e 24h que têm e-mail real salvo
// e ainda não receberam o e-mail de recuperação. Enfileira template 'cart-recovery'.
// Isolado dos demais crons: não altera dispatch, reconciliador nem a fila do painel.
export const Route = createFileRoute('/api/public/hooks/recovery-email')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const adminToken = request.headers.get('x-admin-token')
        if (
          !adminToken ||
          (adminToken !== process.env.ADMIN_TOKEN && adminToken !== process.env.CRON_ADMIN_TOKEN)
        ) {
          return Response.json({ error: 'unauthorized' }, { status: 401 })
        }

        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } },
        )

        const now = Date.now()
        const from = new Date(now - 24 * 60 * 60 * 1000).toISOString()
        const to = new Date(now - 30 * 60 * 1000).toISOString()

        // v315 — repescagem: pedido marcado como "enviado" cujo e-mail na verdade
        // falhou (failed/dlq) volta pra fila UMA vez. Sem isso, uma falha
        // passageira do provedor de e-mail apagava a recuperação em silêncio.
        let repescados = 0
        try {
          const { data: falhos } = await supabase
            .from('email_send_log')
            .select('message_id, status')
            .eq('template_name', 'cart-recovery')
            .in('status', ['failed', 'dlq'])
            .gte('created_at', from)
            .limit(100)

          const ids = new Set<string>()
          for (const row of falhos ?? []) {
            const m = String(row.message_id ?? '').match(/^cart-recovery-([0-9a-f-]{36})-t(\d+)$/)
            // só repesca quem ainda não passou de 2 tentativas
            if (m && Number(m[2]) < 2) ids.add(m[1])
          }

          if (ids.size > 0) {
            const { data: voltaram } = await supabase
              .from('pedidos')
              .update({ recovery_email_sent_at: null })
              .in('id', Array.from(ids))
              .in('status', ['pending', 'mp_pending', 'mp_in_process'])
              .select('id')
            repescados = voltaram?.length ?? 0
          }
        } catch (e) {
          console.warn('[recovery-email] repescagem falhou', e)
        }


        const { data: pedidos, error } = await supabase
          .from('pedidos')
          .select('id, email_contato, instagram_user, pacote, rede_social, valor, status')
          .in('status', ['pending', 'mp_pending', 'mp_in_process'])
          .is('recovery_email_sent_at', null)
          .not('email_contato', 'is', null)
          .gte('created_at', from)
          .lte('created_at', to)
          .limit(50)

        if (error) {
          console.error('[recovery-email] query', error)
          return Response.json({ error: 'query_failed' }, { status: 500 })
        }

        let enqueued = 0
        let skipped = 0

        for (const p of pedidos ?? []) {
          const email = String(p.email_contato ?? '').trim().toLowerCase()
          const isFake =
            !email ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
            email.endsWith('@webhook') ||
            email.includes('anonimizado') ||
            email.endsWith('eliteboostprime.com') // fallback do checkout, não é e-mail do cliente

          if (isFake) {
            // marca pra não reprocessar todo ciclo
            await supabase
              .from('pedidos')
              .update({ recovery_email_sent_at: new Date().toISOString() })
              .eq('id', p.id)
            skipped++
            continue
          }

          const { data: sup } = await supabase
            .from('suppressed_emails')
            .select('email')
            .eq('email', email)
            .maybeSingle()
          if (sup) {
            await supabase
              .from('pedidos')
              .update({ recovery_email_sent_at: new Date().toISOString() })
              .eq('id', p.id)
            skipped++
            continue
          }

          // v315 — chave de reenvio por tentativa.
          // Antes a chave era fixa por pedido. Quando a 1ª tentativa falhava,
          // toda repetição voltava 409 "already failed, use a new idempotency key"
          // e o e-mail morria pra sempre (visto em 5 falhas + 1 DLQ no log real).
          const { count: tentativas } = await supabase
            .from('email_send_log')
            .select('id', { count: 'exact', head: true })
            .like('message_id', `cart-recovery-${p.id}%`)
          const attempt = (tentativas ?? 0) + 1

          const { enqueueTemplateEmail } = await import('@/lib/email-enqueue.server')
          const res = await enqueueTemplateEmail(supabase, {
            templateName: 'cart-recovery',
            recipientEmail: email,
            idempotencyKey: `cart-recovery-${p.id}-t${attempt}`,

            templateData: {
              instagramUser:
                p.instagram_user && p.instagram_user !== '[anonimizado-lgpd]'
                  ? p.instagram_user
                  : null,
              pacote: p.pacote ?? null,
              redeSocial: p.rede_social ?? null,
              valor: Number(p.valor ?? 0),
            },
          })

          if (!res.ok) {
            console.warn('[recovery-email] enqueue fail', p.id, res.reason)
            if (res.reason === 'suppressed' || res.reason === 'unsubscribed') {
              await supabase
                .from('pedidos')
                .update({ recovery_email_sent_at: new Date().toISOString() })
                .eq('id', p.id)
              skipped++
            }
            continue
          }


          await supabase
            .from('pedidos')
            .update({ recovery_email_sent_at: new Date().toISOString() })
            .eq('id', p.id)
          enqueued++
        }

        return Response.json({ ok: true, scanned: pedidos?.length ?? 0, enqueued, skipped, repescados })
      },
    },
  },
})
