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
  status: ["statusfinal", "status", "statusoperacional", "decisao", "situacao"],
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
  if (!result.base && headers[0]) result.base = headers[0];
  if (!result.charged && headers[7]) result.charged = headers[7];
  if (!result.status && headers[9]) result.status = headers[9];
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