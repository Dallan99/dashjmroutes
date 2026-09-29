import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, ChevronDown, Trophy, User, Wallet, AlertTriangle, Eye } from "lucide-react";
import { brl } from "@/components/dashboard/data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useWeeklyImports,
  useWeeklyItemsForImports,
  nomeOperacao,
  resolverBaseOperacao,
} from "@/components/history/weekly-api";
import {
  normalizarCodigoBase,
  getOperationType,
} from "@/components/dashboard/views/SavingsView";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/motoristas")({
  head: () => ({
    meta: [
      { title: "JMRoutes — Ranking de Motoristas Ofensores" },
      {
        name: "description",
        content: "Ranking de motoristas com maiores descontos por base na operação JM Transportes.",
      },
      { property: "og:title", content: "JMRoutes — Ranking de Motoristas Ofensores" },
      {
        property: "og:description",
        content: "Motoristas ofensores por base: nomes, ocorrências e valores de desconto.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MotoristasPage,
});

type MotoristaRow = {
  motorista: string;
  base: string;
  rotuloBase: string;
  tipo: "XPT" | "SERVICES" | "SEM BASE";
  ocorrencias: number;
  total: number;
};

function rotuloBaseMotorista(base: string) {
  const nome = nomeOperacao(base);
  return nome ? `${base} · ${nome}` : `${base} · Não cadastrada`;
}

function MotoristasPage() {
  const { data: importacoes = [] } = useWeeklyImports();
  const importIds = useMemo(() => importacoes.map((i) => i.id), [importacoes]);
  const { data: itens = [] } = useWeeklyItemsForImports(importIds);

  const [basesSelecionadas, setBasesSelecionadas] = useState<string[]>([]);
  const [tipoSelecionado, setTipoSelecionado] = useState<string>("todos");
  const [selecionado, setSelecionado] = useState<MotoristaRow | null>(null);

  const semanaPorImport = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const imp of importacoes) {
      mapa.set(imp.id, `W${imp.week} (${imp.year})`);
    }
    return mapa;
  }, [importacoes]);

  const detalhesSelecionado = useMemo(() => {
    if (!selecionado) return [];
    return itens
      .filter((item) => {
        const motorista = (item.driver ?? "").trim();
        if (motorista !== selecionado.motorista) return false;
        const codigo = normalizarCodigoBase(resolverBaseOperacao(item.base, item.service)) || "SEM BASE";
        return codigo === selecionado.base;
      })
      .sort((a, b) => Math.abs(Number(b.amount) || 0) - Math.abs(Number(a.amount) || 0));
  }, [selecionado, itens]);

  const ranking = useMemo<MotoristaRow[]>(() => {
    const mapa = new Map<string, MotoristaRow>();
    for (const item of itens) {
      const motorista = (item.driver ?? "").trim();
      if (!motorista) continue;
      const codigo = normalizarCodigoBase(resolverBaseOperacao(item.base, item.service)) || "SEM BASE";
      const tipo = getOperationType(codigo);
      const chave = `${motorista}||${codigo}`;
      const atual = mapa.get(chave) ?? {
        motorista,
        base: codigo,
        rotuloBase: rotuloBaseMotorista(codigo),
        tipo,
        ocorrencias: 0,
        total: 0,
      };
      atual.ocorrencias += 1;
      atual.total += Math.abs(Number(item.amount) || 0);
      mapa.set(chave, atual);
    }
    return Array.from(mapa.values()).sort((a, b) => b.total - a.total);
  }, [itens]);

  const basesDisponiveis = useMemo(() => {
    const set = new Map<string, string>();
    for (const r of ranking) set.set(r.base, r.rotuloBase);
    return Array.from(set.entries())
      .map(([codigo, rotulo]) => ({ codigo, rotulo }))
      .sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));
  }, [ranking]);

  const rankingFiltrado = useMemo(
    () =>
      ranking.filter(
        (r) =>
          (basesSelecionadas.length === 0 || basesSelecionadas.includes(r.base)) &&
          (tipoSelecionado === "todos" || r.tipo === tipoSelecionado),
      ),
    [ranking, basesSelecionadas, tipoSelecionado],
  );

  const totalGeral = rankingFiltrado.reduce((s, r) => s + r.total, 0);
  const totalOcorrencias = rankingFiltrado.reduce((s, r) => s + r.ocorrencias, 0);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-[image:var(--gradient-hero)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-secondary sm:text-2xl">
              Ranking de Motoristas Ofensores
            </h1>
            <p className="text-xs font-semibold text-white">
              Descontos por motorista e base · todas as semanas importadas
            </p>
          </div>
          <Button asChild variant="outline" className="w-fit">
            <Link to="/" search={{ view: "savings" }}>
              <ArrowLeft className="mr-2 size-4" /> Voltar ao painel
            </Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-6 space-y-6">
        {/* Filtros */}
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Base</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-56 justify-between font-semibold">
                  {basesSelecionadas.length === 0
                    ? "Todas as bases"
                    : `${basesSelecionadas.length} selecionada(s)`}
                  <ChevronDown className="size-4 opacity-60" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2" align="start">
                <button
                  className="mb-1 w-full rounded-md px-2 py-1.5 text-left text-sm font-bold hover:bg-accent"
                  onClick={() => setBasesSelecionadas([])}
                >
                  Todas
                </button>
                {basesDisponiveis.map((b) => (
                  <label
                    key={b.codigo}
                    className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm font-semibold hover:bg-accent"
                  >
                    <Checkbox
                      checked={basesSelecionadas.includes(b.codigo)}
                      onCheckedChange={(checked) =>
                        setBasesSelecionadas((prev) =>
                          checked ? [...prev, b.codigo] : prev.filter((x) => x !== b.codigo),
                        )
                      }
                    />
                    {b.rotulo}
                  </label>
                ))}
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Tipo</p>
            <div className="flex gap-1">
              {["todos", "XPT", "SERVICES"].map((t) => (
                <Button
                  key={t}
                  size="sm"
                  variant={tipoSelecionado === t ? "default" : "outline"}
                  className="font-semibold"
                  onClick={() => setTipoSelecionado(t)}
                >
                  {t === "todos" ? "Todos" : t}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="size-4" />
              <p className="text-xs font-bold uppercase tracking-wider">Motoristas no ranking</p>
            </div>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">{rankingFiltrado.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertTriangle className="size-4" />
              <p className="text-xs font-bold uppercase tracking-wider">Ocorrências</p>
            </div>
            <p className="mt-1 text-2xl font-extrabold tabular-nums">{totalOcorrencias}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Wallet className="size-4" />
              <p className="text-xs font-bold uppercase tracking-wider">Total em descontos</p>
            </div>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-destructive">{brl(totalGeral)}</p>
          </div>
        </div>

        {/* Tabela */}
        <div className="overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50 text-left">
                <th className="px-4 py-3 font-bold">#</th>
                <th className="px-4 py-3 font-bold">Motorista</th>
                <th className="px-4 py-3 font-bold">Base</th>
                <th className="px-4 py-3 font-bold">Tipo</th>
                <th className="px-4 py-3 text-right font-bold">Ocorrências</th>
                <th className="px-4 py-3 text-right font-bold">Total descontos</th>
              </tr>
            </thead>
            <tbody>
              {rankingFiltrado.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center font-semibold text-muted-foreground">
                    Nenhum motorista encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
              {rankingFiltrado.map((r, i) => (
                <tr
                  key={`${r.motorista}-${r.base}`}
                  className={cn(
                    "border-b border-border/60 last:border-0",
                    i < 3 && "bg-destructive/5",
                  )}
                >
                  <td className="px-4 py-2.5 font-extrabold tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      {i < 3 && <Trophy className="size-4 text-secondary" />}
                      {i + 1}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-semibold">{r.motorista}</td>
                  <td className="px-4 py-2.5 font-semibold">{r.rotuloBase}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-bold",
                        r.tipo === "XPT"
                          ? "bg-primary/10 text-primary"
                          : r.tipo === "SERVICES"
                            ? "bg-secondary/20 text-secondary-foreground"
                            : "bg-muted text-muted-foreground",
                      )}
                    >
                      {r.tipo}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{r.ocorrencias}</td>
                  <td className="px-4 py-2.5 text-right font-extrabold tabular-nums text-destructive">
                    {brl(r.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            {rankingFiltrado.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/40">
                  <td colSpan={4} className="px-4 py-3 font-extrabold">
                    Total ({rankingFiltrado.length} motoristas)
                  </td>
                  <td className="px-4 py-3 text-right font-extrabold tabular-nums">{totalOcorrencias}</td>
                  <td className="px-4 py-3 text-right font-extrabold tabular-nums text-destructive">
                    {brl(totalGeral)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </main>
  );
}
