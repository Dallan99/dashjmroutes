import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  CalendarRange,
  Check,
  CircleCheck,
  Clock,
  FileText,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { BASES, PISO_JMROUTES, brl, brlCurto, perdaProjetada } from "@/components/dashboard/data";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WeeklyImportButton } from "@/components/history/WeeklyImportDialog";
import {
  groupWeeklyItemsByActiveClassification,
  useActiveClassificationRules,
  useWeeklyImports,
  useWeeklyItems,
  useWeeklyItemsForImports,
  useWeekNotes,
  normalizarBase,
} from "@/components/history/weekly-api";
import { cn } from "@/lib/utils";

interface SavingsViewProps {
  selecionadas: string[];
  setSelecionadas: React.Dispatch<React.SetStateAction<string[]>>;
  eficacia: number;
  setEficacia: (v: number) => void;
}

export function SavingsView({ selecionadas, setSelecionadas, eficacia, setEficacia }: SavingsViewProps) {
  const {
    data: importacoes = [],
    isLoading: carregandoImportacoes,
    isError: erroImportacoes,
    refetch: recarregarImportacoes,
  } = useWeeklyImports();
  const [importacaoSelecionada, setImportacaoSelecionada] = useState("");
  const [baseSelecionada, setBaseSelecionada] = useState("__todas_as_bases__");

  useEffect(() => {
    if (!importacaoSelecionada && importacoes.length > 0) {
      setImportacaoSelecionada(importacoes[0]!.id);
    }
  }, [importacaoSelecionada, importacoes]);

  const importacaoAtual = importacoes.find((item) => item.id === importacaoSelecionada) ?? null;
  const {
    data: itensSemana = [],
    isLoading: carregandoItens,
    isError: erroItens,
    refetch: recarregarItens,
  } = useWeeklyItems(importacaoAtual?.id);
  const {
    data: itensHistorico = [],
    isLoading: carregandoHistorico,
    isError: erroHistorico,
    refetch: recarregarHistorico,
  } = useWeeklyItemsForImports(importacoes.map((importacao) => importacao.id));
  const {
    data: observacoesSemana = [],
    isLoading: carregandoObservacoes,
    isError: erroObservacoes,
    refetch: recarregarObservacoes,
  } = useWeekNotes(importacaoAtual?.id);
  const {
    data: regrasAtivas = [],
    isLoading: carregandoRegras,
    isError: erroRegras,
    refetch: recarregarRegras,
  } = useActiveClassificationRules();

  const basesSemana = useMemo(
    () =>
      Array.from(
        new Set(itensSemana.map((item) => normalizarBase(item.base)).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b, "pt-BR")),
    [itensSemana],
  );

  useEffect(() => {
    if (
      baseSelecionada !== "__todas_as_bases__" &&
      !basesSemana.some((base) => base === baseSelecionada)
    ) {
      setBaseSelecionada("__todas_as_bases__");
    }
  }, [baseSelecionada, basesSemana]);

  const itensFiltrados = useMemo(
    () =>
      itensSemana.filter(
        (item) =>
          baseSelecionada === "__todas_as_bases__" || item.base?.trim() === baseSelecionada,
      ),
    [baseSelecionada, itensSemana],
  );

  const gruposClassificacao = useMemo(
    () => groupWeeklyItemsByActiveClassification(itensFiltrados, regrasAtivas),
    [itensFiltrados, regrasAtivas],
  );

  const itensHistoricoFiltrados = useMemo(
    () =>
      itensHistorico.filter(
        (item) =>
          baseSelecionada === "__todas_as_bases__" || item.base?.trim() === baseSelecionada,
      ),
    [baseSelecionada, itensHistorico],
  );

  const evolucaoSemanal = useMemo(() => {
    const totaisPorImportacao = new Map(
      importacoes.map((importacao) => [
        importacao.id,
        { semana: importacao.week_code, year: importacao.year, week: importacao.week_number, registros: 0, valor: 0 },
      ]),
    );

    for (const item of itensHistoricoFiltrados) {
      const total = totaisPorImportacao.get(item.import_id);
      if (!total) continue;
      total.registros += 1;
      if (typeof item.amount === "number" && Number.isFinite(item.amount)) total.valor += item.amount;
    }

    return Array.from(totaisPorImportacao.values()).sort(
      (primeira, segunda) => primeira.year - segunda.year || primeira.week - segunda.week,
    );
  }, [importacoes, itensHistoricoFiltrados]);

  const importacaoAnterior = useMemo(() => {
    if (!importacaoAtual) return null;
    const indiceAtual = importacoes.findIndex((item) => item.id === importacaoAtual.id);
    return indiceAtual >= 0 ? importacoes[indiceAtual + 1] ?? null : null;
  }, [importacaoAtual, importacoes]);

  const comparativoSemanal = useMemo(() => {
    const itensAtuais = itensHistoricoFiltrados.filter((item) => item.import_id === importacaoAtual?.id);
    const itensAnteriores = itensHistoricoFiltrados.filter((item) => item.import_id === importacaoAnterior?.id);
    const resumir = (itens: typeof itensSemana) => ({
      registros: itens.length,
      valor: itens.reduce(
        (total, item) => total + (typeof item.amount === "number" && Number.isFinite(item.amount) ? item.amount : 0),
        0,
      ),
    });

    const porBase = new Map<string, { base: string; atual: number; anterior: number }>();
    for (const [tipo, itens] of [["atual", itensAtuais], ["anterior", itensAnteriores]] as const) {
      for (const item of itens) {
        const base = normalizarBase(item.base) || "Sem base";
        const total = porBase.get(base) ?? { base, atual: 0, anterior: 0 };
        total[tipo] += 1;
        porBase.set(base, total);
      }
    }

    const porClassificacao = new Map<string, { classificacao: string; atual: number; anterior: number }>();
    for (const [tipo, itens] of [["atual", itensAtuais], ["anterior", itensAnteriores]] as const) {
      for (const grupo of groupWeeklyItemsByActiveClassification(itens, regrasAtivas)) {
        const total = porClassificacao.get(grupo.category) ?? { classificacao: grupo.category, atual: 0, anterior: 0 };
        total[tipo] += grupo.items_count;
        porClassificacao.set(grupo.category, total);
      }
    }

    return {
      atual: resumir(itensAtuais),
      anterior: resumir(itensAnteriores),
      porBase: Array.from(porBase.values()).sort((a, b) => b.atual - a.atual || b.anterior - a.anterior),
      porClassificacao: Array.from(porClassificacao.values()).sort((a, b) => b.atual - a.atual || b.anterior - a.anterior),
    };
  }, [importacaoAnterior, importacaoAtual, itensHistoricoFiltrados, regrasAtivas]);

  const observacoesVisiveis = useMemo(
    () =>
      observacoesSemana.filter(
        (observacao) =>
          !normalizarBase(observacao.base) ||
          (baseSelecionada !== "__todas_as_bases__" && normalizarBase(observacao.base) === baseSelecionada),
      ),
    [baseSelecionada, observacoesSemana],
  );

  const kpisSavings = useMemo(() => {
    const normalizarCategoria = (categoria: string) =>
      categoria.trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");

    const totalBases = new Set(
      itensFiltrados
        .map((item) => normalizarBase(item.base))
        .filter(Boolean),
    ).size;
    const valorTotal = itensFiltrados.reduce(
      (total, item) =>
        typeof item.amount === "number" && Number.isFinite(item.amount)
          ? total + item.amount
          : total,
      0,
    );
    const registrosSemRegra = gruposClassificacao
      .filter(
        (grupo) =>
          grupo.key === "sem_classificacao_regra" || grupo.key === "regra_ambigua",
      )
      .reduce((total, grupo) => total + grupo.items_count, 0);
    const registrosClassificados = itensFiltrados.length - registrosSemRegra;
    const gruposPorCategoria = new Map(
      gruposClassificacao
        .filter((grupo) => grupo.key !== "sem_classificacao_regra")
        .map((grupo) => [normalizarCategoria(grupo.category), grupo]),
    );
    const categoriasComRegraAtiva = new Set(
      regrasAtivas.map((regra) => normalizarCategoria(regra.category)),
    );
    const categoriasFinanceiras = [
      { category: "Perda", icon: TrendingUp, tone: "loss" },
      { category: "Valor evitado", icon: Wallet, tone: "highlight" },
      { category: "Recuperado", icon: Check, tone: "gain" },
      { category: "Pendência", icon: Clock, tone: "neutral" },
    ] as const;

    return {
      totalBases,
      valorTotal,
      registrosClassificados,
      registrosSemRegra,
      categoriasFinanceiras: categoriasFinanceiras
        .filter(({ category }) => categoriasComRegraAtiva.has(normalizarCategoria(category)))
        .map(({ category, icon, tone }) => {
          const grupo = gruposPorCategoria.get(normalizarCategoria(category));
          return {
            id: `categoria-${normalizarCategoria(category)}`,
            label: category,
            value: brl(grupo?.amount_total ?? 0),
            hint: `${grupo?.items_count ?? 0} registro(s) classificado(s)`,
            icon,
            tone,
          };
        }),
    };
  }, [gruposClassificacao, itensFiltrados, regrasAtivas]);

  const fator = eficacia / 100;
  const linhas = useMemo(() => {
    const totais = new Map<string, number>();
    for (const item of itensFiltrados) {
      const base = normalizarBase(item.base) || "Sem base";
      const amount = typeof item.amount === "number" && Number.isFinite(item.amount) ? item.amount : 0;
      totais.set(base, (totais.get(base) ?? 0) + amount);
    }

    return Array.from(totais, ([nome, atual]) => {
      const semBase = nome === "Sem base";
      const referencia = BASES.find(
        (base) => normalizarBase(base.id) === nome,
      );
      const comJMRoutes = referencia?.comJMRoutes ?? false;
      const ativa = !semBase && (comJMRoutes || selecionadas.includes(nome));
      const projetado = ativa ? perdaProjetada(atual, fator) : atual;

      return {
        id: nome,
        nome,
        semBase,
        comJMRoutes,
        ativa,
        atual,
        projetado,
        economia: atual - projetado,
      };
    }).sort((a, b) => b.atual - a.atual);
  }, [itensFiltrados, selecionadas, fator]);

  const criticas = linhas.filter((linha) => !linha.comJMRoutes && !linha.semBase);
  const escopo = linhas.filter((linha) => !linha.comJMRoutes);
  const totalAtual = escopo.reduce((soma, linha) => soma + linha.atual, 0);
  const totalProjetado = escopo.reduce((soma, linha) => soma + linha.projetado, 0);
  const economiaSemanal = totalAtual - totalProjetado;
  const reducaoPct = totalAtual > 0 ? (economiaSemanal / totalAtual) * 100 : 0;

  const toggle = (id: string) =>
    setSelecionadas((atual) =>
      atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id],
    );

  const formatarDataImportacao = (data: string | null) => {
    if (!data) return "Data não informada";
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(data));
  };

  if (carregandoImportacoes) {
    return <p className="text-sm font-medium text-muted-foreground">Carregando importações semanais…</p>;
  }

  if (erroImportacoes) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 shadow-[var(--shadow-panel)]">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <h2 className="text-sm font-bold">Não foi possível carregar as importações semanais</h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground">Tente novamente para consultar os dados reais do histórico.</p>
            <button type="button" onClick={() => void recarregarImportacoes()} className="mt-4 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold transition-colors hover:border-primary/40 hover:text-primary">Tentar novamente</button>
          </div>
        </div>
      </div>
    );
  }

  if (importacoes.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center shadow-[var(--shadow-panel)]">
        <h2 className="text-lg font-bold">Nenhuma semana concluída disponível</h2>
        <p className="mx-auto mt-2 max-w-md text-sm font-medium text-muted-foreground">
          Importe e conclua uma planilha semanal para visualizar os dados reais de savings por base.
        </p>
        <div className="mt-5 flex justify-center">
          <ImportButton />
        </div>
      </div>
    );
  }

  if (erroItens || erroHistorico || erroRegras || erroObservacoes) {
    const tentarNovamente = () => {
      if (erroItens) void recarregarItens();
      if (erroHistorico) void recarregarHistorico();
      if (erroRegras) void recarregarRegras();
      if (erroObservacoes) void recarregarObservacoes();
    };

    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6 shadow-[var(--shadow-panel)]">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <h2 className="text-sm font-bold">Não foi possível carregar todos os dados da semana</h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground">Nenhum indicador é exibido até que os dados reais estejam disponíveis.</p>
            <button type="button" onClick={tentarNovamente} className="mt-4 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold transition-colors hover:border-primary/40 hover:text-primary">Tentar novamente</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Dados reais — Histórico semanal</h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Analise exclusivamente os dados reais da importação semanal selecionada.
            </p>
          </div>
          <ImportButton />
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Semana importada</Label>
            <Select value={importacaoSelecionada} onValueChange={setImportacaoSelecionada}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecione uma semana" />
              </SelectTrigger>
              <SelectContent>
                {importacoes.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.week_code} · {item.file_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Base</Label>
            <Select value={baseSelecionada} onValueChange={setBaseSelecionada}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todas as bases" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__todas_as_bases__">Todas as bases</SelectItem>
                {basesSemana.map((base) => (
                  <SelectItem key={base} value={base}>
                    {base}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-5 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <CalendarRange className="size-4 text-primary" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Linha do tempo das semanas concluídas
            </h3>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {importacoes.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setImportacaoSelecionada(item.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-semibold transition-all duration-200",
                    item.id === importacaoSelecionada
                      ? "border-primary bg-primary text-primary-foreground shadow-sm"
                      : "border-border bg-muted/40 text-muted-foreground hover:border-primary/40 hover:text-foreground",
                  )}
                >
                  {item.week_code}
                </button>
              ))}
          </div>
        </div>
      </section>

      {carregandoItens || carregandoHistorico || carregandoRegras || carregandoObservacoes ? (
        <p className="text-sm font-medium text-muted-foreground">
          Carregando dados da semana selecionada…
        </p>
      ) : null}

      <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Agrupamento por regra de classificação
            </h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Itens da semana e da base selecionadas são relacionados apenas às regras ativas.
            </p>
          </div>
          <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {itensFiltrados.length} registro(s)
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {gruposClassificacao.map((grupo) => (
            <div
              key={grupo.key}
              className={cn(
                "rounded-lg border p-4 transition-all duration-200",
                grupo.key === "sem_classificacao_regra"
                  ? "border-border bg-muted/40"
                  : "border-primary/20 bg-primary/5",
              )}
            >
              <p className="text-sm font-bold">{grupo.category}</p>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                {grupo.items_count} registro(s)
              </p>
              <p className="mt-3 text-lg font-extrabold tabular-nums text-primary">
                {brl(grupo.amount_total)}
              </p>
              <p className="text-xs font-semibold text-muted-foreground">Valor informado nos registros</p>
            </div>
          ))}
          {gruposClassificacao.length === 0 && !carregandoItens ? (
            <p className="text-sm font-medium text-muted-foreground">
              Não há registros para a semana e a base selecionadas.
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">Dados reais — Histórico semanal</span>
          <p className="text-sm font-medium text-muted-foreground">Indicadores da semana e da base selecionadas.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            id: "total-registros",
            label: "Total de registros",
            value: `${itensFiltrados.length}`,
            hint: "Registros da semana e base selecionadas",
            icon: FileText,
            tone: "neutral",
          },
          {
            id: "total-bases",
            label: "Total de bases",
            value: `${kpisSavings.totalBases}`,
            hint: "Bases identificadas no filtro atual",
            icon: CircleCheck,
            tone: "neutral",
          },
          {
            id: "valor-total",
            label: "Valor total",
            value: brl(kpisSavings.valorTotal),
            hint: "Soma apenas de valores válidos",
            icon: Wallet,
            tone: "highlight",
          },
          {
            id: "registros-classificados",
            label: "Registros classificados",
            value: `${kpisSavings.registrosClassificados}`,
            hint: "Associados a uma regra ativa",
            icon: Check,
            tone: "gain",
          },
          {
            id: "registros-sem-regra",
            label: "Registros sem regra",
            value: `${kpisSavings.registrosSemRegra}`,
            hint: "Sem regra válida ou com regra ambígua",
            icon: Clock,
            tone: "neutral",
          },
          ...kpisSavings.categoriasFinanceiras,
        ].map((kpi) => (
          <KpiCard
            key={kpi.id}
            label={kpi.label}
            value={kpi.value}
            hint={kpi.hint}
            icon={kpi.icon}
            tone={kpi.tone}
          />
        ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Evolução real por semana</h2>
              <p className="mt-1 text-sm font-medium text-muted-foreground">Valores válidos das importações concluídas.</p>
            </div>
            <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">Dados reais</span>
          </div>
          <div className="mt-5 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolucaoSemanal}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="semana" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <YAxis tickFormatter={(valor: number) => brlCurto(valor)} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={64} />
                <Tooltip formatter={(valor: number) => brl(valor)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "0.6rem", fontSize: 12 }} />
                <Line type="monotone" dataKey="valor" name="Valor" stroke="var(--chart-1)" strokeWidth={3} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Quantidade por classificação</h2>
              <p className="mt-1 text-sm font-medium text-muted-foreground">Categorias definidas exclusivamente por regras ativas.</p>
            </div>
            <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">Dados reais</span>
          </div>
          <div className="mt-5 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gruposClassificacao.map((grupo) => ({ classificacao: grupo.category, quantidade: grupo.items_count }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="classificacao" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={36} />
                <Tooltip formatter={(valor: number) => [`${valor} registro(s)`, "Quantidade"]} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "0.6rem", fontSize: 12 }} />
                <Bar dataKey="quantidade" name="Quantidade" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Comparação semanal real</h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              {importacaoAnterior ? `${importacaoAtual?.week_code} comparada com ${importacaoAnterior.week_code}.` : "Não há uma semana anterior concluída disponível para comparação."}
            </p>
          </div>
          <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">Dados reais</span>
        </div>
        {importacaoAnterior ? (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-muted/40 p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Registros</p><p className="mt-2 text-xl font-extrabold tabular-nums">{comparativoSemanal.atual.registros}</p><p className="text-sm font-medium text-muted-foreground">Anterior: {comparativoSemanal.anterior.registros}</p></div>
              <div className="rounded-lg border border-border bg-muted/40 p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Valor válido</p><p className="mt-2 text-xl font-extrabold tabular-nums">{brl(comparativoSemanal.atual.valor)}</p><p className="text-sm font-medium text-muted-foreground">Anterior: {brl(comparativoSemanal.anterior.valor)}</p></div>
              <div className="rounded-lg border border-border bg-muted/40 p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Bases identificadas</p><p className="mt-2 text-xl font-extrabold tabular-nums">{comparativoSemanal.porBase.filter((item) => item.atual > 0).length}</p><p className="text-sm font-medium text-muted-foreground">Anterior: {comparativoSemanal.porBase.filter((item) => item.anterior > 0).length}</p></div>
            </div>
            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full text-sm"><thead className="bg-muted/50"><tr className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground"><th className="px-3 py-2">Base</th><th className="px-3 py-2 text-right">Semana atual</th><th className="px-3 py-2 text-right">Anterior</th></tr></thead><tbody>{comparativoSemanal.porBase.map((item) => <tr key={item.base} className="border-t border-border"><td className="px-3 py-2 font-semibold">{item.base}</td><td className="px-3 py-2 text-right tabular-nums">{item.atual}</td><td className="px-3 py-2 text-right tabular-nums">{item.anterior}</td></tr>)}</tbody></table></div>
              <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full text-sm"><thead className="bg-muted/50"><tr className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground"><th className="px-3 py-2">Classificação</th><th className="px-3 py-2 text-right">Semana atual</th><th className="px-3 py-2 text-right">Anterior</th></tr></thead><tbody>{comparativoSemanal.porClassificacao.map((item) => <tr key={item.classificacao} className="border-t border-border"><td className="px-3 py-2 font-semibold">{item.classificacao}</td><td className="px-3 py-2 text-right tabular-nums">{item.atual}</td><td className="px-3 py-2 text-right tabular-nums">{item.anterior}</td></tr>)}</tbody></table></div>
            </div>
          </>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-panel)]">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Histórico de importações
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">Semana</th>
                <th className="px-5 py-3">Importada em</th>
                <th className="px-5 py-3">Arquivo</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Registros</th>
                <th className="px-5 py-3 text-right">Bases</th>
              </tr>
            </thead>
            <tbody>
              {importacoes.map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    "cursor-pointer border-t border-border transition-colors hover:bg-muted/40",
                    item.id === importacaoSelecionada && "bg-primary/5",
                  )}
                  onClick={() => setImportacaoSelecionada(item.id)}
                >
                  <td className="px-5 py-3 font-semibold text-primary">{item.week_code}</td>
                  <td className="px-5 py-3 text-muted-foreground">{formatarDataImportacao(item.imported_at)}</td>
                  <td className="max-w-[260px] truncate px-5 py-3 font-medium" title={item.file_name}>
                    <span className="inline-flex items-center gap-2"><FileText className="size-4 text-muted-foreground" />{item.file_name}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">
                      <Check className="size-3.5" /> Concluída
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums">{item.items_count}</td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums">{item.bases_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Observações da semana</h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground">Observações gerais e, quando uma base estiver filtrada, observações específicas dessa base.</p>
          </div>
          <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">Dados reais</span>
        </div>
        <div className="mt-4 space-y-3">
          {observacoesVisiveis.length > 0 ? observacoesVisiveis.map((observacao) => (
            <div key={observacao.id} className="rounded-lg border border-border bg-muted/40 p-4">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">{normalizarBase(observacao.base) || "Observação geral"}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-relaxed">{observacao.note}</p>
            </div>
          )) : <p className="text-sm font-medium text-muted-foreground">Não há observações registradas para este filtro.</p>}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Simulação / Projeção por base
          </h2>
          <p className="mt-1 text-sm font-medium text-muted-foreground">O valor atual vem do histórico semanal selecionado; o valor projetado é uma simulação operacional.</p>
          <div className="mt-5 h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={linhas}
                margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="nome"
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--border)" }}
                />
                <YAxis
                  tickFormatter={(v: number) => brlCurto(v)}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.35 }}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.6rem",
                    color: "var(--popover-foreground)",
                    fontSize: 12,
                  }}
                  formatter={(v: number, name: string) => [brl(v), name]}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Bar dataKey="atual" name="Atual" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="projetado"
                  name="Projetado"
                  fill="var(--chart-2)"
                  radius={[4, 4, 0, 0]}
                >
                  {linhas.map((l) => (
                    <Cell
                      key={l.id}
                      fill={l.ativa ? "var(--chart-2)" : "var(--muted-foreground)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Simulação / Projeção
            </h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Escolha as bases que receberão o JMRoutes.
            </p>
          </div>

          <div className="space-y-3">
            {criticas.length > 0 ? (
              criticas.map((base) => (
                <div key={base.id} className="flex items-center justify-between gap-3">
                  <Label htmlFor={`base-${base.id}`} className="flex flex-col items-start gap-0.5">
                    <span className="text-sm font-semibold">{base.nome}</span>
                    <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                      {brl(base.atual)} / semana
                    </span>
                  </Label>
                  <Switch
                    id={`base-${base.id}`}
                    checked={selecionadas.includes(base.id)}
                    onCheckedChange={() => toggle(base.id)}
                  />
                </div>
              ))
            ) : (
              <p className="text-sm font-medium text-muted-foreground">
                Nenhuma base elegível foi encontrada para a simulação com o filtro atual.
              </p>
            )}
          </div>

          <div className="space-y-3 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Eficácia da implantação</Label>
              <span className="text-sm font-extrabold tabular-nums text-primary">{eficacia}%</span>
            </div>
            <Slider
              value={[eficacia]}
              onValueChange={([v]) => setEficacia(v ?? 0)}
              min={0}
              max={100}
              step={5}
            />
            <p className="text-sm font-medium text-muted-foreground">
              100% equivale ao desempenho real da base SSP34 (Embu).
            </p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-panel)]">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Simulação / Projeção — Detalhamento por base
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-sm font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">Base</th>
                <th className="px-5 py-3 text-right">Atual / semana</th>
                <th className="px-5 py-3 text-right">Projetado / semana</th>
                <th className="px-5 py-3 text-right">Saving anual</th>
                <th className="px-5 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-5 py-3 font-semibold">
                    <Link
                      to="/base/$baseId"
                      params={{ baseId: l.id }}
                      search={{ eficacia }}
                      className="hover:text-primary hover:underline"
                    >
                      {l.nome}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-destructive font-semibold">
                    {brl(l.atual)}
                  </td>
                  <td className="px-5 py-3 text-right tabular-nums text-success font-semibold">
                    {brl(l.projetado)}
                  </td>
                  <td className="px-5 py-3 text-right font-extrabold tabular-nums">
                    {brl(l.economia * 52)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium",
                        l.comJMRoutes
                          ? "border-success/40 bg-success/10 text-success"
                          : l.ativa
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      {l.comJMRoutes ? "Em operação" : l.ativa ? "Planejado" : "Fora do escopo"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="pb-4 text-sm font-medium text-muted-foreground italic">
        <Clock className="mr-1 inline size-4" /> Dados reais da semana {importacaoAtual?.week_code ?? "selecionada"}. A simulação utiliza a referência operacional da SSP34 e não altera os registros importados.
      </p>
    </div>
  );
}
