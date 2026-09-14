import { useMemo, useState, useEffect } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChevronDown, Save, Wallet, TrendingDown, Percent, CalendarRange } from "lucide-react";
import { toast } from "sonner";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { brl, brlCurto } from "@/components/dashboard/data";
import { ImportButton } from "./ImportDialog";
import { useEntries, useNotes, salvarObservacao, type Entry } from "./api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

type Referencia = { tipo: "primeira" | "media" | "manual"; valor: number };

const chave = (e: { year: number; week_label: string }) => `${e.year}-${e.week_label}`;

function useDados() {
  const { data: entries = [], isLoading } = useEntries();
  const semanas = useMemo(
    () => Array.from(new Set(entries.map(chave))).sort(),
    [entries],
  );
  const bases = useMemo(
    () => Array.from(new Set(entries.map((e) => e.base))).sort(),
    [entries],
  );
  return { entries, semanas, bases, isLoading };
}

function Chip({
  ativo,
  children,
  onClick,
}: {
  ativo: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-sm font-semibold transition-colors",
        ativo
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-muted/40 text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function VazioHistorico() {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
      <h2 className="text-lg font-bold">Nenhuma semana importada ainda</h2>
      <p className="mx-auto mt-2 max-w-md text-sm font-medium text-muted-foreground">
        Importe a planilha semanal recebida por e-mail para montar a linha do tempo de gastos e
        economia. As colunas podem ser mapeadas na hora da importação.
      </p>
      <div className="mt-5 flex justify-center">
        <ImportButton />
      </div>
    </div>
  );
}

function calcularReferencia(
  ref: Referencia,
  totaisPorSemana: { semana: string; total: number }[],
  semanasSelecionadas: string[],
): number | null {
  if (ref.tipo === "manual") return ref.valor > 0 ? ref.valor : null;
  const selecionadas = totaisPorSemana.filter((t) => semanasSelecionadas.includes(t.semana));
  if (selecionadas.length === 0) return null;
  if (ref.tipo === "primeira") return selecionadas[0]!.total;
  const primeira = selecionadas[0]!.semana;
  const anteriores = totaisPorSemana.filter((t) => t.semana < primeira);
  if (anteriores.length === 0) return null;
  return anteriores.reduce((s, t) => s + t.total, 0) / anteriores.length;
}

/* ---------------------------------- Histórico --------------------------------- */

export function HistoryView() {
  const { entries, semanas, bases, isLoading } = useDados();
  const { data: notes = [] } = useNotes();
  const [semSel, setSemSel] = useState<string[]>([]);
  const [baseSel, setBaseSel] = useState<string[]>([]);
  const [detalhe, setDetalhe] = useState<string | null>(null);
  const [ref, setRef] = useState<Referencia>({ tipo: "primeira", valor: 0 });
  const [obs, setObs] = useState("");

  useEffect(() => {
    if (semanas.length && semSel.length === 0) setSemSel(semanas);
  }, [semanas]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (bases.length && baseSel.length === 0) setBaseSel(bases);
  }, [bases]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtradas = useMemo(
    () => entries.filter((e) => semSel.includes(chave(e)) && baseSel.includes(e.base)),
    [entries, semSel, baseSel],
  );

  const totaisPorSemana = useMemo(() => {
    const mapa = new Map<string, number>();
    entries
      .filter((e) => baseSel.includes(e.base))
      .forEach((e) => mapa.set(chave(e), (mapa.get(chave(e)) ?? 0) + Number(e.amount)));
    return Array.from(mapa, ([semana, total]) => ({ semana, total })).sort((a, b) =>
      a.semana.localeCompare(b.semana),
    );
  }, [entries, baseSel]);

  const serie = totaisPorSemana.filter((t) => semSel.includes(t.semana));
  const totalSelecionado = serie.reduce((s, t) => s + t.total, 0);
  const referencia = calcularReferencia(ref, totaisPorSemana, semSel);
  const economiaTotal =
    referencia === null ? null : referencia * serie.length - totalSelecionado;
  const economiaPct =
    referencia === null || referencia === 0 || serie.length === 0
      ? null
      : ((referencia * serie.length - totalSelecionado) / (referencia * serie.length)) * 100;
  const mediaSemanal = serie.length ? totalSelecionado / serie.length : 0;
  const economiaAnual =
    economiaTotal === null || serie.length === 0 ? null : (economiaTotal / serie.length) * 52;

  useEffect(() => {
    if (!detalhe) return;
    const [year, week] = detalhe.split("-");
    const n = notes.find((x) => String(x.year) === year && x.week_label === week && !x.base);
    setObs(n?.note ?? "");
  }, [detalhe, notes]);

  if (isLoading) return <p className="text-sm font-medium text-muted-foreground">Carregando…</p>;
  if (entries.length === 0) return <VazioHistorico />;

  const detalheEntries = filtradas.filter((e) => chave(e) === detalhe);
  const porBaseDetalhe = Array.from(
    detalheEntries.reduce((m, e) => m.set(e.base, (m.get(e.base) ?? 0) + Number(e.amount)), new Map<string, number>()),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Histórico semanal</h2>
          <p className="text-sm font-medium text-muted-foreground">
            Linha do tempo das semanas importadas e economia frente à referência.
          </p>
        </div>
        <ImportButton />
      </div>

      <section className="grid gap-4 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
        <div>
          <Label className="text-sm font-semibold">Semanas</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip ativo={semSel.length === semanas.length} onClick={() => setSemSel(semanas)}>
              Todas as semanas
            </Chip>
            {semanas.map((s) => (
              <Chip
                key={s}
                ativo={semSel.includes(s)}
                onClick={() =>
                  setSemSel((a) => (a.includes(s) ? a.filter((x) => x !== s) : [...a, s].sort()))
                }
              >
                {s.split("-")[1]}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-sm font-semibold">Bases</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip ativo={baseSel.length === bases.length} onClick={() => setBaseSel(bases)}>
              Todas as bases
            </Chip>
            {bases.map((b) => (
              <Chip
                key={b}
                ativo={baseSel.includes(b)}
                onClick={() =>
                  setBaseSel((a) => (a.includes(b) ? a.filter((x) => x !== b) : [...a, b]))
                }
              >
                {b}
              </Chip>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
          <div>
            <Label className="text-sm font-semibold">Referência de economia</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              <Chip ativo={ref.tipo === "primeira"} onClick={() => setRef({ tipo: "primeira", valor: 0 })}>
                Semana inicial
              </Chip>
              <Chip ativo={ref.tipo === "media"} onClick={() => setRef({ tipo: "media", valor: 0 })}>
                Média das semanas anteriores
              </Chip>
              <Chip ativo={ref.tipo === "manual"} onClick={() => setRef({ tipo: "manual", valor: 0 })}>
                Valor-base manual
              </Chip>
            </div>
          </div>
          {ref.tipo === "manual" ? (
            <Input
              type="number"
              className="w-44"
              placeholder="Valor por semana"
              value={ref.valor || ""}
              onChange={(e) => setRef({ tipo: "manual", valor: Number(e.target.value) })}
            />
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Custo/perda selecionado" value={brl(totalSelecionado)} hint={`${serie.length} semana(s)`} icon={Wallet} tone="loss" />
        <KpiCard
          label="Economia total"
          value={economiaTotal === null ? "Defina a referência" : brl(economiaTotal)}
          hint={referencia === null ? "Sem base de comparação" : `Referência: ${brl(referencia)}/semana`}
          icon={TrendingDown}
          tone="gain"
        />
        <KpiCard
          label="Economia %"
          value={economiaPct === null ? "Defina a referência" : `${economiaPct.toFixed(1)}%`}
          hint="Frente à referência selecionada"
          icon={Percent}
          tone="highlight"
        />
        <KpiCard
          label="Média semanal"
          value={brl(mediaSemanal)}
          hint={economiaAnual === null ? "Economia anualizada indisponível" : `Economia anualizada: ${brl(economiaAnual)}`}
          icon={CalendarRange}
        />
      </section>

      <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          Evolução por semana
        </h3>
        <div className="mt-5 h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={serie.map((s) => ({ ...s, semana: s.semana.split("-")[1] }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="semana" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
              <YAxis tickFormatter={(v: number) => brlCurto(v)} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={64} />
              <RTooltip formatter={(v: number) => brl(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "0.6rem", fontSize: 12 }} />
              <Line type="monotone" dataKey="total" name="Total" stroke="var(--chart-1)" strokeWidth={3} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-panel)]">
        <div className="border-b border-border px-5 py-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Semanas (clique para detalhar)
          </h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-bold uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3">Semana</th>
              <th className="px-5 py-3 text-right">Total gasto/perda</th>
              <th className="px-5 py-3 text-right">Economia vs referência</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {serie.map((s) => {
              const eco = referencia === null ? null : referencia - s.total;
              return (
                <tr
                  key={s.semana}
                  className="cursor-pointer border-t border-border hover:bg-muted/40"
                  onClick={() => setDetalhe(detalhe === s.semana ? null : s.semana)}
                >
                  <td className="px-5 py-3 font-bold">{s.semana.split("-")[1]} · {s.semana.split("-")[0]}</td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums text-destructive">{brl(s.total)}</td>
                  <td className={cn("px-5 py-3 text-right font-extrabold tabular-nums", eco !== null && eco >= 0 ? "text-success" : "text-destructive")}>
                    {eco === null ? "Defina a referência" : brl(eco)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <ChevronDown className={cn("inline size-4 transition-transform", detalhe === s.semana && "rotate-180")} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {detalhe ? (
        <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Detalhe da semana {detalhe.split("-")[1]}
          </h3>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Base</th>
                    <th className="px-3 py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {porBaseDetalhe.map(([b, v]) => (
                    <tr key={b} className="border-t border-border">
                      <td className="px-3 py-2 font-semibold">{b}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{brl(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="max-h-64 overflow-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/50">
                  <tr className="text-left font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="px-3 py-2">Base</th>
                    <th className="px-3 py-2">Categoria</th>
                    <th className="px-3 py-2 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {detalheEntries.map((e: Entry) => (
                    <tr key={e.id} className="border-t border-border">
                      <td className="px-3 py-2">{e.base}</td>
                      <td className="px-3 py-2">{e.category ?? e.description ?? "—"}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{brl(Number(e.amount))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Observações da semana</Label>
            <Textarea value={obs} onChange={(e) => setObs(e.target.value)} rows={3} />
            <Button
              variant="outline"
              onClick={async () => {
                const [year, week] = detalhe.split("-");
                await salvarObservacao({ year: Number(year), week_label: week!, base: null, note: obs });
                toast.success("Observação salva");
              }}
            >
              <Save className="mr-2 size-4" /> Salvar observação
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

/* --------------------------------- Comparativo -------------------------------- */

export function ComparisonView() {
  const { entries, semanas, bases, isLoading } = useDados();
  const [semSel, setSemSel] = useState<string[]>([]);
  const [baseSel, setBaseSel] = useState<string[]>([]);

  useEffect(() => { if (semanas.length && semSel.length === 0) setSemSel(semanas); }, [semanas]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (bases.length && baseSel.length === 0) setBaseSel(bases); }, [bases]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return <p className="text-sm font-medium text-muted-foreground">Carregando…</p>;
  if (entries.length === 0) return <VazioHistorico />;

  const filtradas = entries.filter((e) => semSel.includes(chave(e)) && baseSel.includes(e.base));

  const porSemana = Array.from(
    filtradas.reduce((m, e) => m.set(chave(e), (m.get(chave(e)) ?? 0) + Number(e.amount)), new Map<string, number>()),
  )
    .map(([semana, total]) => ({ semana: semana.split("-")[1]!, total }))
    .sort((a, b) => a.semana.localeCompare(b.semana));

  const porBase = Array.from(
    filtradas.reduce((m, e) => m.set(e.base, (m.get(e.base) ?? 0) + Number(e.amount)), new Map<string, number>()),
  )
    .map(([base, total]) => ({ base, total }))
    .sort((a, b) => b.total - a.total);

  const consolidado = filtradas.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Comparativo</h2>
        <p className="text-sm font-medium text-muted-foreground">
          Semana vs semana, base vs base e consolidado das semanas selecionadas.
        </p>
      </div>

      <section className="grid gap-4 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
        <div>
          <Label className="text-sm font-semibold">Semanas</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip ativo={semSel.length === semanas.length} onClick={() => setSemSel(semanas)}>Todas</Chip>
            {semanas.map((s) => (
              <Chip key={s} ativo={semSel.includes(s)} onClick={() => setSemSel((a) => a.includes(s) ? a.filter((x) => x !== s) : [...a, s].sort())}>
                {s.split("-")[1]}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <Label className="text-sm font-semibold">Bases</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip ativo={baseSel.length === bases.length} onClick={() => setBaseSel(bases)}>Todas as bases</Chip>
            {bases.map((b) => (
              <Chip key={b} ativo={baseSel.includes(b)} onClick={() => setBaseSel((a) => a.includes(b) ? a.filter((x) => x !== b) : [...a, b])}>
                {b}
              </Chip>
            ))}
          </div>
        </div>
      </section>

      <KpiCard label="Consolidado das semanas selecionadas" value={brl(consolidado)} hint={`${porSemana.length} semana(s) · ${porBase.length} base(s)`} icon={Wallet} tone="highlight" />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Semana vs semana</h3>
          <div className="mt-5 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porSemana}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="semana" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <YAxis tickFormatter={(v: number) => brlCurto(v)} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={64} />
                <RTooltip formatter={(v: number) => brl(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "0.6rem", fontSize: 12 }} />
                <Bar dataKey="total" name="Total" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Base vs base</h3>
          <div className="mt-5 h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porBase}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="base" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} />
                <YAxis tickFormatter={(v: number) => brlCurto(v)} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={64} />
                <RTooltip formatter={(v: number) => brl(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: "0.6rem", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="total" name="Total" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------- Simulação --------------------------------- */

export function SimulationView() {
  const { entries, bases, semanas, isLoading } = useDados();
  const [reducoes, setReducoes] = useState<Record<string, number>>({});
  const [valoresFixos, setValoresFixos] = useState<Record<string, string>>({});

  if (isLoading) return <p className="text-sm font-medium text-muted-foreground">Carregando…</p>;
  if (entries.length === 0) return <VazioHistorico />;

  const semanasCount = semanas.length || 1;
  const realPorBase = bases.map((base) => {
    const total = entries.filter((e) => e.base === base).reduce((s, e) => s + Number(e.amount), 0);
    const medio = total / semanasCount;
    const fixo = Number(valoresFixos[base]);
    const simulado = Number.isFinite(fixo) && valoresFixos[base]
      ? fixo
      : medio * (1 - (reducoes[base] ?? 0) / 100);
    return { base, medio, simulado, economia: medio - simulado };
  });

  const totalReal = realPorBase.reduce((s, r) => s + r.medio, 0);
  const totalSim = realPorBase.reduce((s, r) => s + r.simulado, 0);
  const economia = totalReal - totalSim;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold">Simulações</h2>
        <p className="text-sm font-medium text-muted-foreground">
          Ajuste a redução esperada por base. Os dados reais importados não são alterados.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Real · média semanal" value={brl(totalReal)} hint="Base: semanas importadas" icon={Wallet} tone="loss" />
        <KpiCard label="Simulado · média semanal" value={brl(totalSim)} hint="Cenário projetado" icon={TrendingDown} tone="gain" />
        <KpiCard label="Economia simulada" value={brl(economia)} hint={`Anualizada: ${brl(economia * 52)}`} icon={Percent} tone="highlight" />
      </section>

      <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Premissas por base</h3>
        {realPorBase.map((r) => (
          <div key={r.base} className="grid items-center gap-3 border-t border-border pt-4 sm:grid-cols-[140px_1fr_120px_160px]">
            <div>
              <p className="text-sm font-bold">{r.base}</p>
              <p className="text-sm font-medium text-muted-foreground">Real: {brl(r.medio)}</p>
            </div>
            <Slider
              value={[reducoes[r.base] ?? 0]}
              onValueChange={([v]) => setReducoes((m) => ({ ...m, [r.base]: v ?? 0 }))}
              min={0}
              max={100}
              step={5}
            />
            <span className="text-sm font-extrabold tabular-nums text-primary">{reducoes[r.base] ?? 0}% redução</span>
            <Input
              placeholder="Valor estimado (R$)"
              value={valoresFixos[r.base] ?? ""}
              onChange={(e) => setValoresFixos((m) => ({ ...m, [r.base]: e.target.value }))}
            />
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-panel)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-bold uppercase tracking-wider text-muted-foreground">
              <th className="px-5 py-3">Base</th>
              <th className="px-5 py-3 text-right">Real</th>
              <th className="px-5 py-3 text-right">Simulado</th>
              <th className="px-5 py-3 text-right">Economia</th>
            </tr>
          </thead>
          <tbody>
            {realPorBase.map((r) => (
              <tr key={r.base} className="border-t border-border">
                <td className="px-5 py-3 font-semibold">{r.base}</td>
                <td className="px-5 py-3 text-right tabular-nums text-destructive font-semibold">{brl(r.medio)}</td>
                <td className="px-5 py-3 text-right tabular-nums text-success font-semibold">{brl(r.simulado)}</td>
                <td className="px-5 py-3 text-right font-extrabold tabular-nums">{brl(r.economia)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="pb-4 text-sm font-medium italic text-muted-foreground">
        * Valores simulados não alteram os dados reais importados.
      </p>
    </div>
  );
}
