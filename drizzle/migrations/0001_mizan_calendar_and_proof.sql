CREATE POLICY "Upload own Fajr proof" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'fajr-proof' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Read own Fajr proof" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'fajr-proof' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Delete own Fajr proof" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'fajr-proof' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE TABLE public.app_user_connections (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, connector_id text NOT NULL, connection_key_ciphertext text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), UNIQUE(user_id, connector_id));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_user_connections TO service_role;
ALTER TABLE public.app_user_connections ENABLE ROW LEVEL SECURITY;