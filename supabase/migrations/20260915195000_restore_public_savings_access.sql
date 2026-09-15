-- Temporary public access for the Savings dashboard without a login.
-- Revoke this migration when authenticated access is introduced.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classification_rules TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_base_mappings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.week_notes TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_imports TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weekly_items TO anon;

CREATE POLICY "public access" ON public.classification_rules
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public access" ON public.service_base_mappings
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public access" ON public.week_notes
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public access" ON public.weekly_imports
  FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "public access" ON public.weekly_items
  FOR ALL TO anon USING (true) WITH CHECK (true);
