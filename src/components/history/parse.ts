import * as XLSX from "xlsx";

export const CAMPOS_INTERNOS = [
  { key: "semana", label: "Semana (ex. W33)", required: true },
  { key: "ano", label: "Ano", required: false },
  { key: "base", label: "Base", required: true },
  { key: "categoria", label: "Categoria / Descrição do gasto", required: false },
  { key: "descricao", label: "Descrição detalhada", required: false },
  { key: "quantidade", label: "Quantidade", required: false },
  { key: "valor", label: "Valor (R$)", required: true },
  { key: "observacao", label: "Observação", required: false },
] as const;

export type CampoInterno = (typeof CAMPOS_INTERNOS)[number]["key"];
export type Mapping = Partial<Record<CampoInterno, string>>;

export type ParsedSheet = {
  name: string;
  headers: string[];
  rows: Record<string, unknown>[];
};

export type ParsedFile = {
  fileName: string;
  hash: string;
  sheets: ParsedSheet[];
};

const norm = (v: string) =>
  v
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const PALAVRAS: Record<CampoInterno, string[]> = {
  semana: ["semana", "week", "wk", "w"],
  ano: ["ano", "year", "exercicio"],
  base: ["base", "unidade", "filial", "ssp", "site", "cd"],
  categoria: ["categoria", "tipo", "classificacao", "grupo", "motivo", "descricao do gasto"],
  descricao: ["descricao", "detalhe", "item", "produto", "ocorrencia"],
  quantidade: ["quantidade", "qtd", "qtde", "volume", "pecas"],
  valor: ["valor", "custo", "perda", "gasto", "total", "r$", "amount"],
  observacao: ["observacao", "obs", "comentario", "nota"],
};

export function assinaturaCabecalhos(headers: string[]) {
  return headers.map(norm).sort().join("|");
}

export function sugerirMapeamento(headers: string[]): Mapping {
  const mapping: Mapping = {};
  const usados = new Set<string>();
  (Object.keys(PALAVRAS) as CampoInterno[]).forEach((campo) => {
    const achado = headers.find((h) => {
      if (usados.has(h)) return false;
      const n = norm(h);
      return PALAVRAS[campo].some((p) => n === p || n.includes(p));
    });
    if (achado) {
      mapping[campo] = achado;
      usados.add(achado);
    }
  });
  return mapping;
}

async function sha256(buffer: ArrayBuffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function lerArquivo(file: File): Promise<ParsedFile> {
  const buffer = await file.arrayBuffer();
  const hash = await sha256(buffer);
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheets: ParsedSheet[] = wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null, raw: true });
    const headers = Array.from(new Set(rows.flatMap((r) => Object.keys(r)))).filter(
      (h) => h && !h.startsWith("__EMPTY"),
    );
    return { name, headers, rows };
  }).filter((s) => s.rows.length > 0);
  return { fileName: file.name, hash, sheets };
}

export function parseValor(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  const texto = String(valor)
    .replace(/[R$\s\u00a0]/gi, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".")
    .replace(/[()]/g, "");
  const n = Number(texto);
  if (!Number.isFinite(n)) return null;
  return String(valor).trim().startsWith("(") ? -n : n;
}

export function normalizarSemana(valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const texto = String(valor).trim().toUpperCase();
  const m = texto.match(/(\d{1,2})/);
  if (!m) return null;
  const num = Number(m[1]);
  if (num < 1 || num > 53) return null;
  return `W${String(num).padStart(2, "0")}`;
}

export type LinhaValida = {
  week_label: string;
  year: number;
  base: string;
  category: string | null;
  description: string | null;
  quantity: number | null;
  amount: number;
  note: string | null;
  extra: Record<string, unknown>;
};

export type LinhaRejeitada = { linha: number; motivo: string };

export function transformarLinhas(
  rows: Record<string, unknown>[],
  mapping: Mapping,
  padrao: { semana: string; ano: number },
): { validas: LinhaValida[]; rejeitadas: LinhaRejeitada[] } {
  const validas: LinhaValida[] = [];
  const rejeitadas: LinhaRejeitada[] = [];
  const get = (row: Record<string, unknown>, campo: CampoInterno) => {
    const col = mapping[campo];
    return col ? row[col] : null;
  };

  rows.forEach((row, i) => {
    const vazia = Object.values(row).every((v) => v === null || v === "");
    if (vazia) return;

    const semana = normalizarSemana(get(row, "semana")) ?? padrao.semana;
    const anoBruto = get(row, "ano");
    const ano = anoBruto ? Number(String(anoBruto).match(/\d{4}/)?.[0] ?? padrao.ano) : padrao.ano;
    const base = get(row, "base");
    const valor = parseValor(get(row, "valor"));

    if (!semana) return rejeitadas.push({ linha: i + 2, motivo: "Semana ausente ou inválida" });
    if (!base || String(base).trim() === "")
      return rejeitadas.push({ linha: i + 2, motivo: "Base ausente" });
    if (valor === null) return rejeitadas.push({ linha: i + 2, motivo: "Valor inválido" });

    const mapeadas = new Set(Object.values(mapping).filter(Boolean) as string[]);
    const extra: Record<string, unknown> = {};
    Object.entries(row).forEach(([k, v]) => {
      if (!mapeadas.has(k) && v !== null && v !== "") extra[k] = v instanceof Date ? v.toISOString() : v;
    });

    const qtd = parseValor(get(row, "quantidade"));
    validas.push({
      week_label: semana,
      year: Number.isFinite(ano) ? ano : padrao.ano,
      base: String(base).trim(),
      category: get(row, "categoria") ? String(get(row, "categoria")).trim() : null,
      description: get(row, "descricao") ? String(get(row, "descricao")).trim() : null,
      quantity: qtd,
      amount: valor,
      note: get(row, "observacao") ? String(get(row, "observacao")).trim() : null,
      extra,
    });
  });

  return { validas, rejeitadas };
}
