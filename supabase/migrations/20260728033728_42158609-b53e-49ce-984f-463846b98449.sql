GRANT SELECT ON public.catalog_changes TO authenticated;
GRANT ALL ON public.catalog_changes TO service_role;
DROP POLICY IF EXISTS "director_read_catalog_changes" ON public.catalog_changes;
CREATE POLICY "director_read_catalog_changes"
ON public.catalog_changes FOR SELECT TO authenticated
USING (public.is_director());