import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FileSpreadsheet, Search, Trash2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/components/dashboard/data";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Row = Record<string, unknown>;
type Mapping = { charged: string; reversed: string; date: string; base: string; classification: string; status: string };
type Item = {
  id: string; import_id: string; reference_date: string | null; base: string | null;
  classification: string | null; status: string | null; charged_amount: number | null;
  reversed_amount: number | null; real_discount: number | null; extra_data: Row;
};
type Import = { id: string; file_name: string; sheet_name: string | null; valid_rows: number; rejected_rows: number; imported_at: string };

const EMPTY: Mapping = { charged: "", reversed: "", date: "", base: "", classification: "", status: "" };
function weekFromName(name: string) {
  const match = name.toUpperCase().match(/W[ _-]?(\d{1,2})/);
  const weekNumber = match ? Number(match[1]) : null;
  return { weekNumber, weekCode: weekNumber ? `W${String(weekNumber).padStart(2, "0")}` : null, year: new Date().getFullYear() };
}
const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const aliases: Record<keyof Mapping, string[]> = {
  charged: ["valorcobrado", "cobrado", "desconto", "valordesconto", "amount", "valor", "rs"],
  reversed: ["valorrevertido", "revertido", "reversao", "estorno", "recuperado"],
  date: ["data", "datacobranca", "competencia", "semana", "mes"],
  base: ["base", "service", "servico", "unidade", "site", "estacao", "facility"],
  classification: ["classificacao", "tratativaslast", "tratativa", "motivo", "categoria", "descricao"],
  status: ["statusfinal", "status", "decisao", "situacao"],
};
function suggest(headers: string[]): Mapping {
  const result = { ...EMPTY };
  (Object.keys(result) as (keyof Mapping)[]).forEach((key) => {
    const found = headers.filter((header) => {
      if (key === "charged" && header.trim().toUpperCase() === "R$") return true;
      return aliases[key].includes(normalize(header));
    });
    if (found.length === 1) result[key] = found[0]!;
  });
  return result;
}
function money(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = String(value).trim();
  const parsed = Number(raw.replace(/[R$\s\u00a0]/gi, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".").replace(/[()]/g, ""));
  if (!Number.isFinite(parsed)) return null;
  return raw.startsWith("(") ? -parsed : parsed;
}
function dateValue(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    return parsed ? `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}` : null;
  }
  const br = String(value).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (br) return `${br[3]}-${String(br[2]).padStart(2, "0")}-${String(br[1]).padStart(2, "0")}`;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}
async function hashFile(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function RealSavingsImportButton() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button type="button" className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-3 py-2.5 text-xs font-extrabold text-background transition-opacity hover:opacity-90">
          <Upload className="size-4" /> Importar semana real
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto">
        <DialogHeader><DialogTitle>Importar Savings Reais</DialogTitle></DialogHeader>
        <RealSavingsView />
      </DialogContent>
    </Dialog>
  );
}

export function RealSavingsView() {
  const queryClient = useQueryClient();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [sheets, setSheets] = useState<{ name: string; rows: Row[] }[]>([]);
  const [sheet, setSheet] = useState("");
  const [mapping, setMapping] = useState<Mapping>(EMPTY);
  const [file, setFile] = useState<{ name: string; hash: string; weekNumber: number | null; weekCode: string | null; year: number } | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [imports, setImports] = useState<Import[]>([]);
  const [query, setQuery] = useState("");
  const [base, setBase] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const db = supabase as any;
  const reload = async () => {
    const [{ data: loadedItems, error: itemError }, { data: loadedImports, error: importError }] = await Promise.all([
      db.from("real_savings_items").select("*").order("reference_date", { ascending: false }),
      db.from("real_savings_imports").select("*").eq("status", "completed").order("imported_at", { ascending: false }),
    ]);
    if (itemError || importError) setMessage("Não foi possível carregar os savings reais.");
    else { setItems(loadedItems ?? []); setImports(loadedImports ?? []); }
  };
  useEffect(() => { void reload(); }, []);

  const chooseSheet = (name: string) => {
    const selected = sheets.find((entry) => entry.name === name);
    if (!selected) return;
    const hs = Array.from(new Set(selected.rows.flatMap((row) => Object.keys(row)))).filter((h) => h && !h.startsWith("__EMPTY"));
    setSheet(name); setRows(selected.rows); setHeaders(hs); setMapping(suggest(hs));
  };
  const read = async (selected?: File) => {
    if (!selected) return;
    setMessage("");
    const buffer = await selected.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
    const parsed = workbook.SheetNames.map((name) => ({
      name, rows: XLSX.utils.sheet_to_json<Row>(workbook.Sheets[name]!, { defval: null, raw: true }),
    })).filter((entry) => entry.rows.length);
    setFile({ name: selected.name, hash: await hashFile(buffer), ...weekFromName(selected.name) });
    setSheets(parsed);
    const ranked = parsed.map((entry) => {
      const hs = Array.from(new Set(entry.rows.flatMap((row) => Object.keys(row)))).filter((h) => h && !h.startsWith("__EMPTY"));
      const detected = suggest(hs);
      const score = (detected.charged ? 4 : 0) + (detected.status ? 4 : 0) + (detected.base ? 3 : 0) + (detected.date ? 1 : 0) + Math.min(entry.rows.length / 1000, 1);
      return { entry, hs, detected, score };
    }).sort((a, b) => b.score - a.score);
    const best = ranked[0];
    if (best) {
      setSheet(best.entry.name); setRows(best.entry.rows); setHeaders(best.hs); setMapping(best.detected);
      setMessage(`Aba selecionada automaticamente: ${best.entry.name}. ${best.entry.rows.length} linhas encontradas.`);
    }
  };

  const preview = useMemo(() => {
    let lastBase = "";
    return rows.map((row, index) => {
      const rawBase = mapping.base ? String(row[mapping.base] ?? "").trim() : "";
      if (rawBase && rawBase !== "0" && rawBase !== "-") lastBase = rawBase;
      const resolvedBase = rawBase && rawBase !== "0" && rawBase !== "-" ? rawBase : lastBase || null;
      const charged = money(row[mapping.charged]);
      const decisionText = mapping.status ? String(row[mapping.status] ?? "").trim() : "";
      const decision = normalize(decisionText);
      const isNotDiscounted = decision.includes("descont") && (decision.startsWith("nao") || decision.includes("naodescont"));
      const isDiscounted = decision.includes("descont") && !isNotDiscounted;
      const reversed = mapping.reversed
        ? money(row[mapping.reversed])
        : charged !== null && (isNotDiscounted || isDiscounted)
          ? (isNotDiscounted ? charged : 0)
          : null;
      return {
        line: index + 2, row, charged, reversed, resolvedBase, decisionText,
        real: reversed,
        valid: charged !== null && reversed !== null,
      };
    });
  }, [rows, mapping]);
  const valid = preview.filter((entry) => entry.valid);
  const previewTotals = valid.reduce((acc, entry) => ({
    charged: acc.charged + (entry.charged ?? 0), reversed: acc.reversed + (entry.reversed ?? 0), real: acc.real + (entry.real ?? 0),
  }), { charged: 0, reversed: 0, real: 0 });

  const save = async () => {
    if (!file || !mapping.charged || (!mapping.reversed && !mapping.status) || !valid.length) {
      setMessage("Mapeie R$ como valor, SERVICE como base e Status final como status."); return;
    }
    setBusy(true); setMessage("");
    try {
      const { data: duplicate } = await db.from("real_savings_imports").select("id").eq("file_hash", file.hash).eq("status", "completed").maybeSingle();
      if (duplicate) throw new Error("Este arquivo já possui uma importação concluída.");
      const { data: imported, error } = await db.from("real_savings_imports").insert({
        file_name: file.name, file_hash: file.hash, sheet_name: sheet, mapping,
        week_code: file.weekCode, week_number: file.weekNumber, year: file.year,
        valid_rows: valid.length, rejected_rows: preview.length - valid.length, status: "processing",
      }).select("id").single();
      if (error) throw error;
      const payload = valid.map((entry) => {
        const mapped = new Set(Object.values(mapping).filter(Boolean));
        return {
          import_id: imported.id,
          reference_date: mapping.date && !["semana", "week"].includes(normalize(mapping.date)) ? dateValue(entry.row[mapping.date]) : null,
          base: entry.resolvedBase,
          classification: mapping.classification ? String(entry.row[mapping.classification] ?? "").trim() || null : null,
          status: entry.decisionText || null,
          charged_amount: entry.charged, reversed_amount: entry.reversed,
          extra_data: Object.fromEntries(Object.entries(entry.row).filter(([key]) => !mapped.has(key))),
        };
      });
      for (let i = 0; i < payload.length; i += 200) {
        const { error: itemError } = await db.from("real_savings_items").insert(payload.slice(i, i + 200));
        if (itemError) throw itemError;
      }
      await db.from("real_savings_imports").update({ status: "completed", imported_at: new Date().toISOString() }).eq("id", imported.id);
      setMessage(`${payload.length} linhas importadas com sucesso.`);
      setRows([]); setHeaders([]); setSheets([]); setFile(null); setSheet("");
      await reload();
      await queryClient.invalidateQueries({ queryKey: ["real_savings"] });
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha na importação."); }
    finally { setBusy(false); }
  };
  const removeImport = async (id: string) => {
    if (!window.confirm("Excluir esta importação e todos os itens relacionados?")) return;
    await db.from("real_savings_imports").delete().eq("id", id);
    await reload();
  };

  const bases = useMemo(() => Array.from(new Set(items.map((item) => item.base).filter(Boolean) as string[])).sort(), [items]);
  const filtered = useMemo(() => items.filter((item) => {
    const text = [item.base, item.classification, item.status, item.extra_data].map((v) => JSON.stringify(v ?? "")).join(" ").toLowerCase();
    return (!base || item.base === base) && (!query || text.includes(query.toLowerCase()));
  }), [items, base, query]);
  const totals = filtered.reduce((acc, item) => ({
    charged: acc.charged + (item.charged_amount ?? 0), reversed: acc.reversed + (item.reversed_amount ?? 0), real: acc.real + (item.real_discount ?? 0),
  }), { charged: 0, reversed: 0, real: 0 });
  const byBase = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((item) => map.set(item.base || "Sem base", (map.get(item.base || "Sem base") ?? 0) + (item.real_discount ?? 0)));
    return Array.from(map, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filtered]);

  return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="text-2xl font-extrabold">Savings Reais</h2><p className="text-sm text-muted-foreground">NÃO DESCONTAR = saving real</p></div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 py-2 font-bold text-primary-foreground"><Upload className="size-4" /> Importar planilha<input className="hidden" type="file" accept=".xlsx,.xls,.csv" onChange={(e) => void read(e.target.files?.[0])} /></label>
    </div>
    {message && <div className="rounded-lg border border-border bg-card p-3 text-sm font-semibold">{message}</div>}

    {file && <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 font-bold"><FileSpreadsheet className="size-5" /> {file.name}</div>
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-sm font-semibold">Aba<select className="mt-1 w-full rounded-md border bg-background p-2" value={sheet} onChange={(e) => chooseSheet(e.target.value)}>{sheets.map((s) => <option key={s.name}>{s.name}</option>)}</select></label>
        {(["charged","reversed","date","base","classification","status"] as (keyof Mapping)[]).map((key) => <label key={key} className="text-sm font-semibold">{({charged:"Valor cobrado",reversed:"Valor revertido",date:"Data/período",base:"Base/unidade",classification:"Classificação/motivo",status:"Status"})[key]}<select className="mt-1 w-full rounded-md border bg-background p-2" value={mapping[key]} onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}><option value="">Não mapeado</option>{headers.map((header) => <option key={header}>{header}</option>)}</select></label>)}
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <Summary label="Linhas válidas" value={String(valid.length)} />
        <Summary label="Rejeitadas" value={String(preview.length - valid.length)} />
        <Summary label="Total cobrado" value={brl(previewTotals.charged)} />
        <Summary label="Saving real" value={brl(previewTotals.real)} />
      </div>
      <button disabled={busy} onClick={() => void save()} className="rounded-lg bg-secondary px-4 py-2 font-bold text-secondary-foreground disabled:opacity-50">{busy ? "Importando…" : "Confirmar importação"}</button>
    </section>}

    <div className="grid gap-4 md:grid-cols-4">
      <Summary label="Total cobrado" value={brl(totals.charged)} />
      <Summary label="Total revertido" value={brl(totals.reversed)} />
      <Summary label="Saving real" value={brl(totals.real)} />
      <Summary label="% revertido" value={totals.charged ? `${((totals.reversed / totals.charged) * 100).toFixed(1)}%` : "—"} />
    </div>
    <div className="grid gap-3 md:grid-cols-[1fr_220px]">
      <label className="relative"><Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" /><input className="w-full rounded-lg border bg-card py-2 pl-9 pr-3" placeholder="Buscar classificação, status ou detalhe" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
      <select className="rounded-lg border bg-card p-2" value={base} onChange={(e) => setBase(e.target.value)}><option value="">Todas as bases</option>{bases.map((value) => <option key={value}>{value}</option>)}</select>
    </div>
    <div className="h-72 rounded-xl border border-border bg-card p-4"><ResponsiveContainer width="100%" height="100%"><BarChart data={byBase}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={(value) => brl(Number(value))} /><Bar dataKey="value" fill="hsl(var(--secondary))" /></BarChart></ResponsiveContainer></div>
    <div className="overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="p-3">Data</th><th className="p-3">Base</th><th className="p-3">Classificação</th><th className="p-3">Status</th><th className="p-3 text-right">Cobrado</th><th className="p-3 text-right">Revertido</th><th className="p-3 text-right">Saving real</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className="border-b last:border-0"><td className="p-3">{item.reference_date ?? "—"}</td><td className="p-3">{item.base ?? "—"}</td><td className="p-3">{item.classification ?? "—"}</td><td className="p-3">{item.status ?? "—"}</td><td className="p-3 text-right">{item.charged_amount === null ? "Pendente" : brl(item.charged_amount)}</td><td className="p-3 text-right">{item.reversed_amount === null ? "Pendente" : brl(item.reversed_amount)}</td><td className={`p-3 text-right font-bold ${(item.real_discount ?? 0) < 0 ? "text-destructive" : ""}`}>{item.real_discount === null ? "Pendente" : brl(item.real_discount)}</td></tr>)}</tbody></table>{!filtered.length && <p className="p-8 text-center text-muted-foreground">Nenhum saving real importado.</p>}</div>
    <section className="rounded-xl border border-border bg-card p-4"><h3 className="mb-3 font-bold">Histórico de importações</h3><div className="space-y-2">{imports.map((entry) => <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3"><div><p className="font-semibold">{entry.file_name}</p><p className="text-xs text-muted-foreground">{entry.sheet_name ?? "Aba não informada"} · {entry.valid_rows} válidas · {entry.rejected_rows} rejeitadas · {new Date(entry.imported_at).toLocaleString("pt-BR")}</p></div><button aria-label="Excluir importação" onClick={() => void removeImport(entry.id)} className="rounded-md p-2 text-destructive hover:bg-destructive/10"><Trash2 className="size-4" /></button></div>)}</div></section>
  </div>;
}
function Summary({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-border bg-card p-4"><p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p></div>;
}
