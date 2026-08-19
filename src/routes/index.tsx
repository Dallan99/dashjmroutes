import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { CircleCheck, TrendingDown, TrendingUp, Wallet } from "lucide-react";

import logo from "@/assets/jmtd-logo.jpg.asset.json";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { BASES, PISO_JMROUTES, brl, brlCurto, perdaProjetada } from "@/components/dashboard/data";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "JMRoutes — Painel de Savings por Base" },
      {
        name: "description",
        content:
          "Simule a economia anual da implantação do JMRoutes nas bases críticas SSP15, SSP20, SSP25 e SSP45.",
      },
      { property: "og:title", content: "JMRoutes — Painel de Savings por Base" },
      {
        property: "og:description",
        content:
          "Perdas operacionais atuais versus cenário projetado com JMRoutes, com simulação de eficácia por base.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const criticas = BASES.filter((b) => !b.comJMRoutes);
  const [selecionadas, setSelecionadas] = useState<string[]>(criticas.map((b) => b.id));
  const [eficacia, setEficacia] = useState(100);

  const fator = eficacia / 100;

  const linhas = useMemo(
    () =>
      BASES.map((base) => {
        const ativa = base.comJMRoutes || selecionadas.includes(base.id);
        const projetado = ativa ? perdaProjetada(base.perdaAtual, fator) : base.perdaAtual;
        return {
          ...base,
          ativa,
          atual: base.perdaAtual,
          projetado,
          economia: base.perdaAtual - projetado,
        };
      }),
    [selecionadas, fator],
  );

  const escopo = linhas.filter((l) => !l.comJMRoutes);
  const totalAtual = escopo.reduce((s, l) => s + l.atual, 0);
  const totalProjetado = escopo.reduce((s, l) => s + l.projetado, 0);
  const economiaMensal = totalAtual - totalProjetado;
  const reducaoPct = totalAtual > 0 ? (economiaMensal / totalAtual) * 100 : 0;

  const toggle = (id: string) =>
    setSelecionadas((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id],
    );

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-[image:var(--gradient-hero)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logo.url}
              alt="Logotipo JM TD"
              className="size-11 rounded-lg border border-border"
            />
            <div>
              <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
                JMRoutes · Painel de Savings
              </h1>
              <p className="text-xs text-muted-foreground">
                Supply Chain AI Lead · Business case operacional
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Economia anual projetada
            </p>
            <p className="text-xl font-semibold tabular-nums text-primary">
              {brl(economiaMensal * 12)}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-5 py-7">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              {
                id: "perda-atual",
                label: "Perda mensal atual",
                value: brl(totalAtual),
                hint: "Bases críticas em processo manual",
                icon: TrendingUp,
                tone: "loss",
              },
              {
                id: "perda-projetada",
                label: "Perda mensal projetada",
                value: brl(totalProjetado),
                hint: `Piso de referência: ${brl(PISO_JMROUTES)} / base`,
                icon: TrendingDown,
                tone: "gain",
              },
              {
                id: "saving",
                label: "Saving mensal",
                value: brl(economiaMensal),
                hint: `Redução de ${reducaoPct.toFixed(1)}% das perdas`,
                icon: Wallet,
                tone: "highlight",
              },
              {
                id: "escopo",
                label: "Bases no escopo",
                value: `${selecionadas.length} de ${criticas.length}`,
                hint: "Ver detalhes da simulação",
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

        <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Perda mensal por base
            </h2>
            <div className="mt-5 h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={linhas}
                  margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                  onClick={undefined}
                  className=""
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
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Simulação
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Escolha as bases que receberão o JMRoutes.
              </p>
            </div>

            <div className="space-y-3">
              {criticas.map((base) => (
                <div key={base.id} className="flex items-center justify-between gap-3">
                  <Label htmlFor={`base-${base.id}`} className="flex flex-col items-start gap-0.5">
                    <span className="text-sm font-medium">{base.nome}</span>
                    <span className="text-xs tabular-nums text-muted-foreground">
                      {brl(base.perdaAtual)} / mês
                    </span>
                  </Label>
                  <Switch
                    id={`base-${base.id}`}
                    checked={selecionadas.includes(base.id)}
                    onCheckedChange={() => toggle(base.id)}
                  />
                </div>
              ))}
            </div>

            <div className="space-y-3 border-t border-border pt-4">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Eficácia da implantação</Label>
                <span className="text-sm font-semibold tabular-nums text-primary">{eficacia}%</span>
              </div>
              <Slider
                value={[eficacia]}
                onValueChange={([v]) => setEficacia(v ?? 0)}
                min={0}
                max={100}
                step={5}
              />
              <p className="text-xs text-muted-foreground">
                100% equivale ao desempenho real da base SSP34 (Embu).
              </p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-panel)]">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Detalhamento por base
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Base</th>
                  <th className="px-5 py-3 text-right font-medium">Atual / mês</th>
                  <th className="px-5 py-3 text-right font-medium">Projetado / mês</th>
                  <th className="px-5 py-3 text-right font-medium">Saving anual</th>
                  <th className="px-5 py-3 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.id} className="border-t border-border">
                    <td className="px-5 py-3 font-medium">
                      <Link
                        to="/base/$baseId"
                        params={{ baseId: l.id }}
                        search={{ eficacia }}
                        className="hover:text-primary hover:underline"
                      >
                        {l.nome}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-destructive">
                      {brl(l.atual)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-success">
                      {brl(l.projetado)}
                    </td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums">
                      {brl(l.economia * 12)}
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

        <p className="pb-4 text-xs text-muted-foreground">
          a empresa, estes dados são somente da W33 - somente 1 semana - isso da para projetar no mês e anual
        </p>
      </div>
    </main>
  );
}
