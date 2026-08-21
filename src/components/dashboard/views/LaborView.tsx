import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { brl } from "@/components/dashboard/data";
import {
  MO_CONFIG,
  LaborPremises,
  calculateLaborStats,
  getComparativoMotoristas,
  getVisaoPorXpt,
  ESCALA_SEMANAL,
} from "@/components/dashboard/labor-data";
import {
  Users,
  CreditCard,
  ArrowDownCircle,
  TrendingDown,
  Info,
  CheckCircle2,
  Lock,
  Zap,
  MessageSquare,
  ShieldCheck,
  LayoutGrid,
  RotateCcw,
  Trash2
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  LabelList,
} from "recharts";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface LaborViewProps {
  premises: LaborPremises;
  setPremises: (p: LaborPremises | ((prev: LaborPremises) => LaborPremises)) => void;
}

export function LaborView({ premises, setPremises }: LaborViewProps) {
  const stats = calculateLaborStats(premises);
  const comparativoMotoristas = getComparativoMotoristas(premises);
  const visaoPorXpt = getVisaoPorXpt(premises);

  const waterfallData = [
    { name: "Custo CLT", value: stats.custoTotalClt, fill: "var(--destructive)" },
    { name: "Econ. Amigos", value: -stats.economiaMotoristasAmigos, fill: "var(--success)" },
    { name: "Impacto Líquido", value: stats.impactoLiquido, fill: "var(--primary)" },
  ];

  const handleInputChange = (key: keyof LaborPremises, value: string) => {
    const num = parseFloat(value) || 0;
    setPremises(prev => {
      const next = { ...prev, [key]: num };
      // Validation: Já contratados cannot exceed total CLTs
      if (key === 'cltsJaContratados' || key === 'quantidadeXpts' || key === 'cltsPorXpt') {
        const total = (key === 'quantidadeXpts' ? num : prev.quantidadeXpts) * (key === 'cltsPorXpt' ? num : prev.cltsPorXpt);
        const contratados = key === 'cltsJaContratados' ? num : prev.cltsJaContratados;
        if (contratados > total) {
           next.cltsJaContratados = total;
        }
      }
      return next;
    });
  };

  const resetPremises = () => setPremises(MO_CONFIG.VALORES_PADRAO);
  const clearSimulation = () => {
    localStorage.removeItem('labor-simulation');
    resetPremises();
  };

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="XPTs no escopo"
          value={stats.xptsNoEscopo.toString()}
          hint="Bases simuladas"
          icon={Info}
          tone="neutral"
        />
        <KpiCard
          label="Estrutura CLT total"
          value={`${stats.totalClts} colaboradores`}
          hint={`${stats.cltsJaContratados} contratados + ${stats.novasContratacoes} novos`}
          icon={Users}
          tone="neutral"
        />
        <KpiCard
          label="Custo total CLTs"
          value={brl(stats.custoTotalClt)}
          hint={`Custo unitário: ${brl(stats.custoUnitarioClt)}/mês`}
          icon={CreditCard}
          tone="loss"
        />
        <KpiCard
          label="Economia Motoristas Amigos"
          value={brl(stats.economiaMotoristasAmigos)}
          hint="Redução simulada"
          icon={TrendingDown}
          tone="gain"
        />
        <KpiCard
          label="Impacto líquido mensal"
          value={brl(stats.impactoLiquido)}
          hint="Diferença custo vs economia"
          icon={ArrowDownCircle}
          tone="highlight"
        />
        <KpiCard
          label="Compensação aproximada"
          value={`${Math.round(stats.percentualCompensacao)}%`}
          hint="Do custo CLT pago pelo saving"
          icon={ArrowDownCircle}
          tone="highlight"
        />
      </section>

      <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Impacto Líquido Mensal
          </h2>
          <span className="text-xs font-medium text-destructive">
            {MO_CONFIG.AVISO_CLT}
          </span>
        </div>
        <div className="mt-8 h-[300px] w-full max-w-2xl mx-auto">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={waterfallData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: "transparent" }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = (payload[0] as any).payload;
                    return (
                      <div className="rounded-lg border border-border bg-popover p-2 text-xs shadow-md text-popover-foreground">
                        <p className="font-bold">{data.name}</p>
                        <p>{brl(Math.abs(data.value))}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {waterfallData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
                <LabelList
                  dataKey="value"
                  position="top"
                  formatter={(v: number) => brl(Math.abs(v))}
                  style={{ fontSize: 12, fontWeight: 600, fill: "var(--foreground)" }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mt-4 text-center text-sm font-medium text-primary">
          “A redução dos Motoristas Amigos compensa aproximadamente {Math.round(stats.percentualCompensacao)}% do custo total dos {stats.totalClts} CLTs.”
        </p>
      </div>

      <Accordion type="single" collapsible className="w-full space-y-4">
        <AccordionItem value="simulador" className="border rounded-xl bg-card px-5 shadow-sm">
          <AccordionTrigger className="text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline">
            Simulador de Mão de Obra
          </AccordionTrigger>
          <AccordionContent className="pb-5 pt-2">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label>Quantidade de XPTs</Label>
                <Input type="number" min="0" step="1" value={premises.quantidadeXpts} onChange={(e) => handleInputChange('quantidadeXpts', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>CLTs por XPT</Label>
                <Input type="number" min="0" step="1" value={premises.cltsPorXpt} onChange={(e) => handleInputChange('cltsPorXpt', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>CLTs já contratados</Label>
                <Input type="number" min="0" step="1" value={premises.cltsJaContratados} onChange={(e) => handleInputChange('cltsJaContratados', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Custo mensal por CLT (R$)</Label>
                <Input type="number" min="0" step="1" value={premises.custoMensalClt} onChange={(e) => handleInputChange('custoMensalClt', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Motoristas Amigos atuais/dia</Label>
                <Input type="number" min="0" step="1" value={premises.motoristasAtuais} onChange={(e) => handleInputChange('motoristasAtuais', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Valor diário Motorista (R$)</Label>
                <Input type="number" min="0" step="1" value={premises.valorDiario} onChange={(e) => handleInputChange('valorDiario', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Dias mensais (Atual)</Label>
                <Input type="number" min="0" step="1" value={premises.diasAtuais} onChange={(e) => handleInputChange('diasAtuais', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Motoristas Propostos/dia</Label>
                <Input type="number" min="0" step="1" value={premises.motoristasPropostos} onChange={(e) => handleInputChange('motoristasPropostos', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Dias mensais (Proposto)</Label>
                <Input type="number" min="0" step="1" value={premises.diasPropostos} onChange={(e) => handleInputChange('diasPropostos', e.target.value)} />
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="outline" size="sm" onClick={resetPremises} className="flex items-center gap-2">
                <RotateCcw className="size-4" /> Restaurar premissas
              </Button>
              <Button variant="ghost" size="sm" onClick={clearSimulation} className="text-destructive hover:text-destructive flex items-center gap-2">
                <Trash2 className="size-4" /> Limpar simulação
              </Button>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="premissas" className="border rounded-xl bg-card px-5 shadow-sm">
          <AccordionTrigger className="text-sm font-semibold uppercase tracking-wider text-muted-foreground hover:no-underline">
            Premissas do Estudo
          </AccordionTrigger>
          <AccordionContent className="pb-5 pt-2">
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              {MO_CONFIG.PREMISSAS.map((p, i) => (
                <li key={i} className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-primary" />
                  {p}
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <section className="grid gap-6">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Zap className="size-4 text-secondary" /> Ganhos Operacionais
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Qualidade operacional", desc: "Equipe fixa, treinada e com rotinas padronizadas", icon: CheckCircle2 },
            { label: "Rastreabilidade", desc: "Maior controle dos pacotes e registros", icon: Lock },
            { label: "Agilidade nas tratativas", desc: "Ocorrências resolvidas mais rapidamente", icon: Zap },
            { label: "Atendimento ao cliente", desc: "Menor tempo de resposta", icon: MessageSquare },
            { label: "Controle operacional", desc: "Responsabilidades e monitoramento definidos", icon: ShieldCheck },
            { label: "Equipe multifuncional", desc: "Apoio em recebimento, expedição e devoluções", icon: LayoutGrid },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-4 rounded-xl border border-border bg-card shadow-sm transition-all hover:border-primary/50">
              <div className="mt-1 p-2 rounded-lg bg-primary/10 text-primary">
                <item.icon className="size-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">{item.label}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="border-b border-border px-5 py-4 bg-muted/30">
            <h3 className="text-sm font-semibold uppercase tracking-wider">Escala Semanal (Auxiliares)</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-5 py-3">Dia</th>
                <th className="px-5 py-3 text-center">Atual (Amigos)</th>
                <th className="px-5 py-3 text-center">Proposto (Amigos)</th>
              </tr>
            </thead>
            <tbody>
              {ESCALA_SEMANAL.map((e, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  <td className="px-5 py-3 font-medium">{e.dia}</td>
                  <td className="px-5 py-3 text-center tabular-nums">{e.atual}</td>
                  <td className={cn("px-5 py-3 text-center tabular-nums font-bold", e.proposto === 0 ? "text-success" : "text-primary")}>
                    {e.proposto}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="p-4 text-xs text-muted-foreground bg-muted/10">
            * Aos finais de semana, o apoio permanece devido ao rodízio da equipe CLT e às necessidades de carga e descarga.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="border-b border-border px-5 py-4 bg-muted/30">
            <h3 className="text-sm font-semibold uppercase tracking-wider">Comparativo Motoristas Amigos</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-5 py-3">Cenário</th>
                <th className="px-5 py-3 text-right">Por XPT</th>
                <th className="px-5 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {comparativoMotoristas.map((c, i) => (
                <tr key={i} className={cn("border-b border-border last:border-0", c.isSaving && "bg-success/5 font-bold text-success")}>
                  <td className="px-5 py-3">{c.cenario}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{brl(c.porXpt)}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{brl(c.total4Xpts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
         <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="border-b border-border px-5 py-4 bg-muted/30">
            <h3 className="text-sm font-semibold uppercase tracking-wider">Detalhamento Custo CLT</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-5 py-3">Referência</th>
                <th className="px-5 py-3 text-center">Quantidade</th>
                <th className="px-5 py-3 text-right">Custo Mensal</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-border">
                <td className="px-5 py-3">Por colaborador</td>
                <td className="px-5 py-3 text-center">1</td>
                <td className="px-5 py-3 text-right tabular-nums">{brl(premises.custoMensalClt)}</td>
              </tr>
              <tr className="border-b border-border font-bold text-primary bg-primary/5">
                <td className="px-5 py-3">Estrutura total</td>
                <td className="px-5 py-3 text-center">{stats.totalClts}</td>
                <td className="px-5 py-3 text-right tabular-nums">{brl(stats.custoTotalClt)}</td>
              </tr>
              <tr>
                <td className="px-5 py-3">Composição</td>
                <td className="px-5 py-3 text-center text-xs">{stats.cltsJaContratados} contratado + {stats.novasContratacoes} novos</td>
                <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">—</td>
              </tr>
            </tbody>
          </table>
          <div className="p-4 bg-muted/10 space-y-2">
            <p className="text-xs text-muted-foreground">
              * {MO_CONFIG.AVISO_CLT}
            </p>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card overflow-hidden shadow-sm">
          <div className="border-b border-border px-5 py-4 bg-muted/30">
            <h3 className="text-sm font-semibold uppercase tracking-wider">Visão por XPT</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-5 py-3">XPT</th>
                <th className="px-5 py-3 text-center">CLTs</th>
                <th className="px-5 py-3 text-center text-xs">Contratado / Novos</th>
                <th className="px-5 py-3 text-right">Custo Total</th>
              </tr>
            </thead>
            <tbody>
              {visaoPorXpt.map((x, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-5 py-3 font-medium">{x.xpt}</td>
                  <td className="px-5 py-3 text-center tabular-nums">{x.clts}</td>
                  <td className="px-5 py-3 text-center tabular-nums">{x.contratado} / {x.novos}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{brl(x.custo)}</td>
                </tr>
              ))}
              <tr className="font-bold bg-muted/50">
                <td className="px-5 py-3">Total</td>
                <td className="px-5 py-3 text-center">{stats.totalClts}</td>
                <td className="px-5 py-3 text-center">{stats.cltsJaContratados} / {stats.novasContratacoes}</td>
                <td className="px-5 py-3 text-right tabular-nums">{brl(stats.custoTotalClt)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
