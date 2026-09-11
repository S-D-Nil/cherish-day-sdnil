CREATE TABLE public.birthdays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  day TEXT NOT NULL,
  month TEXT NOT NULL,
  year TEXT NOT NULL,
  gift_idea TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.birthdays TO anon, authenticated;
GRANT ALL ON public.birthdays TO service_role;

ALTER TABLE public.birthdays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view birthdays"
  ON public.birthdays FOR SELECT
  USING (true);

CREATE POLICY "Anyone can add birthdays"
  ON public.birthdays FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can edit birthdays"
  ON public.birthdays FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can remove birthdays"
  ON public.birthdays FOR DELETE
  USING (true);