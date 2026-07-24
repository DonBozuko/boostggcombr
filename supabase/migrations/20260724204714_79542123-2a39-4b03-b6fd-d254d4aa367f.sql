UPDATE public.jarvis_alerts
SET severidade = 'warning',
    mensagem = '✅ RESOLVIDO — ' || mensagem
WHERE created_at > now() - interval '6 hours'
  AND severidade = 'critical'
  AND origem = 'ops-audit'
  AND mensagem LIKE '%dry-run-catalog%'
  AND mensagem NOT LIKE '✅ RESOLVIDO%';