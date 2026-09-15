import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
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
  Layers,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { brl, brlCurto } from "@/components/dashboard/data";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { WeeklyImportButton } from "@/components/history/WeeklyImportDialog";
import {
  calcularSaudeOperacional,
  groupWeeklyItemsByActiveClassification,
  LIMITE_SAUDAVEL_OPERACAO,
  MIN_SEMANAS_RANKING,
  SAVINGS_SAUDE_CONFIG,
  useActiveClassificationRules,
  useWeeklyImports,
  useWeeklyImportsHistory,
  useWeeklyItems,
  useWeeklyItemsForImports,
  useWeekNotes,
  normalizarBase,
  nomeOperacao,
  rotuloOperacao,
  tipoOperacao,
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
  const { data: historicoImportacoes = [] } = useWeeklyImportsHistory();
  const [importacaoSelecionada, setImportacaoSelecionada] = useState("");
  const [baseSelecionada, setBaseSelecionada] = useState("__todas_as_bases__");
  const [anoRanking, setAnoRanking] = useState<number | null>(null);
  const [modalDetalhe, setModalDetalhe] = useState<"total" | "media" | "ofensora" | "semanas" | null>(null);

  useEffect(() => {
    if (importacoes.length > 0) {
      const selecionadaExiste = importacoes.some((item) => item.id === importacaoSelecionada);
      if (!selecionadaExiste) {
        setImportacaoSelecionada(importacoes[0]!.id);
      }
    }
  }, [importacaoSelecionada, importacoes]);

  const importacaoAtual = importacoes.find((item) => item.id === importacaoSelecionada) ?? null;

  useEffect(() => {
    if (importacaoAtual && anoRanking === null) {
      setAnoRanking(importacaoAtual.year);
    }
  }, [anoRanking, importacaoAtual]);
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
          baseSelecionada === "__todas_as_bases__" ||
          normalizarBase(item.base) === baseSelecionada ||
          item.base?.trim() === baseSelecionada,
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
          baseSelecionada === "__todas_as_bases__" ||
          normalizarBase(item.base) === baseSelecionada ||
          item.base?.trim() === baseSelecionada,
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
          baseSelecionada === "__todas_as_bases__" ||
          normalizarBase(observacao.base) === baseSelecionada,
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

  const anosDisponiveis = useMemo(
    () => Array.from(new Set(importacoes.map((importacao) => importacao.year))).sort((a, b) => b - a),
    [importacoes],
  );

  const resumoSaude = useMemo(
    () => calcularSaudeOperacional(importacoes, itensHistorico, regrasAtivas, anoRanking ?? undefined),
    [anoRanking, importacoes, itensHistorico, regrasAtivas],
  );

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
      const rotuloExibicao = semBase ? "Sem base" : rotuloOperacao(nome);

      return {
        id: nome,
        nome: rotuloExibicao,
        codigoBase: nome,
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
          <WeeklyImportButton />
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
          <WeeklyImportButton />
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
                    {rotuloOperacao(base)}
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

            {/* CARDS PRINCIPAIS CLICÁVEIS COM SEPARAÇÃO XPT x SERVICES */}
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success">Dados reais — Histórico oficial</span>
            <p className="text-sm font-medium text-muted-foreground">Clique em qualquer card para ver o detalhamento XPT vs SERVICES.</p>
          </div>
          <span className="text-xs font-bold text-muted-foreground">XPT (ESP15-18) · SERVICES (demais)</span>
        </div>

        {(() => {
          const itensValidos = itensFiltrados.filter((i) => typeof i.amount === "number" && Number.isFinite(i.amount));
          const totalGeral = itensValidos.reduce((s, i) => s + (i.amount ?? 0), 0);
          const totalXpt = itensValidos.filter((i) => tipoOperacao(i.base) === "XPT").reduce((s, i) => s + (i.amount ?? 0), 0);
          const totalServices = itensValidos.filter((i) => tipoOperacao(i.base) === "SERVICES").reduce((s, i) => s + (i.amount ?? 0), 0);

          const mediaSemanalGeral = resumoSaude.mediaGeral ?? (importacoes.length > 0 ? totalGeral / importacoes.length : 0);
          
          const basesComTotal = new Map<string, number>();
          for (const item of itensValidos) {
            const b = normalizarBase(item.base) || "Sem base";
            basesComTotal.set(b, (basesComTotal.get(b) ?? 0) + (item.amount ?? 0));
          }
          const maisOfensora = Array.from(basesComTotal.entries()).sort((a, b) => b[1] - a[1])[0];
          const nomeOfensora = maisOfensora ? rotuloOperacao(maisOfensora[0]) : "Nenhuma";
          const valorOfensora = maisOfensora ? maisOfensora[1] : 0;

          return (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                label="Total de descontos"
                value={brl(totalGeral)}
                hint={`XPT: ${brl(totalXpt)} · SERVICES: ${brl(totalServices)}`}
                icon={Wallet}
                tone="loss"
                onClick={() => setModalDetalhe("total")}
              />
              <KpiCard
                label="Média semanal"
                value={brl(mediaSemanalGeral)}
                hint={`Limite saudável: ${brl(LIMITE_SAUDAVEL_OPERACAO)}/sem`}
                icon={TrendingDown}
                tone="highlight"
                onClick={() => setModalDetalhe("media")}
              />
              <KpiCard
                label="Base mais ofensora"
                value={nomeOfensora}
                hint={maisOfensora ? `${brl(valorOfensora)} na semana` : "Sem ocorrências"}
                icon={ShieldAlert}
                tone="loss"
                onClick={() => setModalDetalhe("ofensora")}
              />
              <KpiCard
                label="Semanas analisadas"
                value={`${importacoes.length} semana(s)`}
                hint={`${itensFiltrados.length} registros no filtro atual`}
                icon={CalendarRange}
                tone="neutral"
                onClick={() => setModalDetalhe("semanas")}
              />
            </div>
          );
        })()}
      </section>

      {/* MODAL DE DETALHAMENTO XPT x SERVICES DOS CARDS */}
      <Dialog open={modalDetalhe !== null} onOpenChange={(open) => !open && setModalDetalhe(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          {modalDetalhe === "total" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <Wallet className="size-5 text-destructive" /> Detalhamento de Descontos (XPT vs SERVICES)
                </DialogTitle>
                <DialogDescription className="font-medium">
                  Total consolidado da semana selecionada segregado por tipo de operação e Base oficial.
                </DialogDescription>
              </DialogHeader>
              {(() => {
                const itensValidos = itensFiltrados.filter((i) => typeof i.amount === "number" && Number.isFinite(i.amount));
                const totalGeral = itensValidos.reduce((s, i) => s + (i.amount ?? 0), 0);
                const totalXpt = itensValidos.filter((i) => tipoOperacao(i.base) === "XPT").reduce((s, i) => s + (i.amount ?? 0), 0);
                const totalServices = itensValidos.filter((i) => tipoOperacao(i.base) === "SERVICES").reduce((s, i) => s + (i.amount ?? 0), 0);

                const porBase = new Map<string, number>();
                for (const item of itensValidos) {
                  const b = normalizarBase(item.base) || "Sem base";
                  porBase.set(b, (porBase.get(b) ?? 0) + (item.amount ?? 0));
                }
                const listaBases = Array.from(porBase.entries())
                  .map(([codigo, total]) => ({
                    codigo,
                    nome: nomeOperacao(codigo) ?? (codigo === "Sem base" ? "Sem base" : "Não cadastrada"),
                    tipo: tipoOperacao(codigo),
                    total,
                    pct: totalGeral > 0 ? (total / totalGeral) * 100 : 0,
                  }))
                  .sort((a, b) => b.total - a.total);

                return (
                  <div className="space-y-4 pt-2">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-border bg-card p-4">
                        <span className="text-xs font-bold uppercase text-muted-foreground">Total Geral</span>
                        <p className="text-xl font-extrabold text-destructive tabular-nums mt-1">{brl(totalGeral)}</p>
                        <span className="text-xs text-muted-foreground font-semibold">100% dos descontos</span>
                      </div>
                      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                        <span className="text-xs font-bold uppercase text-primary">Total XPT (Próprias)</span>
                        <p className="text-xl font-extrabold text-primary tabular-nums mt-1">{brl(totalXpt)}</p>
                        <span className="text-xs text-muted-foreground font-semibold">{totalGeral > 0 ? ((totalXpt / totalGeral) * 100).toFixed(1) : 0}% do total</span>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/30 p-4">
                        <span className="text-xs font-bold uppercase text-muted-foreground">Total SERVICES</span>
                        <p className="text-xl font-extrabold text-foreground tabular-nums mt-1">{brl(totalServices)}</p>
                        <span className="text-xs text-muted-foreground font-semibold">{totalGeral > 0 ? ((totalServices / totalGeral) * 100).toFixed(1) : 0}% do total</span>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/60 text-xs font-bold uppercase text-muted-foreground">
                          <tr>
                            <th className="px-4 py-2.5 text-left">Código</th>
                            <th className="px-4 py-2.5 text-left">Operação</th>
                            <th className="px-4 py-2.5 text-center">Tipo</th>
                            <th className="px-4 py-2.5 text-right">Total descontos</th>
                            <th className="px-4 py-2.5 text-right">% do Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {listaBases.map((b) => (
                            <tr key={b.codigo} className="border-t border-border hover:bg-muted/20">
                              <td className="px-4 py-2.5 font-mono font-bold text-primary">{b.codigo}</td>
                              <td className="px-4 py-2.5 font-semibold">{b.nome}</td>
                              <td className="px-4 py-2.5 text-center">
                                <Badge variant={b.tipo === "XPT" ? "default" : "secondary"}>
                                  {b.tipo}
                                </Badge>
                              </td>
                              <td className="px-4 py-2.5 text-right font-extrabold tabular-nums text-destructive">{brl(b.total)}</td>
                              <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-muted-foreground">{b.pct.toFixed(1)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {modalDetalhe === "media" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <TrendingDown className="size-5 text-primary" /> Detalhamento da Média Semanal
                </DialogTitle>
                <DialogDescription className="font-medium">
                  Médias históricas por operação com verificação de status operacional (limite de R$ 1.000/semana).
                </DialogDescription>
              </DialogHeader>
              {(() => {
                const operacoes = resumoSaude.operacoes;
                const operacoesXpt = operacoes.filter((o) => tipoOperacao(o.base) === "XPT");
                const operacoesServices = operacoes.filter((o) => tipoOperacao(o.base) === "SERVICES");

                const mediaGeral = resumoSaude.mediaGeral ?? 0;
                const mediaXpt = operacoesXpt.length > 0 ? operacoesXpt.reduce((s, o) => s + o.mediaSemanal, 0) / operacoesXpt.length : 0;
                const mediaServices = operacoesServices.length > 0 ? operacoesServices.reduce((s, o) => s + o.mediaSemanal, 0) / operacoesServices.length : 0;

                return (
                  <div className="space-y-4 pt-2">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-border bg-card p-4">
                        <span className="text-xs font-bold uppercase text-muted-foreground">Média Geral</span>
                        <p className="text-xl font-extrabold text-foreground tabular-nums mt-1">{brl(mediaGeral)}</p>
                        <span className="text-xs text-muted-foreground font-semibold">Todas as operações</span>
                      </div>
                      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                        <span className="text-xs font-bold uppercase text-primary">Média XPT</span>
                        <p className="text-xl font-extrabold text-primary tabular-nums mt-1">{brl(mediaXpt)}</p>
                        <span className="text-xs text-muted-foreground font-semibold">{operacoesXpt.length} bases XPT</span>
                      </div>
                      <div className="rounded-xl border border-border bg-muted/30 p-4">
                        <span className="text-xs font-bold uppercase text-muted-foreground">Média SERVICES</span>
                        <p className="text-xl font-extrabold text-foreground tabular-nums mt-1">{brl(mediaServices)}</p>
                        <span className="text-xs text-muted-foreground font-semibold">{operacoesServices.length} bases Services</span>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/60 text-xs font-bold uppercase text-muted-foreground">
                          <tr>
                            <th className="px-4 py-2.5 text-left">Base</th>
                            <th className="px-4 py-2.5 text-center">Tipo</th>
                            <th className="px-4 py-2.5 text-right">Média Semanal</th>
                            <th className="px-4 py-2.5 text-right">Semanas Avaliadas</th>
                            <th className="px-4 py-2.5 text-right">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {operacoes.map((o) => (
                            <tr key={o.base} className="border-t border-border hover:bg-muted/20">
                              <td className="px-4 py-2.5 font-semibold">{rotuloOperacao(o.base)}</td>
                              <td className="px-4 py-2.5 text-center">
                                <Badge variant={tipoOperacao(o.base) === "XPT" ? "default" : "secondary"}>
                                  {tipoOperacao(o.base)}
                                </Badge>
                              </td>
                              <td className="px-4 py-2.5 text-right font-extrabold tabular-nums">{brl(o.mediaSemanal)}</td>
                              <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">{o.semanasAvaliadas}</td>
                              <td className="px-4 py-2.5 text-right">
                                <StatusSaude status={o.statusAtual} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {modalDetalhe === "ofensora" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <ShieldAlert className="size-5 text-destructive" /> Detalhamento das Bases Mais Ofensoras
                </DialogTitle>
                <DialogDescription className="font-medium">
                  Identificação das maiores perdas consolidadas no período com separação XPT x SERVICES.
                </DialogDescription>
              </DialogHeader>
              {(() => {
                const itensValidos = itensFiltrados.filter((i) => typeof i.amount === "number" && Number.isFinite(i.amount));
                const porBase = new Map<string, number>();
                for (const item of itensValidos) {
                  const b = normalizarBase(item.base) || "Sem base";
                  porBase.set(b, (porBase.get(b) ?? 0) + (item.amount ?? 0));
                }
                const lista = Array.from(porBase.entries()).map(([base, total]) => ({
                  base,
                  nome: rotuloOperacao(base),
                  tipo: tipoOperacao(base),
                  total,
                })).sort((a, b) => b.total - a.total);

                const maisGeral = lista[0];
                const maisXpt = lista.find((i) => i.tipo === "XPT");
                const maisServices = lista.find((i) => i.tipo === "SERVICES");

                return (
                  <div className="space-y-4 pt-2">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                        <span className="text-xs font-bold uppercase text-destructive">Mais Ofensora Geral</span>
                        <p className="text-base font-extrabold text-foreground mt-1 truncate">{maisGeral?.nome ?? "—"}</p>
                        <p className="text-lg font-extrabold text-destructive tabular-nums mt-1">{maisGeral ? brl(maisGeral.total) : "—"}</p>
                      </div>
                      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                        <span className="text-xs font-bold uppercase text-primary">Mais Ofensora XPT</span>
                        <p className="text-base font-extrabold text-foreground mt-1 truncate">{maisXpt?.nome ?? "—"}</p>
                        <p className="text-lg font-extrabold text-primary tabular-nums mt-1">{maisXpt ? brl(maisXpt.total) : "—"}</p>
                      </div>
                      <div className="rounded-xl border border-border bg-card p-4">
                        <span className="text-xs font-bold uppercase text-muted-foreground">Mais Ofensora SERVICES</span>
                        <p className="text-base font-extrabold text-foreground mt-1 truncate">{maisServices?.nome ?? "—"}</p>
                        <p className="text-lg font-extrabold text-foreground tabular-nums mt-1">{maisServices ? brl(maisServices.total) : "—"}</p>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/60 text-xs font-bold uppercase text-muted-foreground">
                          <tr>
                            <th className="px-4 py-2.5 text-left">Posição</th>
                            <th className="px-4 py-2.5 text-left">Base</th>
                            <th className="px-4 py-2.5 text-center">Tipo</th>
                            <th className="px-4 py-2.5 text-right">Total Perdido</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lista.map((item, idx) => (
                            <tr key={item.base} className="border-t border-border hover:bg-muted/20">
                              <td className="px-4 py-2.5 font-bold text-primary">{idx + 1}º</td>
                              <td className="px-4 py-2.5 font-semibold">{item.nome}</td>
                              <td className="px-4 py-2.5 text-center">
                                <Badge variant={item.tipo === "XPT" ? "default" : "secondary"}>
                                  {item.tipo}
                                </Badge>
                              </td>
                              <td className="px-4 py-2.5 text-right font-extrabold tabular-nums text-destructive">{brl(item.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </>
          )}

          {modalDetalhe === "semanas" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <CalendarRange className="size-5 text-primary" /> Semanas Analisadas (XPT x SERVICES)
                </DialogTitle>
                <DialogDescription className="font-medium">
                  Consolidação do histórico semanal com total geral e divisão XPT vs SERVICES por semana.
                </DialogDescription>
              </DialogHeader>
              {(() => {
                const totaisPorSemana = importacoes.map((imp) => {
                  const itensDaSemana = itensHistorico.filter((i) => i.import_id === imp.id && typeof i.amount === "number" && Number.isFinite(i.amount));
                  const total = itensDaSemana.reduce((s, i) => s + (i.amount ?? 0), 0);
                  const totalXpt = itensDaSemana.filter((i) => tipoOperacao(i.base) === "XPT").reduce((s, i) => s + (i.amount ?? 0), 0);
                  const totalServices = itensDaSemana.filter((i) => tipoOperacao(i.base) === "SERVICES").reduce((s, i) => s + (i.amount ?? 0), 0);
                  return {
                    id: imp.id,
                    semana: imp.week_code,
                    ano: imp.year,
                    arquivo: imp.file_name,
                    registros: itensDaSemana.length,
                    total,
                    totalXpt,
                    totalServices,
                  };
                });

                return (
                  <div className="space-y-4 pt-2">
                    <div className="rounded-lg border border-border overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/60 text-xs font-bold uppercase text-muted-foreground">
                          <tr>
                            <th className="px-4 py-2.5 text-left">Semana</th>
                            <th className="px-4 py-2.5 text-left">Arquivo</th>
                            <th className="px-4 py-2.5 text-right">Registros</th>
                            <th className="px-4 py-2.5 text-right">Total XPT</th>
                            <th className="px-4 py-2.5 text-right">Total SERVICES</th>
                            <th className="px-4 py-2.5 text-right">Total Geral</th>
                          </tr>
                        </thead>
                        <tbody>
                          {totaisPorSemana.map((s) => (
                            <tr key={s.id} className="border-t border-border hover:bg-muted/20">
                              <td className="px-4 py-2.5 font-bold text-primary">{s.semana} ({s.ano})</td>
                              <td className="px-4 py-2.5 text-muted-foreground truncate max-w-[180px]" title={s.arquivo}>{s.arquivo}</td>
                              <td className="px-4 py-2.5 text-right tabular-nums font-semibold">{s.registros}</td>
                              <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-primary">{brl(s.totalXpt)}</td>
                              <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-muted-foreground">{brl(s.totalServices)}</td>
                              <td className="px-4 py-2.5 text-right tabular-nums font-extrabold text-destructive">{brl(s.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </>
          )}
        </DialogContent>
      </Dialog>

      <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              Saúde operacional — dados reais classificados
            </p>
            <h2 className="mt-3 text-lg font-bold">Média histórica da Base e limite saudável</h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              A média semanal usa exclusivamente os valores válidos das semanas em que cada Base possui dados reais. Não há preenchimento de semanas ausentes com zero e não são usados valores simulados.
            </p>
          </div>
          <div className="w-full sm:w-44">
            <Label className="text-sm font-semibold">Ano do ranking</Label>
            <Select
              value={anoRanking === null ? "" : String(anoRanking)}
              onValueChange={(valor) => setAnoRanking(Number(valor))}
            >
              <SelectTrigger className="mt-2"><SelectValue placeholder="Selecione o ano" /></SelectTrigger>
              <SelectContent>
                {anosDisponiveis.map((ano) => <SelectItem key={ano} value={String(ano)}>{`Ranking ${ano}`}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {!resumoSaude.categoriaConfigurada ? (
          <div className="mt-5 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
            <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div>
              <p className="font-bold">Ranking aguardando classificação de negócio</p>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                Não há regra ativa na categoria “{SAVINGS_SAUDE_CONFIG.CATEGORIA_OFENSA}”. Por segurança, nenhuma perda ou ofensa foi inferida a partir dos registros importados.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <KpiCard
                label="Média geral das operações"
                value={resumoSaude.mediaGeral === null ? "Sem dados válidos" : brl(resumoSaude.mediaGeral)}
                hint="Média entre as médias semanais das bases válidas"
                icon={TrendingDown}
                tone="highlight"
              />
              <KpiCard
                label="Limite saudável"
                value={brl(LIMITE_SAUDAVEL_OPERACAO)}
                hint="Por operação por semana"
                icon={Check}
                tone="gain"
              />
              <KpiCard
                label="Operações avaliadas"
                value={`${resumoSaude.operacoes.length}`}
                hint={`Mínimo futuro configurado: ${MIN_SEMANAS_RANKING} semana(s)`}
                icon={CalendarRange}
                tone="neutral"
              />
            </div>

            <div className="mt-5 overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-[1060px] text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3">Base</th>
                    <th className="px-4 py-3 text-right">Média semanal</th>
                    <th className="px-4 py-3 text-right">Diferença p/ limite</th>
                    <th className="px-4 py-3 text-right">Semanas avaliadas</th>
                    <th className="px-4 py-3 text-right">Saudáveis</th>
                    <th className="px-4 py-3 text-right">Ofensoras</th>
                    <th className="px-4 py-3 text-right">Saúde</th>
                    <th className="px-4 py-3 text-right">Melhor semana</th>
                    <th className="px-4 py-3 text-right">Pior semana</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {resumoSaude.operacoes.map((operacao) => (
                    <tr key={operacao.base} className="border-t border-border">
                      <td className="px-4 py-3 font-semibold">{rotuloOperacao(operacao.base)}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">{brl(operacao.mediaSemanal)}</td>
                      <td className={cn("px-4 py-3 text-right font-semibold tabular-nums", operacao.diferencaLimite <= 0 ? "text-success" : "text-destructive")}>
                        {operacao.diferencaLimite <= 0 ? "−" : "+"}{brl(Math.abs(operacao.diferencaLimite))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{operacao.semanasAvaliadas}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-success">{operacao.semanasSaudaveis}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-destructive">{operacao.semanasOfensoras}</td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">{operacao.percentualSaude.toFixed(1)}%</td>
                      <td className="px-4 py-3 text-right tabular-nums"><span className="font-semibold">{brl(operacao.melhorSemana.valor)}</span><span className="ml-1 text-xs text-muted-foreground">{operacao.melhorSemana.weekCode}</span></td>
                      <td className="px-4 py-3 text-right tabular-nums"><span className="font-semibold">{brl(operacao.piorSemana.valor)}</span><span className="ml-1 text-xs text-muted-foreground">{operacao.piorSemana.weekCode}</span></td>
                      <td className="px-4 py-3 text-right"><StatusSaude status={operacao.statusAtual} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {resumoSaude.operacoes.length === 0 ? <p className="px-5 py-8 text-center text-sm font-medium text-muted-foreground">Não há valores válidos da categoria de ofensa para o ano selecionado.</p> : null}
            </div>
          </>
        )}
      </section>

      {resumoSaude.categoriaConfigurada ? (
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-panel)]">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Ranking das Operações</h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground">Ranking {anoRanking ?? "anual"} por menor média semanal de valor ofensor. Operações não são excluídas pelo mínimo de semanas configurado.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-muted/50"><tr className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground"><th className="px-5 py-3">Posição</th><th className="px-5 py-3">Base</th><th className="px-5 py-3 text-right">Média semanal</th><th className="px-5 py-3 text-right">Semanas avaliadas</th><th className="px-5 py-3 text-right">Saudáveis</th><th className="px-5 py-3 text-right">Ofensoras</th><th className="px-5 py-3 text-right">Saúde</th><th className="px-5 py-3 text-right">Melhor semana</th><th className="px-5 py-3 text-right">Pior semana</th><th className="px-5 py-3 text-right">Status</th></tr></thead>
              <tbody>{resumoSaude.operacoes.map((operacao, indice) => <tr key={operacao.base} className="border-t border-border transition-colors hover:bg-muted/40"><td className="px-5 py-3 font-extrabold text-primary">{indice + 1}º</td><td className="px-5 py-3 font-semibold">{rotuloOperacao(operacao.base)}</td><td className="px-5 py-3 text-right font-bold tabular-nums">{brl(operacao.mediaSemanal)}</td><td className="px-5 py-3 text-right tabular-nums">{operacao.semanasAvaliadas}</td><td className="px-5 py-3 text-right tabular-nums text-success">{operacao.semanasSaudaveis}</td><td className="px-5 py-3 text-right tabular-nums text-destructive">{operacao.semanasOfensoras}</td><td className="px-5 py-3 text-right font-semibold tabular-nums">{operacao.percentualSaude.toFixed(2)}%</td><td className="px-5 py-3 text-right tabular-nums"><span className="font-semibold">{brl(operacao.melhorSemana.valor)}</span><span className="ml-1 text-xs text-muted-foreground">{operacao.melhorSemana.weekCode}</span></td><td className="px-5 py-3 text-right tabular-nums"><span className="font-semibold">{brl(operacao.piorSemana.valor)}</span><span className="ml-1 text-xs text-muted-foreground">{operacao.piorSemana.weekCode}</span></td><td className="px-5 py-3 text-right"><StatusSaude status={operacao.statusAtual} /></td></tr>)}</tbody>
            </table>
          </div>
        </section>
      ) : null}

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
              <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full text-sm"><thead className="bg-muted/50"><tr className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground"><th className="px-3 py-2">Base</th><th className="px-3 py-2 text-right">Semana atual</th><th className="px-3 py-2 text-right">Anterior</th></tr></thead><tbody>{comparativoSemanal.porBase.map((item) => <tr key={item.base} className="border-t border-border"><td className="px-3 py-2 font-semibold">{rotuloOperacao(item.base)}</td><td className="px-3 py-2 text-right tabular-nums">{item.atual}</td><td className="px-3 py-2 text-right tabular-nums">{item.anterior}</td></tr>)}</tbody></table></div>
              <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full text-sm"><thead className="bg-muted/50"><tr className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground"><th className="px-3 py-2">Classificação</th><th className="px-3 py-2 text-right">Semana atual</th><th className="px-3 py-2 text-right">Anterior</th></tr></thead><tbody>{comparativoSemanal.porClassificacao.map((item) => <tr key={item.classificacao} className="border-t border-border"><td className="px-3 py-2 font-semibold">{item.classificacao}</td><td className="px-3 py-2 text-right tabular-nums">{item.atual}</td><td className="px-3 py-2 text-right tabular-nums">{item.anterior}</td></tr>)}</tbody></table></div>
            </div>
          </>
        ) : null}
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-panel)]">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Histórico técnico de versões
          </h2>
          <p className="mt-1 text-sm font-medium text-muted-foreground">
            Auditoria de todas as importações, incluindo versões substituídas e tentativas com falha.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3">Semana</th>
                <th className="px-5 py-3">Importada em</th>
                <th className="px-5 py-3">Arquivo</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Versão</th>
                <th className="px-5 py-3 text-right">Registros</th>
                <th className="px-5 py-3 text-right">Bases</th>
              </tr>
            </thead>
            <tbody>
              {historicoImportacoes.map((item) => (
                <tr
                  key={item.id}
                  className={cn(
                    "border-t border-border transition-colors hover:bg-muted/40",
                    item.id === importacaoSelecionada && "cursor-pointer bg-primary/5",
                    !item.is_current && "bg-muted/20 text-muted-foreground",
                  )}
                  onClick={() => {
                    if (item.is_current && item.status === "completed") setImportacaoSelecionada(item.id);
                  }}
                >
                  <td className="px-5 py-3 font-semibold text-primary">{item.week_code}</td>
                  <td className="px-5 py-3 text-muted-foreground">{formatarDataImportacao(item.imported_at)}</td>
                  <td className="max-w-[260px] truncate px-5 py-3 font-medium" title={item.file_name}>
                    <span className="inline-flex items-center gap-2"><FileText className="size-4 text-muted-foreground" />{item.file_name}</span>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                        item.status === "completed"
                          ? "border-success/40 bg-success/10 text-success"
                          : item.status === "failed"
                            ? "border-destructive/40 bg-destructive/10 text-destructive"
                            : "border-border bg-muted text-muted-foreground",
                      )}
                    >
                      {item.status === "completed" ? <Check className="size-3.5" /> : null}
                      {item.status === "completed" ? "Concluída" : item.status === "failed" ? "Falhou" : "Processando"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {item.is_current ? (
                      <span className="inline-flex rounded-full border border-primary/20 bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">Atual</span>
                    ) : item.superseded_by || item.superseded_at ? (
                      <span className="inline-flex rounded-full border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">Substituída</span>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground">Não oficial</span>
                    )}
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
              <p className="text-xs font-bold uppercase tracking-wider text-primary">{rotuloOperacao(observacao.base)}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm font-medium leading-relaxed">{observacao.note}</p>
            </div>
          )) : <p className="text-sm font-medium text-muted-foreground">Não há observações registradas para este filtro.</p>}
        </div>
      </section>

      {/* SEÇÃO OPCIONAL DE PROJEÇÃO */}
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
                      params={{ baseId: l.codigoBase }}
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
        <Clock className="mr-1 inline size-4" /> Desempenho semanal usa a semana {importacaoAtual?.week_code ?? "selecionada"}. Média, saúde e ranking usam somente valores válidos da categoria “{SAVINGS_SAUDE_CONFIG.CATEGORIA_OFENSA}” vinculada por regra ativa nas importações concluídas. A simulação permanece separada e não altera os registros importados.
      </p>
    </div>
  );
}

function StatusSaude({ status }: { status: "Saudável" | "Ofensor" }) {
  const saudavel = status === "Saudável";
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold", saudavel ? "border-success/30 bg-success/10 text-success" : "border-destructive/30 bg-destructive/10 text-destructive")}>
      {status}
    </span>
  );
}
