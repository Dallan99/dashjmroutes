import * as XLSX from "xlsx";

export const CAMPOS_INTERNOS = [
  { key: "service", label: "Serviço", required: true },
  { key: "package_id", label: "ID do pacote", required: true },
  { key: "route_id", label: "ID da rota", required: true },
  { key: "driver", label: "Motorista", required: true },
  { key: "description", label: "Descrição", required: true },
  { key: "event_date", label: "Data do evento", required: true },
  { key: "amount", label: "Valor (R$)", required: true },
  { key: "operational_status", label: "Status operacional", required: true },
  { key: "base", label: "Base", required: false },
  { key: "classification", label: "Classificação", required: false },
  { key: "decision", label: "Decisão", required: false },
  { key: "evidence_url", label: "URL de evidência", required: false },
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

export function normalizarCabecalho(v: string | null | undefined): string {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const ALIASES: Record<CampoInterno, string[]> = {
  service: ["service", "servico", "tipodeservico", "tiposervico", "dsp", "prestador", "transportadora"],
  package_id: ["packageid", "iddopacote", "idpacote", "pacote", "tracking", "trackingid", "codigorastreio", "rastreio"],
  route_id: ["routeid", "iddarota", "idrota", "rota", "circuito"],
  driver: ["driver", "motorista", "condutor", "entregador", "nomedomotorista", "nomemotorista"],
  description: ["description", "descricaodoitem", "descricaodopacote", "descricao", "detalhe", "ocorrencia", "itemdescription", "item"],
  event_date: ["eventdate", "datadoevento", "datadoinsucesso", "dataevento", "datainsucesso", "dataocorrencia", "data", "occurrencedate"],
  amount: ["amount", "valor", "valorr", "r", "custo", "perda", "gasto", "valortotal", "total", "prejuizo", "loss"],
  operational_status: ["operationalstatus", "statusoperacional", "situacaooperacional", "status", "situacao"],
  base: ["base", "unidade", "filial", "site", "cd", "estacao", "station", "ssp"],
  classification: ["classification", "classificacao", "categoria", "grupo", "tipoperda", "subcategoria", "motivo"],
  decision: ["decision", "decisao", "parecer", "conclusao", "resultado", "statusdecisao"],
  evidence_url: ["evidenceurl", "urldeevidencia", "evidencia", "link", "foto", "url", "comprovante", "linkevidencia"],
};

export function assinaturaCabecalhos(headers: string[]) {
  return headers.map(normalizarCabecalho).sort().join("|");
}

export function sugerirMapeamento(headers: string[]): Mapping {
  const mapping: Mapping = {};
  const usados = new Set<string>();
  const camposOrdenados: CampoInterno[] = [
    "package_id",
    "route_id",
    "event_date",
    "operational_status",
    "evidence_url",
    "service",
    "driver",
    "description",
    "amount",
    "base",
    "classification",
    "decision",
  ];

  // 1. Correspondência exata normalizada
  camposOrdenados.forEach((campo) => {
    const aliases = ALIASES[campo];
    const achado = headers.find((h) => {
      if (usados.has(h)) return false;
      const normalizado = normalizarCabecalho(h);
      return aliases.includes(normalizado);
    });
    if (achado) {
      mapping[campo] = achado;
      usados.add(achado);
    }
  });

  // 2. Correspondência por inclusão de prefixo/termo para cabeçalhos não mapeados
  camposOrdenados.forEach((campo) => {
    if (mapping[campo]) return;
    const aliases = ALIASES[campo];
    const achado = headers.find((h) => {
      if (usados.has(h)) return false;
      const normalizado = normalizarCabecalho(h);
      if (!normalizado) return false;
      return aliases.some(
        (alias) =>
          (alias.length >= 4 && normalizado.includes(alias)) ||
          (normalizado.length >= 4 && alias.includes(normalizado)),
      );
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
  base: string | null;
  service: string | null;
  package_id: string | null;
  route_id: string | null;
  driver: string | null;
  description: string | null;
  event_date: string | null;
  amount: number | null;
  operational_status: string | null;
  classification: string | null;
  decision: string | null;
  evidence_url: string | null;
  extra_data: Record<string, unknown>;
};

export type LinhaRejeitada = { linha: number; motivo: string };

const texto = (valor: unknown) =>
  valor === null || valor === undefined || String(valor).trim() === "" ? null : String(valor).trim();

export function normalizarData(valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === "") return null;
  if (valor instanceof Date && !Number.isNaN(valor.getTime())) return valor.toISOString().slice(0, 10);
  if (typeof valor === "number" && valor > 0) {
    const data = XLSX.SSF.parse_date_code(valor);
    if (data) return `${data.y}-${String(data.m).padStart(2, "0")}-${String(data.d).padStart(2, "0")}`;
  }
  const bruto = String(valor).trim();
  const brasileira = bruto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (brasileira) {
    const [, dia, mes, ano] = brasileira;
    const data = new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia)));
    if (data.getUTCFullYear() === Number(ano) && data.getUTCMonth() === Number(mes) - 1 && data.getUTCDate() === Number(dia)) {
      return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
    }
    return null;
  }
  const data = new Date(bruto);
  return Number.isNaN(data.getTime()) ? null : data.toISOString().slice(0, 10);
}

export function transformarLinhas(
  rows: Record<string, unknown>[],
  mapping: Mapping,
): { validas: LinhaValida[]; rejeitadas: LinhaRejeitada[] } {
  const validas: LinhaValida[] = [];
  const rejeitadas: LinhaRejeitada[] = [];
  const get = (row: Record<string, unknown>, campo: CampoInterno) => {
    const col = mapping[campo];
    return col ? row[col] : null;
  };

  rows.forEach((row, i) => {
    if (Object.values(row).every((v) => v === null || v === "")) return;

    const mapeadas = new Set(Object.values(mapping).filter(Boolean) as string[]);
    const extra_data: Record<string, unknown> = {};
    Object.entries(row).forEach(([chave, valor]) => {
      if (!mapeadas.has(chave) && valor !== null && valor !== "") {
        extra_data[chave] = valor instanceof Date ? valor.toISOString() : valor;
      }
    });

    const dataOriginal = get(row, "event_date");
    const valorOriginal = get(row, "amount");
    const event_date = normalizarData(dataOriginal);
    const amount = parseValor(valorOriginal);

    if (dataOriginal !== null && dataOriginal !== undefined && dataOriginal !== "" && !event_date) {
      extra_data.data_do_evento_original = dataOriginal instanceof Date ? dataOriginal.toISOString() : dataOriginal;
      rejeitadas.push({ linha: i + 2, motivo: "Data do evento inválida" });
      return;
    }

    if (valorOriginal !== null && valorOriginal !== undefined && valorOriginal !== "" && amount === null) {
      extra_data.valor_original = valorOriginal instanceof Date ? valorOriginal.toISOString() : valorOriginal;
    }

    validas.push({
      base: texto(get(row, "base")),
      service: texto(get(row, "service")),
      package_id: texto(get(row, "package_id")),
      route_id: texto(get(row, "route_id")),
      driver: texto(get(row, "driver")),
      description: texto(get(row, "description")),
      event_date,
      amount,
      operational_status: texto(get(row, "operational_status")),
      classification: texto(get(row, "classification")),
      decision: texto(get(row, "decision")),
      evidence_url: texto(get(row, "evidence_url")),
      extra_data,
    });
  });

  return { validas, rejeitadas };
}
