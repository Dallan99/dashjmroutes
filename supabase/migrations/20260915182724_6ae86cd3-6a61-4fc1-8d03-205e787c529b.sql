-- 1. Remove permissive "public access" policies
DROP POLICY IF EXISTS "public access" ON public.classification_rules;
DROP POLICY IF EXISTS "public access" ON public.service_base_mappings;
DROP POLICY IF EXISTS "public access" ON public.week_notes;
DROP POLICY IF EXISTS "public access" ON public.weekly_imports;
DROP POLICY IF EXISTS "public access" ON public.weekly_items;
DROP POLICY IF EXISTS "public access" ON public.jm_column_mappings;
DROP POLICY IF EXISTS "public access" ON public.jm_entries;
DROP POLICY IF EXISTS "public access" ON public.jm_imports;
DROP POLICY IF EXISTS "public access" ON public.jm_notes;

-- 2. Authenticated-only policies for jm_* tables
CREATE POLICY "jm_column_mappings_auth_all" ON public.jm_column_mappings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "jm_imports_auth_all" ON public.jm_imports
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "jm_entries_auth_all" ON public.jm_entries
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "jm_notes_auth_all" ON public.jm_notes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Revoke anon table privileges
REVOKE ALL ON public.classification_rules FROM anon;
REVOKE ALL ON public.service_base_mappings FROM anon;
REVOKE ALL ON public.week_notes FROM anon;
REVOKE ALL ON public.weekly_imports FROM anon;
REVOKE ALL ON public.weekly_items FROM anon;
REVOKE ALL ON public.jm_column_mappings FROM anon;
REVOKE ALL ON public.jm_entries FROM anon;
REVOKE ALL ON public.jm_imports FROM anon;
REVOKE ALL ON public.jm_notes FROM anon;

-- 4. Ensure authenticated/service_role grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classification_rules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_base_mappings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.week_notes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_imports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jm_column_mappings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jm_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jm_imports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.jm_notes TO authenticated;
GRANT ALL ON public.classification_rules TO service_role;
GRANT ALL ON public.service_base_mappings TO service_role;
GRANT ALL ON public.week_notes TO service_role;
GRANT ALL ON public.weekly_imports TO service_role;
GRANT ALL ON public.weekly_items TO service_role;
GRANT ALL ON public.jm_column_mappings TO service_role;
GRANT ALL ON public.jm_entries TO service_role;
GRANT ALL ON public.jm_imports TO service_role;
GRANT ALL ON public.jm_notes TO service_role;

-- 5. SECURITY DEFINER function must not be callable from the Data API
REVOKE ALL ON FUNCTION public.finalize_weekly_import(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_weekly_import(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.concluir_importacao_semanal(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.concluir_importacao_semanal(uuid) TO authenticated, service_role;