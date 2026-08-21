import { useMemo } from "react";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { brl, BASES, perdaProjetada } from "@/components/dashboard/data";
import { getConsolidado, MO_CONFIG } from "@/components/dashboard/labor-data";
import {
  TrendingUp,
  CreditCard,
  ArrowDownCircle,
  TrendingDown,
  Activity,
  Percent,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface ConsolidatedViewProps {
  selecionadas: string[];
  eficacia: number;
  impactoMaoDeObra: number;
}

export function ConsolidatedView({ selecionadas, eficacia, impactoMaoDeObra: simulationImpactMO }: ConsolidatedViewProps) {
  const fator = eficacia / 100;

  const savingSemanal = useMemo(() => {
    const escopo = BASES.filter((b) => !b.comJMRoutes);
    const totalAtual = escopo.reduce((s, b) => s + b.perdaAtual, 0);
    const totalProjetado = escopo.reduce((s, b) => {
      const ativa = selecionadas.includes(b.id);
      return s + (ativa ? perdaProjetada(b.perdaAtual, fator) : b.perdaAtual);
    }, 0);
    return totalAtual - totalProjetado;
  }, [selecionadas, fator]);

  const {
    savingMensal,
    impactoMaoDeObra,
    resultadoLiquido,
    percentualConsumido,
  } = getConsolidado(savingSemanal, simulationImpactMO);

  return (
    <div className="space-y-6">
      <TooltipProvider>
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="relative group">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-help">
                  <KpiCard
                    label="Saving operacional mensal"
                    value={brl(savingMensal)}
                    hint="Projeção 52 semanas / 12 meses"
                    icon={TrendingUp}
                    tone="highlight"
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Conversão mensal equivalente calculada pela projeção de 52 semanas dividida por 12 meses.</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <KpiCard
            label="Custo total CLTs"
            value={brl(savingMensal > 0 ? (impactoMaoDeObra + 13440) : 35664)} // Fallback conceptual or dynamic
            hint="Base mensal simulada"
            icon={CreditCard}
            tone="loss"
          />

          <KpiCard
            label="Econ. Motoristas Amigos"
            value={brl(13440)}
            hint="Redução mensal simulada"
            icon={TrendingDown}
            tone="gain"
          />

          <KpiCard
            label="Impacto líquido mão de obra"
            value={brl(impactoMaoDeObra)}
            hint="Custo CLT - Economia Amigos"
            icon={Activity}
            tone="neutral"
          />

          <KpiCard
            label="Resultado líquido consolidado"
            value={brl(resultadoLiquido)}
            hint="Saving Operacional - Impacto MO"
            icon={ArrowDownCircle}
            tone="highlight"
          />

          <KpiCard
            label="Saving consumido pela MO"
            value={`${percentualConsumido.toFixed(1)}%`}
            hint="Impacto MO / Saving Operacional"
            icon={Percent}
            tone="neutral"
          />
        </section>
      </TooltipProvider>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Resumo da Viabilidade</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              O projeto demonstra alta viabilidade financeira. Mesmo estruturando uma equipe fixa CLT, o impacto líquido na folha (R$ {impactoMaoDeObra.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}) representa apenas <strong>{percentualConsumido.toFixed(1)}%</strong> do saving operacional gerado pelo sistema JMRoutes no mesmo período.
            </p>
            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Resultado Líquido Final</p>
              <p className="text-2xl font-bold text-primary">{brl(resultadoLiquido)}<span className="text-sm font-normal text-muted-foreground ml-1">/mês</span></p>
            </div>
          </div>
          <div className="space-y-3">
             <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Fórmula Consolidada</span>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg font-mono text-xs space-y-2">
              <p className="text-primary font-bold">resultadoLiquido = savingMensal - impactoMO</p>
              <p className="text-muted-foreground border-t border-border pt-2 mt-2">
                Saving Mensal: {brl(savingMensal)}<br/>
                (-) Impacto Mão de Obra: {brl(impactoMaoDeObra)}
              </p>
            </div>
            <p className="text-[10px] text-destructive italic">
              * {MO_CONFIG.AVISO_CLT}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
