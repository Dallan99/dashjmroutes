import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, Check, Search, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useWeeklyClassificationsSurvey } from "@/components/history/weekly-api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/regras-classificacao")({
  head: () => ({
    meta: [
      { title: "Regras de Classificação — JMRoutes" },
      {
        name: "description",
        content: "Acompanhamento das classificações reais importadas no histórico semanal.",
      },
    ],
  }),
  component: RegrasClassificacao,
});

function RegrasClassificacao() {
  const [busca, setBusca] = useState("");
  const { data: classificacoes = [], isLoading, isError, refetch } = useWeeklyClassificationsSurvey();

  const classificacoesVisiveis = useMemo(() => {
    const termo = busca.trim().toLocaleUpperCase("pt-BR");
    if (!termo) return classificacoes;

    return classificacoes.filter((item) =>
      [item.classification ?? "Sem classificação informada", item.category ?? ""]
        .join(" ")
        .toLocaleUpperCase("pt-BR")
        .includes(termo),
    );
  }, [busca, classificacoes]);

  const semRegraAtiva = classificacoes.filter((item) => !item.has_active_rule).length;
  const regrasAmbiguas = classificacoes.filter((item) => item.active_rules_count > 1).length;
  const totalRegistros = classificacoes.reduce((total, item) => total + item.records_count, 0);

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-[image:var(--gradient-hero)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-7 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              to="/"
              search={{ view: "savings" }}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/80 transition-colors hover:text-white"
            >
              <ArrowLeft className="size-4" />
              Voltar ao painel
            </Link>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Regras de Classificação
            </h1>
            <p className="mt-1 text-sm font-medium text-white/80">
              Visão administrativa das classificações reais importadas no histórico semanal.
            </p>
          </div>
          <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-white/70">Classificações identificadas</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-white">{classificacoes.length}</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-5 py-6">
        <section className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <ShieldCheck className="size-3.5" /> Dados reais — weekly_items
              </p>
              <h2 className="mt-3 text-lg font-bold">Cobertura das regras ativas</h2>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                Cada linha preserva o texto original da classificação importada e informa sua cobertura atual por regras ativas.
              </p>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(event) => setBusca(event.target.value)}
                placeholder="Buscar classificação"
                className="pl-9"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <ResumoCard label="Registros importados" value={totalRegistros} descricao="Somatório de todos os registros" />
            <ResumoCard label="Sem regra ativa" value={semRegraAtiva} descricao="Classificações que exigem atenção" destaque="destructive" />
            <ResumoCard label="Regras ambíguas" value={regrasAmbiguas} descricao="Mais de uma regra ativa vinculada" destaque={regrasAmbiguas > 0 ? "destructive" : "success"} />
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-panel)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Classificações encontradas</h2>
              <p className="mt-1 text-sm font-medium text-muted-foreground">
                Prioridade: sem regra ativa, maior quantidade de registros e nome da classificação.
              </p>
            </div>
            <span className="rounded-full border border-border bg-muted/50 px-3 py-1 text-xs font-semibold text-muted-foreground">
              {classificacoesVisiveis.length} resultado(s)
            </span>
          </div>

          {isLoading ? (
            <p className="px-5 py-10 text-sm font-medium text-muted-foreground">Carregando classificações reais…</p>
          ) : null}

          {isError ? (
            <div className="m-5 rounded-lg border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 size-5 shrink-0 text-destructive" />
                <div>
                  <p className="font-bold">Não foi possível carregar as classificações</p>
                  <p className="mt-1 text-sm font-medium text-muted-foreground">Tente novamente para consultar os registros reais do histórico semanal.</p>
                  <button type="button" onClick={() => void refetch()} className="mt-3 text-sm font-bold text-primary transition-colors hover:underline">Tentar novamente</button>
                </div>
              </div>
            </div>
          ) : null}

          {!isLoading && !isError ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="px-5 py-3">Classificação importada</th>
                    <th className="px-5 py-3">Regra ativa</th>
                    <th className="px-5 py-3">Categoria</th>
                    <th className="px-5 py-3 text-right">Registros</th>
                    <th className="px-5 py-3 text-right">Semanas</th>
                    <th className="px-5 py-3 text-right">Bases</th>
                  </tr>
                </thead>
                <tbody>
                  {classificacoesVisiveis.map((item) => {
                    const semRegra = !item.has_active_rule;
                    const ambigua = item.active_rules_count > 1;
                    return (
                      <tr key={item.classification ?? "__sem_classificacao__"} className="border-t border-border transition-colors hover:bg-muted/40">
                        <td className="px-5 py-3 font-semibold">{item.classification ?? "Sem classificação informada"}</td>
                        <td className="px-5 py-3">
                          <StatusRegra semRegra={semRegra} ambigua={ambigua} />
                        </td>
                        <td className="px-5 py-3 font-medium text-muted-foreground">{item.category ?? "—"}</td>
                        <td className="px-5 py-3 text-right font-bold tabular-nums">{item.records_count}</td>
                        <td className="px-5 py-3 text-right font-semibold tabular-nums text-muted-foreground">{item.weeks_count}</td>
                        <td className="px-5 py-3 text-right font-semibold tabular-nums text-muted-foreground">{item.bases_count}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {classificacoesVisiveis.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm font-medium text-muted-foreground">
                  Nenhuma classificação encontrada para a busca informada.
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function ResumoCard({ label, value, descricao, destaque = "primary" }: { label: string; value: number; descricao: string; destaque?: "primary" | "destructive" | "success" }) {
  const cor = {
    primary: "text-primary",
    destructive: "text-destructive",
    success: "text-success",
  }[destaque];

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-2 text-2xl font-extrabold tabular-nums", cor)}>{value}</p>
      <p className="mt-1 text-sm font-medium text-muted-foreground">{descricao}</p>
    </div>
  );
}

function StatusRegra({ semRegra, ambigua }: { semRegra: boolean; ambigua: boolean }) {
  if (semRegra) {
    return <span className="inline-flex rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">Sem regra ativa</span>;
  }

  if (ambigua) {
    return <span className="inline-flex rounded-full border border-destructive/30 bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">{`Regra ambígua (${ambigua ? "2+" : ""})`}</span>;
  }

  return <span className="inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success"><Check className="size-3.5" /> Regra ativa</span>;
}
