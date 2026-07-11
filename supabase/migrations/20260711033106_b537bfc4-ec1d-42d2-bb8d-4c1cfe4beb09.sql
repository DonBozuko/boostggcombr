-- lgpd_requests: bloqueio explícito para anon e escritas por não-diretores
CREATE POLICY "lgpd_requests deny anon"
  ON public.lgpd_requests
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "lgpd_requests deny non-director writes"
  ON public.lgpd_requests
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_director());

CREATE POLICY "lgpd_requests deny non-director updates"
  ON public.lgpd_requests
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (public.is_director())
  WITH CHECK (public.is_director());

CREATE POLICY "lgpd_requests deny non-director deletes"
  ON public.lgpd_requests
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (public.is_director());

-- webhook_events: bloqueio explícito para anon e authenticated (só service_role acessa)
CREATE POLICY "webhook_events deny anon"
  ON public.webhook_events
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

CREATE POLICY "webhook_events deny authenticated"
  ON public.webhook_events
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);