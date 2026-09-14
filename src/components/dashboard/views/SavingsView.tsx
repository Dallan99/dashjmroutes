import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
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
import { ImportButton } from "@/components/history/ImportDialog";
import { useWeeklyImports, useWeeklyItems } from "@/components/history/weekly-api";
import { cn } from "@/lib/utils";

interface SavingsViewProps {
  selecionadas: string[];
  setSelecionadas: React.Dispatch<React.SetStateAction<string[]>>;
  eficacia: number;
  setEficacia: (v: number) => void;
}

export function SavingsView({ selecionadas, setSelecionadas, eficacia, setEficacia }: SavingsViewProps) {
  const { data: importacoes = [], isLoading: carregandoImportacoes } = useWeeklyImports();
  const [importacaoSelecionada, setImportacaoSelecionada] = useState("");
  const [baseSelecionada, setBaseSelecionada] = useState("__todas_as_bases__");

  useEffect(() => {
    if (!importacaoSelecionada && importacoes.length > 0) {
      setImportacaoSelecionada(importacoes[0]!.id);
    }
  }, [importacaoSelecionada, importacoes]);

  const importacaoAtual = importacoes.find((item) => item.id === importacaoSelecionada) ?? null;
  const { data: itensSemana = [], isLoading: carregandoItens } = useWeeklyItems(importacaoAtual?.id);

  const basesSemana = useMemo(
    () =>
      Array.from(
        new Map(
          itensSemana
            .filter((item) => item.base?.trim())
            .map((item) => [item.base!.trim().toLocaleUpperCase("pt-BR"), item.base!.trim()]),
        ).values(),
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

  const fator = eficacia / 100;
  const linhas = useMemo(() => {
    const totais = new Map<string, number>();
    for (const item of itensFiltrados) {
      const base = item.base?.trim();
      if (!base) continue;
      totais.set(base, (totais.get(base) ?? 0) + Number(item.amount ?? 0));
    }

    return Array.from(totais, ([nome, atual]) => {
      const referencia = BASES.find(
        (base) => base.id.toLocaleUpperCase("pt-BR") === nome.toLocaleUpperCase("pt-BR"),
      );
      const comJMRoutes = referencia?.comJMRoutes ?? false;
      const ativa = comJMRoutes || selecionadas.includes(nome);
      const projetado = ativa ? perdaProjetada(atual, fator) : atual;

      return {
        id: nome,
        nome,
        comJMRoutes,
        ativa,
        atual,
        projetado,
        economia: atual - projetado,
      };
    }).sort((a, b) => b.atual - a.atual);
  }, [itensFiltrados, selecionadas, fator]);

  const criticas = linhas.filter((linha) => !linha.comJMRoutes);
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

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold">Savings por semana importada</h2>
            <p className="mt-1 text-sm font-medium text-muted-foreground">
              Analise os dados reais da importação selecionada e mantenha a simulação operacional.
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
            {importacoes
              .slice()
              .reverse()
              .map((item) => (
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

      {carregandoItens ? (
        <p className="text-sm font-medium text-muted-foreground">Carregando itens da semana selecionada…</p>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(
          [
            {
              id: "perda-atual",
              label: "Perda semanal atual",
              value: brl(totalAtual),
              hint: `${itensFiltrados.length} registro(s) da semana selecionada`,
              icon: TrendingUp,
              tone: "loss",
            },
            {
              id: "perda-projetada",
              label: "Perda semanal projetada",
              value: brl(totalProjetado),
              hint: `Piso de referência: ${brl(PISO_JMROUTES)} / base`, 
              icon: TrendingDown,
              tone: "gain",
            },
            {
              id: "saving",
              label: "Saving semanal",
              value: brl(economiaSemanal),
              hint: `Redução de ${reducaoPct.toFixed(1)}% das perdas`,
              icon: Wallet,
              tone: "highlight",
            },
            {
              id: "escopo",
              label: "Bases no escopo",
              value: `${criticas.filter((base) => selecionadas.includes(base.id)).length} de ${criticas.length}`,
              hint: "Bases da semana no escopo da simulação",
              icon: CircleCheck,
              tone: "neutral",
            },
          ] as const
        ).map((kpi) => (
          <Link
            key={kpi.id}
            to="/metrica/$metricaId"
            params={{ metricaId: kpi.id }}
            search={{ eficacia, bases: selecionadas.join(",") }}
            className="rounded-xl transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <KpiCard
              label={kpi.label}
              value={kpi.value}
              hint={kpi.hint}
              icon={kpi.icon}
              tone={kpi.tone}
            />
          </Link>
        ))}
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

      <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Perda semanal por base
          </h2>
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
              Simulação
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
            Detalhamento por base
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
