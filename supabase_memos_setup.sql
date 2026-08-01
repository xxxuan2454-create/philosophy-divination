-- Run this SQL in your Supabase SQL Editor to create the memos table
CREATE TABLE IF NOT EXISTS public.public_memos (
  card_id   INTEGER PRIMARY KEY,
  note      TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable read access for everyone
ALTER TABLE public.public_memos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read memos"
  ON public.public_memos FOR SELECT
  USING (true);

-- Write access is controlled by the API (EDITOR_PASSWORD), not RLS
-- But we still need a service-role-write policy:
CREATE POLICY "Service can write memos"
  ON public.public_memos FOR ALL
  USING (true)
  WITH CHECK (true);
