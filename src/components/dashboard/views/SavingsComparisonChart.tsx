import { useQuery } from "@tanstack/react-query";
import { Bar, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, ShieldCheck, TrendingDown, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { brl, brlCurto } from "@/components/dashboard/data";
import { KpiCard } from "@/components/dashboard/KpiCard";

type Point = {
  key: string;
  semana: string;
  year: number;
  week: number;
  operacional: number;
  real: number;
  saldo: number;
  efetividade: number;
};

async function allRows(queryFactory: (from: number, to: number) => any) {
  const rows: any[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await queryFactory(from, from + 999);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

function ComparisonTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0]?.payload as Point;
  return (
    <div className="min-w-56 rounded-xl border border-border bg-popover p-3 text-xs shadow-xl">
      <p className="font-extrabold text-foreground">{point.semana} ({point.year})</p>
      <div className="mt-2 space-y-1.5">
        <p className="flex justify-between gap-4"><span className="text-muted-foreground">Perdas operacionais</span><strong className="text-red-400">{brl(point.operacional)}</strong></p>
        <p className="flex justify-between gap-4"><span className="text-muted-foreground">Saving real revertido</span><strong className="text-emerald-400">{brl(point.real)}</strong></p>
        <p className="flex justify-between gap-4 border-t border-border pt-1.5"><span className="text-muted-foreground">Perda não revertida</span><strong>{brl(point.saldo)}</strong></p>
        <p className="flex justify-between gap-4"><span className="text-muted-foreground">Efetividade</span><strong className="text-amber-400">{point.efetividade.toFixed(1)}%</strong></p>
      </div>
    </div>
  );
}

export function SavingsComparisonChart({ selectedWeekKeys }: { selectedWeekKeys?: string[] }) {
  const { data = [], isLoading, isError } = useQuery({
    queryKey: ["savings", "operational-vs-real", selectedWeekKeys ?? "all"],
    queryFn: async (): Promise<Point[]> => {
      const db = supabase as any;
      const [{ data: opImports, error: opError }, { data: realImports, error: realError }] = await Promise.all([
        db.from("weekly_imports").select("id, week_code, year, week_number").eq("status", "completed").eq("is_current", true),
        db.from("real_savings_imports").select("id, week_code, year, week_number").eq("status", "completed"),
      ]);
      if (opError) throw opError;
      if (realError) throw realError;

      const opIds = (opImports ?? []).map((item: any) => item.id);
      const realIds = (realImports ?? []).map((item: any) => item.id);
      const [opItems, realItems] = await Promise.all([
        opIds.length ? allRows((from, to) => db.from("weekly_items").select("import_id, amount").in("import_id", opIds).range(from, to)) : [],
        realIds.length ? allRows((from, to) => db.from("real_savings_items").select("import_id, real_discount").in("import_id", realIds).range(from, to)) : [],
      ]);

      const opByImport = new Map<string, number>();
      for (const item of opItems) {
        const value = Number(item.amount);
        if (Number.isFinite(value)) opByImport.set(item.import_id, (opByImport.get(item.import_id) ?? 0) + value);
      }
      const realByImport = new Map<string, number>();
      for (const item of realItems) {
        const value = Number(item.real_discount);
        if (Number.isFinite(value)) realByImport.set(item.import_id, (realByImport.get(item.import_id) ?? 0) + value);
      }

      const points = new Map<string, Point>();
      for (const item of opImports ?? []) {
        const week = Number(item.week_number);
        const year = Number(item.year);
        if (!week || !year) continue;
        const key = `${year}-${String(week).padStart(2, "0")}`;
        const current = points.get(key) ?? { key, semana: item.week_code || `W${String(week).padStart(2, "0")}`, year, week, operacional: 0, real: 0, saldo: 0, efetividade: 0 };
        current.operacional += opByImport.get(item.id) ?? 0;
        points.set(key, current);
      }
      for (const item of realImports ?? []) {
        const week = Number(item.week_number);
        const year = Number(item.year);
        if (!week || !year) continue;
        const key = `${year}-${String(week).padStart(2, "0")}`;
        const current = points.get(key) ?? { key, semana: item.week_code || `W${String(week).padStart(2, "0")}`, year, week, operacional: 0, real: 0, saldo: 0, efetividade: 0 };
        current.real += realByImport.get(item.id) ?? 0;
        points.set(key, current);
      }
      const selected = selectedWeekKeys?.length ? new Set(selectedWeekKeys) : null;
      return Array.from(points.values()).map((point) => ({
        ...point,
        saldo: Math.max(0, point.operacional - point.real),
        efetividade: point.operacional > 0 ? (point.real / point.operacional) * 100 : 0,
      })).filter((point) => !selected || selected.has(point.key))
        .sort((a, b) => a.year - b.year || a.week - b.week);
    },
  });

  const totals = data.reduce((acc, point) => ({
    operacional: acc.operacional + point.operacional,
    real: acc.real + point.real,
  }), { operacional: 0, real: 0 });
  const efetividade = totals.operacional > 0 ? (totals.real / totals.operacional) * 100 : 0;
  const saldo = Math.max(0, totals.operacional - totals.real);

  if (isLoading) return <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Carregando comparativo semanal…</div>;
  if (isError) return <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">Não foi possível carregar o comparativo.</div>;

  return (
    <section className="space-y-4 rounded-2xl border border-border/80 bg-card p-4 shadow-sm">
      <div className="border-b border-border/50 pb-3">
        <h2 className="text-sm font-bold uppercase tracking-wider">Efetividade do setor de perdas</h2>
        <p className="text-xs text-muted-foreground">Comparação semanal entre perdas operacionais e valores revertidos (NÃO DESCONTAR).</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Perdas operacionais" value={brl(totals.operacional)} hint="Total identificado no período" icon={TrendingDown} tone="loss" />
        <KpiCard label="Saving real revertido" value={brl(totals.real)} hint="Valores que não foram descontados" icon={ShieldCheck} tone="highlight" />
        <KpiCard label="Perda não revertida" value={brl(saldo)} hint="Operacional menos saving real" icon={Wallet} tone="neutral" />
        <KpiCard label="Efetividade da reversão" value={`${efetividade.toFixed(1)}%`} hint="Saving real ÷ perdas operacionais" icon={Activity} tone="highlight" />
      </div>

      <div className="h-[330px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.6} />
            <XAxis dataKey="semana" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} tickLine={false} />
            <YAxis yAxisId="money" tickFormatter={(value: number) => brlCurto(value)} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={65} />
            <YAxis yAxisId="percent" orientation="right" domain={[0, (max: number) => Math.max(100, Math.ceil(max / 10) * 10)]} tickFormatter={(value: number) => `${value}%`} tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} width={48} />
            <Tooltip content={<ComparisonTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar yAxisId="money" dataKey="operacional" name="Perdas operacionais" fill="#ef4444" radius={[4, 4, 0, 0]} />
            <Bar yAxisId="money" dataKey="real" name="Saving real revertido" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Line yAxisId="percent" type="monotone" dataKey="efetividade" name="Efetividade %" stroke="#fbbf24" strokeWidth={3} dot={{ r: 4, fill: "#fbbf24" }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
