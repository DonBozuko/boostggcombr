
-- checkout_attempts: explicit deny for anon/authenticated
DROP POLICY IF EXISTS "Deny anon access to checkout_attempts" ON public.checkout_attempts;
CREATE POLICY "Deny anon access to checkout_attempts"
  ON public.checkout_attempts
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny authenticated access to checkout_attempts" ON public.checkout_attempts;
CREATE POLICY "Deny authenticated access to checkout_attempts"
  ON public.checkout_attempts
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON public.checkout_attempts FROM anon, authenticated;

-- pix_recovery_queue: explicit deny for anon/authenticated
DROP POLICY IF EXISTS "Deny anon access to pix_recovery_queue" ON public.pix_recovery_queue;
CREATE POLICY "Deny anon access to pix_recovery_queue"
  ON public.pix_recovery_queue
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Deny authenticated access to pix_recovery_queue" ON public.pix_recovery_queue;
CREATE POLICY "Deny authenticated access to pix_recovery_queue"
  ON public.pix_recovery_queue
  AS RESTRICTIVE
  FOR ALL
  TO authenticated
  USING (false)
  WITH CHECK (false);

REVOKE ALL ON public.pix_recovery_queue FROM anon, authenticated;
