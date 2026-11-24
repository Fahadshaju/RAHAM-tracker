DROP POLICY IF EXISTS "Read sample journal" ON public.mizan_samples;
REVOKE ALL ON public.mizan_samples FROM anon, authenticated;
GRANT ALL ON public.mizan_samples TO service_role;