import { supabase } from "@/integrations/supabase/client";
import type { WeeklyImportSummary } from "./weekly-api";

export type DeletionConfirmation = Pick<WeeklyImportSummary, "id" | "file_name" | "year" | "week_number" | "week_code" | "is_current"> & {
  items_count: number;
  notes_count: number;
};

export async function prepareWeeklyDeletion(id: string): Promise<DeletionConfirmation> {
  const [header, items, notes] = await Promise.all([
    supabase.from("weekly_imports").select("id, file_name, year, week_number, week_code, status, is_current").eq("id", id).single(),
    supabase.from("weekly_items").select("id", { count: "exact", head: true }).eq("import_id", id),
    supabase.from("week_notes").select("id", { count: "exact", head: true }).eq("import_id", id),
  ]);
  if (header.error) throw header.error;
  if (items.error) throw items.error;
  if (notes.error) throw notes.error;
  if (header.data.status === "processing") throw new Error("Aguarde o término do processamento antes de excluir.");
  if (items.count === null || notes.count === null) throw new Error("Não foi possível conferir a quantidade de registros.");
  return { ...header.data, items_count: items.count, notes_count: notes.count };
}

export async function deleteConfirmedWeeklyImport(confirmation: DeletionConfirmation) {
  const { data, error } = await supabase.rpc("delete_weekly_import_safely", {
    p_import_id: confirmation.id,
    p_file_name: confirmation.file_name,
    p_year: confirmation.year,
    p_week_number: confirmation.week_number,
    p_items_count: confirmation.items_count,
    p_notes_count: confirmation.notes_count,
  });
  if (error) throw error;
  if (!data || typeof data !== "object" || Array.isArray(data) || data.deleted_import_id !== confirmation.id) {
    throw new Error("Não foi possível confirmar a exclusão. Atualize o histórico antes de tentar novamente.");
  }
  return data;
}

export function deletionError(error: unknown) {
  return error && typeof error === "object" && "message" in error && typeof error.message === "string"
    ? error.message
    : "Não foi possível concluir a exclusão. Atualize o histórico e tente novamente.";
}