import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import logo from "@/assets/jmtd-logo.jpg.asset.json";
import { brl, BASES, perdaProjetada } from "@/components/dashboard/data";
import { SavingsView } from "@/components/dashboard/views/SavingsView";
import { LaborView } from "@/components/dashboard/views/LaborView";
import { ConsolidatedView } from "@/components/dashboard/views/ConsolidatedView";
import { z } from "zod";
import { cn } from "@/lib/utils";

const dashboardSearchSchema = z.object({
  view: z.enum(["savings", "mao-de-obra", "consolidado"]).optional().default("savings"),
  bases: z.string().optional(),
  eficacia: z.number().optional(),
});

export const Route = createFileRoute("/")({
  validateSearch: (search) => dashboardSearchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "JMRoutes — Painel de Savings por Base" },
      {
        name: "description",
        content: "Painel executivo de savings logísticos e gestão de mão de obra JM Transportes.",
      },
      { property: "og:title", content: "JMRoutes — Painel de Savings por Base" },
      {
        property: "og:description",
        content: "Simulação de ganhos operacionais e impacto de equipe CLT para JM Transportes.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/" });
  const view = search.view || "savings";

  const criticas = BASES.filter((b) => !b.comJMRoutes);
  const initialBases = search.bases ? search.bases.split(",") : criticas.map((b) => b.id);
  
  const [selecionadas, setSelecionadas] = useState<string[]>(initialBases);
  const [eficacia, setEficacia] = useState(search.eficacia ?? 100);
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // Sync state to URL
  useEffect(() => {
    navigate({
      search: (prev) => ({
        ...prev,
        view,
        bases: selecionadas.join(","),
        eficacia,
      }),
      replace: true,
    } as any);
  }, [selecionadas, eficacia, view, navigate]);

  const setView = (newView: "savings" | "mao-de-obra" | "consolidado") => {
    navigate({
      search: (prev) => ({ ...prev, view: newView }),
    } as any);
  };

  const currentSavingSemanal = () => {
    const fator = eficacia / 100;
    const escopo = BASES.filter((b) => !b.comJMRoutes);
    const totalAtual = escopo.reduce((s, b) => s + b.perdaAtual, 0);
    const totalProjetado = escopo.reduce((s, b) => {
      const ativa = selecionadas.includes(b.id);
      return s + (ativa ? perdaProjetada(b.perdaAtual, fator) : b.perdaAtual);
    }, 0);
    return totalAtual - totalProjetado;
  };

  return (
    <main className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <header className="border-b border-border bg-[image:var(--gradient-hero)]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-5 py-7 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img
              src={logo.url}
              alt="Logotipo JM TD"
              className="size-11 rounded-lg border border-border"
            />
            <div>
              <h1 className="text-lg font-bold tracking-tight text-secondary sm:text-xl">
                JMRoutes · Painel de Savings
              </h1>
              <p className="text-xs text-white">
                Supply Chain AI Lead · Business case operacional
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="flex size-10 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-accent"
              aria-label="Alternar tema"
            >
              {isDarkMode ? <Sun className="size-5" /> : <Moon className="size-5" />}
            </button>
            <div className="rounded-lg border border-primary/40 bg-primary/10 px-4 py-2">
              <p className="text-[11px] uppercase tracking-wider text-white">
                Economia anual projetada (Operacional)
              </p>
              <p className="text-xl font-bold tabular-nums text-white">
                {brl(currentSavingSemanal() * 52)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-6">
        <nav className="flex gap-1 border-b border-border mb-8 overflow-x-auto pb-px scrollbar-none">
          <button
            onClick={() => setView("savings")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200 whitespace-nowrap",
              view === "savings"
                ? "border-secondary text-secondary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            Savings Operacionais
          </button>
          <button
            onClick={() => setView("mao-de-obra")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200 whitespace-nowrap",
              view === "mao-de-obra"
                ? "border-secondary text-secondary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            Mão de Obra
          </button>
          <button
            onClick={() => setView("consolidado")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors duration-200 whitespace-nowrap",
              view === "consolidado"
                ? "border-secondary text-secondary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            Visão Consolidada
          </button>
        </nav>

        <div className="transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
          {view === "savings" && (
            <SavingsView
              selecionadas={selecionadas}
              setSelecionadas={setSelecionadas}
              eficacia={eficacia}
              setEficacia={setEficacia}
            />
          )}
          {view === "mao-de-obra" && <LaborView />}
          {view === "consolidado" && (
            <ConsolidatedView selecionadas={selecionadas} eficacia={eficacia} />
          )}
        </div>
      </div>
    </main>
  );
}
