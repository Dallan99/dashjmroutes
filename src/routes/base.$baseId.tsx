import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { BASES, brl } from "@/components/dashboard/data";
import { decomporBase } from "@/components/dashboard/metricas";

export const Route = createFileRoute("/base/$baseId")({
  validateSearch: (search: Record<string, unknown>) => ({
    eficacia: Math.min(Math.max(Number(search["eficacia"] ?? 100) || 0, 0), 100),
  }),
  head: () => ({
    meta: [
      { title: "Detalhe da base — JMRoutes" },
      {
        name: "description",
        content:
          "Decomposição da perda operacional mensal de uma base e do saving projetado com o JMRoutes.",
      },
      { property: "og:title", content: "Detalhe da base — JMRoutes" },
      {
        property: "og:description",
        content: "Perda atual, piso de referência, parcela redutível e saving anual por base.",
      },
    ],
  }),
  loader: ({ params }) => {
    if (!BASES.some((b) => b.id === params.baseId)) throw notFound();
  },
  component: BaseDetalhe,
});

function Linha({
  rotulo,
  valor,
  nota,
  destaque,
}: {
  rotulo: string;
  valor: string;
  nota?: string;
  destaque?: "loss" | "gain" | "primary";
}) {
  const cor =
    destaque === "loss"
      ? "text-destructive"
      : destaque === "gain"
        ? "text-success"
        : destaque === "primary"
          ? "text-primary"
          : "text-foreground";
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-3 last:border-0">
      <div>
        <p className="text-sm font-medium">{rotulo}</p>
        {nota ? <p className="mt-0.5 text-xs text-muted-foreground">{nota}</p> : null}
      </div>
      <p className={`shrink-0 text-sm font-semibold tabular-nums ${cor}`}>{valor}</p>
    </div>
  );
}

function BaseDetalhe() {
  const { baseId } = Route.useParams();
  const { eficacia } = Route.useSearch();
  const d = decomporBase(baseId, eficacia / 100);
  if (!d) return null;

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
          <h1 className="text-2xl font-semibold tracking-tight">{d.base.nome}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {d.base.comJMRoutes
              ? "Base já em operação com JMRoutes — referência de desempenho."
              : `Cenário simulado com eficácia de implantação de ${eficacia}%.`}
          </p>
        </header>

        <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Decomposição do valor
          </h2>
          <div className="mt-3">
            <Linha
              rotulo="Perda mensal atual"
              valor={brl(d.base.perdaAtual)}
              nota="Medida no relatório executivo"
              destaque="loss"
            />
            <Linha
              rotulo="Piso de referência"
              valor={brl(d.piso)}
              nota="Perda residual real da SSP34 (Embu) com JMRoutes"
            />
            <Linha
              rotulo="Parcela redutível"
              valor={brl(d.redutivel)}
              nota="Perda atual − piso de referência"
            />
            <Linha
              rotulo={`Redução aplicada (${eficacia}%)`}
              valor={`− ${brl(d.reducao)}`}
              nota="Parcela redutível × eficácia"
              destaque="primary"
            />
            <Linha
              rotulo="Perda mensal projetada"
              valor={brl(d.projetado)}
              nota="Perda atual − redução aplicada"
              destaque="gain"
            />
            <Linha
              rotulo="Saving anual"
              valor={brl(d.economiaAnual)}
              nota="Saving mensal × 12"
              destaque="primary"
            />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Como o cálculo funciona
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground">
            <li>
              A perda nunca chega a zero: mesmo com roteirização automatizada resta o piso
              observado em Embu.
            </li>
            <li>
              A eficácia representa quanto do potencial de melhoria é capturado após a implantação;
              100% equivale ao desempenho real da SSP34.
            </li>
            <li>Fórmula: projetado = atual − (atual − piso) × eficácia.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
