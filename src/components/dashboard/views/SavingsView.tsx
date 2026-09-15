import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertCircle,
  Building2,
  CalendarRange,
  Check,
  Clock,
  FileText,
  Filter,
  PieChart,
  ShieldAlert,
  Trash2,
  TrendingDown,
  TrendingUp,
  Upload,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription as AlertDialogMessage,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { WeeklyImportButton } from "@/components/history/WeeklyImportDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  LIMITE_SAUDAVEL_OPERACAO,
  OPERACOES_OFICIAIS,
  useWeeklyImports,
  useWeeklyImportsHistory,
  useWeeklyItems,
  useWeeklyItemsForImports,
  useWeekNotes,
  nomeOperacao,
  resolverBaseOperacao,
} from "@/components/history/weekly-api";
import { cn } from "@/lib/utils";

/** Somente estas quatro bases são XPT. Todo o restante é SERVICES. */
const XPT_CODES = new Set(["ESP15", "ESP16", "ESP17", "ESP18"]);

/** Extrai o código da base a partir de textos como "ESP15 - XPT Ibiúna". */
export function normalizarCodigoBase(base: string | null | undefined) {
  if (!base) return "";
  const texto = base.trim().replace(/\s+/g, " ").toLocaleUpperCase("pt-BR");
  const match = texto.match(/\b([A-Z]{2,4})\s*-?\s*(\d{1,3})\b/);
  return match ? `${match[1]}${match[2]}` : texto;
}

function codigoSemBase(baseCode: string | null | undefined) {
  return ["", "SEM BASE", "-", "0", "NAO", "NÃO"].includes(normalizarCodigoBase(baseCode));
}

/** Classificação oficial do tipo de operação, baseada apenas no código da base. */
export function getOperationType(baseCode: string | null | undefined): "XPT" | "SERVICES" | "SEM BASE" {
  if (codigoSemBase(baseCode)) return "SEM BASE";
  return XPT_CODES.has(normalizarCodigoBase(baseCode)) ? "XPT" : "SERVICES";
}

function codigoOperacao(base: string | null | undefined, service?: string | null) {
  const codigo = normalizarCodigoBase(resolverBaseOperacao(base, service));
  return codigoSemBase(codigo) ? "" : codigo;
}

function rotuloBase(base: string | null | undefined, service?: string | null) {
  const codigo = codigoOperacao(base, service);
  if (!codigo || codigo === "SEM BASE") return "Sem base";
  const nome = nomeOperacao(codigo);
  return nome ? `${codigo} · ${nome}` : `${codigo} · Não cadastrada`;
}

function rotuloOrigem(item: { base: string | null; service: string | null }) {
  return normalizarCodigoBase(item.base) || normalizarCodigoBase(item.service) || "Sem base";
}

interface SavingsViewProps {
  selecionadas: string[];
  setSelecionadas: React.Dispatch<React.SetStateAction<string[]>>;
  eficacia: number;
  setEficacia: (v: number) => void;
}

export function SavingsView({
  selecionadas,
  setSelecionadas,
  eficacia,
  setEficacia,
}: SavingsViewProps) {
  const queryClient = useQueryClient();
  const {
    data: importacoes = [],
    isLoading: carregandoImportacoes,
    isError: erroImportacoes,
    refetch: recarregarImportacoes,
  } = useWeeklyImports();
  const { data: historicoImportacoes = [] } = useWeeklyImportsHistory();
  const [importacaoSelecionada, setImportacaoSelecionada] = useState("");
  const [baseSelecionada, setBaseSelecionada] = useState("__todas_as_bases__");
  const [tipoSelecionado, setTipoSelecionado] = useState<"TODOS" | "XPT" | "SERVICES">("TODOS");
  const [anoRanking, setAnoRanking] = useState<number | null>(null);
  const [modalDetalhe, setModalDetalhe] = useState<"total" | "media" | "ofensora" | "semanas" | null>(null);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [excluindoSemana, setExcluindoSemana] = useState(false);

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

  const { data: itensSemana = [], isLoading: carregandoItens, isError: erroItens, refetch: recarregarItens } = useWeeklyItems(importacaoAtual?.id);
  const { data: itensHistorico = [], isLoading: carregandoHistorico, isError: erroHistorico, refetch: recarregarHistorico } = useWeeklyItemsForImports(importacoes.map((i) => i.id));
  const { data: observacoesSemana = [] } = useWeekNotes(importacaoAtual?.id);

  const excluirSemana = async () => {
    if (!importacaoAtual) return;

    setExcluindoSemana(true);
    try {
      const { error: erroObservacoes } = await supabase
        .from("week_notes")
        .delete()
        .eq("import_id", importacaoAtual.id);
      if (erroObservacoes) throw erroObservacoes;

      const { error: erroItens } = await supabase
        .from("weekly_items")
        .delete()
        .eq("import_id", importacaoAtual.id);
      if (erroItens) throw erroItens;

      const { error: erroImportacao } = await supabase
        .from("weekly_imports")
        .delete()
        .eq("id", importacaoAtual.id);
      if (erroImportacao) throw erroImportacao;

      setImportacaoSelecionada("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["weekly_imports"] }),
        queryClient.invalidateQueries({ queryKey: ["weekly_items"] }),
        queryClient.invalidateQueries({ queryKey: ["week_notes"] }),
      ]);
      toast.success(`${importacaoAtual.week_code} excluída`, {
        description: "A semana foi removida e já pode ser importada novamente.",
      });
    } catch (error) {
      console.error("[Savings] Falha ao excluir semana:", error);
      toast.error("Não foi possível excluir a semana", {
        description: "Nenhuma nova importação foi criada. Tente novamente.",
      });
    } finally {
      setExcluindoSemana(false);
      setConfirmarExclusao(false);
    }
  };

  const anosDisponiveis = useMemo(() => {
    const anos = Array.from(new Set(importacoes.map((i) => i.year))).sort((a, b) => b - a);
    return anos.length > 0 ? anos : [new Date().getFullYear()];
  }, [importacoes]);

  const basesDisponiveis = useMemo(() => {
    const naSemana = new Set(itensSemana.map((i) => codigoOperacao(i.base, i.service)).filter(Boolean));
    const oficiais = Object.keys(OPERACOES_OFICIAIS);
    const uniao = Array.from(new Set([...oficiais, ...naSemana]));
    return uniao.sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [itensSemana]);

  const itensFiltrados = useMemo(() => {
    return itensSemana.filter((item) => {
      const b = codigoOperacao(item.base, item.service);
      const matchBase = baseSelecionada === "__todas_as_bases__" || b === baseSelecionada;
      const matchTipo = tipoSelecionado === "TODOS" || getOperationType(b) === tipoSelecionado;
      return matchBase && matchTipo;
    });
  }, [baseSelecionada, tipoSelecionado, itensSemana]);

  const itensHistoricoFiltrados = useMemo(() => {
    return itensHistorico.filter((item) => {
      const b = codigoOperacao(item.base, item.service);
      const matchBase = baseSelecionada === "__todas_as_bases__" || b === baseSelecionada;
      const matchTipo = tipoSelecionado === "TODOS" || getOperationType(b) === tipoSelecionado;
      return matchBase && matchTipo;
    });
  }, [baseSelecionada, tipoSelecionado, itensHistorico]);

  const rankingFiltrado = useMemo(() => {
    const importacoesDoAno = importacoes.filter((importacao) => anoRanking === null || importacao.year === anoRanking);
    const importacoesPorId = new Map(importacoesDoAno.map((importacao) => [importacao.id, importacao]));
    const valoresPorBaseESemana = new Map<string, Map<string, number>>();

    for (const item of itensHistorico) {
      if (!importacoesPorId.has(item.import_id) || typeof item.amount !== "number" || !Number.isFinite(item.amount)) continue;

      const base = codigoOperacao(item.base, item.service);
      if (!base) continue;

      const matchBase = baseSelecionada === "__todas_as_bases__" || base === baseSelecionada;
      const matchTipo = tipoSelecionado === "TODOS" || getOperationType(base) === tipoSelecionado;
      if (!matchBase || !matchTipo) continue;

      const valoresDaBase = valoresPorBaseESemana.get(base) ?? new Map<string, number>();
      valoresDaBase.set(item.import_id, (valoresDaBase.get(item.import_id) ?? 0) + item.amount);
      valoresPorBaseESemana.set(base, valoresDaBase);
    }

    return Array.from(valoresPorBaseESemana, ([base, valoresPorSemana]) => {
      const semanas = Array.from(valoresPorSemana, ([importId, valor]) => ({
        weekCode: importacoesPorId.get(importId)?.week_code ?? importId,
        valor,
      })).sort((a, b) => a.valor - b.valor);
      const total = semanas.reduce((acumulado, semana) => acumulado + semana.valor, 0);
      const mediaSemanal = total / semanas.length;
      const semanasSaudaveis = semanas.filter((semana) => semana.valor <= LIMITE_SAUDAVEL_OPERACAO).length;

      return {
        base,
        mediaSemanal,
        diferencaLimite: mediaSemanal - LIMITE_SAUDAVEL_OPERACAO,
        semanasAvaliadas: semanas.length,
        semanasSaudaveis,
        semanasOfensoras: semanas.length - semanasSaudaveis,
        percentualSaude: (semanasSaudaveis / semanas.length) * 100,
        melhorSemana: semanas[0]!,
        piorSemana: semanas.at(-1)!,
        statusAtual: mediaSemanal <= LIMITE_SAUDAVEL_OPERACAO ? "Saudável" as const : "Ofensor" as const,
      };
    }).sort((a, b) => b.mediaSemanal - a.mediaSemanal);
  }, [anoRanking, baseSelecionada, importacoes, itensHistorico, tipoSelecionado]);

  const evolucaoSemanal = useMemo(() => {
    const totaisPorImportacao = new Map(
      importacoes.map((imp) => [
        imp.id,
        { semana: imp.week_code, year: imp.year, week: imp.week_number, valor: 0, registros: 0 },
      ]),
    );

    for (const item of itensHistoricoFiltrados) {
      const total = totaisPorImportacao.get(item.import_id);
      if (!total) continue;
      total.registros += 1;
      if (typeof item.amount === "number" && Number.isFinite(item.amount)) {
        total.valor += item.amount;
      }
    }

    return Array.from(totaisPorImportacao.values()).sort(
      (a, b) => a.year - b.year || a.week - b.week,
    );
  }, [importacoes, itensHistoricoFiltrados]);

  const dadosFinanceiros = useMemo(() => {
    const validos = itensFiltrados.filter((i) => typeof i.amount === "number" && Number.isFinite(i.amount));
    const totalGeral = validos.reduce((s, i) => s + (i.amount ?? 0), 0);
    const totalXpt = validos
      .filter((i) => getOperationType(codigoOperacao(i.base, i.service)) === "XPT")
      .reduce((s, i) => s + (i.amount ?? 0), 0);
    const totalServices = validos
      .filter((i) => getOperationType(codigoOperacao(i.base, i.service)) === "SERVICES")
      .reduce((s, i) => s + (i.amount ?? 0), 0);
    const totalSemBase = validos
      .filter((i) => getOperationType(codigoOperacao(i.base, i.service)) === "SEM BASE")
      .reduce((s, i) => s + (i.amount ?? 0), 0);

    const mediaSemanal = importacoes.length > 0 ? totalGeral / importacoes.length : 0;

    const porBase = new Map<string, number>();
    for (const item of validos) {
      const b = codigoOperacao(item.base, item.service) || "Sem base";
      porBase.set(b, (porBase.get(b) ?? 0) + (item.amount ?? 0));
    }
    const listaOrdenada = Array.from(porBase.entries())
      .map(([codigo, total]) => ({
        codigo,
        nome: nomeOperacao(codigo) ?? (codigo === "Sem base" ? "Sem base" : "Não cadastrada"),
        rotulo: rotuloBase(codigo),
        tipo: getOperationType(codigo),
        total,
        pct: totalGeral > 0 ? (total / totalGeral) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total);


    const maiorOfensor = listaOrdenada[0] ?? null;
    const top5 = listaOrdenada.slice(0, 5);

    return {
      totalGeral,
      totalXpt,
      totalServices,
      totalSemBase,
      mediaSemanal,
      maiorOfensor,
      top5,
      listaBases: listaOrdenada,
      pctXpt: totalGeral > 0 ? (totalXpt / totalGeral) * 100 : 0,
      pctServices: totalGeral > 0 ? (totalServices / totalGeral) * 100 : 0,
    };
  }, [itensFiltrados, importacoes.length]);

  const detalhamentoPorOrigem = useMemo(() => {
    const validos = itensFiltrados.filter((item) => typeof item.amount === "number" && Number.isFinite(item.amount));
    const porOrigem = new Map<string, { total: number; operacao: string; tipo: ReturnType<typeof getOperationType> }>();

    for (const item of validos) {
      const origem = rotuloOrigem(item);
      const operacao = codigoOperacao(item.base, item.service) || "Sem base";
      const atual = porOrigem.get(origem);
      porOrigem.set(origem, {
        total: (atual?.total ?? 0) + (item.amount ?? 0),
        operacao,
        tipo: getOperationType(operacao),
      });
    }

    return Array.from(porOrigem, ([origem, dados]) => ({
      origem,
      ...dados,
      pct: dadosFinanceiros.totalGeral > 0 ? (dados.total / dadosFinanceiros.totalGeral) * 100 : 0,
    })).sort((a, b) => b.total - a.total);
  }, [dadosFinanceiros.totalGeral, itensFiltrados]);

  if (carregandoImportacoes) {
    return <p className="py-10 text-center text-sm font-medium text-muted-foreground">Carregando dados do Dashboard Savings…</p>;
  }

  if (erroImportacoes) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <h2 className="text-sm font-bold">Não foi possível carregar o histórico semanal</h2>
            <p className="mt-1 text-sm text-muted-foreground">Verifique a conexão e tente novamente.</p>
            <button type="button" onClick={() => void recarregarImportacoes()} className="mt-3 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:border-primary">
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (importacoes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
        <Building2 className="mx-auto size-10 text-muted-foreground/60" />
        <h2 className="mt-3 text-lg font-bold">Nenhuma semana importada</h2>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Importe uma planilha semanal para habilitar todos os indicadores executivos de Savings.
        </p>
        <div className="mt-6 flex justify-center">
          <WeeklyImportButton />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      {/* 1. SIDEBAR ESCURA À ESQUERDA */}
      <aside className="w-full shrink-0 rounded-2xl border border-zinc-800 bg-zinc-950 p-3 text-zinc-100 shadow-xl lg:w-[172px] lg:sticky lg:top-4">
        <div className="mb-3 flex items-center justify-between border-b border-zinc-800/80 pb-2.5">
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-amber-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-300">Filtros Savings</h2>
          </div>
          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
            {importacoes.length} sem.
          </span>
        </div>

        <div className="space-y-3 text-xs">
          {/* Filtro: Ano */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Ano</Label>
            <Select
              value={anoRanking === null ? String(anosDisponiveis[0]) : String(anoRanking)}
              onValueChange={(val) => setAnoRanking(Number(val))}
            >
              <SelectTrigger className="h-9 border-zinc-800 bg-zinc-900/90 text-xs text-zinc-100 focus:ring-amber-400">
                <SelectValue placeholder="Selecione o ano" />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-900 text-zinc-100">
                {anosDisponiveis.map((ano) => (
                  <SelectItem key={ano} value={String(ano)} className="text-xs hover:bg-zinc-800 focus:bg-zinc-800">
                    {ano}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro: Base */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Base</Label>
            <Select value={baseSelecionada} onValueChange={setBaseSelecionada}>
              <SelectTrigger className="h-9 border-zinc-800 bg-zinc-900/90 text-xs text-zinc-100 focus:ring-amber-400">
                <SelectValue placeholder="Todas as bases" />
              </SelectTrigger>
              <SelectContent className="max-h-56 border-zinc-800 bg-zinc-900 text-zinc-100">
                <SelectItem value="__todas_as_bases__" className="text-xs hover:bg-zinc-800 focus:bg-zinc-800">
                  Todas as bases
                </SelectItem>
                {basesDisponiveis.map((base) => (
                  <SelectItem key={base} value={base} className="text-xs hover:bg-zinc-800 focus:bg-zinc-800">
                    {rotuloBase(base)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro: Tipo */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Tipo</Label>
            <div className="grid grid-cols-3 gap-1 rounded-lg border border-zinc-800 bg-zinc-900/80 p-1">
              {(['TODOS', 'XPT', 'SERVICES'] as const).map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => setTipoSelecionado(tipo)}
                  className={cn(
                    "rounded py-1.5 text-center text-[11px] font-bold transition-all",
                    tipoSelecionado === tipo
                      ? "bg-zinc-100 text-zinc-950 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-100",
                  )}
                >
                  {tipo === "TODOS" ? "Todos" : tipo}
                </button>
              ))}
            </div>
          </div>

          {/* Filtro: Semana */}
          <div className="space-y-1.5 pt-1">
            <Label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Semana ativa</Label>
            <Select value={importacaoSelecionada} onValueChange={setImportacaoSelecionada}>
              <SelectTrigger className="h-9 border-zinc-800 bg-zinc-900/90 text-xs text-zinc-100 focus:ring-amber-400">
                <SelectValue placeholder="Selecione a semana" />
              </SelectTrigger>
              <SelectContent className="border-zinc-800 bg-zinc-900 text-zinc-100">
                {importacoes.map((item) => (
                  <SelectItem key={item.id} value={item.id} className="text-xs hover:bg-zinc-800 focus:bg-zinc-800">
                    {item.week_code} ({item.year})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Botão Importar semana */}
          <div className="border-t border-zinc-800/80 pt-3">
            <WeeklyImportButton className="w-full justify-center bg-zinc-100 text-zinc-950 font-bold hover:bg-white text-xs h-9 shadow-sm" />
          </div>
          <button
            type="button"
            onClick={() => setConfirmarExclusao(true)}
            disabled={!importacaoAtual || excluindoSemana}
            className="flex h-8 w-full items-center justify-center gap-1.5 rounded-md text-[11px] font-semibold text-red-300 transition-colors hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Trash2 className="size-3.5" />
            Excluir semana
          </button>
        </div>
      </aside>

      {/* 2. ÁREA PRINCIPAL CLARA */}
      <main className="flex-1 min-w-0 space-y-4">
        {/* 3. QUATRO CARDS NO TOPO */}
        <section className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <KpiCard
            label="Total de descontos"
            value={brl(dadosFinanceiros.totalGeral)}
            hint={`XPT: ${brl(dadosFinanceiros.totalXpt)} · SERVICES: ${brl(dadosFinanceiros.totalServices)} · Sem base: ${brl(dadosFinanceiros.totalSemBase)}`}
            icon={Wallet}
            tone="loss"
            onClick={() => setModalDetalhe("total")}
          />
          <KpiCard
            label="Média semanal"
            value={brl(dadosFinanceiros.mediaSemanal)}
            hint={`Limite saudável: ${brl(LIMITE_SAUDAVEL_OPERACAO)}/sem`}
            icon={TrendingDown}
            tone="highlight"
            onClick={() => setModalDetalhe("media")}
          />
          <KpiCard
            label="Maior ofensor"
            value={dadosFinanceiros.maiorOfensor?.rotulo ?? "Nenhum"}
            hint={dadosFinanceiros.maiorOfensor ? `${brl(dadosFinanceiros.maiorOfensor.total)} na semana` : "Sem ocorrências"}
            icon={ShieldAlert}
            tone="loss"
            onClick={() => setModalDetalhe("ofensora")}
          />
          <KpiCard
            label="Semanas analisadas"
            value={`${importacoes.length} semana(s)`}
            hint={`${itensFiltrados.length} registros filtrados`}
            icon={CalendarRange}
            tone="neutral"
            onClick={() => setModalDetalhe("semanas")}
          />
        </section>

        {/* 4. ÁREA GRANDE: DESCONTOS POR SEMANA */}
        <section className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-3">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Descontos por semana</h2>
              <p className="text-xs font-medium text-muted-foreground">Evolução real dos valores descontados em todas as importações concluídas</p>
            </div>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              Histórico oficial
            </span>
          </div>

          <div className="mt-3 h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolucaoSemanal} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.6} />
                <XAxis dataKey="semana" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} />
                <YAxis tickFormatter={(val: number) => brlCurto(val)} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} width={64} />
                <Tooltip
                  formatter={(val: number) => [brl(val), "Descontos"]}
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: "0.6rem",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="valor"
                  name="Descontos"
                  stroke="var(--chart-1)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "var(--chart-1)" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* 5. DOIS BLOCOS MENORES: XPT x SERVICES & TOP 5 OFENSORES */}
        <section className="grid gap-3 lg:grid-cols-2">
          {/* Bloco: XPT x SERVICES */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <PieChart className="size-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">XPT x SERVICES</h3>
              </div>
              <span className="text-xs font-bold text-muted-foreground">Total: {brl(dadosFinanceiros.totalGeral)}</span>
            </div>

            <div className="mt-4 space-y-4">
              {/* Barra proporcional visual */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-primary font-bold">XPT: {dadosFinanceiros.pctXpt.toFixed(1)}%</span>
                  <span className="text-muted-foreground font-bold">SERVICES: {dadosFinanceiros.pctServices.toFixed(1)}%</span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-muted flex">
                  <div style={{ width: `${dadosFinanceiros.pctXpt}%` }} className="bg-primary transition-all duration-300" />
                  <div style={{ width: `${dadosFinanceiros.pctServices}%` }} className="bg-zinc-400 transition-all duration-300" />
                </div>
              </div>

              {/* Cards comparativos */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary block">Operações XPT</span>
                  <p className="text-lg font-extrabold text-primary tabular-nums mt-1">{brl(dadosFinanceiros.totalXpt)}</p>
                  <span className="text-[11px] font-semibold text-muted-foreground">ESP15 a ESP18</span>
                </div>
                <div className="rounded-xl border border-border bg-muted/30 p-3.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">Operações SERVICES</span>
                  <p className="text-lg font-extrabold text-foreground tabular-nums mt-1">{brl(dadosFinanceiros.totalServices)}</p>
                  <span className="text-[11px] font-semibold text-muted-foreground">Demais bases</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bloco: Top 5 ofensores */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="size-4 text-destructive" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Top 5 ofensores</h3>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">Semana {importacaoAtual?.week_code}</span>
            </div>

            <div className="mt-3 space-y-2.5">
              {dadosFinanceiros.top5.map((item, idx) => (
                <div key={item.codigo} className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-bold text-primary tabular-nums w-4">{idx + 1}º</span>
                    <span className="font-semibold truncate max-w-[140px] sm:max-w-[180px]" title={item.rotulo}>
                      {item.rotulo}
                    </span>
                    <Badge variant={item.tipo === "XPT" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0 h-4">
                      {item.tipo}
                    </Badge>
                  </div>
                  <span className="font-extrabold tabular-nums text-destructive text-right ml-2">
                    {brl(item.total)}
                  </span>
                </div>
              ))}
              {dadosFinanceiros.top5.length === 0 && (
                <p className="text-center py-6 text-xs text-muted-foreground">Nenhum ofensor registrado para o filtro atual.</p>
              )}
            </div>
          </div>
        </section>

        {/* 6. PARTE INFERIOR: BASES MAIS OFENSORAS & RANKING ANUAL */}
        <section className="grid gap-3 lg:grid-cols-2">
          {/* Tabela: Bases mais ofensoras */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Bases mais ofensoras</h3>
                <p className="text-[11px] text-muted-foreground">Detalhamento completo das perdas por Base na semana</p>
              </div>
              <span className="text-xs font-bold text-muted-foreground">{dadosFinanceiros.listaBases.length} bases</span>
            </div>

            <div className="mt-3 overflow-x-auto max-h-72">
              <table className="w-full text-xs">
                <thead className="bg-muted/60 text-muted-foreground sticky top-0">
                  <tr className="text-left font-bold uppercase tracking-wider">
                    <th className="px-3 py-2">Base</th>
                    <th className="px-2 py-2 text-center">Tipo</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosFinanceiros.listaBases.map((item) => (
                    <tr key={item.codigo} className="border-t border-border/60 hover:bg-muted/30">
                      <td className="px-3 py-2 font-semibold truncate max-w-[150px]" title={item.rotulo}>
                        {item.rotulo}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <Badge variant={item.tipo === "XPT" ? "default" : "secondary"} className="text-[10px] px-1 py-0 h-4">
                          {item.tipo}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums text-destructive">
                        {brl(item.total)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground font-medium">
                        {item.pct.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tabela: Ranking anual */}
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Ranking anual</h3>
                <p className="text-[11px] text-muted-foreground">Classificação histórica por menor média semanal ofensora</p>
              </div>
              <span className="text-xs font-bold text-primary">Ano {anoRanking ?? "atual"}</span>
            </div>

            <div className="mt-3 overflow-x-auto max-h-72">
              <table className="w-full text-xs">
                <thead className="bg-muted/60 text-muted-foreground sticky top-0">
                  <tr className="text-left font-bold uppercase tracking-wider">
                    <th className="px-3 py-2">Pos.</th>
                    <th className="px-3 py-2">Base</th>
                    <th className="px-3 py-2 text-right">Média/sem</th>
                    <th className="px-3 py-2 text-right">Saúde</th>
                    <th className="px-3 py-2 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rankingFiltrado.map((op, idx) => (
                    <tr key={op.base} className="border-t border-border/60 hover:bg-muted/30">
                      <td className="px-3 py-2 font-extrabold text-primary tabular-nums">{idx + 1}º</td>
                      <td className="px-3 py-2 font-semibold truncate max-w-[130px]" title={rotuloBase(op.base)}>
                        {rotuloBase(op.base)}
                      </td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums">{brl(op.mediaSemanal)}</td>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">{op.percentualSaude.toFixed(0)}%</td>
                      <td className="px-3 py-2 text-right">
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            op.statusAtual === "Saudável"
                              ? "bg-success/10 text-success border border-success/30"
                              : "bg-destructive/10 text-destructive border border-destructive/30",
                          )}
                        >
                          {op.statusAtual}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {rankingFiltrado.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                        Nenhum registro classificado para o ranking anual deste ano.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>

      {/* MODAL DE DETALHAMENTO INTERATIVO */}
      <Dialog open={modalDetalhe !== null} onOpenChange={(open) => !open && setModalDetalhe(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {modalDetalhe === "total" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <Wallet className="size-4 text-destructive" /> Detalhamento de Descontos (XPT x SERVICES)
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Totais por rótulo original da planilha e sua operação no Dashboard Savings.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2 text-xs">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg border border-border bg-card p-3">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Total</span>
                    <p className="text-base font-extrabold text-destructive tabular-nums mt-0.5">{brl(dadosFinanceiros.totalGeral)}</p>
                  </div>
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <span className="text-[10px] font-bold uppercase text-primary">XPT</span>
                    <p className="text-base font-extrabold text-primary tabular-nums mt-0.5">{brl(dadosFinanceiros.totalXpt)}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">SERVICES</span>
                    <p className="text-base font-extrabold text-foreground tabular-nums mt-0.5">{brl(dadosFinanceiros.totalServices)}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/30 p-3">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground">Sem base</span>
                    <p className="text-base font-extrabold text-foreground tabular-nums mt-0.5">{brl(dadosFinanceiros.totalSemBase)}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/60 text-muted-foreground font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2 text-left">Rótulo da planilha</th>
                        <th className="px-3 py-2 text-left">Operação</th>
                        <th className="px-3 py-2 text-center">Tipo</th>
                        <th className="px-3 py-2 text-right">Total</th>
                        <th className="px-3 py-2 text-right">% Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalhamentoPorOrigem.map((item) => (
                        <tr key={item.origem} className="border-t border-border hover:bg-muted/20">
                          <td className="px-3 py-2 font-semibold">{item.origem}</td>
                          <td className="px-3 py-2 text-muted-foreground">{rotuloBase(item.operacao)}</td>
                          <td className="px-3 py-2 text-center"><Badge variant={item.tipo === "XPT" ? "default" : "secondary"}>{item.tipo}</Badge></td>
                          <td className="px-3 py-2 text-right font-extrabold tabular-nums text-destructive">{brl(item.total)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{item.pct.toFixed(1)}%</td>
                        </tr>
                      ))}
                      {detalhamentoPorOrigem.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">Nenhum lançamento para o filtro atual.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {modalDetalhe === "media" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <TrendingDown className="size-4 text-primary" /> Média Semanal Histórica
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Médias semanais consolidadas calculadas exclusivamente com base em semanas com dados válidos.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2 text-xs">
                <div className="rounded-lg border border-border p-3 bg-muted/20">
                  <p className="font-bold text-foreground">Limite operacional saudável: {brl(LIMITE_SAUDAVEL_OPERACAO)}/semana</p>
                  <p className="text-muted-foreground mt-0.5">Bases com média semanal até R$ 1.000 são classificadas como Saudáveis.</p>
                </div>
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/60 text-muted-foreground font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2 text-left">Base</th>
                        <th className="px-3 py-2 text-right">Média Semanal</th>
                        <th className="px-3 py-2 text-right">Semanas</th>
                        <th className="px-3 py-2 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rankingFiltrado.map((op) => (
                        <tr key={op.base} className="border-t border-border hover:bg-muted/20">
                          <td className="px-3 py-2 font-semibold">{rotuloBase(op.base)}</td>
                          <td className="px-3 py-2 text-right font-extrabold tabular-nums">{brl(op.mediaSemanal)}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{op.semanasAvaliadas}</td>
                          <td className="px-3 py-2 text-right"><span className={cn("px-2 py-0.5 rounded-full font-semibold text-[10px]", op.statusAtual === "Saudável" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive")}>{op.statusAtual}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {modalDetalhe === "ofensora" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <ShieldAlert className="size-4 text-destructive" /> Bases Ofensoras do Período
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Lista ordenada por maior perda registrada na semana ativa.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2 text-xs">
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/60 text-muted-foreground font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2 text-left">Pos.</th>
                        <th className="px-3 py-2 text-left">Base</th>
                        <th className="px-3 py-2 text-center">Tipo</th>
                        <th className="px-3 py-2 text-right">Total Perdido</th>
                      </tr>
                    </thead>
                    <tbody>
                      {dadosFinanceiros.listaBases.map((item, idx) => (
                        <tr key={item.codigo} className="border-t border-border hover:bg-muted/20">
                          <td className="px-3 py-2 font-bold text-primary">{idx + 1}º</td>
                          <td className="px-3 py-2 font-semibold">{item.rotulo}</td>
                          <td className="px-3 py-2 text-center"><Badge variant={item.tipo === "XPT" ? "default" : "secondary"}>{item.tipo}</Badge></td>
                          <td className="px-3 py-2 text-right font-extrabold tabular-nums text-destructive">{brl(item.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {modalDetalhe === "semanas" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base font-bold flex items-center gap-2">
                  <CalendarRange className="size-4 text-primary" /> Semanas Concluídas
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Auditoria de importações oficiais semana a semana.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2 text-xs">
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/60 text-muted-foreground font-bold uppercase text-[10px]">
                      <tr>
                        <th className="px-3 py-2 text-left">Semana</th>
                        <th className="px-3 py-2 text-left">Arquivo</th>
                        <th className="px-3 py-2 text-right">Registros</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importacoes.map((s) => (
                        <tr key={s.id} className="border-t border-border hover:bg-muted/20">
                          <td className="px-3 py-2 font-bold text-primary">{s.week_code} ({s.year})</td>
                          <td className="px-3 py-2 text-muted-foreground truncate max-w-[200px]" title={s.file_name}>{s.file_name}</td>
                          <td className="px-3 py-2 text-right font-semibold tabular-nums">{s.items_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={confirmarExclusao} onOpenChange={setConfirmarExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {importacaoAtual?.week_code}?</AlertDialogTitle>
            <AlertDialogMessage>
              Esta ação remove permanentemente os lançamentos e observações de {importacaoAtual?.week_code} ({importacaoAtual?.year}). Depois, você poderá importar a planilha novamente.
            </AlertDialogMessage>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindoSemana}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={excluirSemana} disabled={excluindoSemana} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {excluindoSemana ? "Excluindo…" : "Excluir semana"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
