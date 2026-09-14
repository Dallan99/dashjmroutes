import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export type WeeklyImportSummary = {
  id: string;
  week_code: string;
  year: number;
  week_number: number;
  imported_at: string | null;
  file_name: string;
  status: string | null;
  items_count: number;
  bases_count: number;
};

export type WeeklyItem = {
  id: string;
  import_id: string;
  base: string | null;
  service: string | null;
  package_id: string | null;
  route_id: string | null;
  driver: string | null;
  description: string | null;
  event_date: string | null;
  amount: number | null;
  operational_status: string | null;
  classification: string | null;
  decision: string | null;
  evidence_url: string | null;
  extra_data: Json | null;
};

export type ClassificationRule = {
  id: string;
  classification: string;
  category: string;
  active: boolean | null;
  created_at: string | null;
};

export type WeekNote = {
  id: string;
  import_id: string;
  base: string | null;
  note: string;
  created_at: string | null;
};

export type WeeklyItemsClassificationGroup = {
  key: string;
  category: string;
  items: WeeklyItem[];
  items_count: number;
  amount_total: number;
};

function normalizarBase(base: string | null) {
  return base?.trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR") ?? "";
}

/**
 * Lista exclusivamente as importações semanais concluídas, da mais recente
 * para a mais antiga. As contagens de itens e bases são derivadas de weekly_items.
 */
export function useWeeklyImports() {
  return useQuery({
    queryKey: ["weekly_imports", "completed"],
    queryFn: async (): Promise<WeeklyImportSummary[]> => {
      const { data: imports, error: importsError } = await supabase
        .from("weekly_imports")
        .select("id, week_code, year, week_number, imported_at, file_name, status")
        .eq("status", "completed")
        .order("year", { ascending: false })
        .order("week_number", { ascending: false });

      if (importsError) throw importsError;
      if (!imports?.length) return [];

      const importIds = imports.map((item) => item.id);
      const { data: itemReferences, error: itemsError } = await supabase
        .from("weekly_items")
        .select("import_id, base")
        .in("import_id", importIds);

      if (itemsError) throw itemsError;

      const totalsByImport = new Map<string, { items: number; bases: Set<string> }>();
      for (const item of itemReferences ?? []) {
        const current = totalsByImport.get(item.import_id) ?? { items: 0, bases: new Set<string>() };
        current.items += 1;

        const base = normalizarBase(item.base);
        if (base) current.bases.add(base);

        totalsByImport.set(item.import_id, current);
      }

      return imports.map((item) => {
        const totals = totalsByImport.get(item.id);
        return {
          ...item,
          items_count: totals?.items ?? 0,
          bases_count: totals?.bases.size ?? 0,
        };
      });
    },
  });
}

/** Consulta os registros reais vinculados à importação semanal escolhida. */
export function useWeeklyItems(importId: string | null | undefined) {
  return useQuery({
    queryKey: ["weekly_items", importId],
    enabled: Boolean(importId),
    queryFn: async (): Promise<WeeklyItem[]> => {
      if (!importId) return [];

      const { data, error } = await supabase
        .from("weekly_items")
        .select(
          "id, import_id, base, service, package_id, route_id, driver, description, event_date, amount, operational_status, classification, decision, evidence_url, extra_data",
        )
        .eq("import_id", importId)
        .order("event_date", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Consulta os itens reais de todas as importações concluídas informadas. */
export function useWeeklyItemsForImports(importIds: string[]) {
  return useQuery({
    queryKey: ["weekly_items", "imports", importIds],
    enabled: importIds.length > 0,
    queryFn: async (): Promise<WeeklyItem[]> => {
      if (!importIds.length) return [];

      const { data, error } = await supabase
        .from("weekly_items")
        .select(
          "id, import_id, base, service, package_id, route_id, driver, description, event_date, amount, operational_status, classification, decision, evidence_url, extra_data",
        )
        .in("import_id", importIds);

      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Observações registradas para a importação semanal selecionada. */
export function useWeekNotes(importId: string | null | undefined) {
  return useQuery({
    queryKey: ["week_notes", importId],
    enabled: Boolean(importId),
    queryFn: async (): Promise<WeekNote[]> => {
      if (!importId) return [];

      const { data, error } = await supabase
        .from("week_notes")
        .select("id, import_id, base, note, created_at")
        .eq("import_id", importId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}

/** Deriva as bases disponíveis apenas dos itens reais da importação selecionada. */
export function useWeeklyBases(importId: string | null | undefined) {
  const itemsQuery = useWeeklyItems(importId);

  const bases = Array.from(
    new Map(
      (itemsQuery.data ?? [])
        .filter((item) => normalizarBase(item.base))
        .map((item) => [normalizarBase(item.base), item.base?.trim() ?? ""]),
    ).values(),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  return {
    ...itemsQuery,
    data: bases,
  };
}

/**
 * Agrupa itens reais pela categoria da regra ativa correspondente.
 * Itens sem classificação ou sem uma regra ativa permanecem, sem qualquer
 * inferência financeira, no grupo sem_classificacao_regra.
 */
export function groupWeeklyItemsByActiveClassification(
  items: WeeklyItem[],
  activeRules: ClassificationRule[],
): WeeklyItemsClassificationGroup[] {
  const rulesByClassification = new Map(
    activeRules
      .filter((rule) => rule.active)
      .map((rule) => [
        rule.classification.trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR"),
        rule.category.trim(),
      ]),
  );

  const groups = new Map<string, WeeklyItemsClassificationGroup>();

  for (const item of items) {
    const classificationKey = item.classification
      ?.trim()
      .replace(/\s+/g, " ")
      .toLocaleUpperCase("pt-BR");
    const category = classificationKey ? rulesByClassification.get(classificationKey) : undefined;
    const key = category
      ? `categoria:${category.toLocaleUpperCase("pt-BR")}`
      : "sem_classificacao_regra";
    const group = groups.get(key) ?? {
      key,
      category: category || "Sem classificação por regra",
      items: [],
      items_count: 0,
      amount_total: 0,
    };

    group.items.push(item);
    group.items_count += 1;
    if (typeof item.amount === "number" && Number.isFinite(item.amount)) {
      group.amount_total += item.amount;
    }
    groups.set(key, group);
  }

  return Array.from(groups.values()).sort((first, second) => {
    if (first.key === "sem_classificacao_regra") return 1;
    if (second.key === "sem_classificacao_regra") return -1;
    return first.category.localeCompare(second.category, "pt-BR");
  });
}

/** Regras de classificação ativas para agrupamentos do Savings. */
export function useActiveClassificationRules() {
  return useQuery({
    queryKey: ["classification_rules", "active"],
    queryFn: async (): Promise<ClassificationRule[]> => {
      const { data, error } = await supabase
        .from("classification_rules")
        .select("id, classification, category, active, created_at")
        .eq("active", true)
        .order("classification", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}
