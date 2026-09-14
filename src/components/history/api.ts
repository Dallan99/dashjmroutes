import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { LinhaValida, Mapping } from "./parse";

export type Entry = {
  id: string;
  import_id: string | null;
  week_label: string;
  year: number;
  base: string;
  category: string | null;
  description: string | null;
  quantity: number | null;
  amount: number;
  note: string | null;
  extra: Record<string, unknown>;
};

export type ImportRow = {
  id: string;
  file_name: string;
  file_hash: string;
  sheet_name: string | null;
  week_label: string;
  year: number;
  valid_rows: number;
  rejected_rows: number;
  created_at: string;
};

export type NoteRow = {
  id: string;
  week_label: string;
  year: number;
  base: string | null;
  note: string;
};

export const chaveSemana = (year: number, week: string) => `${year}-${week}`;

export function useEntries() {
  return useQuery({
    queryKey: ["jm_entries"],
    queryFn: async (): Promise<Entry[]> => {
      const { data, error } = await supabase
        .from("jm_entries")
        .select("*")
        .order("year", { ascending: true })
        .order("week_label", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as Entry[];
    },
  });
}

export function useImports() {
  return useQuery({
    queryKey: ["jm_imports"],
    queryFn: async (): Promise<ImportRow[]> => {
      const { data, error } = await supabase
        .from("jm_imports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ImportRow[];
    },
  });
}

export function useNotes() {
  return useQuery({
    queryKey: ["jm_notes"],
    queryFn: async (): Promise<NoteRow[]> => {
      const { data, error } = await supabase.from("jm_notes").select("*");
      if (error) throw error;
      return (data ?? []) as unknown as NoteRow[];
    },
  });
}

export async function salvarObservacao(params: {
  year: number;
  week_label: string;
  base: string | null;
  note: string;
}) {
  const { data: existente } = await supabase
    .from("jm_notes")
    .select("id")
    .eq("year", params.year)
    .eq("week_label", params.week_label)
    .is("base", params.base === null ? null : undefined)
    .maybeSingle();

  if (params.base === null && existente?.id) {
    const { error } = await supabase.from("jm_notes").update({ note: params.note }).eq("id", existente.id);
    if (error) throw error;
    return;
  }

  if (params.base !== null) {
    const { data: comBase } = await supabase
      .from("jm_notes")
      .select("id")
      .eq("year", params.year)
      .eq("week_label", params.week_label)
      .eq("base", params.base)
      .maybeSingle();
    if (comBase?.id) {
      const { error } = await supabase.from("jm_notes").update({ note: params.note }).eq("id", comBase.id);
      if (error) throw error;
      return;
    }
  }

  const { error } = await supabase.from("jm_notes").insert(params as never);
  if (error) throw error;
}

export async function buscarMapeamentoSalvo(signature: string): Promise<Mapping | null> {
  const { data } = await supabase
    .from("jm_column_mappings")
    .select("mapping")
    .eq("signature", signature)
    .maybeSingle();
  return (data?.mapping as Mapping | undefined) ?? null;
}

export async function salvarMapeamento(signature: string, label: string, mapping: Mapping) {
  const { data } = await supabase
    .from("jm_column_mappings")
    .select("id")
    .eq("signature", signature)
    .maybeSingle();
  if (data?.id) {
    await supabase.from("jm_column_mappings").update({ mapping, label } as never).eq("id", data.id);
  } else {
    await supabase.from("jm_column_mappings").insert({ signature, label, mapping } as never);
  }
}

export async function checarDuplicidade(params: { hash: string; year: number; week_label: string }) {
  const { data: porHash } = await supabase
    .from("jm_imports")
    .select("id, file_name, created_at")
    .eq("file_hash", params.hash);
  const { data: porSemana } = await supabase
    .from("jm_imports")
    .select("id, file_name, created_at")
    .eq("year", params.year)
    .eq("week_label", params.week_label);
  return {
    mesmoArquivo: (porHash ?? []).length > 0,
    mesmaSemana: (porSemana ?? []) as { id: string; file_name: string; created_at: string }[],
  };
}

export async function gravarImportacao(params: {
  fileName: string;
  hash: string;
  sheetName: string;
  week_label: string;
  year: number;
  mapping: Mapping;
  validas: LinhaValida[];
  rejeitadas: number;
  substituirSemana: boolean;
}) {
  if (params.substituirSemana) {
    await supabase
      .from("jm_entries")
      .delete()
      .eq("year", params.year)
      .eq("week_label", params.week_label);
    await supabase
      .from("jm_imports")
      .delete()
      .eq("year", params.year)
      .eq("week_label", params.week_label);
  }

  const { data, error } = await supabase
    .from("jm_imports")
    .insert({
      file_name: params.fileName,
      file_hash: params.hash,
      sheet_name: params.sheetName,
      week_label: params.week_label,
      year: params.year,
      valid_rows: params.validas.length,
      rejected_rows: params.rejeitadas,
      mapping: params.mapping,
    } as never)
    .select("id")
    .single();
  if (error) throw error;

  const importId = (data as { id: string }).id;
  const chunk = 400;
  for (let i = 0; i < params.validas.length; i += chunk) {
    const lote = params.validas.slice(i, i + chunk).map((l) => ({ ...l, import_id: importId }));
    const { error: errLote } = await supabase.from("jm_entries").insert(lote as never);
    if (errLote) throw errLote;
  }
  return importId;
}
