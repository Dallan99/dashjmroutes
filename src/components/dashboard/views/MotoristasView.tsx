import { useMemo, useState } from "react";
import { ChevronDown, Trophy, User, Wallet, AlertTriangle, Eye } from "lucide-react";
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

export function MotoristasView() {
  const { data: importacoes = [] } = useWeeklyImports();
  const importIds = useMemo(() => importacoes.map((i) => i.id), [importacoes]);
  const { data: itens = [] } = useWeeklyItemsForImports(importIds);

  const [basesSelecionadas, setBasesSelecionadas] = useState<string[]>([]);
  const [tipoSelecionado, setTipoSelecionado] = useState<string>("todos");
  const [semanasSelecionadas, setSemanasSelecionadas] = useState<string[]>([]);
  const [selecionado, setSelecionado] = useState<MotoristaRow | null>(null);

  const semanaPorImport = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const imp of importacoes) {
      mapa.set(imp.id, `W${imp.week_number} (${imp.year})`);
    }
    return mapa;
  }, [importacoes]);

  const itensIdsPorSemana = useMemo(() => {
    const set = new Set(semanasSelecionadas);
    if (set.size === 0) return null; // null = todas as semanas
    return new Set(
      importacoes
        .filter((imp) => set.has(`W${imp.week_number} (${imp.year})`))
        .map((imp) => imp.id),
    );
  }, [semanasSelecionadas, importacoes]);

  const detalhesSelecionado = useMemo(() => {
    if (!selecionado) return [];
    return itens
      .filter((item) => {
        if (itensIdsPorSemana && !itensIdsPorSemana.has(item.import_id)) return false;
        const motorista = (item.driver ?? "").trim();
        if (motorista !== selecionado.motorista) return false;
        const codigo = normalizarCodigoBase(resolverBaseOperacao(item.base, item.service)) || "SEM BASE";
        return codigo === selecionado.base;
      })
      .sort((a, b) => Math.abs(Number(b.amount) || 0) - Math.abs(Number(a.amount) || 0));
  }, [selecionado, itens, itensIdsPorSemana]);

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
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-extrabold tracking-tight">Ranking de Motoristas Ofensores</h2>
        <p className="text-sm font-semibold text-muted-foreground">
          Descontos por motorista e base · todas as semanas importadas · clique na linha para ver o detalhe
        </p>
      </div>


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
                  onClick={() => setSelecionado(r)}
                  title="Clique para ver o detalhe das ocorrências"
                  className={cn(
                    "cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-accent/60",
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
                    <span className="inline-flex items-center justify-end gap-2">
                      {brl(r.total)}
                      <Eye className="size-4 text-muted-foreground" />
                    </span>
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

      {/* Detalhe do motorista */}
      <Dialog open={selecionado !== null} onOpenChange={(open) => !open && setSelecionado(null)}>
        <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto">
          {selecionado && (
            <>
              <DialogHeader>
                <DialogTitle className="text-lg font-extrabold">{selecionado.motorista}</DialogTitle>
                <DialogDescription className="font-semibold">
                  {selecionado.rotuloBase} · {selecionado.tipo}
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Ocorrências</p>
                  <p className="mt-1 text-xl font-extrabold tabular-nums">{selecionado.ocorrencias}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total descontos</p>
                  <p className="mt-1 text-xl font-extrabold tabular-nums text-destructive">{brl(selecionado.total)}</p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Média por ocorrência</p>
                  <p className="mt-1 text-xl font-extrabold tabular-nums">
                    {brl(selecionado.ocorrencias > 0 ? selecionado.total / selecionado.ocorrencias : 0)}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Maior desconto</p>
                  <p className="mt-1 text-xl font-extrabold tabular-nums text-destructive">
                    {brl(detalhesSelecionado.length > 0 ? Math.abs(Number(detalhesSelecionado[0]?.amount) || 0) : 0)}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-left">
                      <th className="px-3 py-2 font-bold">Semana</th>
                      <th className="px-3 py-2 font-bold">Data</th>
                      <th className="px-3 py-2 font-bold">Descrição</th>
                      <th className="px-3 py-2 font-bold">Pacote</th>
                      <th className="px-3 py-2 font-bold">Rota</th>
                      <th className="px-3 py-2 font-bold">Status</th>
                      <th className="px-3 py-2 text-right font-bold">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detalhesSelecionado.map((item) => (
                      <tr key={item.id} className="border-b border-border/60 last:border-0">
                        <td className="px-3 py-2 font-semibold whitespace-nowrap">
                          {semanaPorImport.get(item.import_id) ?? "—"}
                        </td>
                        <td className="px-3 py-2 font-semibold whitespace-nowrap">
                          {item.event_date
                            ? new Date(`${item.event_date}T00:00:00`).toLocaleDateString("pt-BR")
                            : "—"}
                        </td>
                        <td className="px-3 py-2 font-semibold">{item.description || "—"}</td>
                        <td className="px-3 py-2 font-semibold">{item.package_id || "—"}</td>
                        <td className="px-3 py-2 font-semibold">{item.route_id || "—"}</td>
                        <td className="px-3 py-2 font-semibold">{item.operational_status || item.classification || "—"}</td>
                        <td className="px-3 py-2 text-right font-extrabold tabular-nums text-destructive whitespace-nowrap">
                          {brl(Math.abs(Number(item.amount) || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
