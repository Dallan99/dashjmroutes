CREATE OR REPLACE FUNCTION public.delete_weekly_import_safely(p_import_id uuid, p_file_name text, p_year integer, p_week_number integer, p_items_count integer, p_notes_count integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_import public.weekly_imports%ROWTYPE;
  v_items integer;
  v_notes integer;
  v_affected integer;
  v_current uuid;
BEGIN
  -- Serialize the short deletion with inserts/finalization; all failures roll back.
  LOCK TABLE public.weekly_imports, public.weekly_items, public.week_notes IN SHARE ROW EXCLUSIVE MODE;
  SELECT * INTO v_import FROM public.weekly_imports WHERE id = p_import_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Importação não encontrada ou sem permissão para excluir.'; END IF;
  IF v_import.status = 'processing' THEN RAISE EXCEPTION 'Aguarde o término do processamento antes de excluir.'; END IF;
  IF v_import.file_name IS DISTINCT FROM p_file_name OR v_import.year IS DISTINCT FROM p_year OR v_import.week_number IS DISTINCT FROM p_week_number THEN
    RAISE EXCEPTION 'A importação mudou. Atualize o histórico e confirme novamente.';
  END IF;
  SELECT count(*) INTO v_items FROM public.weekly_items WHERE import_id = p_import_id;
  SELECT count(*) INTO v_notes FROM public.week_notes WHERE import_id = p_import_id;
  IF p_items_count IS NULL OR p_notes_count IS NULL OR v_items <> p_items_count OR v_notes <> p_notes_count THEN
    RAISE EXCEPTION 'A quantidade de registros mudou. Atualize o histórico e confirme novamente.';
  END IF;
  DELETE FROM public.weekly_items WHERE import_id = p_import_id;
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  IF v_affected <> v_items THEN RAISE EXCEPTION 'Sem permissão para excluir todos os registros. Nada foi removido.'; END IF;
  DELETE FROM public.week_notes WHERE import_id = p_import_id;
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  IF v_affected <> v_notes THEN RAISE EXCEPTION 'Sem permissão para excluir todas as observações. Nada foi removido.'; END IF;
  UPDATE public.weekly_imports SET superseded_by = NULL, superseded_at = NULL
  WHERE superseded_by = p_import_id AND year = v_import.year AND week_number = v_import.week_number;
  DELETE FROM public.weekly_imports WHERE id = p_import_id;
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  IF v_affected <> 1 THEN RAISE EXCEPTION 'Sem permissão para excluir a importação. Nada foi removido.'; END IF;
  IF v_import.is_current THEN
    SELECT id INTO v_current FROM public.weekly_imports
    WHERE year = v_import.year AND week_number = v_import.week_number AND status = 'completed'
    ORDER BY imported_at DESC NULLS LAST, id DESC LIMIT 1;
    UPDATE public.weekly_imports SET is_current = false
    WHERE year = v_import.year AND week_number = v_import.week_number AND is_current;
    IF EXISTS (SELECT 1 FROM public.weekly_imports WHERE year = v_import.year AND week_number = v_import.week_number AND is_current) THEN
      RAISE EXCEPTION 'Sem permissão para atualizar as versões. Nada foi removido.';
    END IF;
    IF v_current IS NOT NULL THEN
      UPDATE public.weekly_imports SET is_current = true, superseded_by = NULL, superseded_at = NULL WHERE id = v_current;
      GET DIAGNOSTICS v_affected = ROW_COUNT;
      IF v_affected <> 1 THEN RAISE EXCEPTION 'Sem permissão para restaurar a versão anterior. Nada foi removido.'; END IF;
      UPDATE public.weekly_imports SET superseded_by = v_current, superseded_at = now()
      WHERE year = v_import.year AND week_number = v_import.week_number AND status = 'completed' AND id <> v_current;
    END IF;
  END IF;
  RETURN jsonb_build_object('deleted_import_id', p_import_id, 'deleted_items', v_items, 'deleted_notes', v_notes, 'current_import_id', v_current);
END;
$$;
REVOKE ALL ON FUNCTION public.delete_weekly_import_safely(uuid, text, integer, integer, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_weekly_import_safely(uuid, text, integer, integer, integer, integer) TO authenticated, service_role;
COMMENT ON FUNCTION public.delete_weekly_import_safely(uuid, text, integer, integer, integer, integer) IS 'Atomic confirmed deletion; security invoker preserves existing table permissions and RLS.';