import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { brl, BASES, perdaProjetada } from "@/components/dashboard/data";
import { SavingsView } from "@/components/dashboard/views/SavingsView";
import { MotoristasView } from "@/components/dashboard/views/MotoristasView";
import { z } from "zod";
import { cn } from "@/lib/utils";

const dashboardSearchSchema = z.object({
  view: z.enum(["savings", "savings-reais", "motoristas"]).optional().default("savings"),
  bases: z.string().optional(),
  eficacia: z.number().optional(),
  labor: z.string().optional(),
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
  const initialBases = view !== "savings" && search.bases ? search.bases.split(",") : criticas.map((b) => b.id);
  
  const [selecionadas, setSelecionadas] = useState<string[]>(initialBases);
  const [eficacia, setEficacia] = useState(view !== "savings" ? (search.eficacia ?? 100) : 100);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("jm-theme") !== "light";
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    window.localStorage.setItem("jm-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  // Sync state to URL (ignora parâmetros legados de simulação na visão real de savings)
  useEffect(() => {
    if (view === "savings") {
      navigate({
        search: () => ({ view: "savings" }),
        replace: true,
      } as any);
      return;
    }

    navigate({
      search: (prev: any) => ({
        ...prev,
        view,
        bases: selecionadas.join(","),
        eficacia,
      }),
      replace: true,
    } as any);
  }, [selecionadas, eficacia, view, navigate]);

  const setView = (newView: "savings" | "savings-reais" | "motoristas") => {
    if (newView === "savings") {
      navigate({
        search: () => ({ view: "savings" }),
      } as any);
    } else {
      navigate({
        search: (prev: any) => ({ ...prev, view: newView }),
      } as any);
    }
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
              src="/favicon.ico"
              alt="JM Transportes"
              className="size-11 rounded-lg border border-white/20 bg-white/10 object-contain p-1"
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-secondary sm:text-2xl">
                JMRoutes · Painel de Savings
              </h1>
              <p className="text-xs font-semibold text-white">
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
              <p className="text-xl font-extrabold tabular-nums text-white sm:text-2xl">
                {brl(currentSavingSemanal() * 52)}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-6">
        <nav className="flex gap-4 border-b border-border mb-8 overflow-x-auto pb-px scrollbar-none">
          <button
            onClick={() => setView("savings")}
            className={cn(
              "px-6 py-3 text-base font-bold border-b-2 transition-colors duration-200 whitespace-nowrap",
              view === "savings"
                ? "border-secondary text-secondary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            Savings Operacionais
          </button>
          <button
            onClick={() => setView("savings-reais")}
            className={cn(
              "px-6 py-3 text-base font-bold border-b-2 transition-colors duration-200 whitespace-nowrap",
              view === "savings-reais"
                ? "border-secondary text-secondary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            Savings Reais
          </button>
          <button
            onClick={() => setView("motoristas")}
            className={cn(
              "px-6 py-3 text-base font-bold border-b-2 transition-colors duration-200 whitespace-nowrap",
              view === "motoristas"
                ? "border-secondary text-secondary"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
            )}
          >
            Ranking de Motoristas
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
          {view === "savings-reais" && (
            <SavingsView
              dataMode="real"
              selecionadas={selecionadas}
              setSelecionadas={setSelecionadas}
              eficacia={eficacia}
              setEficacia={setEficacia}
            />
          )}
          {view === "motoristas" && <MotoristasView />}
        </div>
      </div>
    </main>
  );
}
