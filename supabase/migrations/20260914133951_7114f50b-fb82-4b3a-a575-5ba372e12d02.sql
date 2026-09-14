CREATE TABLE public.jm_column_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signature text NOT NULL UNIQUE,
  label text,
  mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.jm_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name text NOT NULL,
  file_hash text NOT NULL,
  sheet_name text,
  week_label text NOT NULL,
  year integer NOT NULL,
  valid_rows integer NOT NULL DEFAULT 0,
  rejected_rows integer NOT NULL DEFAULT 0,
  mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jm_imports_week_idx ON public.jm_imports (year, week_label);
CREATE INDEX jm_imports_hash_idx ON public.jm_imports (file_hash);

CREATE TABLE public.jm_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id uuid REFERENCES public.jm_imports(id) ON DELETE CASCADE,
  week_label text NOT NULL,
  year integer NOT NULL,
  base text NOT NULL,
  category text,
  description text,
  quantity numeric,
  amount numeric NOT NULL DEFAULT 0,
  note text,
  extra jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX jm_entries_week_idx ON public.jm_entries (year, week_label);
CREATE INDEX jm_entries_base_idx ON public.jm_entries (base);

CREATE TABLE public.jm_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_label text NOT NULL,
  year integer NOT NULL,
  base text,
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX jm_notes_unique_idx ON public.jm_notes (year, week_label, COALESCE(base, ''));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.jm_column_mappings TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jm_imports TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jm_entries TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jm_notes TO anon, authenticated;
GRANT ALL ON public.jm_column_mappings TO service_role;
GRANT ALL ON public.jm_imports TO service_role;
GRANT ALL ON public.jm_entries TO service_role;
GRANT ALL ON public.jm_notes TO service_role;

ALTER TABLE public.jm_column_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jm_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jm_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jm_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public access" ON public.jm_column_mappings FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public access" ON public.jm_imports FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public access" ON public.jm_entries FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "public access" ON public.jm_notes FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER jm_column_mappings_updated BEFORE UPDATE ON public.jm_column_mappings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER jm_imports_updated BEFORE UPDATE ON public.jm_imports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER jm_entries_updated BEFORE UPDATE ON public.jm_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER jm_notes_updated BEFORE UPDATE ON public.jm_notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();