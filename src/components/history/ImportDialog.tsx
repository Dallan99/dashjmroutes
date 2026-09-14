import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { brl } from "@/components/dashboard/data";
import {
  CAMPOS_INTERNOS,
  assinaturaCabecalhos,
  lerArquivo,
  normalizarSemana,
  sugerirMapeamento,
  transformarLinhas,
  type CampoInterno,
  type Mapping,
  type ParsedFile,
} from "./parse";
import {
  buscarMapeamentoSalvo,
  checarDuplicidade,
  gravarImportacao,
  salvarMapeamento,
} from "./api";

const NENHUMA = "__nenhuma__";

export function ImportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [arquivo, setArquivo] = useState<ParsedFile | null>(null);
  const [aba, setAba] = useState<string>("");
  const [mapping, setMapping] = useState<Mapping>({});
  const [mapeamentoReconhecido, setMapeamentoReconhecido] = useState(false);
  const [semanaPadrao, setSemanaPadrao] = useState("");
  const [anoPadrao, setAnoPadrao] = useState(new Date().getFullYear());
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [dup, setDup] = useState<{ mesmoArquivo: boolean; mesmaSemana: number } | null>(null);

  const sheet = arquivo?.sheets.find((s) => s.name === aba) ?? null;

  const resultado = useMemo(() => {
    if (!sheet) return null;
    return transformarLinhas(sheet.rows, mapping, {
      semana: normalizarSemana(semanaPadrao) ?? "",
      ano: anoPadrao,
    });
  }, [sheet, mapping, semanaPadrao, anoPadrao]);

  const semanasDetectadas = useMemo(
    () => Array.from(new Set((resultado?.validas ?? []).map((l) => l.week_label))).sort(),
    [resultado],
  );
  const totalValor = (resultado?.validas ?? []).reduce((s, l) => s + l.amount, 0);

  const reset = () => {
    setArquivo(null);
    setAba("");
    setMapping({});
    setMapeamentoReconhecido(false);
    setSemanaPadrao("");
    setDup(null);
  };

  const aoSelecionarArquivo = async (file: File | undefined) => {
    if (!file) return;
    setCarregando(true);
    try {
      const parsed = await lerArquivo(file);
      if (parsed.sheets.length === 0) {
        toast.error("Arquivo vazio", { description: "Nenhuma linha encontrada na planilha." });
        setCarregando(false);
        return;
      }
      setArquivo(parsed);
      const primeira = parsed.sheets[0]!;
      setAba(primeira.name);
      const salvo = await buscarMapeamentoSalvo(assinaturaCabecalhos(primeira.headers));
      setMapeamentoReconhecido(Boolean(salvo));
      setMapping(salvo ?? sugerirMapeamento(primeira.headers));
      const semanaNome = normalizarSemana(file.name.match(/[wW]\s?\d{1,2}/)?.[0] ?? "");
      if (semanaNome) setSemanaPadrao(semanaNome);
    } catch {
      toast.error("Não foi possível ler o arquivo", {
        description: "Verifique se é um .xlsx, .xls ou .csv válido.",
      });
    }
    setCarregando(false);
  };

  const trocarAba = async (nome: string) => {
    setAba(nome);
    const s = arquivo?.sheets.find((x) => x.name === nome);
    if (!s) return;
    const salvo = await buscarMapeamentoSalvo(assinaturaCabecalhos(s.headers));
    setMapeamentoReconhecido(Boolean(salvo));
    setMapping(salvo ?? sugerirMapeamento(s.headers));
  };

  const validar = async () => {
    if (!resultado || resultado.validas.length === 0) {
      toast.error("Nenhuma linha válida para importar.");
      return;
    }
    if (semanasDetectadas.length === 0) {
      toast.error("Defina a semana", { description: "Mapeie a coluna de semana ou informe a semana padrão." });
      return;
    }
    const d = await checarDuplicidade({
      hash: arquivo!.hash,
      year: anoPadrao,
      week_label: semanasDetectadas[0]!,
    });
    setDup({ mesmoArquivo: d.mesmoArquivo, mesmaSemana: d.mesmaSemana.length });
    if (!d.mesmoArquivo && d.mesmaSemana.length === 0) void confirmar(false);
  };

  const confirmar = async (substituir: boolean) => {
    if (!resultado || !arquivo || !sheet) return;
    setSalvando(true);
    try {
      for (const semana of semanasDetectadas) {
        await gravarImportacao({
          fileName: arquivo.fileName,
          hash: arquivo.hash,
          sheetName: sheet.name,
          week_label: semana,
          year: anoPadrao,
          mapping,
          validas: resultado.validas.filter((l) => l.week_label === semana),
          rejeitadas: resultado.rejeitadas.length,
          substituirSemana: substituir,
        });
      }
      await salvarMapeamento(assinaturaCabecalhos(sheet.headers), arquivo.fileName, mapping);
      await queryClient.invalidateQueries();
      toast.success("Semana importada", {
        description: `${resultado.validas.length} linhas salvas (${semanasDetectadas.join(", ")}).`,
      });
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error("Falha ao salvar a importação", { description: (e as Error).message });
    }
    setSalvando(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Importar semana</DialogTitle>
          <DialogDescription className="font-medium">
            Envie a planilha semanal (.xlsx, .xls ou .csv), confira o mapeamento das colunas e valide
            antes de salvar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Arquivo</Label>
            <Input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => void aoSelecionarArquivo(e.target.files?.[0])}
            />
            {carregando ? (
              <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Lendo planilha…
              </p>
            ) : null}
          </div>

          {arquivo && sheet ? (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Aba</Label>
                  <Select value={aba} onValueChange={(v) => void trocarAba(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {arquivo.sheets.map((s) => (
                        <SelectItem key={s.name} value={s.name}>
                          {s.name} ({s.rows.length})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Semana padrão</Label>
                  <Input
                    value={semanaPadrao}
                    placeholder="W33"
                    onChange={(e) => setSemanaPadrao(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Ano</Label>
                  <Input
                    type="number"
                    value={anoPadrao}
                    onChange={(e) => setAnoPadrao(Number(e.target.value))}
                  />
                </div>
              </div>

              {mapeamentoReconhecido ? (
                <p className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 px-3 py-2 text-sm font-semibold text-success">
                  <CheckCircle2 className="size-4" /> Cabeçalhos reconhecidos — mapeamento anterior
                  aplicado automaticamente.
                </p>
              ) : null}

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                  Mapeamento de colunas
                </h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {CAMPOS_INTERNOS.map((campo) => (
                    <div key={campo.key} className="space-y-1.5">
                      <Label className="text-sm font-semibold">
                        {campo.label}
                        {campo.required ? <span className="text-destructive"> *</span> : null}
                      </Label>
                      <Select
                        value={mapping[campo.key as CampoInterno] ?? NENHUMA}
                        onValueChange={(v) =>
                          setMapping((m) => ({
                            ...m,
                            [campo.key]: v === NENHUMA ? undefined : v,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Não mapeado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NENHUMA}>Não mapeado</SelectItem>
                          {sheet.headers.map((h) => (
                            <SelectItem key={h} value={h}>
                              {h}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  Colunas não mapeadas são preservadas como campos extras.
                </p>
              </div>

              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm font-semibold">
                  <span className="text-success">
                    {resultado?.validas.length ?? 0} linhas válidas
                  </span>
                  <span className="text-destructive">
                    {resultado?.rejeitadas.length ?? 0} rejeitadas
                  </span>
                  <span>Total: {brl(totalValor)}</span>
                  <span>Semanas: {semanasDetectadas.join(", ") || "—"}</span>
                </div>
                {resultado && resultado.rejeitadas.length > 0 ? (
                  <ul className="mt-2 max-h-24 overflow-y-auto text-sm font-medium text-muted-foreground">
                    {resultado.rejeitadas.slice(0, 20).map((r) => (
                      <li key={r.linha}>
                        Linha {r.linha}: {r.motivo}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {resultado && resultado.validas.length > 0 ? (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[620px] text-sm">
                    <thead className="bg-muted/50">
                      <tr className="text-left font-bold uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2">Semana</th>
                        <th className="px-3 py-2">Base</th>
                        <th className="px-3 py-2">Categoria</th>
                        <th className="px-3 py-2 text-right">Qtd.</th>
                        <th className="px-3 py-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultado.validas.slice(0, 8).map((l, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-3 py-2 font-semibold">{l.week_label}</td>
                          <td className="px-3 py-2">{l.base}</td>
                          <td className="px-3 py-2">{l.category ?? "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{l.quantity ?? "—"}</td>
                          <td className="px-3 py-2 text-right tabular-nums">{brl(l.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {dup && (dup.mesmoArquivo || dup.mesmaSemana > 0) ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
                  <p className="flex items-center gap-2 text-sm font-bold text-destructive">
                    <AlertTriangle className="size-4" /> Importação possivelmente duplicada
                  </p>
                  <p className="mt-1 text-sm font-medium">
                    {dup.mesmoArquivo ? "Este arquivo já foi importado. " : ""}
                    {dup.mesmaSemana > 0
                      ? `Já existem dados para ${semanasDetectadas.join(", ")}/${anoPadrao}.`
                      : ""}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button variant="destructive" disabled={salvando} onClick={() => void confirmar(true)}>
                      Substituir a semana
                    </Button>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancelar
                  </Button>
                  <Button disabled={salvando} onClick={() => void validar()}>
                    {salvando ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
                    Validar e importar
                  </Button>
                </div>
              )}
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ImportButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className={className}
        size="lg"
      >
        <Upload className="mr-2 size-4" /> Importar semana
      </Button>
      <ImportDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
