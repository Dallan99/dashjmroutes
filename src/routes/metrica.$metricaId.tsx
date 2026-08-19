import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { BASES, brl, perdaProjetada } from "@/components/dashboard/data";
import { METRICAS, type MetricaId } from "@/components/dashboard/metricas";

export const Route = createFileRoute("/metrica/$metricaId")({
  validateSearch: (search: Record<string, unknown>) => ({
    eficacia: Math.min(Math.max(Number(search["eficacia"] ?? 100) || 0, 0), 100),
    bases: typeof search["bases"] === "string" ? (search["bases"] as string) : "",
  }),
  head: () => ({
    meta: [
      { title: "Detalhe do indicador — JMRoutes" },
      {
        name: "description",
        content:
          "Explicação e decomposição por base dos indicadores de perda e saving do painel JMRoutes.",
      },
      { property: "og:title", content: "Detalhe do indicador — JMRoutes" },
      {
        property: "og:description",
        content: "Entenda como cada indicador do painel de savings é calculado, base a base.",
      },
    ],
  }),
  loader: ({ params }) => {
    if (!(params.metricaId in METRICAS)) throw notFound();
  },
  component: MetricaDetalhe,
});

function MetricaDetalhe() {
  const { metricaId } = Route.useParams();
  const { eficacia, bases } = Route.useSearch();
  const info = METRICAS[metricaId as MetricaId];
  const selecionadas = bases ? bases.split(",").filter(Boolean) : [];
  const fator = eficacia / 100;

  const linhas = BASES.filter((b) => !b.comJMRoutes).map((b) => {
    const ativa = selecionadas.includes(b.id);
    const projetado = ativa ? perdaProjetada(b.perdaAtual, fator) : b.perdaAtual;
    return { ...b, ativa, projetado, economia: b.perdaAtual - projetado };
  });

  const totalAtual = linhas.reduce((s, l) => s + l.perdaAtual, 0);
  const totalProjetado = linhas.reduce((s, l) => s + l.projetado, 0);

  const valorPrincipal =
    metricaId === "perda-atual"
      ? brl(totalAtual)
      : metricaId === "perda-projetada"
        ? brl(totalProjetado)
        : metricaId === "saving"
          ? brl(totalAtual - totalProjetado)
          : `${selecionadas.length} de ${linhas.length}`;

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl space-y-6 px-5 py-8">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Voltar ao painel
        </Link>

        <header>
          <h1 className="text-2xl font-semibold tracking-tight">{info.titulo}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{info.resumo}</p>
          <p className="mt-4 text-3xl font-semibold tabular-nums text-primary">{valorPrincipal}</p>
          <p className="text-xs text-muted-foreground">Cenário com eficácia de {eficacia}%</p>
        </header>

        <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Como este número é calculado
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            {info.explicacao.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-panel)]">
          <div className="border-b border-border px-5 py-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Composição por base
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3 font-medium">Base</th>
                  <th className="px-5 py-3 text-right font-medium">Atual</th>
                  <th className="px-5 py-3 text-right font-medium">Projetado</th>
                  <th className="px-5 py-3 text-right font-medium">Saving mensal</th>
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
                        className="hover:text-primary"
                      >
                        {l.nome}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-destructive">
                      {brl(l.perdaAtual)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-success">
                      {brl(l.projetado)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums font-medium">
                      {brl(l.economia)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-muted/40 font-semibold">
                  <td className="px-5 py-3">Total</td>
                  <td className="px-5 py-3 text-right tabular-nums">{brl(totalAtual)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{brl(totalProjetado)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">
                    {brl(totalAtual - totalProjetado)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
