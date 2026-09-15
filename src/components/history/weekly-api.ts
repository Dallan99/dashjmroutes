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
  is_current: boolean;
  superseded_by: string | null;
  superseded_at: string | null;
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

export type WeeklyClassificationSurvey = {
  classification: string | null;
  records_count: number;
  weeks_count: number;
  bases_count: number;
  has_rule: boolean;
  has_active_rule: boolean;
  active_rules_count: number;
  inactive_rules_count: number;
  category: string | null;
};

/** Limite de negócio aplicado a cada operação em cada semana. */
export const LIMITE_SAUDAVEL_OPERACAO = 1000;

/** Catálogo oficial de operações exibido no Savings e no ranking. */
export const OPERACOES_OFICIAIS = {
  ESP15: "XPT Ibiúna",
  ESP16: "XPT Guarujá",
  ESP17: "XPT Embu Guaçu",
  ESP18: "Atibaia",
  SSC2: "Biguaçu",
  SSP15: "Santos",
  SSP17: "ABC",
  SSP20: "Sorocaba",
  SSP23: "Suzano",
  SSP3: "Campinas",
  SSP37: "Campinas",
  SSP38: "Itupeva",
  SSP45: "Itaquera",
  SSP5: "Mega Barueri",
  SSP6: "Mauá",
} as const;

export function nomeOperacao(base: string | null | undefined) {
  if (!base) return null;
  const chave = normalizarBase(base);
  return OPERACOES_OFICIAIS[chave as keyof typeof OPERACOES_OFICIAIS] ?? null;
}

export function rotuloOperacao(base: string | null | undefined) {
  if (!base || !base.trim() || base === "Sem base") return "Sem base";
  const chave = normalizarBase(base);
  const nome = nomeOperacao(chave);
  return nome ? `${chave} · ${nome}` : `${base.trim()} · Não cadastrada`;
}

/** Quantidade mínima reservada para futura elegibilidade de premiação. */
export const MIN_SEMANAS_RANKING = 1;

/** Parâmetros centralizados para a saúde operacional e o ranking histórico. */
export const SAVINGS_SAUDE_CONFIG = {
  LIMITE_SAUDAVEL_OPERACAO,
  MIN_SEMANAS_RANKING,
  CATEGORIA_OFENSA: "Perda",
} as const;

export type SemanaOperacao = {
  weekCode: string;
  valor: number;
};

export type RankingOperacao = {
  base: string;
  mediaSemanal: number;
  diferencaLimite: number;
  semanasAvaliadas: number;
  semanasSaudaveis: number;
  semanasOfensoras: number;
  percentualSaude: number;
  melhorSemana: SemanaOperacao;
  piorSemana: SemanaOperacao;
  statusAtual: "Saudável" | "Ofensor";
};

export type ResumoSaudeOperacional = {
  categoriaConfigurada: boolean;
  operacoes: RankingOperacao[];
  mediaGeral: number | null;
};

export async function criarRegraClassificacao(params: {
  classification: string;
  category: string;
  active: boolean;
}) {
  const { error } = await supabase.from("classification_rules").insert({
    classification: params.classification,
    category: params.category,
    active: params.active,
  });

  if (error) throw error;
}

export function normalizarBase(base: string | null | undefined) {
  return base?.trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR") ?? "";
}

/**
 * Chave técnica única para associar classificações importadas às regras.
 * O texto salvo e exibido permanece inalterado; a normalização é usada
 * exclusivamente para comparação sem diferença de espaços nas pontas ou caixa.
 */
export function normalizarClassificacao(classification: string | null | undefined) {
  return classification?.trim().toLocaleUpperCase("pt-BR") ?? "";
}

/**
 * Lista exclusivamente as versões atuais concluídas, da mais recente
 * para a mais antiga. As contagens de itens e bases são derivadas de weekly_items.
 */
export function useWeeklyImports() {
  return useQuery({
    queryKey: ["weekly_imports", "completed", "current"],
    queryFn: async (): Promise<WeeklyImportSummary[]> => {
      const { data: imports, error: importsError } = await supabase
        .from("weekly_imports")
        .select("id, week_code, year, week_number, imported_at, file_name, status, is_current, superseded_by, superseded_at")
        .eq("status", "completed")
        .eq("is_current", true)
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

/** Lista todas as versões para auditoria técnica, inclusive falhas e substituídas. */
export function useWeeklyImportsHistory() {
  return useQuery({
    queryKey: ["weekly_imports", "history"],
    queryFn: async (): Promise<WeeklyImportSummary[]> => {
      const { data: imports, error: importsError } = await supabase
        .from("weekly_imports")
        .select("id, week_code, year, week_number, imported_at, file_name, status, is_current, superseded_by, superseded_at")
        .order("year", { ascending: false })
        .order("week_number", { ascending: false })
        .order("imported_at", { ascending: false });

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
        const totals = totalsByImport.get(item.import_id) ?? { items: 0, bases: new Set<string>() };
        totals.items += 1;
        const base = normalizarBase(item.base);
        if (base) totals.bases.add(base);
        totalsByImport.set(item.import_id, totals);
      }

      return imports.map((item) => {
        const totals = totalsByImport.get(item.id);
        return { ...item, items_count: totals?.items ?? 0, bases_count: totals?.bases.size ?? 0 };
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

/**
 * Levanta as classificações distintas preservando exatamente o texto importado.
 * A normalização é aplicada apenas no vínculo técnico com classification_rules.
 */
export function useWeeklyClassificationsSurvey() {
  return useQuery({
    queryKey: ["weekly_items", "classification-survey"],
    queryFn: async (): Promise<WeeklyClassificationSurvey[]> => {
      const { data: currentImports, error: importsErr } = await supabase
        .from("weekly_imports")
        .select("id")
        .eq("status", "completed")
        .eq("is_current", true);

      if (importsErr) throw importsErr;
      const validImportIds = (currentImports ?? []).map((i) => i.id);
      if (validImportIds.length === 0) return [];

      const [{ data: items, error: itemsError }, { data: rules, error: rulesError }] =
        await Promise.all([
          supabase
            .from("weekly_items")
            .select("import_id, base, classification")
            .in("import_id", validImportIds),
          supabase
            .from("classification_rules")
            .select("id, classification, category, active, created_at"),
        ]);

      if (itemsError) throw itemsError;
      if (rulesError) throw rulesError;

      const rulesByClassification = new Map<string, ClassificationRule[]>();
      for (const rule of rules ?? []) {
        const key = normalizarClassificacao(rule.classification);
        const current = rulesByClassification.get(key) ?? [];
        current.push(rule);
        rulesByClassification.set(key, current);
      }

      const surveyByOriginalClassification = new Map<
        string,
        {
          classification: string | null;
          records_count: number;
          importIds: Set<string>;
          bases: Set<string>;
        }
      >();

      for (const item of items ?? []) {
        const key = item.classification === null ? "__sem_classificacao__" : `texto:${item.classification}`;
        const current = surveyByOriginalClassification.get(key) ?? {
          classification: item.classification,
          records_count: 0,
          importIds: new Set<string>(),
          bases: new Set<string>(),
        };

        current.records_count += 1;
        current.importIds.add(item.import_id);
        const base = normalizarBase(item.base);
        if (base) current.bases.add(base);
        surveyByOriginalClassification.set(key, current);
      }

      return Array.from(surveyByOriginalClassification.values())
        .map((entry) => {
          const classificationRules = rulesByClassification.get(
            normalizarClassificacao(entry.classification),
          ) ?? [];
          const activeRules = classificationRules.filter((rule) => rule.active);
          const inactiveRules = classificationRules.filter((rule) => !rule.active);
          const categoryRule = activeRules.length === 1
            ? activeRules[0]
            : classificationRules.length === 1
              ? classificationRules[0]
              : undefined;

          return {
            classification: entry.classification,
            records_count: entry.records_count,
            weeks_count: entry.importIds.size,
            bases_count: entry.bases.size,
            has_rule: classificationRules.length > 0,
            has_active_rule: activeRules.length > 0,
            active_rules_count: activeRules.length,
            inactive_rules_count: inactiveRules.length,
            category: categoryRule?.category ?? null,
          };
        })
        .sort((first, second) => {
          if (first.has_active_rule !== second.has_active_rule) {
            return first.has_active_rule ? 1 : -1;
          }
          if (first.records_count !== second.records_count) {
            return second.records_count - first.records_count;
          }
          return (first.classification ?? "").localeCompare(second.classification ?? "", "pt-BR");
        });
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
  const rulesByClassification = new Map<string, ClassificationRule[]>();

  for (const rule of activeRules.filter((rule) => rule.active)) {
    const classificationKey = normalizarClassificacao(rule.classification);
    const rules = rulesByClassification.get(classificationKey) ?? [];
    rules.push(rule);
    rulesByClassification.set(classificationKey, rules);
  }

  const classificacoesAmbiguas = new Set(
    Array.from(rulesByClassification.entries())
      .filter(([, rules]) => rules.length > 1)
      .map(([classification]) => classification),
  );

  if (classificacoesAmbiguas.size > 0) {
    const regrasAmbiguas = Array.from(classificacoesAmbiguas, (classification) => ({
      classification,
      ruleIds: (rulesByClassification.get(classification) ?? []).map((rule) => rule.id),
    }));
    console.warn("[Savings] Foram encontradas regras ativas duplicadas para a mesma classificação.", regrasAmbiguas);
  }

  const groups = new Map<string, WeeklyItemsClassificationGroup>();

  for (const item of items) {
    const classificationKey = item.classification
      ? normalizarClassificacao(item.classification)
      : undefined;
    const rules = classificationKey ? rulesByClassification.get(classificationKey) : undefined;
    const category = rules?.length === 1 ? rules[0]?.category.trim() : undefined;
    const key = classificationKey && classificacoesAmbiguas.has(classificationKey)
      ? "regra_ambigua"
      : category
        ? `categoria:${category.toLocaleUpperCase("pt-BR")}`
        : "sem_classificacao_regra";
    const group = groups.get(key) ?? {
      key,
      category: key === "regra_ambigua" ? "Regra ambígua" : category || "Sem classificação por regra",
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
    if (first.key === "sem_classificacao_regra" || first.key === "regra_ambigua") return 1;
    if (second.key === "sem_classificacao_regra" || second.key === "regra_ambigua") return -1;
    return first.category.localeCompare(second.category, "pt-BR");
  });
}

/**
 * Consolida exclusivamente os valores reais da categoria de ofensa configurada.
 * Cada base entra apenas nas semanas em que possui ao menos um valor financeiro
 * válido naquela categoria; semanas ausentes nunca são convertidas em zero.
 */
export function calcularSaudeOperacional(
  importacoes: WeeklyImportSummary[],
  itens: WeeklyItem[],
  regrasAtivas: ClassificationRule[],
  year?: number,
): ResumoSaudeOperacional {
  const normalizarCategoria = (categoria: string) =>
    categoria.trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");
  const categoriaOfensa = normalizarCategoria(SAVINGS_SAUDE_CONFIG.CATEGORIA_OFENSA);
  const regrasDaCategoria = regrasAtivas.filter(
    (regra) => regra.active && normalizarCategoria(regra.category) === categoriaOfensa,
  );
  const categoriaConfigurada = regrasDaCategoria.length > 0;

  if (!categoriaConfigurada) {
    return { categoriaConfigurada: false, operacoes: [], mediaGeral: null };
  }

  const importacoesPorSemana = new Map<string, WeeklyImportSummary>();
  for (const importacao of importacoes.filter(
    (item) => year === undefined || item.year === year,
  )) {
    const chaveSemana = `${importacao.year}-${importacao.week_number}`;
    const existente = importacoesPorSemana.get(chaveSemana);
    if (!existente || (importacao.imported_at ?? "") > (existente.imported_at ?? "")) {
      importacoesPorSemana.set(chaveSemana, importacao);
    }
  }
  const importacoesConsideradas = new Map(
    Array.from(importacoesPorSemana.values(), (importacao) => [importacao.id, importacao]),
  );
  const regrasPorClassificacao = new Map<string, ClassificationRule[]>();

  for (const regra of regrasDaCategoria) {
    const chave = normalizarClassificacao(regra.classification);
    const regras = regrasPorClassificacao.get(chave) ?? [];
    regras.push(regra);
    regrasPorClassificacao.set(chave, regras);
  }

  const valoresPorBaseESemana = new Map<string, Map<string, number>>();
  for (const item of itens) {
    if (!importacoesConsideradas.has(item.import_id)) continue;
    if (typeof item.amount !== "number" || !Number.isFinite(item.amount)) continue;

    const classificacao = normalizarClassificacao(item.classification);
    const regras = regrasPorClassificacao.get(classificacao) ?? [];
    if (regras.length !== 1) continue;

    const base = normalizarBase(item.base);
    if (!base) continue;

    const semanasDaBase = valoresPorBaseESemana.get(base) ?? new Map<string, number>();
    semanasDaBase.set(item.import_id, (semanasDaBase.get(item.import_id) ?? 0) + item.amount);
    valoresPorBaseESemana.set(base, semanasDaBase);
  }

  const operacoes = Array.from(valoresPorBaseESemana, ([base, valoresPorSemana]) => {
    const semanas = Array.from(valoresPorSemana, ([importId, valor]) => ({
      weekCode: importacoesConsideradas.get(importId)?.week_code ?? importId,
      valor,
    }));
    const semanasAvaliadas = semanas.length;
    const semanasSaudaveis = semanas.filter(
      (semana) => semana.valor <= LIMITE_SAUDAVEL_OPERACAO,
    ).length;
    const semanasOfensoras = semanasAvaliadas - semanasSaudaveis;
    const mediaSemanal =
      semanas.reduce((total, semana) => total + semana.valor, 0) / semanasAvaliadas;
    const melhorSemana =
      semanas.length > 0
        ? semanas.reduce((melhor, semana) =>
            semana.valor < melhor.valor ||
            (semana.valor === melhor.valor && semana.weekCode.localeCompare(melhor.weekCode, "pt-BR") < 0)
              ? semana
              : melhor,
          )
        : { weekCode: "-", valor: 0 };
    const piorSemana =
      semanas.length > 0
        ? semanas.reduce((pior, semana) =>
            semana.valor > pior.valor ||
            (semana.valor === pior.valor && semana.weekCode.localeCompare(pior.weekCode, "pt-BR") < 0)
              ? semana
              : pior,
          )
        : { weekCode: "-", valor: 0 };

    return {
      base,
      mediaSemanal,
      diferencaLimite: mediaSemanal - LIMITE_SAUDAVEL_OPERACAO,
      semanasAvaliadas,
      semanasSaudaveis,
      semanasOfensoras,
      percentualSaude: (semanasSaudaveis / semanasAvaliadas) * 100,
      melhorSemana,
      piorSemana,
      statusAtual: mediaSemanal <= LIMITE_SAUDAVEL_OPERACAO ? "Saudável" : "Ofensor",
    } satisfies RankingOperacao;
  }).sort((primeira, segunda) => {
    if (primeira.mediaSemanal !== segunda.mediaSemanal) {
      return primeira.mediaSemanal - segunda.mediaSemanal;
    }
    if (primeira.semanasOfensoras !== segunda.semanasOfensoras) {
      return primeira.semanasOfensoras - segunda.semanasOfensoras;
    }
    if (primeira.percentualSaude !== segunda.percentualSaude) {
      return segunda.percentualSaude - primeira.percentualSaude;
    }
    if (primeira.piorSemana.valor !== segunda.piorSemana.valor) {
      return primeira.piorSemana.valor - segunda.piorSemana.valor;
    }
    if (primeira.semanasAvaliadas !== segunda.semanasAvaliadas) {
      return segunda.semanasAvaliadas - primeira.semanasAvaliadas;
    }
    return primeira.base.localeCompare(segunda.base, "pt-BR");
  });

  return {
    categoriaConfigurada: true,
    operacoes,
    mediaGeral:
      operacoes.length > 0
        ? operacoes.reduce((total, operacao) => total + operacao.mediaSemanal, 0) /
          operacoes.length
        : null,
  };
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
