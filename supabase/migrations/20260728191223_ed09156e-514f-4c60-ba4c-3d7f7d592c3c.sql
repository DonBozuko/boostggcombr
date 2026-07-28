DELETE FROM public.email_send_log p
WHERE p.status = 'pending'
  AND EXISTS (
    SELECT 1 FROM public.email_send_log s
    WHERE s.message_id = p.message_id AND s.status = 'sent'
  );