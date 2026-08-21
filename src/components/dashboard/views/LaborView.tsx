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
  MO_STATS,
  ESCALA_SEMANAL,
  COMPARATIVO_MOTORISTAS,
  VISAO_POR_XPT,
} from "@/components/dashboard/labor-data";
import {
  Users,
  CreditCard,
  ArrowDownCircle,
  TrendingDown,
  Info,
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

export function LaborView() {
  const waterfallData = [
    { name: "Custo CLT (8)", value: MO_STATS.custoTotalClt, fill: "var(--destructive)" },
    { name: "Econ. Amigos", value: -MO_STATS.economiaMotoristasAmigos, fill: "var(--success)" },
    { name: "Impacto Líquido", value: MO_STATS.impactoLiquido, fill: "var(--primary)" },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <KpiCard
          label="XPTs no escopo"
          value={MO_STATS.xptsNoEscopo.toString()}
          hint="Embu, Franco, Ibiúna, Guarujá"
          icon={Info}
          tone="neutral"
        />
        <KpiCard
          label="Estrutura CLT total"
          value={`${MO_STATS.estruturaCltTotal} colaboradores`}
          hint="1 contratado + 7 novos"
          icon={Users}
          tone="neutral"
        />
        <KpiCard
          label="Custo total (8 CLTs)"
          value={brl(MO_STATS.custoTotalClt)}
          hint={`Custo unitário: ${brl(MO_CONFIG.VALORES.custoUnitarioClt)}/mês`}
          icon={CreditCard}
          tone="loss"
        />
        <KpiCard
          label="Economia Motoristas Amigos"
          value={brl(MO_STATS.economiaMotoristasAmigos)}
          hint="Redução de 3 para 2 auxiliares/dia"
          icon={TrendingDown}
          tone="gain"
        />
        <KpiCard
          label="Impacto líquido mensal"
          value={brl(MO_STATS.impactoLiquido)}
          hint="Diferença custo vs economia"
          icon={ArrowDownCircle}
          tone="highlight"
        />
        <KpiCard
          label="Compensação aproximada"
          value={`${MO_STATS.percentualCompensado}%`}
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
          “A redução dos Motoristas Amigos compensa aproximadamente 38% do custo total dos 8 CLTs.”
        </p>
      </div>

      <Accordion type="single" collapsible className="w-full">
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
                <th className="px-5 py-3 text-right">4 XPTs</th>
              </tr>
            </thead>
            <tbody>
              {COMPARATIVO_MOTORISTAS.map((c, i) => (
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
                <td className="px-5 py-3 text-right tabular-nums">{brl(MO_CONFIG.VALORES.custoUnitarioClt)}</td>
              </tr>
              <tr className="border-b border-border font-bold text-primary bg-primary/5">
                <td className="px-5 py-3">Estrutura total</td>
                <td className="px-5 py-3 text-center">8</td>
                <td className="px-5 py-3 text-right tabular-nums">{brl(MO_STATS.custoTotalClt)}</td>
              </tr>
              <tr>
                <td className="px-5 py-3">Composição</td>
                <td className="px-5 py-3 text-center text-xs">1 contratado + 7 novos</td>
                <td className="px-5 py-3 text-right tabular-nums text-muted-foreground">—</td>
              </tr>
            </tbody>
          </table>
          <div className="p-4 bg-muted/10 space-y-2">
            <p className="text-xs text-muted-foreground">
              * Custo baseado em: Salário R$ 2.100, VR R$ 39/dia, VA R$ 180/mês, encargos, 13º e férias.
            </p>
            <p className="text-xs font-semibold text-primary">
              “A proposta não é contratar 7 pessoas apenas para bipagem. É estruturar uma equipe total de 8 colaboradores, fixa, treinada e multifuncional.”
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
              {VISAO_POR_XPT.map((x, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="px-5 py-3 font-medium">{x.xpt}</td>
                  <td className="px-5 py-3 text-center tabular-nums">{x.clts}</td>
                  <td className="px-5 py-3 text-center tabular-nums">{x.contratado} / {x.novos}</td>
                  <td className="px-5 py-3 text-right tabular-nums">{brl(x.custo)}</td>
                </tr>
              ))}
              <tr className="font-bold bg-muted/50">
                <td className="px-5 py-3">Total</td>
                <td className="px-5 py-3 text-center">8</td>
                <td className="px-5 py-3 text-center">1 / 7</td>
                <td className="px-5 py-3 text-right tabular-nums">{brl(MO_STATS.custoTotalClt)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
