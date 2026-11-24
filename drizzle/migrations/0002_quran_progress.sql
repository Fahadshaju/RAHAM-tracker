CREATE TABLE public.quran_progress (
  user_id uuid PRIMARY KEY,
  read_juz int[] NOT NULL DEFAULT '{}',
  last_juz int NOT NULL DEFAULT 1,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quran_progress TO authenticated;
GRANT ALL ON public.quran_progress TO service_role;
ALTER TABLE public.quran_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own quran progress" ON public.quran_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);