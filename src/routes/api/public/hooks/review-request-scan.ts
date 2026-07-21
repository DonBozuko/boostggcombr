import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'

// Escaneia pedidos entregues 24h+ atrás com e-mail salvo e ainda não notificados,
// enfileirando um pedido de avaliação (template review-request). Cap 50/run.
export const Route = createFileRoute('/api/public/hooks/review-request-scan')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const adminToken = request.headers.get('x-admin-token')
        if (!adminToken || (adminToken !== process.env.ADMIN_TOKEN && adminToken !== process.env.CRON_ADMIN_TOKEN)) {
          return new Response(JSON.stringify({ error: 'unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } },
        )

        const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
        const { data: pedidos, error } = await supabase
          .from('pedidos')
          .select('id, email_contato, instagram_user, pacote')
          .eq('status', 'completed')
          .is('review_email_sent_at', null)
          .not('email_contato', 'is', null)
          .lt('created_at', cutoff)
          .limit(50)

        if (error) {
          console.error('[review-scan] query', error)
          return new Response(JSON.stringify({ error: 'query_failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          })
        }

        let enqueued = 0
        let skipped = 0
        for (const p of pedidos ?? []) {
          const email = String(p.email_contato ?? '').toLowerCase()
          if (!email || email.endsWith('@webhook') || email.includes('anonimizado')) {
            skipped++
            continue
          }
          // Checar supressão
          const { data: sup } = await supabase
            .from('suppressed_emails')
            .select('email')
            .eq('email', email)
            .maybeSingle()
          if (sup) {
            await supabase.from('pedidos').update({ review_email_sent_at: new Date().toISOString() }).eq('id', p.id)
            skipped++
            continue
          }

          const { error: enqErr } = await supabase.rpc('enqueue_email' as any, {
            queue_name: 'transactional_emails',
            payload: {
              template_name: 'review-request',
              recipient_email: email,
              idempotency_key: `review-request-${p.id}`,
              template_data: {
                instagramUser: p.instagram_user && p.instagram_user !== '[anonimizado-lgpd]' ? p.instagram_user : null,
                pacote: p.pacote ?? null,
              },
            },
          })
          if (enqErr) {
            console.warn('[review-scan] enqueue fail', p.id, enqErr)
            continue
          }
          await supabase.from('pedidos').update({ review_email_sent_at: new Date().toISOString() }).eq('id', p.id)
          enqueued++
        }

        return new Response(JSON.stringify({ enqueued, skipped, scanned: pedidos?.length ?? 0 }), {
          headers: { 'Content-Type': 'application/json' },
        })
      },
    },
  },
})
